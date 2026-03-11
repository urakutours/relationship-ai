"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { PersonData, CostInfo } from "@/lib/types";

export default function ConsultPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><p className="text-text-muted text-sm">読み込み中...</p></div>}>
      <ConsultContent />
    </Suspense>
  );
}

function ConsultContent() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [consultationContext, setConsultationContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingAd, setWaitingAd] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [consultType, setConsultType] = useState<"standard" | "deep">("standard");
  const [targetInfo, setTargetInfo] = useState<{
    nickname: string;
    relationship: string;
  } | null>(null);

  // Deep Insight用カウントダウンモーダル
  const [showDeepModal, setShowDeepModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const searchParams = useSearchParams();

  // 人物一覧を取得 + URLパラメータで事前選択
  useEffect(() => {
    fetch("/api/persons")
      .then((res) => res.json())
      .then((data) => {
        setPersons(data);
        const preselect = searchParams.get("personId");
        if (preselect && data.some((p: PersonData) => p.id === preselect)) {
          setSelectedPersonId(preselect);
        }
      })
      .catch(console.error);
  }, [searchParams]);

  // カウントダウン完了後に深掘り相談を実行
  const startDeepConsult = useCallback(async () => {
    setShowDeepModal(false);
    setLoading(true);
    setResult(null);
    setCostInfo(null);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selectedPersonId,
          consultationContext: consultationContext.trim(),
          consultType: "deep",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.actionPlan);
        setCostInfo(data.costInfo ?? null);
        setTargetInfo(data.target ?? null);
        setConsultType("deep");
      } else {
        setResult(data.error || "深掘り相談の処理に失敗しました");
      }
    } catch {
      setResult("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [selectedPersonId, consultationContext]);

  // カウントダウンモーダルを開始
  const openDeepModal = () => {
    if (!selectedPersonId || !consultationContext.trim()) return;
    setCountdown(5);
    setShowDeepModal(true);
  };

  // カウントダウンのタイマー
  useEffect(() => {
    if (showDeepModal && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } else if (showDeepModal && countdown === 0) {
      startDeepConsult();
    }
  }, [showDeepModal, countdown, startDeepConsult]);

  // 通常相談実行
  const handleConsult = async () => {
    if (!selectedPersonId || !consultationContext.trim()) return;

    // 広告代替: 3秒待機
    setWaitingAd(true);
    setResult(null);
    setCostInfo(null);

    await new Promise((resolve) => setTimeout(resolve, 3000));
    setWaitingAd(false);

    setLoading(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selectedPersonId,
          consultationContext: consultationContext.trim(),
          userType: "FREE",
          consultType: "standard",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.actionPlan);
        setCostInfo(data.costInfo ?? null);
        setTargetInfo(data.target ?? null);
        setConsultType("standard");
      } else {
        setResult(data.error || "相談の処理に失敗しました");
      }
    } catch {
      setResult("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);
  const canConsult = selectedPersonId && consultationContext.trim() && !loading && !waitingAd;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
        Consultation
      </h1>

      {/* 上部: 相手情報サマリー + 選択 */}
      <div className="card">
        <h2 className="text-xs text-text-muted uppercase font-display tracking-widest mb-4">
          Step 1 &mdash; Target
        </h2>
        {persons.length === 0 ? (
          <p className="text-text-muted text-sm">
            まず人物を登録してください。
            <a href="/persons/new" className="text-jade hover:text-gold transition-colors ml-1">
              人物登録へ
            </a>
          </p>
        ) : (
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="input-underline"
          >
            <option value="">人物を選択してください</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.nickname}（{person.relationship}）
              </option>
            ))}
          </select>
        )}

        {/* 選択した人物の情報表示 */}
        {selectedPerson && (
          <div className="mt-4 py-3 px-4 bg-base rounded-[4px]">
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              {selectedPerson.birthDate && (
                <span>生年月日: {selectedPerson.birthDate}</span>
              )}
              {selectedPerson.observations.length > 0 && (
                <span>
                  観察メモ:{" "}
                  {selectedPerson.observations.map((o) => o.content).join("、")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 下部: 相談内容入力 */}
      <div className="card">
        <h2 className="text-xs text-text-muted uppercase font-display tracking-widest mb-4">
          Step 2 &mdash; Context
        </h2>
        <textarea
          value={consultationContext}
          onChange={(e) => setConsultationContext(e.target.value)}
          placeholder="例: 明日の会議で仕様変更を提案したいが、相手は保守的なタイプ。どう切り出せばいい？"
          rows={4}
          className="w-full bg-transparent border-none border-b border-border-subtle text-text-primary text-[15px] font-['Noto_Serif_JP'] outline-none resize-none placeholder:text-text-muted leading-relaxed p-0 pb-2"
          style={{ borderBottom: '1px solid rgba(201, 168, 76, 0.12)' }}
        />
      </div>

      {/* 相談ボタン */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleConsult}
          disabled={!canConsult}
          className="btn-ghost flex-1 py-3"
        >
          {waitingAd
            ? "準備中..."
            : loading && consultType === "standard"
              ? "アクションプラン生成中..."
              : "相談する"}
        </button>

        {/* 深掘り相談ボタン */}
        <button
          onClick={openDeepModal}
          disabled={!canConsult}
          className="relative flex-1 py-3 inline-flex items-center justify-center border border-jade/30 text-jade bg-transparent rounded-[4px] text-sm cursor-pointer transition-all duration-300 hover:bg-jade hover:text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-jade"
        >
          <span className="font-display tracking-wider mr-2">&#x2726;</span>
          深掘り相談
          <span className="ml-2 text-[10px] text-text-muted">(Deep Insight)</span>
        </button>
      </div>

      {/* 待機中のプログレスバー */}
      {waitingAd && (
        <div className="w-full h-[2px] bg-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full"
            style={{
              animation: "progress-fill 3s linear forwards",
            }}
          />
        </div>
      )}

      {/* 深掘り相談カウントダウンモーダル */}
      {showDeepModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <div className="mb-6">
              <span className="font-display text-jade text-3xl">&#x2726;</span>
            </div>
            <h3 className="font-display text-xl text-gold tracking-wide mb-2">
              Deep Insight
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              より詳細なアクションプランを生成します
            </p>

            {/* カウントダウン表示 */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="36"
                  stroke="rgba(201, 168, 76, 0.15)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="40" cy="40" r="36"
                  stroke="#7ec8c0"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (countdown / 5)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-2xl text-gold">
                {countdown}
              </span>
            </div>

            <p className="text-text-muted text-xs mb-4">
              広告の代わりに{countdown}秒お待ちください...
            </p>

            <button
              onClick={() => {
                setShowDeepModal(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
              }}
              className="text-text-muted text-xs hover:text-text-secondary transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-xl text-gold tracking-wide">
              {consultType === "deep" ? (
                <>
                  <span className="text-jade mr-2">&#x2726;</span>
                  Deep Insight
                </>
              ) : (
                "Action Plan"
              )}
            </h2>
            {targetInfo && (
              <span className="text-xs text-text-muted">
                {targetInfo.nickname}（{targetInfo.relationship}）
              </span>
            )}
          </div>

          <div className="relative">
            <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${consultType === "deep" ? "via-jade-dim" : "via-gold-dim"} to-transparent`} />
            <div className="py-5">
              <pre className="whitespace-pre-wrap text-text-primary leading-[2] text-[14px] font-['Noto_Serif_JP']">
                {result}
              </pre>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${consultType === "deep" ? "via-jade-dim" : "via-gold-dim"} to-transparent`} />
          </div>

          {/* コスト表示（開発環境のみ） */}
          {costInfo && (
            <div className="mt-4 py-2 px-3 bg-base rounded-[4px] text-[10px] text-text-muted font-display tracking-wide">
              IN:{costInfo.inputTokens} | OUT:{costInfo.outputTokens} |
              CACHE_R:{costInfo.cacheReadTokens} | CACHE_W:{costInfo.cacheCreationTokens} |
              COST: &yen;{costInfo.estimatedCostJPY.toFixed(4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
