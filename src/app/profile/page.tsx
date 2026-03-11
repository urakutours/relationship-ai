"use client";

import { useState, useEffect, useCallback } from "react";
import type { DivinationResult } from "@/lib/types";
import { BirthDateSelect } from "@/components/birth-date-select";

// 性別の選択肢（内部値→表示ラベル）
const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;

// 血液型
const BLOOD_TYPE_OPTIONS = ["A", "B", "O", "AB"] as const;

// 出生順位
const BIRTH_ORDER_OPTIONS = [
  { value: "first", label: "長子" },
  { value: "middle", label: "中間" },
  { value: "last", label: "末子" },
  { value: "only", label: "一人っ子" },
] as const;

// birthDate (YYYY-MM-DD) を年・月・日に分解
function parseBirthDate(dateStr: string | null): { year: string; month: string; day: string } {
  if (!dateStr) return { year: "", month: "", day: "" };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return { year: "", month: "", day: "" };
  return {
    year: String(parseInt(parts[0])),
    month: String(parseInt(parts[1])),
    day: String(parseInt(parts[2])),
  };
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // フォーム状態
  const [nickname, setNickname] = useState("自分");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthOrder, setBirthOrder] = useState("");
  const [birthCountry, setBirthCountry] = useState("JP");
  const [mbti, setMbti] = useState("");
  const [memoTags, setMemoTags] = useState<string[]>([""]);

  // 占術プレビュー
  const [divPreview, setDivPreview] = useState<DivinationResult | null>(null);

  // 年月日からbirthDate文字列を生成
  const buildBirthDate = (): string | null => {
    if (!birthYear || !birthMonth || !birthDay) return null;
    const y = birthYear.padStart(4, "0");
    const m = birthMonth.padStart(2, "0");
    const d = birthDay.padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // プロフィール読み込み
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setNickname(data.nickname || "自分");
          // birthDateを年月日に分解
          const parsed = parseBirthDate(data.birthDate || null);
          if (parsed.year) {
            setBirthYear(parsed.year);
            setBirthMonth(parsed.month);
            setBirthDay(parsed.day);
          } else if (data.birthYear) {
            setBirthYear(String(data.birthYear));
          }
          setGender(data.gender || "");
          setBloodType(data.bloodType || "");
          setBirthOrder(data.birthOrder || "");
          setBirthCountry(data.birthCountry || "JP");
          setMbti(data.mbti || "");
          try {
            const tags = JSON.parse(data.memoTags || "[]");
            setMemoTags(tags.length > 0 ? tags : [""]);
          } catch {
            setMemoTags([""]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 占術プレビューの更新
  const birthDate = buildBirthDate();
  const updateDivPreview = useCallback(async () => {
    if (!birthDate && !birthYear) {
      setDivPreview(null);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (birthDate) params.set("birthDate", birthDate);
      if (birthYear) params.set("birthYear", birthYear);
      const res = await fetch(`/api/profile/divination?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDivPreview(data.divination);
      }
    } catch {
      // プレビュー失敗は無視
    }
  }, [birthDate, birthYear]);

  useEffect(() => {
    updateDivPreview();
  }, [updateDivPreview]);

  // メモタグ操作
  const addMemoTag = () => setMemoTags((prev) => [...prev, ""]);
  const updateMemoTag = (index: number, value: string) => {
    setMemoTags((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeMemoTag = (index: number) => {
    setMemoTags((prev) => prev.filter((_, i) => i !== index));
  };

  // 保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          birthDate: buildBirthDate() || null,
          birthYear: birthYear || null,
          gender: gender || null,
          bloodType: bloodType || null,
          birthOrder: birthOrder || null,
          birthCountry: birthCountry || null,
          mbti: mbti || null,
          memoTags: memoTags.filter((t) => t.trim()),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "保存に失敗しました");
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-text-muted text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-10">
      {/* 左: フォーム */}
      <div className="flex-1 max-w-xl">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide mb-8">
          Profile
        </h1>

        <form onSubmit={handleSave} className="space-y-0">
          {/* ニックネーム */}
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-2 tracking-wide">
              ニックネーム <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder="自分"
              className="input-underline"
            />
          </div>

          {/* 生年月日 - 年/月/日 3分割 */}
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

          <hr className="divider" />

          {/* 性別 */}
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
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 血液型 */}
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

          {/* 出生順位 */}
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
                <option key={bo.value} value={bo.value}>
                  {bo.label}
                </option>
              ))}
            </select>
          </div>

          {/* 出身国 */}
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-2 tracking-wide">
              出身国 <span className="text-text-muted">(任意)</span>
            </label>
            <input
              type="text"
              value={birthCountry}
              onChange={(e) => setBirthCountry(e.target.value)}
              placeholder="JP"
              className="input-underline"
            />
          </div>

          <hr className="divider" />

          {/* MBTI */}
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-2 tracking-wide">
              MBTI <span className="text-text-muted">(任意)</span>
            </label>
            <input
              type="text"
              value={mbti}
              onChange={(e) => setMbti(e.target.value)}
              placeholder="例: INTJ"
              maxLength={4}
              className="input-underline uppercase"
            />
          </div>

          {/* 自分の特性メモ */}
          <div className="py-4">
            <label className="block text-xs text-text-secondary mb-3 tracking-wide">
              自分の特性メモ
            </label>
            <div className="space-y-3">
              {memoTags.map((tag, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateMemoTag(index, e.target.value)}
                    placeholder="例: せっかちな方、感情で動くことが多い"
                    className="input-underline"
                  />
                  {memoTags.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMemoTag(index)}
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
              onClick={addMemoTag}
              className="mt-3 text-xs text-jade hover:text-gold transition-colors"
            >
              + メモを追加
            </button>
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center gap-4 pt-8">
            <button
              type="submit"
              disabled={saving || !nickname.trim()}
              className="btn-ghost"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            {saved && (
              <span className="text-jade text-xs">保存しました</span>
            )}
          </div>
        </form>
      </div>

      {/* 右: 占術プレビュー */}
      {divPreview && (
        <div className="w-full md:w-64 md:shrink-0 md:pt-[72px]">
          <div className="card md:sticky md:top-10">
            <h3 className="text-xs text-text-muted uppercase font-display tracking-widest mb-4">
              Divination Preview
            </h3>
            <div className="space-y-3">
              {divPreview.solarSign && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted text-xs">星座</span>
                  <span className="text-gold">{divPreview.solarSign}</span>
                </div>
              )}
              {divPreview.numerology && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted text-xs">誕生数</span>
                  <span className="text-gold">{divPreview.numerology}</span>
                </div>
              )}
              {divPreview.kyusei && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted text-xs">九星</span>
                  <span className="text-jade">{divPreview.kyusei}</span>
                </div>
              )}
              {divPreview.dayPillar && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted text-xs">日柱</span>
                  <span className="text-jade">{divPreview.dayPillar}</span>
                </div>
              )}
              {divPreview.wuxingProfile && (
                <div className="pt-2 border-t border-border-subtle">
                  <span className="text-text-muted text-[10px] uppercase font-display tracking-widest">
                    Wuxing
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { label: "木", value: divPreview.wuxingProfile.wood },
                      { label: "火", value: divPreview.wuxingProfile.fire },
                      { label: "土", value: divPreview.wuxingProfile.earth },
                      { label: "金", value: divPreview.wuxingProfile.metal },
                      { label: "水", value: divPreview.wuxingProfile.water },
                    ].map((el) => (
                      <div key={el.label} className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary w-4">{el.label}</span>
                        <div className="flex-1 h-1 bg-base rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (el.value / 8) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted w-4 text-right">{el.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
