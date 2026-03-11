"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { PersonData, CostInfo } from "@/lib/types";

/** Markdownをシンプルに表示用HTMLに変換 */
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h3 class="text-gold font-display text-lg tracking-wide mt-5 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-gold shrink-0">$1.</span><span>$2</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-gold shrink-0">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="h-3"></div>')
    .replace(/\n/g, "<br/>");
}

/** 相性スコアの色を返す */
function getScoreColor(score: number): string {
  if (score >= 70) return "#7ec8c0";
  if (score >= 41) return "#d4a843";
  return "#c45c5c";
}

/** 関係性に応じたプレースホルダー */
const PLACEHOLDERS: Record<string, string> = {
  "上司": "来週の進捗報告で、プロジェクトの遅延を正直に伝えたい。角が立たない伝え方は？",
  "部下": "最近ミスが増えている部下に、やる気を損なわずに改善を促したい",
  "クライアント": "先方から返事が来ない。催促のタイミングと文面はどうすればいい？",
  "配偶者": "最近すれ違いが多い。休日の過ごし方について話し合いたい",
  "友人": "久しぶりに連絡を取りたいが、どんな話題から入るといい？",
};
const DEFAULT_PLACEHOLDER = "この人との関係で悩んでいることや、うまくやりたい場面を入力してください";

