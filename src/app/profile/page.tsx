"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { CostInfo } from "@/lib/types";
import { BirthDateSelect } from "@/components/birth-date-select";

// 性別の選択肢（内部値→表示ラベル）
const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;

const BLOOD_TYPE_OPTIONS = ["A", "B", "O", "AB"] as const;

const BIRTH_ORDER_OPTIONS = [
  { value: "first", label: "長子" },
  { value: "middle", label: "中間" },
  { value: "last", label: "末子" },
  { value: "only", label: "一人っ子" },
] as const;

function parseBirthDate(dateStr: string | null): { year: string; month: string; day: string } {
  if (!dateStr) return { year: "", month: "", day: "" };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return { year: "", month: "", day: "" };
  return { year: String(parseInt(parts[0])), month: String(parseInt(parts[1])), day: String(parseInt(parts[2])) };
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

  // 分析ノート
  const [quickNote, setQuickNote] = useState<string | null>(null);
  const [deepNote, setDeepNote] = useState<string | null>(null);
  const [quickNoteUpdatedAt, setQuickNoteUpdatedAt] = useState<string | null>(null);
  const [deepNoteUpdatedAt, setDeepNoteUpdatedAt] = useState<string | null>(null);
  const [quickAnalyzing, setQuickAnalyzing] = useState(false);
  const [deepAnalyzing, setDeepAnalyzing] = useState(false);
  const [analysisCostInfo, setAnalysisCostInfo] = useState<CostInfo | null>(null);
  const [deepTruncated, setDeepTruncated] = useState(false);
  const [deepTruncatedContext, setDeepTruncatedContext] = useState<string | null>(null);
  const [continuingDeep, setContinuingDeep] = useState(false);

  // ポーリング用
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const buildBirthDate = (): string | null => {
    if (!birthYear || !birthMonth || !birthDay) return null;
    return `${birthYear.padStart(4, "0")}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
  };

  // プロフィール読み込み
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setNickname(data.nickname || "自分");
          const parsed = parseBirthDate(data.birthDate || null);
          if (parsed.year) { setBirthYear(parsed.year); setBirthMonth(parsed.month); setBirthDay(parsed.day); }
          else if (data.birthYear) { setBirthYear(String(data.birthYear)); }
          setGender(data.gender || "");
          setBloodType(data.bloodType || "");
          setBirthOrder(data.birthOrder || "");
          setBirthCountry(data.birthCountry || "JP");
          setMbti(data.mbti || "");
          try { const tags = JSON.parse(data.memoTags || "[]"); setMemoTags(tags.length > 0 ? tags : [""]); } catch { setMemoTags([""]); }
          // 分析ノート
          setQuickNote(data.quickNote || null);
          setDeepNote(data.deepNote || null);
          setQuickNoteUpdatedAt(data.quickNoteUpdatedAt || null);
          setDeepNoteUpdatedAt(data.deepNoteUpdatedAt || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // メモタグ操作
  const addMemoTag = () => setMemoTags((prev) => [...prev, ""]);
  const updateMemoTag = (index: number, value: string) => { setMemoTags((prev) => { const next = [...prev]; next[index] = value; return next; }); };
  const removeMemoTag = (index: number) => { setMemoTags((prev) => prev.filter((_, i) => i !== index)); };

  // ポーリング（保存後の自動分析待ち）
  const startPolling = () => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 7) { stopPolling(); return; }
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.quickNote && data.quickNote !== quickNote) {
          setQuickNote(data.quickNote);
          setQuickNoteUpdatedAt(data.quickNoteUpdatedAt);
          stopPolling();
        }
      } catch {}
    }, 2000);
  };
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

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
        // 保存後にポーリング開始（自動分析待ち）
        startPolling();
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

  // クイック分析
  const runQuickAnalysis = async () => {
    setQuickAnalyzing(true);
    setAnalysisCostInfo(null);
    try {
      const res = await fetch("/api/profile/analyze", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQuickNote(data.quickNote);
        setQuickNoteUpdatedAt(data.quickNoteUpdatedAt);
        if (data.costInfo) setAnalysisCostInfo(data.costInfo);
      }
    } catch (err) { console.error("プロフィール分析エラー:", err); }
    finally { setQuickAnalyzing(false); }
  };

  // 深掘り分析
  const runDeepAnalysis = async () => {
    setDeepAnalyzing(true);
    setAnalysisCostInfo(null);
    setDeepTruncated(false);
    setDeepTruncatedContext(null);
    try {
      const res = await fetch("/api/profile/analyze-deep", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDeepNote(data.deepNote);
        setDeepNoteUpdatedAt(data.deepNoteUpdatedAt);
        if (data.costInfo) setAnalysisCostInfo(data.costInfo);
        if (data.isTruncated) {
          setDeepTruncated(true);
          setDeepTruncatedContext(data.truncatedContext);
        }
      }
    } catch (err) { console.error("プロフィール深掘り分析エラー:", err); }
    finally { setDeepAnalyzing(false); }
  };

  // 続きを読む（プロフィール版）
  const continueDeepAnalysis = async () => {
    if (!deepTruncatedContext) return;
    setContinuingDeep(true);
    try {
      const res = await fetch("/api/profile/analyze-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truncatedContent: deepTruncatedContext }),
      });
      const data = await res.json();
      if (res.ok) {
        const newNote = `${deepNote || ""}\n\n${data.continuation}`;
        setDeepNote(newNote.trim());
        if (data.isTruncated) {
          setDeepTruncatedContext(data.truncatedContext);
        } else {
          setDeepTruncated(false);
          setDeepTruncatedContext(null);
        }
        if (data.costInfo) setAnalysisCostInfo(data.costInfo);
      }
    } catch (err) { console.error("続き生成エラー:", err); }
    finally { setContinuingDeep(false); }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch { return null; }
  };

  if (loading) {
    return (<div className="flex justify-center py-16"><p className="text-text-muted text-sm">読み込み中...</p></div>);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-10">
        {/* 左: フォーム */}
        <div className="flex-1 max-w-xl">
          <h1 className="font-display text-[32px] font-light text-gold tracking-wide mb-8">プロフィール</h1>

          <form onSubmit={handleSave} className="space-y-0">
            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">ニックネーム <span className="text-gold">*</span></label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required placeholder="自分" className="input-underline" />
            </div>

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">生年月日 <span className="text-text-muted">(任意)</span></label>
              <BirthDateSelect birthYear={birthYear} birthMonth={birthMonth} birthDay={birthDay} onYearChange={setBirthYear} onMonthChange={setBirthMonth} onDayChange={setBirthDay} />
            </div>

            <div className="h-4" />

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">性別 <span className="text-text-muted">(任意)</span></label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-underline">
                <option value="">未選択</option>
                {GENDER_OPTIONS.map((g) => (<option key={g.value} value={g.value}>{g.label}</option>))}
              </select>
            </div>

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">血液型 <span className="text-text-muted">(任意)</span></label>
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="input-underline">
                <option value="">未選択</option>
                {BLOOD_TYPE_OPTIONS.map((bt) => (<option key={bt} value={bt}>{bt}型</option>))}
              </select>
            </div>

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">出生順位 <span className="text-text-muted">(任意)</span></label>
              <select value={birthOrder} onChange={(e) => setBirthOrder(e.target.value)} className="input-underline">
                <option value="">未選択</option>
                {BIRTH_ORDER_OPTIONS.map((bo) => (<option key={bo.value} value={bo.value}>{bo.label}</option>))}
              </select>
            </div>

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">出身国 <span className="text-text-muted">(任意)</span></label>
              <input type="text" value={birthCountry} onChange={(e) => setBirthCountry(e.target.value)} placeholder="JP" className="input-underline" />
            </div>

            <div className="h-4" />

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">MBTI <span className="text-text-muted">(任意)</span></label>
              <input type="text" value={mbti} onChange={(e) => setMbti(e.target.value)} placeholder="例: INTJ" maxLength={4} className="input-underline uppercase" />
            </div>

            <div className="py-4">
              <label className="block text-xs text-text-secondary mb-3 tracking-wide">自分の特性メモ</label>
              <div className="space-y-3">
                {memoTags.map((tag, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input type="text" value={tag} onChange={(e) => updateMemoTag(index, e.target.value)} placeholder="例: せっかちな方、感情で動くことが多い" className="input-underline" />
                    {memoTags.length > 1 && (
                      <button type="button" onClick={() => removeMemoTag(index)} className="text-text-muted hover:text-danger transition-colors text-xs shrink-0">&#x2715;</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addMemoTag} className="mt-3 text-xs text-jade hover:text-gold transition-colors">+ メモを追加</button>
            </div>

            <div className="flex items-center gap-4 pt-8">
              <button type="submit" disabled={saving || !nickname.trim()} className="btn-ghost">{saving ? "保存中..." : "保存する"}</button>
              {saved && <span className="text-jade text-xs">保存しました</span>}
            </div>
          </form>
        </div>

      </div>

      {/* ===== 自分の特性分析セクション ===== */}
      <div className="space-y-6">
        <h2 className="font-display text-[24px] font-light text-gold tracking-wide">自己分析</h2>

        {/* クイック分析 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-gold tracking-wide">簡易分析</h3>
            <div className="flex items-center gap-3">
              {quickNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(quickNoteUpdatedAt)}</span>}
              <button onClick={runQuickAnalysis} disabled={quickAnalyzing} className="text-[12px] text-text-secondary hover:text-gold transition-colors disabled:opacity-40">
                {quickAnalyzing ? "まとめています..." : "更新する"}
              </button>
            </div>
          </div>

          {quickAnalyzing ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">まとめています...</span>
            </div>
          ) : quickNote ? (
            <div className="markdown-body text-sm"><ReactMarkdown>{quickNote}</ReactMarkdown></div>
          ) : (
            <div className="text-center py-6">
              <p className="text-text-muted text-sm mb-3">まだ分析が実行されていません</p>
              <button onClick={runQuickAnalysis} className="btn-ghost text-sm">概要をまとめる</button>
            </div>
          )}
        </div>

        {/* 深掘り分析 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-jade tracking-wide">詳細分析</h3>
            {deepNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(deepNoteUpdatedAt)}</span>}
          </div>

          {deepAnalyzing ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <div className="w-5 h-5 border-2 border-jade border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">詳しく分析しています... 少々お待ちください</span>
            </div>
          ) : deepNote ? (
            <>
              <div className="markdown-body text-sm"><ReactMarkdown>{deepNote}</ReactMarkdown></div>
              {deepTruncated && (
                <div className="mt-3">
                  <button
                    onClick={continueDeepAnalysis}
                    disabled={continuingDeep}
                    className="text-[12px] text-jade hover:text-gold transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {continuingDeep ? (
                      <>
                        <span className="w-3 h-3 border border-jade border-t-transparent rounded-full animate-spin" />
                        続きを生成中...
                      </>
                    ) : (
                      "続きを読む →"
                    )}
                  </button>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <button onClick={runDeepAnalysis} className="text-[12px] text-text-secondary hover:text-jade transition-colors">更新する</button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-text-muted text-sm mb-1">より詳しい自己分析を実行できます</p>
              <p className="text-text-muted text-[11px] mb-4">少し時間がかかります</p>
              <button onClick={runDeepAnalysis} disabled={deepAnalyzing}
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-jade-dim text-jade bg-transparent rounded-[4px] text-sm hover:bg-jade hover:text-base transition-all duration-300 disabled:opacity-40">
                <span className="text-lg leading-none">🔍</span>
                詳しく分析する
              </button>
            </div>
          )}
        </div>

        {/* コスト情報 */}
        {analysisCostInfo && (
          <div className="text-[11px] text-text-muted bg-surface-hover rounded px-3 py-2 font-mono">
            入力: {analysisCostInfo.inputTokens} | 出力: {analysisCostInfo.outputTokens} | キャッシュ読: {analysisCostInfo.cacheReadTokens} | キャッシュ作成: {analysisCostInfo.cacheCreationTokens} | 推定コスト: ¥{analysisCostInfo.estimatedCostJPY.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}
