"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PersonData, CostInfo } from "@/lib/types";

/** Markdownをシンプルに表示用HTMLに変換 */
function renderMarkdown(md: string): string {
  return md
    // ## 見出し
    .replace(/^## (.+)$/gm, '<h3 class="text-gold font-display text-lg tracking-wide mt-5 mb-2">$1</h3>')
    // **太字**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
    // 番号付きリスト
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-gold shrink-0">$1.</span><span>$2</span></div>')
    // 箇条書き
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-gold shrink-0">•</span><span>$1</span></div>')
    // 段落区切り（2連続改行）
    .replace(/\n\n/g, '<div class="h-3"></div>')
    // 単一改行
    .replace(/\n/g, "<br/>");
}

/** 相性スコアの色を返す */
function getScoreColor(score: number): string {
  if (score >= 70) return "#7ec8c0"; // jade
  if (score >= 41) return "#d4a843"; // amber
  return "#c45c5c"; // red
}

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [person, setPerson] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);

  // ノート関連
  const [quickAnalyzing, setQuickAnalyzing] = useState(false);
  const [deepAnalyzing, setDeepAnalyzing] = useState(false);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);

  // ポーリング用
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // 人物データを取得
  const fetchPerson = useCallback(async () => {
    try {
      const res = await fetch("/api/persons");
      const data: PersonData[] = await res.json();
      const found = data.find((p) => p.id === id);
      if (found) {
        setPerson(found);
        return found;
      }
    } catch (err) {
      console.error("人物取得エラー:", err);
    }
    return null;
  }, [id]);

  // 初回読み込み
  useEffect(() => {
    fetchPerson().then((p) => {
      setLoading(false);
      // クイックノート未生成の場合はポーリング開始（登録直後の自動分析待ち）
      if (p && !p.quickNote) {
        startPolling();
      }
    });
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = () => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 7) {
        // 最大15秒（2秒×7回）
        stopPolling();
        return;
      }
      const p = await fetchPerson();
      if (p?.quickNote) {
        stopPolling();
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // クイック分析を（再）生成
  const runQuickAnalysis = async () => {
    setQuickAnalyzing(true);
    setCostInfo(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) =>
          prev
            ? {
                ...prev,
                quickNote: data.quickNote,
                compatibilityScore: data.compatibilityScore,
                quickNoteUpdatedAt: data.quickNoteUpdatedAt,
              }
            : prev
        );
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) {
      console.error("クイック分析エラー:", err);
    } finally {
      setQuickAnalyzing(false);
    }
  };

  // 深掘り分析
  const runDeepAnalysis = async () => {
    setDeepAnalyzing(true);
    setCostInfo(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze-deep`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) =>
          prev
            ? {
                ...prev,
                deepNote: data.deepNote,
                deepNoteUpdatedAt: data.deepNoteUpdatedAt,
              }
            : prev
        );
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) {
      console.error("深掘り分析エラー:", err);
    } finally {
      setDeepAnalyzing(false);
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return null;
    }
  };

  const formatBirthDate = (bd: string | null) => {
    if (!bd) return null;
    const parts = bd.split("-");
    if (parts.length === 3) return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    return bd;
  };

  // ローディング
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-text-muted text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted mb-4">人物が見つかりません</p>
        <Link href="/persons" className="btn-ghost">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const score = person.compatibilityScore;

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/persons"
        className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-gold transition-colors"
      >
        ← 一覧に戻る
      </Link>

      {/* ===== ヘッダーカード ===== */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="font-display text-[28px] md:text-[32px] font-light text-gold tracking-wide">
            {person.nickname}
          </h1>
          <span className="inline-block self-start px-2 py-0.5 border border-border-subtle rounded-[4px] text-[12px] text-text-secondary">
            {person.relationship}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-sm text-text-secondary">
          {person.birthDate && (
            <p>生年月日: {formatBirthDate(person.birthDate)}</p>
          )}
          {person.observations.length > 0 && (
            <p>
              観察メモ:{" "}
              <span className="text-text-primary">
                {person.observations.map((o) => o.content).join("、")}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ===== クイック分析 ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-gold tracking-wide">
            Quick Analysis
          </h2>
          <div className="flex items-center gap-3">
            {person.quickNoteUpdatedAt && (
              <span className="text-[11px] text-text-muted">
                {formatDate(person.quickNoteUpdatedAt)}
              </span>
            )}
            <button
              onClick={runQuickAnalysis}
              disabled={quickAnalyzing}
              className="text-[12px] text-text-secondary hover:text-gold transition-colors disabled:opacity-40"
            >
              {quickAnalyzing ? "分析中..." : "再生成"}
            </button>
          </div>
        </div>

        {quickAnalyzing ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-text-muted text-sm">分析中...</span>
          </div>
        ) : person.quickNote ? (
          <>
            {/* 相性スコアバー */}
            {score !== null && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">相性スコア</span>
                  <span
                    className="font-display text-xl font-semibold"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}
                    <span className="text-sm text-text-muted">/100</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getScoreColor(score),
                    }}
                  />
                </div>
              </div>
            )}

            {/* ノート本文 */}
            <div
              className="text-sm text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(
                  // 相性スコア行はバーで表示済みなので除外
                  person.quickNote
                    .split("\n")
                    .filter((l) => !l.match(/^相性スコア[：:]/))
                    .join("\n")
                ),
              }}
            />
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm mb-3">
              まだ分析が実行されていません
            </p>
            <button onClick={runQuickAnalysis} className="btn-ghost text-sm">
              クイック分析を実行
            </button>
          </div>
        )}
      </div>

      {/* ===== 深掘り分析 ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-jade tracking-wide">
            Deep Analysis
          </h2>
          {person.deepNoteUpdatedAt && (
            <span className="text-[11px] text-text-muted">
              {formatDate(person.deepNoteUpdatedAt)}
            </span>
          )}
        </div>

        {deepAnalyzing ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <div className="w-5 h-5 border-2 border-jade border-t-transparent rounded-full animate-spin" />
            <span className="text-text-muted text-sm">
              深掘り分析中... 少々お待ちください
            </span>
          </div>
        ) : person.deepNote ? (
          <>
            <div
              className="text-sm text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(person.deepNote),
              }}
            />
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <button
                onClick={runDeepAnalysis}
                className="text-[12px] text-text-secondary hover:text-jade transition-colors"
              >
                再生成する
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm mb-1">
              より詳しい分析を実行できます
            </p>
            <p className="text-text-muted text-[11px] mb-4">
              生成には少し時間がかかります
            </p>
            <button
              onClick={runDeepAnalysis}
              disabled={deepAnalyzing}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-jade-dim text-jade bg-transparent rounded-[4px] text-sm hover:bg-jade hover:text-base transition-all duration-300 disabled:opacity-40"
            >
              <span className="text-lg leading-none">🔍</span>
              詳細分析を実行する
            </button>
          </div>
        )}
      </div>

      {/* ===== コスト情報（開発環境のみ） ===== */}
      {costInfo && (
        <div className="text-[11px] text-text-muted bg-surface-hover rounded px-3 py-2 font-mono">
          入力: {costInfo.inputTokens} | 出力: {costInfo.outputTokens} |
          キャッシュ読: {costInfo.cacheReadTokens} | キャッシュ作成:{" "}
          {costInfo.cacheCreationTokens} | 推定コスト: ¥
          {costInfo.estimatedCostJPY.toFixed(4)}
        </div>
      )}

      {/* ===== 相談リンク ===== */}
      <button
        onClick={() => router.push(`/consult?personId=${person.id}`)}
        className="w-full card flex items-center justify-between group hover:border-gold transition-colors duration-200 cursor-pointer"
      >
        <span className="text-text-primary text-sm">
          この人物について相談する
        </span>
        <span className="text-gold group-hover:translate-x-1 transition-transform duration-200">
          →
        </span>
      </button>
    </div>
  );
}
