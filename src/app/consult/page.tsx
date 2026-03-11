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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ディープ相談</h1>

      {/* Step 1: 人物選択 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-2">
          Step 1: 相談する相手を選択
        </h2>
        {persons.length === 0 ? (
          <p className="text-gray-500 text-sm">
            まず人物を登録してください。
            <a href="/persons/new" className="text-indigo-600 hover:underline ml-1">
              人物登録へ
            </a>
          </p>
        ) : (
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <div className="flex flex-wrap gap-2">
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

      {/* Step 2: 相談内容入力 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-2">
          Step 2: 相談内容を入力
        </h2>
        <textarea
          value={consultationContext}
          onChange={(e) => setConsultationContext(e.target.value)}
          placeholder="例: 明日の会議で仕様変更を提案したいが、相手は保守的なタイプ。どう切り出せばいい？"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
        />
      </div>

      {/* Step 3: 相談ボタン */}
      <button
        onClick={handleConsult}
        disabled={
          !selectedPersonId ||
          !consultationContext.trim() ||
          loading ||
          waitingAd
        }
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {waitingAd
          ? "準備中...（3秒お待ちください）"
          : loading
            ? "アクションプラン生成中..."
            : "無料で相談する"}
      </button>

      {/* 待機中のプログレスバー */}
      {waitingAd && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-3000 ease-linear"
            style={{
              width: "100%",
              animation: "progress 3s linear forwards",
            }}
          />
          <style jsx>{`
            @keyframes progress {
              from {
                width: 0%;
              }
              to {
                width: 100%;
              }
            }
          `}</style>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              アクションプラン
            </h2>
            {targetInfo && (
              <span className="text-sm text-gray-500">
                対象: {targetInfo.nickname}（{targetInfo.relationship}）
              </span>
            )}
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm font-sans">
              {result}
            </pre>
          </div>

          {/* コスト表示（開発環境のみ） */}
          {costInfo && (
            <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-500 font-mono">
              <p>
                入力: {costInfo.inputTokens} | 出力: {costInfo.outputTokens} |
                キャッシュ読取: {costInfo.cacheReadTokens} | キャッシュ作成:{" "}
                {costInfo.cacheCreationTokens} | 推定コスト: ¥
                {costInfo.estimatedCostJPY.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
