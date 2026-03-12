"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { PersonData, CostInfo, ObservationData, ConsultationLogData, CompressedMemory, ObservationCategory } from "@/lib/types";
import {
  RELATIONSHIP_TYPES,
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  BIRTH_ORDER_OPTIONS,
  OBSERVATION_CATEGORIES,
} from "@/lib/types";
import { BirthDateSelect } from "@/components/birth-date-select";

/** 相性スコアの色を返す */
function getScoreColor(score: number): string {
  if (score >= 70) return "#7ec8c0";
  if (score >= 41) return "#d4a843";
  return "#c45c5c";
}

/** birthDate文字列からパーツを抽出 */
function parseBirthDate(dateStr: string | null): { year: string; month: string; day: string } {
  if (!dateStr) return { year: "", month: "", day: "" };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return { year: "", month: "", day: "" };
  return { year: String(parseInt(parts[0])), month: String(parseInt(parts[1])), day: String(parseInt(parts[2])) };
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

/** カテゴリ情報を取得 */
function getCategoryInfo(cat: string | null) {
  return OBSERVATION_CATEGORIES.find(c => c.value === cat) || OBSERVATION_CATEGORIES[OBSERVATION_CATEGORIES.length - 1];
}

/** 相対時間表示 */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHr < 24) return `${diffHr}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  const dt = new Date(dateStr);
  return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [person, setPerson] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);

  // タブ
  const [activeTab, setActiveTab] = useState<"notes" | "history">("notes");

  // ノート関連
  const [quickAnalyzing, setQuickAnalyzing] = useState(false);
  const [deepAnalyzing, setDeepAnalyzing] = useState(false);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [deepTruncated, setDeepTruncated] = useState(false);
  const [deepTruncatedContext, setDeepTruncatedContext] = useState<string | null>(null);
  const [continuingDeep, setContinuingDeep] = useState(false);

  // ポーリング用
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // ===== 編集モード =====
  const [editMode, setEditMode] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editBirthYear, setEditBirthYear] = useState("");
  const [editBirthMonth, setEditBirthMonth] = useState("");
  const [editBirthDay, setEditBirthDay] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodType, setEditBloodType] = useState("");
  const [editBirthCountry, setEditBirthCountry] = useState("");
  const [editBirthOrder, setEditBirthOrder] = useState("");
  const [editPersonalContext, setEditPersonalContext] = useState("");
  const [editObservations, setEditObservations] = useState<ObservationData[]>([]);
  const [newObservations, setNewObservations] = useState<string[]>([]);
  const [deleteObservationIds, setDeleteObservationIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // 観察メモインライン編集
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditContent, setInlineEditContent] = useState("");
  const [inlineEditCategory, setInlineEditCategory] = useState<ObservationCategory>("other");
  const [inlineEditSaving, setInlineEditSaving] = useState(false);

  // 観察メモ新規追加（非編集モード）
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [addMemoContent, setAddMemoContent] = useState("");
  const [addMemoCategory, setAddMemoCategory] = useState<ObservationCategory>("other");
  const [addMemoSaving, setAddMemoSaving] = useState(false);

  // 相談モーダル
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultContext, setConsultContext] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"standard" | "deep">("standard");
  const [consultSaved, setConsultSaved] = useState(false);
  const [consultCostInfo, setConsultCostInfo] = useState<CostInfo | null>(null);

  // Deep相談カウントダウン
  const [showDeepCountdown, setShowDeepCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 相談履歴タブ
  const [consultLogs, setConsultLogs] = useState<ConsultationLogData[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressMessage, setCompressMessage] = useState<string | null>(null);

  // 結果記録モーダル
  const [outcomeLogId, setOutcomeLogId] = useState<string | null>(null);
  const [outcomeRating, setOutcomeRating] = useState(0);
  const [outcomeText, setOutcomeText] = useState("");
  const [outcomeSaving, setOutcomeSaving] = useState(false);

  // 人物データを取得
  const fetchPerson = useCallback(async () => {
    try {
      const res = await fetch(`/api/persons/${id}`);
      if (res.ok) {
        const data: PersonData = await res.json();
        setPerson(data);
        return data;
      }
    } catch (err) {
      console.error("人物取得エラー:", err);
    }
    return null;
  }, [id]);

  useEffect(() => {
    fetchPerson().then((p) => {
      setLoading(false);
      if (p && !p.quickNote) startPolling();
    });
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = () => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 7) { stopPolling(); return; }
      const p = await fetchPerson();
      if (p?.quickNote) stopPolling();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // 相談履歴取得
  const fetchConsultLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/consultations?personId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setConsultLogs(data.logs);
      }
    } catch (err) {
      console.error("相談履歴取得エラー:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  // タブ切り替え時に履歴を取得
  useEffect(() => {
    if (activeTab === "history") {
      fetchConsultLogs();
    }
  }, [activeTab, fetchConsultLogs]);

  // ===== 編集モード開始 =====
  const enterEditMode = () => {
    if (!person) return;
    const bd = parseBirthDate(person.birthDate);
    setEditNickname(person.nickname);
    setEditRelationship(person.relationship);
    setEditBirthYear(bd.year || (person.birthYear ? String(person.birthYear) : ""));
    setEditBirthMonth(bd.month);
    setEditBirthDay(bd.day);
    setEditGender(person.gender || "");
    setEditBloodType(person.bloodType || "");
    setEditBirthCountry(person.birthCountry || "");
    setEditBirthOrder(person.birthOrder || "");
    setEditPersonalContext(person.personalContext || "");
    setEditObservations([...person.observations]);
    setNewObservations([]);
    setDeleteObservationIds([]);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  // 編集保存
  const saveEdit = async () => {
    if (!person || !editNickname.trim()) return;
    setEditSaving(true);

    // birthDate変更を判定
    const newBirthDate = (editBirthYear && editBirthMonth && editBirthDay)
      ? `${editBirthYear.padStart(4, "0")}-${editBirthMonth.padStart(2, "0")}-${editBirthDay.padStart(2, "0")}`
      : null;
    const birthDateChanged = newBirthDate !== person.birthDate;
    const observationsChanged = deleteObservationIds.length > 0 || newObservations.some(o => o.trim());

    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname.trim(),
          relationship: editRelationship,
          birthDate: newBirthDate,
          birthYear: editBirthYear || null,
          gender: editGender || null,
          bloodType: editBloodType || null,
          birthCountry: editBirthCountry || null,
          birthOrder: editBirthOrder || null,
          personalContext: editPersonalContext.trim() || null,
          observations: {
            add: newObservations.filter(o => o.trim()),
            delete: deleteObservationIds,
          },
          _reanalyze: birthDateChanged || observationsChanged,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPerson(updated);
        setEditMode(false);
        if (birthDateChanged || observationsChanged) {
          startPolling();
        }
      } else {
        const data = await res.json();
        alert(data.error || "更新に失敗しました");
      }
    } catch {
      alert("更新に失敗しました");
    } finally {
      setEditSaving(false);
    }
  };

  // 観察メモ編集用
  const markObservationForDelete = (obsId: string) => {
    setDeleteObservationIds(prev => [...prev, obsId]);
    setEditObservations(prev => prev.filter(o => o.id !== obsId));
  };
  const addNewObservation = () => setNewObservations(prev => [...prev, ""]);
  const updateNewObservation = (index: number, value: string) => {
    setNewObservations(prev => { const next = [...prev]; next[index] = value; return next; });
  };
  const removeNewObservation = (index: number) => {
    setNewObservations(prev => prev.filter((_, i) => i !== index));
  };

  // インライン編集開始
  const startInlineEdit = (obs: ObservationData) => {
    setInlineEditId(obs.id);
    setInlineEditContent(obs.content);
    setInlineEditCategory((obs.category || "other") as ObservationCategory);
  };
  const cancelInlineEdit = () => { setInlineEditId(null); };
  const saveInlineEdit = async () => {
    if (!inlineEditId || !inlineEditContent.trim()) return;
    setInlineEditSaving(true);
    try {
      const res = await fetch(`/api/persons/${id}/memos/${inlineEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inlineEditContent.trim(), category: inlineEditCategory }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPerson(prev => prev ? {
          ...prev,
          observations: prev.observations.map(o => o.id === inlineEditId ? { ...o, content: updated.content, category: updated.category } : o),
        } : prev);
        setInlineEditId(null);
      }
    } catch { alert("更新に失敗しました"); }
    finally { setInlineEditSaving(false); }
  };

  // 非編集モードでの観察メモ追加
  const saveAddMemo = async () => {
    if (!addMemoContent.trim()) return;
    setAddMemoSaving(true);
    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations: {
            add: [{ content: addMemoContent.trim(), category: addMemoCategory }],
            delete: [],
          },
          _reanalyze: true,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPerson(updated);
        setAddMemoContent("");
        setAddMemoCategory("other");
        setShowAddMemo(false);
        startPolling();
      }
    } catch { alert("追加に失敗しました"); }
    finally { setAddMemoSaving(false); }
  };

  // クイック分析
  const runQuickAnalysis = async () => {
    setQuickAnalyzing(true);
    setCostInfo(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) => prev ? { ...prev, quickNote: data.quickNote, compatibilityScore: data.compatibilityScore, quickNoteUpdatedAt: data.quickNoteUpdatedAt } : prev);
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) { console.error("クイック分析エラー:", err); }
    finally { setQuickAnalyzing(false); }
  };

  // 深掘り分析
  const runDeepAnalysis = async () => {
    setDeepAnalyzing(true);
    setCostInfo(null);
    setDeepTruncated(false);
    setDeepTruncatedContext(null);
    try {
      const res = await fetch(`/api/persons/${id}/analyze-deep`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) => prev ? { ...prev, deepNote: data.deepNote, deepNoteUpdatedAt: data.deepNoteUpdatedAt } : prev);
        if (data.costInfo) setCostInfo(data.costInfo);
        if (data.isTruncated) {
          setDeepTruncated(true);
          setDeepTruncatedContext(data.truncatedContext);
        }
      }
    } catch (err) { console.error("深掘り分析エラー:", err); }
    finally { setDeepAnalyzing(false); }
  };

  // 続きを読む
  const continueDeepAnalysis = async () => {
    if (!deepTruncatedContext) return;
    setContinuingDeep(true);
    try {
      const res = await fetch(`/api/persons/${id}/analyze-continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truncatedContent: deepTruncatedContext }),
      });
      const data = await res.json();
      if (res.ok) {
        const newNote = `${person?.deepNote || ""}\n\n${data.continuation}`;
        setPerson((prev) => prev ? { ...prev, deepNote: newNote.trim() } : prev);
        if (data.isTruncated) {
          setDeepTruncatedContext(data.truncatedContext);
        } else {
          setDeepTruncated(false);
          setDeepTruncatedContext(null);
        }
        if (data.costInfo) setCostInfo(data.costInfo);
      }
    } catch (err) { console.error("続き生成エラー:", err); }
    finally { setContinuingDeep(false); }
  };

  // ===== 相談モーダル =====
  const openConsultModal = () => {
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
    if (!consultContext.trim()) return;
    setConsultLoading(true);
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setConsultType("standard");
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: id, consultationContext: consultContext.trim(), consultType: "standard" }),
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

  const runDeepConsult = async () => {
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
        body: JSON.stringify({ personId: id, consultationContext: consultContext.trim(), consultType: "deep" }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsultResult(data.actionPlan);
        setConsultSaved(true);
        if (data.costInfo) setConsultCostInfo(data.costInfo);
      } else {
        setConsultResult(data.error || "詳細相談処理に失敗しました");
      }
    } catch {
      setConsultResult("ネットワークエラーが発生しました");
    } finally {
      setConsultLoading(false);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeepCountdown, countdown]);

  // ===== 圧縮記憶 =====
  const compressMemory = async () => {
    setCompressing(true);
    setCompressMessage(null);
    try {
      const res = await fetch(`/api/persons/${id}/compress-memory`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCompressMessage("記憶を整理しました");
        // person のcompressedMemory を更新
        setPerson((prev) => prev ? {
          ...prev,
          compressedMemory: JSON.stringify(data.memory),
          memoryUpdatedAt: new Date().toISOString(),
        } : prev);
        setTimeout(() => setCompressMessage(null), 3000);
      } else {
        setCompressMessage(data.error || "整理に失敗しました");
      }
    } catch {
      setCompressMessage("エラーが発生しました");
    } finally {
      setCompressing(false);
    }
  };

  // ===== 結果記録 =====
  const openOutcomeModal = (logId: string) => {
    setOutcomeLogId(logId);
    setOutcomeRating(0);
    setOutcomeText("");
    setOutcomeSaving(false);
  };

  const closeOutcomeModal = () => {
    setOutcomeLogId(null);
  };

  const saveOutcome = async () => {
    if (!outcomeLogId || outcomeRating === 0) return;
    setOutcomeSaving(true);
    try {
      const res = await fetch(`/api/consultations/${outcomeLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: outcomeText.trim() || null,
          outcomeRating,
        }),
      });
      if (res.ok) {
        // ローカルstate更新
        setConsultLogs((prev) =>
          prev.map((l) =>
            l.id === outcomeLogId
              ? { ...l, outcome: outcomeText.trim() || null, outcomeRating }
              : l
          )
        );
        closeOutcomeModal();
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setOutcomeSaving(false);
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch { return null; }
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatBirthDate = (bd: string | null) => {
    if (!bd) return null;
    const parts = bd.split("-");
    if (parts.length === 3) return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    return bd;
  };

  // 圧縮記憶のパース
  const parsedMemory: CompressedMemory | null = (() => {
    if (!person?.compressedMemory) return null;
    try { return JSON.parse(person.compressedMemory); }
    catch { return null; }
  })();

  if (loading) {
    return (<div className="flex justify-center py-16"><p className="text-text-muted text-sm">読み込み中...</p></div>);
  }
  if (!person) {
    return (<div className="text-center py-16"><p className="text-text-muted mb-4">人物が見つかりません</p><Link href="/persons" className="btn-ghost">一覧に戻る</Link></div>);
  }

  const score = person.compatibilityScore;
  const placeholder = PLACEHOLDERS[person.relationship] || DEFAULT_PLACEHOLDER;

  return (
    <div className="space-y-6">
      <Link href="/persons" className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-gold transition-colors">← 一覧に戻る</Link>

      {/* ===== ヘッダーカード / 編集モード ===== */}
      {editMode ? (
        <div className="card space-y-4">
          <h2 className="font-display text-lg text-gold tracking-wide mb-2">Edit</h2>

          {/* ニックネーム */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">ニックネーム</label>
            <input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)}
              className="input-underline" />
          </div>

          {/* 関係性 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">関係性</label>
            <select value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)} className="input-underline">
              {RELATIONSHIP_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>

          {/* 生年月日 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">生年月日</label>
            <BirthDateSelect birthYear={editBirthYear} birthMonth={editBirthMonth} birthDay={editBirthDay}
              onYearChange={setEditBirthYear} onMonthChange={setEditBirthMonth} onDayChange={setEditBirthDay} />
          </div>

          <hr className="divider !my-2" />

          {/* 性別 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">性別</label>
            <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="input-underline">
              <option value="">未選択</option>
              {GENDER_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
          </div>

          {/* 血液型 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">血液型</label>
            <select value={editBloodType} onChange={(e) => setEditBloodType(e.target.value)} className="input-underline">
              <option value="">未選択</option>
              {BLOOD_TYPE_OPTIONS.map((bt) => (<option key={bt} value={bt}>{bt}型</option>))}
            </select>
          </div>

          {/* 出身国 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">出身国</label>
            <input type="text" value={editBirthCountry} onChange={(e) => setEditBirthCountry(e.target.value)}
              placeholder="例: 日本" className="input-underline" />
          </div>

          {/* 出生順位 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">出生順位</label>
            <select value={editBirthOrder} onChange={(e) => setEditBirthOrder(e.target.value)} className="input-underline">
              <option value="">未選択</option>
              {BIRTH_ORDER_OPTIONS.map((bo) => (<option key={bo} value={bo}>{bo}</option>))}
            </select>
          </div>

          <hr className="divider !my-2" />

          {/* personalContext */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">生活背景・家族構成</label>
            <textarea value={editPersonalContext} onChange={(e) => setEditPersonalContext(e.target.value)}
              rows={3} className="input-underline resize-none" />
            <div className="mt-1 space-y-0.5 text-[11px] text-text-muted">
              <p>例：既婚、子供2人。単身赴任中。</p>
              <p>例：パートナーあり、同棲中。仕事最優先の価値観。</p>
              <p>例：独身、親と同居。週末は趣味に集中したい。</p>
            </div>
          </div>

          <hr className="divider !my-2" />

          {/* 観察メモ */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">観察メモ</label>
            <div className="space-y-2">
              {editObservations.map((obs) => {
                const catInfo = getCategoryInfo(obs.category);
                return (
                  <div key={obs.id} className="flex gap-2 items-center">
                    <span className="text-[13px] shrink-0">{catInfo.icon}</span>
                    <span className="flex-1 text-sm text-text-primary py-1 border-b border-border-subtle">{obs.content}</span>
                    <button type="button" onClick={() => markObservationForDelete(obs.id)}
                      className="text-text-muted hover:text-danger transition-colors text-xs shrink-0">✕</button>
                  </div>
                );
              })}
              {newObservations.map((obs, index) => (
                <div key={`new-${index}`} className="flex gap-3 items-center">
                  <input type="text" value={obs} onChange={(e) => updateNewObservation(index, e.target.value)}
                    placeholder="新しい観察メモ" className="input-underline" />
                  <button type="button" onClick={() => removeNewObservation(index)}
                    className="text-text-muted hover:text-danger transition-colors text-xs shrink-0">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addNewObservation}
              className="mt-2 text-xs text-jade hover:text-gold transition-colors">+ メモを追加</button>
          </div>

          {/* 保存・キャンセル */}
          <div className="flex gap-3 pt-4">
            <button onClick={saveEdit} disabled={editSaving || !editNickname.trim()} className="btn-ghost">
              {editSaving ? "保存中..." : "保存"}
            </button>
            <button onClick={cancelEdit}
              className="px-6 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">キャンセル</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="font-display text-[28px] md:text-[32px] font-light text-gold tracking-wide">{person.nickname}</h1>
              <span className="inline-block self-start px-2 py-0.5 border border-border-subtle rounded-[4px] text-[12px] text-text-secondary">{person.relationship}</span>
            </div>
            <button onClick={enterEditMode}
              className="self-start text-[12px] text-text-secondary hover:text-gold border border-border-subtle hover:border-gold-dim rounded-[4px] px-3 py-1 transition-colors">
              編集
            </button>
          </div>
          <div className="mt-3 space-y-1 text-sm text-text-secondary">
            {person.birthDate && <p>生年月日: {formatBirthDate(person.birthDate)}</p>}
            {person.gender && <p>性別: {person.gender}</p>}
            {person.bloodType && <p>血液型: {person.bloodType}型</p>}
            {person.personalContext && <p>背景: <span className="text-text-primary">{person.personalContext}</span></p>}
          </div>

          {/* 観察メモセクション */}
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-text-secondary tracking-wide">観察メモ</h3>
              <button onClick={() => setShowAddMemo(!showAddMemo)}
                className="text-xs text-jade hover:text-gold transition-colors">
                {showAddMemo ? "キャンセル" : "+ メモを追加"}
              </button>
            </div>

            {/* 新規追加フォーム */}
            {showAddMemo && (
              <div className="mb-3 p-3 border border-border-subtle rounded-lg space-y-2">
                <textarea
                  value={addMemoContent}
                  onChange={(e) => setAddMemoContent(e.target.value)}
                  placeholder="観察した内容を入力..."
                  rows={2}
                  className="w-full bg-transparent text-text-primary text-sm outline-none resize-none placeholder:text-text-muted"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={addMemoCategory} onChange={(e) => setAddMemoCategory(e.target.value as ObservationCategory)}
                    className="text-[11px] bg-transparent border border-border-subtle rounded px-2 py-1 text-text-secondary outline-none">
                    {OBSERVATION_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => { setShowAddMemo(false); setAddMemoContent(""); }}
                      className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1">キャンセル</button>
                    <button onClick={saveAddMemo} disabled={!addMemoContent.trim() || addMemoSaving}
                      className="text-xs text-jade hover:text-gold transition-colors px-2 py-1 disabled:opacity-40">
                      {addMemoSaving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {person.observations.length > 0 ? (
              <div className="space-y-2">
                {person.observations.map((obs) => {
                  const catInfo = getCategoryInfo(obs.category);
                  const isEditing = inlineEditId === obs.id;

                  if (isEditing) {
                    return (
                      <div key={obs.id} className="p-3 border border-gold-dim rounded-lg space-y-2">
                        <textarea
                          value={inlineEditContent}
                          onChange={(e) => setInlineEditContent(e.target.value)}
                          rows={2}
                          className="w-full bg-transparent text-text-primary text-sm outline-none resize-none"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={inlineEditCategory} onChange={(e) => setInlineEditCategory(e.target.value as ObservationCategory)}
                            className="text-[11px] bg-transparent border border-border-subtle rounded px-2 py-1 text-text-secondary outline-none">
                            {OBSERVATION_CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                            ))}
                          </select>
                          <div className="ml-auto flex gap-2">
                            <button onClick={cancelInlineEdit}
                              className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1">キャンセル</button>
                            <button onClick={saveInlineEdit} disabled={!inlineEditContent.trim() || inlineEditSaving}
                              className="text-xs text-jade hover:text-gold transition-colors px-2 py-1 disabled:opacity-40">
                              {inlineEditSaving ? "保存中..." : "保存"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={obs.id} className="group flex items-start gap-2 py-1.5">
                      <span className="text-[13px] leading-none mt-0.5 shrink-0">{catInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{obs.content}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-text-muted">{catInfo.label}</span>
                          <span className="text-[10px] text-text-muted">·</span>
                          <span className="text-[10px] text-text-muted">{relativeTime(obs.createdAt)}</span>
                        </div>
                      </div>
                      <button onClick={() => startInlineEdit(obs)}
                        className="shrink-0 text-text-muted hover:text-gold transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 mt-0.5"
                        title="編集">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : !showAddMemo && (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted opacity-50 shrink-0">
                  <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                </svg>
                <p className="text-text-muted text-xs">観察メモがありません。上の「+メモを追加」から記録できます。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 相談ボタン ===== */}
      {!editMode && (
        <button onClick={openConsultModal} className="w-full card flex items-center justify-between group hover:border-gold transition-colors duration-200 cursor-pointer">
          <span className="text-text-primary text-sm">この人物について相談する</span>
          <span className="text-gold group-hover:translate-x-1 transition-transform duration-200">→</span>
        </button>
      )}

      {/* ===== タブ ===== */}
      {!editMode && (
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === "notes"
                ? "text-gold border-b-2 border-gold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            ノート
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === "history"
                ? "text-gold border-b-2 border-gold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            相談履歴
            {person.consultCount > 0 && (
              <span className="ml-1.5 text-[10px] text-text-muted">({person.consultCount})</span>
            )}
          </button>
        </div>
      )}

      {/* ===== ノートタブ ===== */}
      {!editMode && activeTab === "notes" && (
        <>
          {/* クイック分析 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-gold tracking-wide">簡易分析</h2>
              <div className="flex items-center gap-3">
                {person.quickNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(person.quickNoteUpdatedAt)}</span>}
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
            ) : person.quickNote ? (
              <>
                {score !== null && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-secondary text-sm">相性スコア</span>
                      <span className="font-display text-xl font-semibold" style={{ color: getScoreColor(score) }}>
                        {score}<span className="text-sm text-text-muted">/100</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }} />
                    </div>
                  </div>
                )}
                <div className="markdown-body text-sm">
                  <ReactMarkdown>{person.quickNote.split("\n").filter((l) => !l.match(/^相性スコア[：:]/)).join("\n")}</ReactMarkdown>
                </div>
              </>
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
              <h2 className="font-display text-lg text-jade tracking-wide">詳細分析</h2>
              {person.deepNoteUpdatedAt && <span className="text-[11px] text-text-muted">{formatDate(person.deepNoteUpdatedAt)}</span>}
            </div>
            {deepAnalyzing ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <div className="w-5 h-5 border-2 border-jade border-t-transparent rounded-full animate-spin" />
                <span className="text-text-muted text-sm">詳しく分析しています... 少々お待ちください</span>
              </div>
            ) : person.deepNote ? (
              <>
                <div className="markdown-body text-sm">
                  <ReactMarkdown>{person.deepNote}</ReactMarkdown>
                </div>
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
                <p className="text-text-muted text-sm mb-1">より詳しい分析を実行できます</p>
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
          {costInfo && (
            <div className="text-[11px] text-text-muted bg-surface-hover rounded px-3 py-2 font-mono">
              入力: {costInfo.inputTokens} | 出力: {costInfo.outputTokens} | キャッシュ読: {costInfo.cacheReadTokens} | キャッシュ作成: {costInfo.cacheCreationTokens} | 推定コスト: ¥{costInfo.estimatedCostJPY.toFixed(4)}
            </div>
          )}
        </>
      )}

      {/* ===== 相談履歴タブ ===== */}
      {!editMode && activeTab === "history" && (
        <div className="space-y-4">
          {/* 圧縮記憶サマリー */}
          {parsedMemory && (
            <div className="card !py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gold">学習済みパターン</h3>
                {person.memoryUpdatedAt && (
                  <span className="text-[10px] text-text-muted">
                    最終更新: {formatDate(person.memoryUpdatedAt)}
                  </span>
                )}
              </div>
              {parsedMemory.successPatterns.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] text-text-muted mb-1">成功パターン</p>
                  <div className="space-y-0.5">
                    {parsedMemory.successPatterns.map((p, i) => (
                      <p key={i} className="text-xs text-text-secondary pl-3 relative">
                        <span className="absolute left-0 text-jade">▸</span>{p}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {parsedMemory.failurePatterns.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] text-text-muted mb-1">注意パターン</p>
                  <div className="space-y-0.5">
                    {parsedMemory.failurePatterns.map((p, i) => (
                      <p key={i} className="text-xs text-text-secondary pl-3 relative">
                        <span className="absolute left-0 text-danger">▸</span>{p}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 記憶を整理するボタン */}
          <div className="flex items-center gap-3">
            <button
              onClick={compressMemory}
              disabled={compressing || consultLogs.length === 0}
              className="btn-ghost text-xs"
            >
              {compressing ? "整理中..." : "記憶を整理する"}
            </button>
            {compressMessage && (
              <span className="text-xs text-jade">{compressMessage}</span>
            )}
          </div>

          {/* 履歴一覧 */}
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : consultLogs.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-text-muted text-sm">相談履歴はまだありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {consultLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="card !py-0 overflow-hidden">
                    {/* ヘッダー行 */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="w-full flex items-center gap-3 py-3 px-0 text-left group cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <span className={`text-text-muted text-xs transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>▸</span>
                      <span className="text-text-muted text-[11px] shrink-0">{formatShortDate(log.createdAt)}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border ${
                        log.consultType === "deep" ? "border-jade/30 text-jade" : "border-border-subtle text-text-secondary"
                      }`}>
                        {log.consultType === "deep" ? "詳細" : "標準"}
                      </span>
                      <span className="flex-1 text-text-muted text-xs truncate min-w-0">
                        {log.context.slice(0, 40)}
                      </span>
                      {log.outcomeRating && (
                        <span className="text-gold text-xs shrink-0">
                          {"★".repeat(log.outcomeRating)}{"☆".repeat(5 - log.outcomeRating)}
                        </span>
                      )}
                    </div>

                    {/* 展開コンテンツ */}
                    {isExpanded && (
                      <div className="pb-4 pt-1 border-t border-border-subtle">
                        <div className="mb-3">
                          <p className="text-[11px] text-text-muted mb-1">相談内容</p>
                          <p className="text-sm text-text-secondary">{log.context}</p>
                        </div>
                        <div className="relative">
                          <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${
                            log.consultType === "deep" ? "via-jade-dim" : "via-gold-dim"
                          } to-transparent`} />
                          <div className="py-3">
                            <div className="markdown-body text-[13px]">
                              <ReactMarkdown>{log.result}</ReactMarkdown>
                            </div>
                          </div>
                        </div>

                        {/* 結果記録 */}
                        {log.outcomeRating ? (
                          <div className="mt-2 pt-2 border-t border-border-subtle">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-muted">結果:</span>
                              <span className="text-gold text-sm">
                                {"★".repeat(log.outcomeRating)}{"☆".repeat(5 - log.outcomeRating)}
                              </span>
                            </div>
                            {log.outcome && (
                              <p className="text-xs text-text-secondary mt-1">{log.outcome}</p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t border-border-subtle">
                            <button
                              onClick={(e) => { e.stopPropagation(); openOutcomeModal(log.id); }}
                              className="text-xs text-jade hover:text-gold transition-colors"
                            >
                              結果を記録
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 相談モーダル ===== */}
      {showConsultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeConsultModal(); }}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="font-display text-lg text-gold tracking-wide">
                {person.nickname}について相談する
              </h3>
              <button onClick={closeConsultModal} className="text-text-muted hover:text-text-primary text-lg transition-colors">✕</button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!consultResult ? (
                <>
                  {/* 相談データバッジ */}
                  {person.consultCount > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span className="px-1.5 py-0.5 border border-jade/20 rounded text-jade">
                        過去{person.consultCount}回の相談データあり
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-text-secondary mb-2">相談内容</label>
                    <textarea
                      value={consultContext}
                      onChange={(e) => setConsultContext(e.target.value)}
                      placeholder={placeholder}
                      rows={4}
                      className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted leading-relaxed focus:border-gold transition-colors"
                    />
                  </div>

                  {showDeepCountdown && (
                    <div className="text-center py-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" stroke="rgba(219,145,79,0.15)" strokeWidth="3" fill="none" />
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
                        {consultType === "deep" ? "詳細相談中..." : "相談中..."}
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
                          <span className="text-jade">✦ 詳細相談</span>
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
                    <div className="bg-surface-hover rounded px-3 py-2 space-y-1">
                      <p className="text-jade text-xs">この相談を保存しました</p>
                      <button
                        onClick={() => { closeConsultModal(); setActiveTab("history"); fetchConsultLogs(); }}
                        className="text-xs text-text-muted hover:text-gold transition-colors"
                      >
                        {person.nickname}さんの相談履歴を見る →
                      </button>
                    </div>
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
                  <span className="font-display mr-1">✦</span> 詳細相談
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

      {/* ===== 結果記録モーダル ===== */}
      {outcomeLogId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeOutcomeModal(); }}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm mx-4">
            <div className="px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="text-sm text-text-primary">この相談の結果を記録</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-xs text-text-secondary mb-2">うまくいきましたか？</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setOutcomeRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= outcomeRating ? "text-gold" : "text-text-muted"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">メモ（任意）</label>
                <textarea
                  value={outcomeText}
                  onChange={(e) => setOutcomeText(e.target.value)}
                  rows={3}
                  placeholder="どうなったか、感じたことなど"
                  className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted focus:border-gold transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
              <button onClick={closeOutcomeModal}
                className="flex-1 py-2 text-text-muted text-sm hover:text-text-secondary transition-colors">キャンセル</button>
              <button onClick={saveOutcome} disabled={outcomeRating === 0 || outcomeSaving}
                className="btn-ghost flex-1 text-sm py-2">
                {outcomeSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
