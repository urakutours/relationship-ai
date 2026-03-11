"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { PersonData, CostInfo } from "@/lib/types";

/** 相性スコア→星表示（1〜5、未生成は"--"） */
function scoreToStars(score: number | null): string {
  if (score === null) return "--";
  const stars = Math.min(5, Math.max(1, Math.round(score / 20)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
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

export default function PersonsListPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  // 相談モーダル
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultPersonId, setConsultPersonId] = useState<string | null>(null);
  const [consultPersonName, setConsultPersonName] = useState("");
  const [consultRelationship, setConsultRelationship] = useState("");
  const [consultContext, setConsultContext] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"standard" | "deep">("standard");
  const [consultSaved, setConsultSaved] = useState(false);
  const [consultCostInfo, setConsultCostInfo] = useState<CostInfo | null>(null);
  const [showDeepCountdown, setShowDeepCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      setPersons(data);
    } catch (error) {
      console.error("人物一覧取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    nickname: string
  ) => {
    e.stopPropagation();
    if (!confirm(`「${nickname}」を削除しますか？`)) return;
    try {
      await fetch(`/api/persons?id=${id}`, { method: "DELETE" });
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  // ===== 相談モーダル =====
  const openConsultModal = (e: React.MouseEvent, person: PersonData) => {
    e.stopPropagation();
    setConsultPersonId(person.id);
    setConsultPersonName(person.nickname);
    setConsultRelationship(person.relationship);
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

  const runStandardConsult = async () => {
    if (!consultContext.trim() || !consultPersonId) return;
    setConsultLoading(true);
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setConsultType("standard");
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: consultPersonId, consultationContext: consultContext.trim(), consultType: "standard" }),
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

  const runDeepConsult = useCallback(async () => {
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
        body: JSON.stringify({ personId: consultPersonId, consultationContext: consultContext.trim(), consultType: "deep" }),
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
  }, [consultPersonId, consultContext]);

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
  }, [showDeepCountdown, countdown, runDeepConsult]);

  const consultPlaceholder = PLACEHOLDERS[consultRelationship] || DEFAULT_PLACEHOLDER;

  // 最終相談日のフォーマット (consult APIがconsultationsを返さないので、今はpersonデータから判断)
  const formatLastConsult = (person: PersonData) => {
    // consultationsフィールドがPersonDataにないため省略
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-text-muted text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
          People
        </h1>
        <Link href="/persons/new" className="btn-ghost">
          新規登録
        </Link>
      </div>

      {persons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-muted mb-4">まだ人物が登録されていません</p>
          <Link href="/persons/new" className="btn-ghost">
            最初の人物を登録する
          </Link>
        </div>
      ) : (
        <>
          {/* === デスクトップ: カード形式 === */}
          <div className="hidden md:block space-y-3">
            {persons.map((person) => {
              const hasNote = person.quickNote !== null;
              return (
                <div
                  key={person.id}
                  onClick={() => router.push(`/persons/${person.id}`)}
                  className="card !py-4 cursor-pointer hover:border-gold-dim transition-colors duration-200 group"
                >
                  {/* 1行目: 名前 + 関係性 + スコア */}
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary text-[15px]">
                      {person.nickname}
                    </span>
                    {!hasNote && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/30">
                        未分析
                      </span>
                    )}
                    <span className="inline-block px-2 py-0.5 border border-border-subtle rounded-[4px] text-[11px] text-text-secondary">
                      {person.relationship}
                    </span>
                    <span className="ml-auto text-xs text-gold tracking-wider">
                      {scoreToStars(person.compatibilityScore)}
                    </span>
                  </div>

                  {/* 2行目: 相談リンク + 削除 */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={(e) => openConsultModal(e, person)}
                      className="text-jade text-xs hover:text-gold transition-colors"
                    >
                      この人物について相談する ›
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, person.id, person.nickname)}
                      className="text-text-muted hover:text-danger transition-colors text-xs opacity-0 group-hover:opacity-100"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* === モバイル: カード形式 === */}
          <div className="md:hidden space-y-3">
            {persons.map((person) => {
              const hasNote = person.quickNote !== null;
              return (
                <div
                  key={person.id}
                  onClick={() => router.push(`/persons/${person.id}`)}
                  className="card !p-4 cursor-pointer active:bg-surface-hover transition-colors"
                >
                  {/* 1行目: 名前 + 関係性 + スコア */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-text-primary text-[15px] font-medium">
                          {person.nickname}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 border border-border-subtle rounded-[3px] text-[10px] text-text-secondary shrink-0">
                          {person.relationship}
                        </span>
                        {!hasNote && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-amber-900/30 text-amber-400 border border-amber-700/30 shrink-0">
                            未分析
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gold">
                        {scoreToStars(person.compatibilityScore)}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, person.id, person.nickname)}
                        className="text-text-muted hover:text-danger transition-colors text-xs"
                      >
                        &#x2715;
                      </button>
                    </div>
                  </div>

                  {/* 2行目: 相談リンク */}
                  <button
                    onClick={(e) => openConsultModal(e, person)}
                    className="text-jade text-xs hover:text-gold transition-colors mt-1"
                  >
                    この人物について相談する ›
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== 相談モーダル ===== */}
      {showConsultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeConsultModal(); }}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="font-display text-lg text-gold tracking-wide">
                {consultPersonName}について相談する
              </h3>
              <button onClick={closeConsultModal} className="text-text-muted hover:text-text-primary text-lg transition-colors">✕</button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!consultResult ? (
                <>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">相談内容</label>
                    <textarea
                      value={consultContext}
                      onChange={(e) => setConsultContext(e.target.value)}
                      placeholder={consultPlaceholder}
                      rows={4}
                      className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted leading-relaxed focus:border-gold transition-colors"
                    />
                  </div>

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
                      <div className="markdown-body text-[13px]">
                        <ReactMarkdown>{consultResult}</ReactMarkdown>
                      </div>
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

            {/* フッター */}
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
