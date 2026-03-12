"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
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

  // 結果記録モーダル
  const [outcomeLogId, setOutcomeLogId] = useState<string | null>(null);
  const [outcomeRating, setOutcomeRating] = useState(0);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeSaving, setOutcomeSaving] = useState(false);

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

  // 結果記録
  const openOutcomeModal = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    setOutcomeLogId(logId);
    setOutcomeRating(0);
    setOutcomeText("");
    setOutcomeSaving(false);
  };

  const closeOutcomeModal = () => {
    setOutcomeLogId(null);
  };

  const saveOutcome = async () => {
    if (!outcomeLogId || outcomeRating === 0) return;
    setOutcomeSaving(true);
    try {
      const res = await fetch(`/api/consultations/${outcomeLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: outcomeText.trim() || null,
          outcomeRating,
        }),
      });
      if (res.ok) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === outcomeLogId
              ? { ...l, outcome: outcomeText.trim() || null, outcomeRating }
              : l
          )
        );
        closeOutcomeModal();
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setOutcomeSaving(false);
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
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
          相談履歴
        </h1>
        <Link href="/consult/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-jade-dim text-jade bg-transparent rounded-[4px] text-sm hover:bg-jade hover:text-base transition-all duration-300">
          <span className="text-jade leading-none">+</span>
          新しい相談
        </Link>
      </div>

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
        <div className="card text-center py-16">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto mb-4 text-text-muted opacity-40">
            <path d="M20 44A18 18 0 1 1 10 32.2L6 50Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="30" r="2" fill="currentColor" />
            <circle cx="32" cy="30" r="2" fill="currentColor" />
            <circle cx="40" cy="30" r="2" fill="currentColor" />
          </svg>
          <p className="text-text-secondary text-sm mb-1">相談履歴がありません</p>
          <p className="text-text-muted text-xs">気になる人物について相談してみましょう。</p>
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
                <div
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  className="w-full py-3 px-0 text-left group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : log.id)}
                >
                  {/* デスクトップ: 1行表示 */}
                  <div className="hidden sm:flex items-center gap-3">
                    <span
                      className={`text-text-muted text-xs transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▸
                    </span>
                    <span className="text-text-primary text-sm shrink-0">
                      {log.person?.nickname || "不明"}
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border ${
                        log.consultType === "deep"
                          ? "border-jade/30 text-jade"
                          : "border-border-subtle text-text-secondary"
                      }`}
                    >
                      {log.consultType === "deep" ? "詳細" : "標準"}
                    </span>
                    <span className="flex-1 text-text-muted text-xs truncate min-w-0">
                      {log.context}
                    </span>
                    {log.outcomeRating && (
                      <span className="text-gold text-[11px] shrink-0">
                        {"★".repeat(log.outcomeRating)}
                      </span>
                    )}
                    <span className="text-text-muted text-[11px] shrink-0">
                      {formatDate(log.createdAt)}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, log.id)}
                      className="text-text-muted hover:text-danger transition-colors text-xs shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>

                  {/* モバイル: 2行表示 */}
                  <div className="sm:hidden space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-text-muted text-xs transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ▸
                      </span>
                      <span className="text-text-primary text-sm">
                        {log.person?.nickname || "不明"}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          log.consultType === "deep"
                            ? "border-jade/30 text-jade"
                            : "border-border-subtle text-text-secondary"
                        }`}
                      >
                        {log.consultType === "deep" ? "詳細" : "標準"}
                      </span>
                      {log.outcomeRating && (
                        <span className="text-gold text-[11px]">
                          {"★".repeat(log.outcomeRating)}
                        </span>
                      )}
                      <span className="ml-auto text-text-muted text-[11px] shrink-0">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-text-muted text-xs truncate pl-5">
                      {log.context}
                    </p>
                  </div>
                </div>

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

                    {/* モバイル: 日時は既にヘッダーに表示 */}

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

                    {/* 結果記録 */}
                    {log.outcomeRating ? (
                      <div className="mt-2 pt-2 border-t border-border-subtle">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-text-muted">結果:</span>
                          <span className="text-gold text-sm">
                            {"★".repeat(log.outcomeRating)}{"☆".repeat(5 - log.outcomeRating)}
                          </span>
                        </div>
                        {log.outcome && (
                          <p className="text-xs text-text-secondary mt-1">{log.outcome}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-border-subtle flex items-center gap-3">
                        <button
                          onClick={(e) => openOutcomeModal(e, log.id)}
                          className="text-xs text-jade hover:text-gold transition-colors"
                        >
                          結果を記録
                        </button>
                      </div>
                    )}

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

      {/* 結果記録モーダル */}
      {outcomeLogId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeOutcomeModal(); }}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm mx-4">
            <div className="px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="text-sm text-text-primary">この相談の結果を記録</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-xs text-text-secondary mb-2">うまくいきましたか？</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setOutcomeRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= outcomeRating ? "text-gold" : "text-text-muted"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">メモ（任意）</label>
                <textarea
                  value={outcomeText}
                  onChange={(e) => setOutcomeText(e.target.value)}
                  rows={3}
                  placeholder="どうなったか、感じたことなど"
                  className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted focus:border-gold transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
              <button onClick={closeOutcomeModal}
                className="flex-1 py-2 text-text-muted text-sm hover:text-text-secondary transition-colors">キャンセル</button>
              <button onClick={saveOutcome} disabled={outcomeRating === 0 || outcomeSaving}
                className="btn-ghost flex-1 text-sm py-2">
                {outcomeSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