export default function PersonDetailPage() {
  const params = useParams();
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

  // 相談モーダル
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultContext, setConsultContext] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"standard" | "deep">("standard");
  const [consultSaved, setConsultSaved] = useState(false);
  const [consultCostInfo, setConsultCostInfo] = useState<CostInfo | null>(null);

  // Deep相談カウントダウン
  const [showDeepCountdown, setShowDeepCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    fetchPerson().then((p) => {
      setLoading(false);
      if (p && !p.quickNote) startPolling();
    });
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = () => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 7) { stopPolling(); return; }
      const p = await fetchPerson();
      if (p?.quickNote) stopPolling();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // クイック分析
  const runQuickAnalysis = async () => {
    setQuickAnalyzing(true);
    setCostInfo(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) => prev ? { ...prev, quickNote: data.quickNote, compatibilityScore: data.compatibilityScore, quickNoteUpdatedAt: data.quickNoteUpdatedAt } : prev);
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) { console.error("クイック分析エラー:", err); }
    finally { setQuickAnalyzing(false); }
  };

  // 深掘り分析
  const runDeepAnalysis = async () => {
    setDeepAnalyzing(true);
    setCostInfo(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze-deep`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) => prev ? { ...prev, deepNote: data.deepNote, deepNoteUpdatedAt: data.deepNoteUpdatedAt } : prev);
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) { console.error("深掘り分析エラー:", err); }
    finally { setDeepAnalyzing(false); }
  };

  // ===== 相談モーダル =====
  const openConsultModal = () => {
    setConsultContext("");
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setShowConsultModal(true);
  };

  const closeConsultModal = () => {
    setShowConsultModal(false);
    setShowDeepCountdown(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // 標準相談
  const runStandardConsult = async () => {
    if (!consultContext.trim()) return;
    setConsultLoading(true);
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setConsultType("standard");
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: id,
          consultationContext: consultContext.trim(),
          consultType: "standard",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsultResult(data.actionPlan);
        setConsultSaved(true);
        if (data.costInfo) setConsultCostInfo(data.costInfo);
      } else {
        setConsultResult(data.error || "相談処理に失敗しました");
      }
    } catch {
      setConsultResult("ネットワークエラーが発生しました");
    } finally {
      setConsultLoading(false);
    }
  };

  // 深掘り相談
  const runDeepConsult = async () => {
    setShowDeepCountdown(false);
    setConsultLoading(true);
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setConsultType("deep");
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: id,
          consultationContext: consultContext.trim(),
          consultType: "deep",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsultResult(data.actionPlan);
        setConsultSaved(true);
        if (data.costInfo) setConsultCostInfo(data.costInfo);
      } else {
        setConsultResult(data.error || "深掘り相談処理に失敗しました");
      }
    } catch {
      setConsultResult("ネットワークエラーが発生しました");
    } finally {
      setConsultLoading(false);
    }
  };

  // 深掘りカウントダウン開始
  const startDeepCountdown = () => {
    if (!consultContext.trim()) return;
    setCountdown(3);
    setShowDeepCountdown(true);
  };

  useEffect(() => {
    if (showDeepCountdown && countdown > 0) {
      countdownRef.current = setInterval(() => setCountdown((p) => p - 1), 1000);
      return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    } else if (showDeepCountdown && countdown === 0) {
      runDeepConsult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeepCountdown, countdown]);

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch { return null; }
  };

  const formatBirthDate = (bd: string | null) => {
    if (!bd) return null;
    const parts = bd.split("-");
    if (parts.length === 3) return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    return bd;
  };

  if (loading) {
    return (<div className="flex justify-center py-16"><p className="text-text-muted text-sm">読み込み中...</p></div>);
  }
  if (!person) {
    return (<div className="text-center py-16"><p className="text-text-muted mb-4">人物が見つかりません</p><Link href="/persons" className="btn-ghost">一覧に戻る</Link></div>);
  }

  const score = person.compatibilityScore;
  const placeholder = PLACEHOLDERS[person.relationship] || DEFAULT_PLACEHOLDER;

  return (
    <div className="space-y-6">
      <Link href="/persons" className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-gold transition-colors">← 一覧に戻る</Link>

      {/* ===== ヘッダーカード ===== */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="font-display text-[28px] md:text-[32px] font-light text-gold tracking-wide">{person.nickname}</h1>
          <span className="inline-block self-start px-2 py-0.5 border border-border-subtle rounded-[4px] text-[12px] text-text-secondary">{person.relationship}</span>
        </div>
        <div className="mt-3 space-y-1 text-sm text-text-secondary">
          {person.birthDate && <p>生年月日: {formatBirthDate(person.birthDate)}</p>}
          {person.personalContext && <p>背景: <span className="text-text-primary">{person.personalContext}</span></p>}
          {person.observations.length > 0 && (
            <p>観察メモ: <span className="text-text-primary">{person.observations.map((o) => o.content).join("、")}</span></p>
          )}
        </div>
      </div>

      {/* ===== クイック分析 ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-gold tracking-wide">Quick Analysis</h2>
          <div className="flex items-center gap-3">
            {person.quickNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(person.quickNoteUpdatedAt)}</span>}
            <button onClick={runQuickAnalysis} disabled={quickAnalyzing} className="text-[12px] text-text-secondary hover:text-gold transition-colors disabled:opacity-40">
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
            {score !== null && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">相性スコア</span>
                  <span className="font-display text-xl font-semibold" style={{ color: getScoreColor(score) }}>
                    {score}<span className="text-sm text-text-muted">/100</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }} />
                </div>
              </div>
            )}
            <div className="text-sm text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{
              __html: renderMarkdown(person.quickNote.split("\n").filter((l) => !l.match(/^相性スコア[：:]/)).join("\n")),
            }} />
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm mb-3">まだ分析が実行されていません</p>
            <button onClick={runQuickAnalysis} className="btn-ghost text-sm">クイック分析を実行</button>
          </div>
        )}
      </div>

      {/* ===== 深掘り分析 ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-jade tracking-wide">Deep Analysis</h2>
          {person.deepNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(person.deepNoteUpdatedAt)}</span>}
        </div>
        {deepAnalyzing ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <div className="w-5 h-5 border-2 border-jade border-t-transparent rounded-full animate-spin" />
            <span className="text-text-muted text-sm">深掘り分析中... 少々お待ちください</span>
          </div>
        ) : person.deepNote ? (
          <>
            <div className="text-sm text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(person.deepNote) }} />
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <button onClick={runDeepAnalysis} className="text-[12px] text-text-secondary hover:text-jade transition-colors">再生成する</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-text-muted text-sm mb-1">より詳しい分析を実行できます</p>
            <p className="text-text-muted text-[11px] mb-4">生成には少し時間がかかります</p>
            <button onClick={runDeepAnalysis} disabled={deepAnalyzing}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-jade-dim text-jade bg-transparent rounded-[4px] text-sm hover:bg-jade hover:text-base transition-all duration-300 disabled:opacity-40">
              <span className="text-lg leading-none">🔍</span>
              詳細分析を実行する
            </button>
          </div>
        )}
      </div>

      {/* コスト情報 */}
      {costInfo && (
        <div className="text-[11px] text-text-muted bg-surface-hover rounded px-3 py-2 font-mono">
          入力: {costInfo.inputTokens} | 出力: {costInfo.outputTokens} | キャッシュ読: {costInfo.cacheReadTokens} | キャッシュ作成: {costInfo.cacheCreationTokens} | 推定コスト: ¥{costInfo.estimatedCostJPY.toFixed(4)}
        </div>
      )}

      {/* ===== 相談ボタン ===== */}
      <button onClick={openConsultModal} className="w-full card flex items-center justify-between group hover:border-gold transition-colors duration-200 cursor-pointer">
        <span className="text-text-primary text-sm">この人物について相談する</span>
        <span className="text-gold group-hover:translate-x-1 transition-transform duration-200">→</span>
      </button>

      {/* ===== 相談モーダル ===== */}
      {showConsultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeConsultModal(); }}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="font-display text-lg text-gold tracking-wide">
                {person.nickname}について相談する
              </h3>
              <button onClick={closeConsultModal} className="text-text-muted hover:text-text-primary text-lg transition-colors">✕</button>
            </div>

            {/* コンテンツ（スクロール可能） */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!consultResult ? (
                <>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">相談内容</label>
                    <textarea
                      value={consultContext}
                      onChange={(e) => setConsultContext(e.target.value)}
                      placeholder={placeholder}
                      rows={4}
                      className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted leading-relaxed focus:border-gold transition-colors"
                    />
                  </div>

                  {/* 深掘りカウントダウン */}
                  {showDeepCountdown && (
                    <div className="text-center py-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" stroke="rgba(201,168,76,0.15)" strokeWidth="3" fill="none" />
                          <circle cx="32" cy="32" r="28" stroke="#7ec8c0" strokeWidth="3" fill="none" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (countdown / 3)}`}
                            className="transition-all duration-1000 ease-linear" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-display text-xl text-gold">{countdown}</span>
                      </div>
                      <p className="text-text-muted text-xs">広告の代わりに{countdown}秒お待ちください...</p>
                      <button onClick={() => { setShowDeepCountdown(false); if (countdownRef.current) clearInterval(countdownRef.current); }}
                        className="mt-2 text-text-muted text-xs hover:text-text-secondary transition-colors">キャンセル</button>
                    </div>
                  )}

                  {consultLoading && (
                    <div className="flex items-center justify-center py-6 gap-3">
                      <div className={`w-5 h-5 border-2 ${consultType === "deep" ? "border-jade" : "border-gold"} border-t-transparent rounded-full animate-spin`} />
                      <span className="text-text-muted text-sm">
                        {consultType === "deep" ? "深掘り相談中..." : "相談中..."}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${consultType === "deep" ? "via-jade-dim" : "via-gold-dim"} to-transparent`} />
                    <div className="py-4">
                      <h4 className="font-display text-base mb-3 tracking-wide">
                        {consultType === "deep" ? (
                          <span className="text-jade">✦ Deep Insight</span>
                        ) : (
                          <span className="text-gold">Action Plan</span>
                        )}
                      </h4>
                      <pre className="whitespace-pre-wrap text-text-primary leading-[1.8] text-[13px] font-['Noto_Serif_JP']">{consultResult}</pre>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${consultType === "deep" ? "via-jade-dim" : "via-gold-dim"} to-transparent`} />
                  </div>

                  {consultSaved && (
                    <p className="text-jade text-xs">保存しました。履歴で確認できます。</p>
                  )}

                  {consultCostInfo && (
                    <div className="text-[10px] text-text-muted bg-surface-hover rounded px-2 py-1 font-mono">
                      IN:{consultCostInfo.inputTokens} OUT:{consultCostInfo.outputTokens} COST:¥{consultCostInfo.estimatedCostJPY.toFixed(4)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* フッター（ボタン） */}
            {!consultResult && !consultLoading && !showDeepCountdown && (
              <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
                <button onClick={runStandardConsult} disabled={!consultContext.trim()} className="btn-ghost flex-1 text-sm py-2.5">
                  標準相談
                </button>
                <button onClick={startDeepCountdown} disabled={!consultContext.trim()}
                  className="flex-1 py-2.5 inline-flex items-center justify-center border border-jade/30 text-jade bg-transparent rounded-[4px] text-sm cursor-pointer transition-all duration-300 hover:bg-jade hover:text-base disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="font-display mr-1">✦</span> 深掘り相談
                  <span className="ml-1 text-[10px] text-text-muted">📺</span>
                </button>
              </div>
            )}
            {consultResult && (
              <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
                <button onClick={() => { setConsultResult(null); setConsultSaved(false); setConsultContext(""); }}
                  className="btn-ghost flex-1 text-sm py-2.5">新しい相談</button>
                <button onClick={closeConsultModal}
                  className="flex-1 py-2.5 text-text-secondary text-sm hover:text-text-primary transition-colors">閉じる</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
