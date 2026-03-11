"use client";

import { useEffect, useState } from "react";
import type { PersonData, CostInfo } from "@/lib/types";

export default function ConsultPage() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [consultationContext, setConsultationContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingAd, setWaitingAd] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [targetInfo, setTargetInfo] = useState<{
    nickname: string;
    relationship: string;
  } | null>(null);

  // 人物一覧を取得
  useEffect(() => {
    fetch("/api/persons")
      .then((res) => res.json())
      .then((data) => setPersons(data))
      .catch(console.error);
  }, []);

  // 相談実行
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
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.actionPlan);
        setCostInfo(data.costInfo ?? null);
        setTargetInfo(data.target ?? null);
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
      <button
        onClick={handleConsult}
        disabled={
          !selectedPersonId ||
          !consultationContext.trim() ||
          loading ||
          waitingAd
        }
        className="btn-ghost w-full py-3"
      >
        {waitingAd
          ? "準備中..."
          : loading
            ? "アクションプラン生成中..."
            : "相談する"}
      </button>

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

      {/* 結果表示 */}
      {result && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-xl text-gold tracking-wide">
              Action Plan
            </h2>
            {targetInfo && (
              <span className="text-xs text-text-muted">
                {targetInfo.nickname}（{targetInfo.relationship}）
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
            <div className="py-5">
              <pre className="whitespace-pre-wrap text-text-primary leading-[2] text-[14px] font-['Noto_Serif_JP']">
                {result}
              </pre>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
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
