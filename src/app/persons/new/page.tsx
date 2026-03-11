"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RELATIONSHIP_TYPES,
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  BIRTH_ORDER_OPTIONS,
} from "@/lib/types";

export default function NewPersonPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // フォーム状態
  const [nickname, setNickname] = useState("");
  const [relationship, setRelationship] = useState<string>(RELATIONSHIP_TYPES[0]);
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [birthOrder, setBirthOrder] = useState("");
  const [observations, setObservations] = useState<string[]>([""]);

  // 観察メモの追加
  const addObservation = () => {
    setObservations((prev) => [...prev, ""]);
  };

  // 観察メモの更新
  const updateObservation = (index: number, value: string) => {
    setObservations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // 観察メモの削除
  const removeObservation = (index: number) => {
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          relationship,
          birthDate: birthDate || null,
          birthYear: birthYear || null,
          gender: gender || null,
          bloodType: bloodType || null,
          birthCountry: birthCountry || null,
          birthOrder: birthOrder || null,
          observations: observations.filter((o) => o.trim()),
        }),
      });

      if (res.ok) {
        router.push("/persons");
      } else {
        const data = await res.json();
        alert(data.error || "登録に失敗しました");
      }
    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">人物登録</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ニックネーム（必須） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ニックネーム <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            placeholder="例: 田中部長"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 関係性タイプ（必須） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            関係性 <span className="text-red-500">*</span>
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* 生年月日（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生年月日（わかる場合のみ）
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 生まれた年（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生まれた年（生年月日が不明な場合）
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="例: 1985"
            min="1900"
            max="2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 性別（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            性別
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">未選択</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* 血液型（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            血液型
          </label>
          <select
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">未選択</option>
            {BLOOD_TYPE_OPTIONS.map((bt) => (
              <option key={bt} value={bt}>
                {bt}型
              </option>
            ))}
          </select>
        </div>

        {/* 出身国（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            出身国
          </label>
          <input
            type="text"
            value={birthCountry}
            onChange={(e) => setBirthCountry(e.target.value)}
            placeholder="例: 日本"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 出生順位（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            出生順位
          </label>
          <select
            value={birthOrder}
            onChange={(e) => setBirthOrder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">未選択</option>
            {BIRTH_ORDER_OPTIONS.map((bo) => (
              <option key={bo} value={bo}>
                {bo}
              </option>
            ))}
          </select>
        </div>

        {/* 観察メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            観察メモ
          </label>
          <div className="space-y-2">
            {observations.map((obs, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={obs}
                  onChange={(e) => updateObservation(index, e.target.value)}
                  placeholder="例: 細かいことで怒る、他責傾向が強い"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {observations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObservation(index)}
                    className="px-3 py-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addObservation}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            + メモを追加
          </button>
        </div>

        {/* 送信ボタン */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !nickname.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/persons")}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
