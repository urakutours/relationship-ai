"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  BIRTH_ORDER_OPTIONS,
  CONTACT_FREQUENCY_OPTIONS,
  MBTI_TYPES,
  MARITAL_STATUS_OPTIONS,
  HAS_CHILDREN_OPTIONS,
} from "@/lib/types";
import { RELATIONSHIP_CATEGORIES } from "@/lib/relationship-types";
import { BirthDateSelect } from "@/components/birth-date-select";
import { CountrySelect } from "@/components/country-select";

export default function NewPersonPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // フォーム状態
  const [nickname, setNickname] = useState("");
  const [relCategory, setRelCategory] = useState("");
  const [relSubtype, setRelSubtype] = useState("");
  const [relDetail, setRelDetail] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [birthOrder, setBirthOrder] = useState("");
  const [honorific, setHonorific] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [acquaintanceYear, setAcquaintanceYear] = useState("");
  const [acquaintanceMonth, setAcquaintanceMonth] = useState("");
  const [acquaintanceDay, setAcquaintanceDay] = useState("");
  const [intimacyScore, setIntimacyScore] = useState(5);
  const [contactFrequency, setContactFrequency] = useState("");
  const [mbti, setMbti] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState("");
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

  // 年月日からbirthDate文字列（YYYY-MM-DD）を生成
  const buildBirthDate = (): string | null => {
    if (!birthYear || !birthMonth || !birthDay) return null;
    const y = birthYear.padStart(4, "0");
    const m = birthMonth.padStart(2, "0");
    const d = birthDay.padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 知り合った日（年だけ、年月、年月日に対応）
  const buildAcquaintanceDate = (): string | null => {
    if (!acquaintanceYear) return null;
    const y = acquaintanceYear.padStart(4, "0");
    if (!acquaintanceMonth) return y;
    const m = acquaintanceMonth.padStart(2, "0");
    if (!acquaintanceDay) return `${y}-${m}`;
    const d = acquaintanceDay.padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !relCategory || !relSubtype) return;

    setSubmitting(true);
    try {
      const birthDate = buildBirthDate();
      // サブタイプのラベルを旧relationshipフィールドにも設定（互換用）
      const selectedCat = RELATIONSHIP_CATEGORIES.find(c => c.value === relCategory);
      const selectedSub = selectedCat?.subtypes.find(s => s.value === relSubtype);
      const legacyRelationship = selectedSub?.label || "その他";

      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          relationship: legacyRelationship,
          relationshipCategory: relCategory || null,
          relationshipSubtype: relSubtype || null,
          relationshipDetail: relDetail.trim() || null,
          birthDate: birthDate || null,
          birthYear: birthYear || null,
          gender: gender || null,
          bloodType: bloodType || null,
          birthCountry: birthCountry || null,
          birthOrder: birthOrder || null,
          honorific: honorific.trim() || null,
          personalContext: personalContext.trim() || null,
          acquaintanceDate: buildAcquaintanceDate(),
          intimacyScore: intimacyScore,
          contactFrequency: contactFrequency || null,
          mbti: mbti || null,
          maritalStatus: maritalStatus || null,
          hasChildren: hasChildren || null,
          observations: observations.filter((o) => o.trim()),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        router.push(`/persons/${created.id}`);
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
        人物を登録
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

        {/* 関係性カテゴリ（必須） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            関係性 <span className="text-gold">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RELATIONSHIP_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => { setRelCategory(cat.value); setRelSubtype(""); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-200 ${
                  relCategory === cat.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-subtle text-text-secondary hover:border-text-muted"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* サブタイプ選択 */}
        {relCategory && (
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-3 tracking-wide">
              具体的な関係 <span className="text-gold">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RELATIONSHIP_CATEGORIES
                .find(c => c.value === relCategory)
                ?.subtypes.map((sub) => (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => setRelSubtype(sub.value)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                      relSubtype === sub.value
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border-subtle text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* 補足（任意） */}
        {relSubtype && (
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-2 tracking-wide">
              補足 <span className="text-text-muted">(任意)</span>
            </label>
            <input
              type="text"
              value={relDetail}
              onChange={(e) => setRelDetail(e.target.value)}
              placeholder="例：母方の叔父、妻の職場の上司など"
              className="input-underline"
            />
          </div>
        )}

        <div className="h-4" />

        {/* 生年月日（任意）- 年/月/日 3分割 */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            生年月日 <span className="text-text-muted">(任意)</span>
          </label>
          <BirthDateSelect
            birthYear={birthYear}
            birthMonth={birthMonth}
            birthDay={birthDay}
            onYearChange={setBirthYear}
            onMonthChange={setBirthMonth}
            onDayChange={setBirthDay}
          />
        </div>

        <div className="h-4" />

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

        {/* 敬称（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            敬称 <span className="text-text-muted">(任意・空欄で「さん」)</span>
          </label>
          <input
            type="text"
            value={honorific}
            onChange={(e) => setHonorific(e.target.value)}
            placeholder="さん・ちゃん・くん・様・先生など"
            className="input-underline"
          />
        </div>

        {/* 出身国（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            出身国 <span className="text-text-muted">(任意)</span>
          </label>
          <CountrySelect value={birthCountry} onChange={setBirthCountry} />
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

        <div className="h-4" />

        {/* 知り合った時期（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            知り合った時期 <span className="text-text-muted">(任意・年だけでもOK)</span>
          </label>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <select value={acquaintanceYear} onChange={(e) => setAcquaintanceYear(e.target.value)} className="input-underline">
                <option value="">年</option>
                {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={String(y)}>{y}年</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <select value={acquaintanceMonth} onChange={(e) => setAcquaintanceMonth(e.target.value)} className="input-underline">
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>{m}月</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <select value={acquaintanceDay} onChange={(e) => setAcquaintanceDay(e.target.value)} className="input-underline">
                <option value="">日</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}日</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 親密度（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            親密度
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted shrink-0">他人</span>
            <input
              type="range"
              min={0}
              max={10}
              value={intimacyScore}
              onChange={(e) => setIntimacyScore(parseInt(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="text-[10px] text-text-muted shrink-0">親密</span>
            <span className="text-sm text-gold font-medium w-6 text-center">{intimacyScore}</span>
          </div>
        </div>

        {/* 接触頻度（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            接触頻度 <span className="text-text-muted">(任意)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTACT_FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContactFrequency(contactFrequency === opt.value ? "" : opt.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all duration-200 ${
                  contactFrequency === opt.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-subtle text-text-secondary hover:border-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* MBTI（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            MBTI <span className="text-text-muted">(任意)</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {MBTI_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMbti(mbti === type ? "" : type)}
                className={`px-2 py-1.5 rounded border text-xs font-mono transition-all duration-200 ${
                  mbti === type
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-subtle text-text-secondary hover:border-text-muted"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMbti(mbti === "unknown" ? "" : "unknown")}
            className={`mt-2 px-3 py-1.5 rounded border text-xs transition-all duration-200 ${
              mbti === "unknown"
                ? "border-gold bg-gold/10 text-gold"
                : "border-border-subtle text-text-secondary hover:border-text-muted"
            }`}
          >
            わからない
          </button>
        </div>

        {/* 婚姻状況（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            婚姻状況 <span className="text-text-muted">(任意)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMaritalStatus(maritalStatus === opt.value ? "" : opt.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all duration-200 ${
                  maritalStatus === opt.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-subtle text-text-secondary hover:border-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 子供の有無（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-3 tracking-wide">
            子供の有無 <span className="text-text-muted">(任意)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {HAS_CHILDREN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHasChildren(hasChildren === opt.value ? "" : opt.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all duration-200 ${
                  hasChildren === opt.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border-subtle text-text-secondary hover:border-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4" />

        {/* 生活背景・家族構成（任意） */}
        <div className="py-4">
          <label className="block text-xs text-text-secondary mb-2 tracking-wide">
            生活背景・家族構成 <span className="text-text-muted">(任意)</span>
          </label>
          <textarea
            value={personalContext}
            onChange={(e) => setPersonalContext(e.target.value)}
            rows={3}
            className="input-underline resize-none"
          />
          <div className="mt-2 space-y-0.5 text-[11px] text-text-muted">
            <p>例：既婚、子供2人。単身赴任中。</p>
            <p>例：パートナーあり、同棲中。仕事最優先の価値観。</p>
            <p>例：独身、親と同居。週末は趣味に集中したい。</p>
          </div>
        </div>

        <div className="h-4" />

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
            disabled={submitting || !nickname.trim() || !relCategory || !relSubtype}
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
