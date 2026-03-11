"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { ConsultationLogData, PersonData } from "@/lib/types";

export default function ConsultHistoryPage() {
  const [logs, setLogs] = useState<ConsultationLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // フィルター
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [filterPersonId, setFilterPersonId] = useState("");

  // 展開中のログID
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // IntersectionObserver用
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 人物一覧取得
  useEffect(() => {
    fetch("/api/persons")
      .then((res) => res.json())
      .then(setPersons)
      .catch(console.error);
  }, []);

  // 履歴取得
  const fetchLogs = useCallback(
    async (cursor?: string, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (filterPersonId) params.set("personId", filterPersonId);
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/consultations?${params.toString()}`);
        const data = await res.json();

        if (append) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
        }
        setNextCursor(data.nextCursor);
      } catch (error) {
        console.error("履歴取得エラー:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterPersonId]
  );

  // 初回＋フィルター変更時
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 無限スクロール
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchLogs(nextCursor, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchLogs]);

  // 削除
  const handleDelete = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!confirm("この相談履歴を削除しますか？")) return;
    try {
      await fetch(`/api/consultations/${logId}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${y}/${m}/${day} ${h}:${min}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
        History
      </h1>

      {/* フィルター */}
      <div className="flex items-center gap-3">
        <select
          value={filterPersonId}
          onChange={(e) => setFilterPersonId(e.target.value)}
          className="input-underline max-w-xs text-sm"
        >
          <option value="">すべての人物</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname}（{p.relationship}）
            </option>
          ))}
        </select>
      </div>

      {/* 履歴一覧 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <p className="text-text-muted text-sm">読み込み中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">相談履歴はまだありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="card !py-0 overflow-hidden"
              >
                {/* ヘッダー行（クリックで展開） */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  className="w-full flex items-center gap-3 py-3 px-0 text-left group"
                >
                  {/* 展開矢印 */}
                  <span
                    className={`text-text-muted text-xs transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>

                  {/* 人物名 */}
                  <span className="text-text-primary text-sm shrink-0">
                    {log.person?.nickname || "不明"}
                  </span>

                  {/* 相談タイプ */}
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border ${
                      log.consultType === "deep"
                        ? "border-jade/30 text-jade"
                        : "border-border-subtle text-text-secondary"
                    }`}
                  >
                    {log.consultType === "deep" ? "Deep" : "Standard"}
                  </span>

                  {/* 相談内容プレビュー */}
                  <span className="flex-1 text-text-muted text-xs truncate min-w-0">
                    {log.context}
                  </span>

                  {/* 日時 */}
                  <span className="text-text-muted text-[11px] shrink-0 hidden sm:inline">
                    {formatDate(log.createdAt)}
                  </span>

                  {/* 削除 */}
                  <button
                    onClick={(e) => handleDelete(e, log.id)}
                    className="text-text-muted hover:text-danger transition-colors text-xs shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </button>

                {/* 展開コンテンツ */}
                {isExpanded && (
                  <div className="pb-4 pt-1 border-t border-border-subtle">
                    {/* 相談内容 */}
                    <div className="mb-3">
                      <p className="text-[11px] text-text-muted mb-1">
                        相談内容
                      </p>
                      <p className="text-sm text-text-secondary">
                        {log.context}
                      </p>
                    </div>

                    {/* モバイル日時 */}
                    <p className="text-[11px] text-text-muted mb-3 sm:hidden">
                      {formatDate(log.createdAt)}
                    </p>

                    {/* 結果 */}
                    <div className="relative">
                      <div
                        className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${
                          log.consultType === "deep"
                            ? "via-jade-dim"
                            : "via-gold-dim"
                        } to-transparent`}
                      />
                      <div className="py-3">
                        <div className="markdown-body text-[13px]">
                          <ReactMarkdown>{log.result}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* 削除（モバイル用） */}
                    <button
                      onClick={(e) => handleDelete(e, log.id)}
                      className="sm:hidden text-text-muted hover:text-danger text-xs mt-2 transition-colors"
                    >
                      この履歴を削除
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* 無限スクロール用センチネル */}
          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
