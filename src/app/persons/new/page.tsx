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
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-[32px] font-light text-gold tracking-wide mb-8">
        Register
      </h1>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* ニックネーム（必須） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            ニックネーム <span className="text-gold">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            placeholder="例: 田中部長"
            className="input-underline"
          />
        </div>

        {/* 関係性タイプ（必須） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            関係性 <span className="text-gold">*</span>
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="input-underline"
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <hr className="divider" />

        {/* 生年月日（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            生年月日 <span className="text-text-muted">(任意)</span>
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="input-underline"
          />
        </div>

        {/* 生まれた年（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            生まれた年 <span className="text-text-muted">(任意)</span>
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="例: 1985"
            min="1900"
            max="2025"
            className="input-underline"
          />
        </div>

        <hr className="divider" />

        {/* 性別（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            性別 <span className="text-text-muted">(任意)</span>
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="input-underline"
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
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            血液型 <span className="text-text-muted">(任意)</span>
          </label>
          <select
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            className="input-underline"
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
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            出身国 <span className="text-text-muted">(任意)</span>
          </label>
          <input
            type="text"
            value={birthCountry}
            onChange={(e) => setBirthCountry(e.target.value)}
            placeholder="例: 日本"
            className="input-underline"
          />
        </div>

        {/* 出生順位（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            出生順位 <span className="text-text-muted">(任意)</span>
          </label>
          <select
            value={birthOrder}
            onChange={(e) => setBirthOrder(e.target.value)}
            className="input-underline"
          >
            <option value="">未選択</option>
            {BIRTH_ORDER_OPTIONS.map((bo) => (
              <option key={bo} value={bo}>
                {bo}
              </option>
            ))}
          </select>
        </div>

        <hr className="divider" />

        {/* 観察メモ */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            観察メモ
          </label>
          <div className="space-y-3">
            {observations.map((obs, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={obs}
                  onChange={(e) => updateObservation(index, e.target.value)}
                  placeholder="例: 細かいことで怒る、他責傾向が強い"
                  className="input-underline"
                />
                {observations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObservation(index)}
                    className="text-text-muted hover:text-danger transition-colors text-xs shrink-0"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addObservation}
            className="mt-3 text-xs text-jade hover:text-gold transition-colors"
          >
            + メモを追加
          </button>
        </div>

        {/* 送信ボタン */}
        <div className="flex gap-4 pt-8">
          <button
            type="submit"
            disabled={submitting || !nickname.trim()}
            className="btn-ghost"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/persons")}
            className="px-6 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
