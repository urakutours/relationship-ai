"use client";

import { useState, useEffect, useCallback } from "react";
import type { DivinationResult } from "@/lib/types";

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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // フォーム状態
  const [nickname, setNickname] = useState("自分");
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthOrder, setBirthOrder] = useState("");
  const [birthCountry, setBirthCountry] = useState("JP");
  const [mbti, setMbti] = useState("");
  const [memoTags, setMemoTags] = useState<string[]>([""]);

  // 占術プレビュー
  const [divPreview, setDivPreview] = useState<DivinationResult | null>(null);

  // プロフィール読み込み
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setNickname(data.nickname || "自分");
          setBirthDate(data.birthDate || "");
          setBirthYear(data.birthYear ? String(data.birthYear) : "");
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
  const updateDivPreview = useCallback(async () => {
    if (!birthDate && !birthYear) {
      setDivPreview(null);
      return;
    }
    try {
      // クライアント側でAPIを叩いてプレビュー生成
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
          birthDate: birthDate || null,
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
      <div className="flex justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        自分のプロフィール
      </h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ニックネーム */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ニックネーム <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            placeholder="自分"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 生年月日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生年月日（任意）
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 生まれた年 */}
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

        {/* 性別 */}
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
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* 血液型 */}
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

        {/* 出生順位 */}
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
              <option key={bo.value} value={bo.value}>
                {bo.label}
              </option>
            ))}
          </select>
        </div>

        {/* 出身国 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            出身国
          </label>
          <input
            type="text"
            value={birthCountry}
            onChange={(e) => setBirthCountry(e.target.value)}
            placeholder="JP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* MBTI */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            MBTI（任意）
          </label>
          <input
            type="text"
            value={mbti}
            onChange={(e) => setMbti(e.target.value)}
            placeholder="例: INTJ"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
          />
        </div>

        {/* 自分の特性メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            自分の特性メモ
          </label>
          <div className="space-y-2">
            {memoTags.map((tag, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => updateMemoTag(index, e.target.value)}
                  placeholder="例: せっかちな方、感情で動くことが多い"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {memoTags.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMemoTag(index)}
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
            onClick={addMemoTag}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            + メモを追加
          </button>
        </div>

        {/* 占術計算結果プレビュー */}
        {divPreview && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              占術計算結果プレビュー
            </h3>
            <div className="flex flex-wrap gap-2">
              {divPreview.solarSign && (
                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                  {divPreview.solarSign}
                </span>
              )}
              {divPreview.numerology && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                  誕生数{divPreview.numerology}
                </span>
              )}
              {divPreview.kyusei && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                  {divPreview.kyusei}
                </span>
              )}
              {divPreview.dayPillar && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                  日柱: {divPreview.dayPillar}
                </span>
              )}
              {divPreview.wuxingProfile && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  五行: 木{divPreview.wuxingProfile.wood} 火
                  {divPreview.wuxingProfile.fire} 土
                  {divPreview.wuxingProfile.earth} 金
                  {divPreview.wuxingProfile.metal} 水
                  {divPreview.wuxingProfile.water}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !nickname.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          {saved && (
            <span className="text-green-600 text-sm">保存しました</span>
          )}
        </div>
      </form>
    </div>
  );
}
