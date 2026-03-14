"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { PersonData, CostInfo, ObservationData, ConsultationLogData, CompressedMemory, ObservationCategory } from "@/lib/types";
import {
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  BIRTH_ORDER_OPTIONS,
  OBSERVATION_CATEGORIES,
  CONTACT_FREQUENCY_OPTIONS,
  MBTI_TYPES_DATA,
  MARITAL_STATUS_OPTIONS,
  HAS_CHILDREN_OPTIONS,
} from "@/lib/types";
import { RELATIONSHIP_CATEGORIES, formatRelationshipShort, formatRelationshipLabel } from "@/lib/relationship-types";
import { BirthDateSelect } from "@/components/birth-date-select";
import { CountrySelect } from "@/components/country-select";
import { DivinationDebug } from "@/components/divination-debug";

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
  const [debugMode, setDebugMode] = useState(false);
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
  const [editRelCategory, setEditRelCategory] = useState("");
  const [editRelSubtype, setEditRelSubtype] = useState("");
  const [editRelDetail, setEditRelDetail] = useState("");
  const [editBirthYear, setEditBirthYear] = useState("");
  const [editBirthMonth, setEditBirthMonth] = useState("");
  const [editBirthDay, setEditBirthDay] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodType, setEditBloodType] = useState("");
  const [editBirthCountry, setEditBirthCountry] = useState("");
  const [editBirthOrder, setEditBirthOrder] = useState("");
  const [editHonorific, setEditHonorific] = useState("");
  const [editPersonalContext, setEditPersonalContext] = useState("");
  const [editAcquaintanceYear, setEditAcquaintanceYear] = useState("");
  const [editAcquaintanceMonth, setEditAcquaintanceMonth] = useState("");
  const [editAcquaintanceDay, setEditAcquaintanceDay] = useState("");
  const [editIntimacyScore, setEditIntimacyScore] = useState(5);
  const [editContactFrequency, setEditContactFrequency] = useState("");
  const [editMbti, setEditMbti] = useState("");
  const [editMaritalStatus, setEditMaritalStatus] = useState("");
  const [editHasChildren, setEditHasChildren] = useState("");

  // インライン編集中のフィールド名
  const [inlineField, setInlineField] = useState<string | null>(null);
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

  // デバッグ: テスト一括相談
  const [bulkConsulting, setBulkConsulting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [memoryExpanded, setMemoryExpanded] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get("debug") === "true");
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
    setEditRelCategory(person.relationshipCategory || "");
    setEditRelSubtype(person.relationshipSubtype || "");
    setEditRelDetail(person.relationshipDetail || "");
    setEditBirthYear(bd.year || (person.birthYear ? String(person.birthYear) : ""));
    setEditBirthMonth(bd.month);
    setEditBirthDay(bd.day);
    setEditGender(person.gender || "");
    setEditBloodType(person.bloodType || "");
    setEditBirthCountry(person.birthCountry || "");
    setEditBirthOrder(person.birthOrder || "");
    setEditHonorific(person.honorific || "");
    setEditPersonalContext(person.personalContext || "");
    // 知り合った日のパース
    const aq = person.acquaintanceDate || "";
    const aqParts = aq.split("-");
    setEditAcquaintanceYear(aqParts[0] || "");
    setEditAcquaintanceMonth(aqParts[1] ? String(parseInt(aqParts[1])) : "");
    setEditAcquaintanceDay(aqParts[2] ? String(parseInt(aqParts[2])) : "");
    setEditIntimacyScore(person.intimacyScore ?? 5);
    setEditContactFrequency(person.contactFrequency || "");
    setEditMbti(person.mbti || "");
    setEditMaritalStatus(person.maritalStatus || "");
    setEditHasChildren(person.hasChildren || "");
    setEditObservations([...person.observations]);
    setNewObservations([]);
    setDeleteObservationIds([]);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setInlineField(null);
  };

  // フィールドインライン編集開始ヘルパー
  const startFieldEdit = (field: string) => {
    if (!person) return;
    // まず現在の値をedit stateにセット
    enterEditMode();
    setInlineField(field);
  };

  // インライン保存（単一フィールド）
  const saveInlineField = async () => {
    if (!person) return;
    setEditSaving(true);
    // acquaintanceDate構築
    const aqDate = editAcquaintanceYear
      ? (editAcquaintanceMonth
        ? (editAcquaintanceDay
          ? `${editAcquaintanceYear.padStart(4, "0")}-${editAcquaintanceMonth.padStart(2, "0")}-${editAcquaintanceDay.padStart(2, "0")}`
          : `${editAcquaintanceYear.padStart(4, "0")}-${editAcquaintanceMonth.padStart(2, "0")}`)
        : editAcquaintanceYear.padStart(4, "0"))
      : null;

    const newBirthDate = (editBirthYear && editBirthMonth && editBirthDay)
      ? `${editBirthYear.padStart(4, "0")}-${editBirthMonth.padStart(2, "0")}-${editBirthDay.padStart(2, "0")}`
      : null;

    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname.trim(),
          relationship: formatRelationshipShort(editRelCategory, editRelSubtype) || editRelationship,
          relationshipCategory: editRelCategory || null,
          relationshipSubtype: editRelSubtype || null,
          relationshipDetail: editRelDetail.trim() || null,
          birthDate: newBirthDate,
          birthYear: editBirthYear || null,
          gender: editGender || null,
          bloodType: editBloodType || null,
          birthCountry: editBirthCountry || null,
          birthOrder: editBirthOrder || null,
          honorific: editHonorific.trim() || null,
          personalContext: editPersonalContext.trim() || null,
          acquaintanceDate: aqDate,
          intimacyScore: editIntimacyScore,
          contactFrequency: editContactFrequency || null,
          mbti: editMbti || null,
          maritalStatus: editMaritalStatus || null,
          hasChildren: editHasChildren || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPerson(updated);
        setInlineField(null);
        setEditMode(false);
      }
    } catch (error) {
      console.error("保存エラー:", error);
    } finally {
      setEditSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    setInlineField(null);
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
    // acquaintanceDate構築
    const aqDate = editAcquaintanceYear
      ? (editAcquaintanceMonth
        ? (editAcquaintanceDay
          ? `${editAcquaintanceYear.padStart(4, "0")}-${editAcquaintanceMonth.padStart(2, "0")}-${editAcquaintanceDay.padStart(2, "0")}`
          : `${editAcquaintanceYear.padStart(4, "0")}-${editAcquaintanceMonth.padStart(2, "0")}`)
        : editAcquaintanceYear.padStart(4, "0"))
      : null;

    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname.trim(),
          relationship: formatRelationshipShort(editRelCategory, editRelSubtype) || editRelationship,
          relationshipCategory: editRelCategory || null,
          relationshipSubtype: editRelSubtype || null,
          relationshipDetail: editRelDetail.trim() || null,
          birthDate: newBirthDate,
          birthYear: editBirthYear || null,
          gender: editGender || null,
          bloodType: editBloodType || null,
          birthCountry: editBirthCountry || null,
          birthOrder: editBirthOrder || null,
          honorific: editHonorific.trim() || null,
          personalContext: editPersonalContext.trim() || null,
          acquaintanceDate: aqDate,
          intimacyScore: editIntimacyScore,
          contactFrequency: editContactFrequency || null,
          mbti: editMbti || null,
          maritalStatus: editMaritalStatus || null,
          hasChildren: editHasChildren || null,
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
  const startMemoInlineEdit = (obs: ObservationData) => {
    setInlineEditId(obs.id);
    setInlineEditContent(obs.content);
    setInlineEditCategory((obs.category || "other") as ObservationCategory);
  };
  const cancelMemoInlineEdit = () => { setInlineEditId(null); };
  const saveMemoInlineEdit = async () => {
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

  // ===== テスト用: 5回一括相談（開発環境のみ） =====
  const runBulkConsult = async () => {
    if (bulkConsulting) return;
    setBulkConsulting(true);
    setBulkProgress(0);
    const testQueries = [
      "来週の会議でうまく話を進めるコツを教えて",
      "最近少し距離を感じる。どうアプローチすべき？",
      "お互いの意見が食い違ったとき、どう折り合いをつける？",
      "信頼関係をもっと深めるにはどうしたらいい？",
      "感謝の気持ちを自然に伝える方法を教えて",
    ];
    for (let i = 0; i < testQueries.length; i++) {
      try {
        setBulkProgress(i + 1);
        await fetch("/api/consult", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: id,
            consultationContext: testQueries[i],
            consultType: "standard",
          }),
        });
      } catch (err) {
        console.error(`テスト相談${i + 1}回目エラー:`, err);
      }
    }
    // 相談履歴・人物データを再取得
    await Promise.all([fetchConsultLogs(), fetchPerson()]);
    setBulkConsulting(false);
    setBulkProgress(0);
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

  // ヘルパー: 接触頻度ラベル
  const contactFreqLabel = CONTACT_FREQUENCY_OPTIONS.find(o => o.value === person.contactFrequency)?.label;
  // ヘルパー: 婚姻状況ラベル
  const maritalLabel = MARITAL_STATUS_OPTIONS.find(o => o.value === person.maritalStatus)?.label;
  // ヘルパー: 子供の有無ラベル
  const childrenLabel = HAS_CHILDREN_OPTIONS.find(o => o.value === person.hasChildren)?.label;
  // ヘルパー: 知り合った日の表示
  const formatAcquaintanceDate = (ad: string | null) => {
    if (!ad) return null;
    const p = ad.split("-");
    if (p.length === 1) return `${p[0]}年`;
    if (p.length === 2) return `${p[0]}年${parseInt(p[1])}月`;
    return `${p[0]}年${parseInt(p[1])}月${parseInt(p[2])}日`;
  };
  // インライン編集 保存/キャンセルボタン
  const InlineButtons = () => (
    <div className="flex gap-2 mt-2">
      <button onClick={saveInlineField} disabled={editSaving}
        className="text-xs text-jade hover:text-gold transition-colors px-2 py-1 border border-jade/30 rounded disabled:opacity-40">
        {editSaving ? "保存中..." : "✓ 保存"}
      </button>
      <button onClick={cancelInlineEdit}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1">
        ✕ キャンセル
      </button>
    </div>
  );
  // クリッカブル表示行
  const FieldRow = ({ label, value, field }: { label: string; value: string | null | undefined; field: string }) => (
    value ? (
      <button onClick={() => startFieldEdit(field)}
        className="flex items-start gap-2 text-sm group w-full text-left hover:bg-gold/5 rounded px-1 -mx-1 py-0.5 transition-colors">
        <span className="text-text-secondary shrink-0">{label}:</span>
        <span className="text-text-primary">{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 mt-0.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
      </button>
    ) : null
  );

  return (
    <div className="space-y-6">
      <Link href="/persons" className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-gold transition-colors">← 一覧に戻る</Link>

      {/* ===== ヘッダーカード / 編集モード ===== */}
      {(editMode && !inlineField) ? (
        <div className="card space-y-4">
          <h2 className="font-display text-lg text-gold tracking-wide mb-2">編集</h2>

          {/* ニックネーム */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">ニックネーム</label>
            <input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)}
              className="input-underline" />
          </div>

          {/* 関係性カテゴリ */}
          <div>
            <label className="block text-xs text-text-secondary mb-3 tracking-wide">関係性</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RELATIONSHIP_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setEditRelCategory(cat.value); setEditRelSubtype(""); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-200 ${
                    editRelCategory === cat.value
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
          {editRelCategory && (
            <div>
              <label className="block text-xs text-text-secondary mb-3 tracking-wide">具体的な関係</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RELATIONSHIP_CATEGORIES
                  .find(c => c.value === editRelCategory)
                  ?.subtypes.map((sub) => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => setEditRelSubtype(sub.value)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        editRelSubtype === sub.value
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
          {editRelSubtype && (
            <div>
              <label className="block text-xs text-text-secondary mb-2 tracking-wide">
                補足 <span className="text-text-muted">(任意)</span>
              </label>
              <input
                type="text"
                value={editRelDetail}
                onChange={(e) => setEditRelDetail(e.target.value)}
                placeholder="例：母方の叔父、妻の職場の上司など"
                className="input-underline"
              />
            </div>
          )}

          {/* 生年月日 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">生年月日</label>
            <BirthDateSelect birthYear={editBirthYear} birthMonth={editBirthMonth} birthDay={editBirthDay}
              onYearChange={setEditBirthYear} onMonthChange={setEditBirthMonth} onDayChange={setEditBirthDay} />
          </div>

          <div className="h-2" />

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

          {/* 敬称 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">敬称</label>
            <input type="text" value={editHonorific} onChange={(e) => setEditHonorific(e.target.value)}
              placeholder="さん・ちゃん・くん・様・先生など" className="input-underline" />
          </div>

          {/* 出身国 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">出身国</label>
            <CountrySelect value={editBirthCountry} onChange={setEditBirthCountry} />
          </div>

          {/* 出生順位 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">出生順位</label>
            <select value={editBirthOrder} onChange={(e) => setEditBirthOrder(e.target.value)} className="input-underline">
              <option value="">未選択</option>
              {BIRTH_ORDER_OPTIONS.map((bo) => (<option key={bo} value={bo}>{bo}</option>))}
            </select>
          </div>

          <div className="h-2" />

          {/* 知り合った時期 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">知り合った時期</label>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <select value={editAcquaintanceYear} onChange={(e) => setEditAcquaintanceYear(e.target.value)} className="input-underline">
                  <option value="">年</option>
                  {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={String(y)}>{y}年</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <select value={editAcquaintanceMonth} onChange={(e) => setEditAcquaintanceMonth(e.target.value)} className="input-underline">
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>{m}月</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <select value={editAcquaintanceDay} onChange={(e) => setEditAcquaintanceDay(e.target.value)} className="input-underline">
                  <option value="">日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 親密度 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">親密度</label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-text-muted shrink-0">他人</span>
              <input type="range" min={0} max={10} value={editIntimacyScore}
                onChange={(e) => setEditIntimacyScore(parseInt(e.target.value))} className="flex-1 accent-gold" />
              <span className="text-[10px] text-text-muted shrink-0">親密</span>
              <span className="text-sm text-gold font-medium w-6 text-center">{editIntimacyScore}</span>
            </div>
          </div>

          {/* 接触頻度 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">接触頻度</label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_FREQUENCY_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setEditContactFrequency(editContactFrequency === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all duration-200 ${
                    editContactFrequency === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* MBTI */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">MBTI</label>
            <select value={editMbti} onChange={(e) => setEditMbti(e.target.value)} className="input-underline">
              <option value="">未設定</option>
              {MBTI_TYPES_DATA.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.code}（{type.label}）
                </option>
              ))}
              <option value="unknown">わからない</option>
            </select>
          </div>

          {/* 婚姻状況 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">婚姻状況</label>
            <div className="flex flex-wrap gap-2">
              {MARITAL_STATUS_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setEditMaritalStatus(editMaritalStatus === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    editMaritalStatus === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* 子供の有無 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">子供の有無</label>
            <div className="flex flex-wrap gap-2">
              {HAS_CHILDREN_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setEditHasChildren(editHasChildren === opt.value ? "" : opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    editHasChildren === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="h-2" />

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

          <div className="h-2" />

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
          {/* ヘッダー: ニックネーム + 関係性 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {inlineField === "nickname" ? (
                <div>
                  <input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)}
                    className="input-underline text-lg" autoFocus />
                  <InlineButtons />
                </div>
              ) : (
                <button onClick={() => startFieldEdit("nickname")} className="group flex items-center gap-2">
                  <h1 className="font-display text-[28px] md:text-[32px] font-light text-gold tracking-wide">{person.nickname}</h1>
                  <span className="text-text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                </button>
              )}
              {inlineField === "relationship" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {RELATIONSHIP_CATEGORIES.map((cat) => (
                      <button key={cat.value} type="button" onClick={() => { setEditRelCategory(cat.value); setEditRelSubtype(""); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                          editRelCategory === cat.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                        }`}>
                        <span className="text-sm">{cat.icon}</span><span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {editRelCategory && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {RELATIONSHIP_CATEGORIES.find(c => c.value === editRelCategory)?.subtypes.map((sub) => (
                        <button key={sub.value} type="button" onClick={() => setEditRelSubtype(sub.value)}
                          className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${
                            editRelSubtype === sub.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                          }`}>{sub.label}</button>
                      ))}
                    </div>
                  )}
                  {editRelSubtype && (
                    <input type="text" value={editRelDetail} onChange={(e) => setEditRelDetail(e.target.value)}
                      placeholder="補足（任意）" className="input-underline text-xs" />
                  )}
                  <InlineButtons />
                </div>
              ) : (
                <button onClick={() => startFieldEdit("relationship")} className="group inline-flex items-center gap-1">
                  <span className="inline-block self-start px-2 py-0.5 border border-border-subtle rounded-[4px] text-[12px] text-text-secondary">
                    {formatRelationshipLabel(person.relationshipCategory, person.relationshipSubtype, person.relationshipDetail) || person.relationship}
                  </span>
                  <span className="text-text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                </button>
              )}
            </div>
            <button onClick={enterEditMode}
              className="self-start text-[12px] text-text-secondary hover:text-gold border border-border-subtle hover:border-gold-dim rounded-[4px] px-3 py-1 transition-colors">
              全体編集
            </button>
          </div>

          {/* プロフィール情報（インライン編集対応） */}
          <div className="mt-3 space-y-0.5">
            {/* 敬称 */}
            {inlineField === "honorific" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">敬称</label>
                <input type="text" value={editHonorific} onChange={(e) => setEditHonorific(e.target.value)}
                  placeholder="さん・ちゃん・くん・様・先生など" className="input-underline text-sm" autoFocus />
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="敬称" value={person.honorific || "さん（デフォルト）"} field="honorific" />
            )}

            {/* 生年月日 */}
            {inlineField === "birthDate" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">生年月日</label>
                <BirthDateSelect birthYear={editBirthYear} birthMonth={editBirthMonth} birthDay={editBirthDay}
                  onYearChange={setEditBirthYear} onMonthChange={setEditBirthMonth} onDayChange={setEditBirthDay} />
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="生年月日" value={formatBirthDate(person.birthDate)} field="birthDate" />
            )}

            {/* 性別 */}
            {inlineField === "gender" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">性別</label>
                <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="input-underline text-sm" autoFocus>
                  <option value="">未選択</option>
                  {GENDER_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="性別" value={person.gender} field="gender" />
            )}

            {/* 血液型 */}
            {inlineField === "bloodType" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">血液型</label>
                <select value={editBloodType} onChange={(e) => setEditBloodType(e.target.value)} className="input-underline text-sm" autoFocus>
                  <option value="">未選択</option>
                  {BLOOD_TYPE_OPTIONS.map((bt) => (<option key={bt} value={bt}>{bt}型</option>))}
                </select>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="血液型" value={person.bloodType ? `${person.bloodType}型` : null} field="bloodType" />
            )}

            {/* 出身国 */}
            {inlineField === "birthCountry" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">出身国</label>
                <CountrySelect value={editBirthCountry} onChange={setEditBirthCountry} />
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="出身国" value={person.birthCountry} field="birthCountry" />
            )}

            {/* 出生順位 */}
            {inlineField === "birthOrder" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">出生順位</label>
                <select value={editBirthOrder} onChange={(e) => setEditBirthOrder(e.target.value)} className="input-underline text-sm" autoFocus>
                  <option value="">未選択</option>
                  {BIRTH_ORDER_OPTIONS.map((bo) => (<option key={bo} value={bo}>{bo}</option>))}
                </select>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="出生順位" value={person.birthOrder} field="birthOrder" />
            )}

            {/* 知り合った時期 */}
            {inlineField === "acquaintanceDate" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">知り合った時期</label>
                <div className="flex gap-2 items-end">
                  <select value={editAcquaintanceYear} onChange={(e) => setEditAcquaintanceYear(e.target.value)} className="input-underline text-sm flex-1">
                    <option value="">年</option>
                    {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={String(y)}>{y}年</option>
                    ))}
                  </select>
                  <select value={editAcquaintanceMonth} onChange={(e) => setEditAcquaintanceMonth(e.target.value)} className="input-underline text-sm w-20">
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m)}>{m}月</option>
                    ))}
                  </select>
                  <select value={editAcquaintanceDay} onChange={(e) => setEditAcquaintanceDay(e.target.value)} className="input-underline text-sm w-20">
                    <option value="">日</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}日</option>
                    ))}
                  </select>
                </div>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="知り合った時期" value={formatAcquaintanceDate(person.acquaintanceDate)} field="acquaintanceDate" />
            )}

            {/* 親密度 */}
            {inlineField === "intimacyScore" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">親密度</label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-text-muted shrink-0">他人</span>
                  <input type="range" min={0} max={10} value={editIntimacyScore}
                    onChange={(e) => setEditIntimacyScore(parseInt(e.target.value))} className="flex-1 accent-gold" />
                  <span className="text-[10px] text-text-muted shrink-0">親密</span>
                  <span className="text-sm text-gold font-medium w-6 text-center">{editIntimacyScore}</span>
                </div>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="親密度" value={person.intimacyScore !== null ? `${person.intimacyScore}/10` : null} field="intimacyScore" />
            )}

            {/* 接触頻度 */}
            {inlineField === "contactFrequency" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">接触頻度</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTACT_FREQUENCY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setEditContactFrequency(editContactFrequency === opt.value ? "" : opt.value)}
                      className={`px-2 py-1 rounded-lg border text-xs transition-all ${
                        editContactFrequency === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="接触頻度" value={contactFreqLabel} field="contactFrequency" />
            )}

            {/* MBTI */}
            {inlineField === "mbti" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">MBTI</label>
                <select value={editMbti} onChange={(e) => setEditMbti(e.target.value)} className="input-underline text-sm">
                  <option value="">未設定</option>
                  {MBTI_TYPES_DATA.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.code}（{type.label}）
                    </option>
                  ))}
                  <option value="unknown">わからない</option>
                </select>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="MBTI" value={person.mbti === "unknown" ? "不明" : person.mbti} field="mbti" />
            )}

            {/* 婚姻状況 */}
            {inlineField === "maritalStatus" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">婚姻状況</label>
                <div className="flex flex-wrap gap-1.5">
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setEditMaritalStatus(editMaritalStatus === opt.value ? "" : opt.value)}
                      className={`px-2 py-1 rounded-lg border text-xs transition-all ${
                        editMaritalStatus === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="婚姻状況" value={maritalLabel} field="maritalStatus" />
            )}

            {/* 子供の有無 */}
            {inlineField === "hasChildren" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">子供の有無</label>
                <div className="flex flex-wrap gap-1.5">
                  {HAS_CHILDREN_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setEditHasChildren(editHasChildren === opt.value ? "" : opt.value)}
                      className={`px-2 py-1 rounded-lg border text-xs transition-all ${
                        editHasChildren === opt.value ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-secondary hover:border-text-muted"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="子供" value={childrenLabel} field="hasChildren" />
            )}

            {/* 生活背景 */}
            {inlineField === "personalContext" ? (
              <div className="py-1">
                <label className="block text-xs text-text-secondary mb-1">生活背景・家族構成</label>
                <textarea value={editPersonalContext} onChange={(e) => setEditPersonalContext(e.target.value)}
                  rows={3} className="input-underline resize-none text-sm" autoFocus />
                <InlineButtons />
              </div>
            ) : (
              <FieldRow label="背景" value={person.personalContext} field="personalContext" />
            )}

            {/* 未入力フィールドの追加ボタン */}
            {!inlineField && (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border-subtle">
                {!person.birthDate && <button onClick={() => startFieldEdit("birthDate")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 生年月日</button>}
                {!person.gender && <button onClick={() => startFieldEdit("gender")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 性別</button>}
                {!person.bloodType && <button onClick={() => startFieldEdit("bloodType")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 血液型</button>}
                {!person.birthCountry && <button onClick={() => startFieldEdit("birthCountry")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 出身国</button>}
                {!person.acquaintanceDate && <button onClick={() => startFieldEdit("acquaintanceDate")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 知り合った時期</button>}
                {!person.contactFrequency && <button onClick={() => startFieldEdit("contactFrequency")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 接触頻度</button>}
                {!person.mbti && <button onClick={() => startFieldEdit("mbti")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ MBTI</button>}
                {!person.maritalStatus && <button onClick={() => startFieldEdit("maritalStatus")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 婚姻状況</button>}
                {!person.hasChildren && <button onClick={() => startFieldEdit("hasChildren")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 子供の有無</button>}
                {!person.personalContext && <button onClick={() => startFieldEdit("personalContext")} className="text-[10px] text-text-muted hover:text-jade transition-colors px-1.5 py-0.5 border border-dashed border-border-subtle rounded">+ 背景</button>}
              </div>
            )}
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
                            <button onClick={cancelMemoInlineEdit}
                              className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1">キャンセル</button>
                            <button onClick={saveMemoInlineEdit} disabled={!inlineEditContent.trim() || inlineEditSaving}
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
                      <button onClick={() => startMemoInlineEdit(obs)}
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

          {/* コスト情報（debug=true パラメータ時のみ） */}
          {debugMode && costInfo && (
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

          {/* 開発環境: AI記憶サマリーデバッグ表示 */}
          {debugMode && (
            <div className="p-4 bg-[#2a2a2e] border border-[#444] rounded-lg">
              {parsedMemory ? (
                <>
                  <button
                    onClick={() => setMemoryExpanded(!memoryExpanded)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-[11px] text-[#999] tracking-widest font-mono">
                      📋 AI記憶サマリー（最終更新: {person.memoryUpdatedAt ? formatDate(person.memoryUpdatedAt) : "不明"}）
                    </span>
                    <span className={`text-[#666] text-xs transition-transform duration-200 ${memoryExpanded ? "rotate-90" : ""}`}>▸</span>
                  </button>
                  {memoryExpanded && (
                    <div className="mt-3 space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-[#888]">相談回数:</span>{" "}
                        <span className="text-[#ccc]">{parsedMemory.consultCount}回</span>
                      </div>
                      {parsedMemory.keyTraits.length > 0 && (
                        <div>
                          <p className="text-[#888] mb-0.5">性格特性:</p>
                          {parsedMemory.keyTraits.map((t, i) => (
                            <p key={i} className="text-[#ccc] pl-3">• {t}</p>
                          ))}
                        </div>
                      )}
                      {parsedMemory.successPatterns.length > 0 && (
                        <div>
                          <p className="text-[#888] mb-0.5">成功パターン:</p>
                          {parsedMemory.successPatterns.map((p, i) => (
                            <p key={i} className="text-jade pl-3">✓ {p}</p>
                          ))}
                        </div>
                      )}
                      {parsedMemory.failurePatterns.length > 0 && (
                        <div>
                          <p className="text-[#888] mb-0.5">注意パターン:</p>
                          {parsedMemory.failurePatterns.map((p, i) => (
                            <p key={i} className="text-[#c45c5c] pl-3">✗ {p}</p>
                          ))}
                        </div>
                      )}
                      {parsedMemory.importantContext.length > 0 && (
                        <div>
                          <p className="text-[#888] mb-0.5">重要コンテキスト:</p>
                          {parsedMemory.importantContext.map((c, i) => (
                            <p key={i} className="text-[#ccc] pl-3">◆ {c}</p>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#444] text-[10px] text-[#666]">
                        consultCount={person.consultCount} | memoryUpdatedAt={person.memoryUpdatedAt ?? "null"}
                        {" | "}次回自動圧縮: {person.consultCount ? `${5 - (person.consultCount % 5)}回後` : "5回後"}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-[#999] font-mono">
                  📋 記憶サマリーなし（相談{person.consultCount ?? 0}回 / 5回後に自動生成）
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

          {/* 開発環境: テスト用5回一括相談ボタン */}
          {debugMode && (
            <div className="p-3 bg-[#2a2a2e] border border-[#444] rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={runBulkConsult}
                  disabled={bulkConsulting}
                  className="text-xs text-[#ccc] border border-[#555] rounded px-3 py-1.5 hover:bg-[#333] transition-colors disabled:opacity-40 font-mono"
                >
                  {bulkConsulting ? `テスト相談中... (${bulkProgress}/5)` : "🧪 5回テスト相談を実行"}
                </button>
                <span className="text-[10px] text-[#666] font-mono">
                  ※ API呼び出し5回分のコストが発生します
                </span>
              </div>
            </div>
          )}

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
                          <span className="text-gold">アクションプラン</span>
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

                  {debugMode && consultCostInfo && (
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

      {/* ===== 占術デバッグ表示（開発環境のみ） ===== */}
      <DivinationDebug
        birthDate={person.birthDate}
        birthYear={person.birthYear}
        visible={debugMode}
      />

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
