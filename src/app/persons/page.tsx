"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PersonData, CostInfo, LabelData } from "@/lib/types";
import { RELATIONSHIP_TYPES } from "@/lib/types";

/** 相性スコア→星表示 */
function scoreToStars(score: number | null): string {
  if (score === null) return "--";
  const stars = Math.min(5, Math.max(1, Math.round(score / 20)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

/** 関係性に応じたプレースホルダー */
const PLACEHOLDERS: Record<string, string> = {
  上司: "来週の進捗報告で、プロジェクトの遅延を正直に伝えたい。角が立たない伝え方は？",
  部下: "最近ミスが増えている部下に、やる気を損なわずに改善を促したい",
  クライアント: "先方から返事が来ない。催促のタイミングと文面はどうすればいい？",
  配偶者: "最近すれ違いが多い。休日の過ごし方について話し合いたい",
  友人: "久しぶりに連絡を取りたいが、どんな話題から入るといい？",
};
const DEFAULT_PLACEHOLDER =
  "この人との関係で悩んでいることや、うまくやりたい場面を入力してください";

// ===== ソート可能な人物カード =====
function SortablePersonCard({
  person,
  onConsult,
  onDelete,
  onClick,
}: {
  person: PersonData;
  onConsult: (e: React.MouseEvent, person: PersonData) => void;
  onDelete: (e: React.MouseEvent, id: string, nickname: string) => void;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasNote = person.quickNote !== null;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* === デスクトップカード === */}
      <div
        className="hidden md:block card !py-3 cursor-pointer hover:border-gold-dim transition-colors duration-200 group"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {/* ドラッグハンドル */}
          <span
            {...attributes}
            {...listeners}
            className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing text-sm select-none px-1"
            onClick={(e) => e.stopPropagation()}
          >
            ⠿
          </span>

          <span className="text-text-primary text-[15px]">
            {person.nickname}
          </span>

          {!hasNote && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/30">
              未分析
            </span>
          )}

          <span className="inline-block px-2 py-0.5 border border-border-subtle rounded-[4px] text-[11px] text-text-secondary">
            {person.relationship}
          </span>

          {/* ラベルバッジ */}
          {person.labels?.map((pl) => (
            <span
              key={pl.labelId}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] text-white/90"
              style={{ backgroundColor: pl.label.color }}
            >
              {pl.label.name}
            </span>
          ))}

          <span className="ml-auto text-xs text-gold tracking-wider">
            {scoreToStars(person.compatibilityScore)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 pl-7">
          <button
            onClick={(e) => onConsult(e, person)}
            className="text-jade text-xs hover:text-gold transition-colors"
          >
            この人物について相談する ›
          </button>
          <button
            onClick={(e) => onDelete(e, person.id, person.nickname)}
            className="text-text-muted hover:text-danger transition-colors text-xs opacity-0 group-hover:opacity-100"
          >
            削除
          </button>
        </div>
      </div>

      {/* === モバイルカード === */}
      <div
        className="md:hidden card !p-3 cursor-pointer active:bg-surface-hover transition-colors"
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          {/* ドラッグハンドル */}
          <span
            {...attributes}
            {...listeners}
            className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing text-sm select-none mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            ⠿
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-text-primary text-[15px] font-medium">
                {person.nickname}
              </span>
              <span className="inline-block px-1.5 py-0.5 border border-border-subtle rounded-[3px] text-[10px] text-text-secondary shrink-0">
                {person.relationship}
              </span>
              {!hasNote && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-amber-900/30 text-amber-400 border border-amber-700/30 shrink-0">
                  未分析
                </span>
              )}
              {person.labels?.map((pl) => (
                <span
                  key={pl.labelId}
                  className="inline-block px-1 py-0.5 rounded text-[9px] text-white/90 shrink-0"
                  style={{ backgroundColor: pl.label.color }}
                >
                  {pl.label.name}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => onConsult(e, person)}
                className="text-jade text-xs hover:text-gold transition-colors"
              >
                この人物について相談する ›
              </button>
              <span className="text-xs text-gold">
                {scoreToStars(person.compatibilityScore)}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => onDelete(e, person.id, person.nickname)}
            className="text-text-muted hover:text-danger transition-colors text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== メインページ =====
export default function PersonsListPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  // ラベル
  const [allLabels, setAllLabels] = useState<LabelData[]>([]);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#7ec8c0");

  // フィルター・ソート
  const [filterRelationship, setFilterRelationship] = useState("");
  const [filterLabelId, setFilterLabelId] = useState("");
  const [sortBy, setSortBy] = useState<"manual" | "name" | "updated" | "score">("manual");

  // 相談モーダル
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultPersonId, setConsultPersonId] = useState<string | null>(null);
  const [consultPersonName, setConsultPersonName] = useState("");
  const [consultRelationship, setConsultRelationship] = useState("");
  const [consultContext, setConsultContext] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"standard" | "deep">(
    "standard"
  );
  const [consultSaved, setConsultSaved] = useState(false);
  const [consultCostInfo, setConsultCostInfo] = useState<CostInfo | null>(null);
  const [showDeepCountdown, setShowDeepCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ラベル割り当てモーダル
  const [showLabelAssign, setShowLabelAssign] = useState(false);
  const [labelAssignPersonId, setLabelAssignPersonId] = useState<string | null>(null);
  const [labelAssignPersonName, setLabelAssignPersonName] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchPersons();
    fetchLabels();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      setPersons(data);
    } catch (error) {
      console.error("人物一覧取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch("/api/labels");
      const data = await res.json();
      setAllLabels(data);
    } catch (error) {
      console.error("ラベル取得エラー:", error);
    }
  };

  // ===== ドラッグ&ドロップ =====
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = persons.findIndex((p) => p.id === active.id);
    const newIndex = persons.findIndex((p) => p.id === over.id);
    const newOrder = arrayMove(persons, oldIndex, newIndex);
    setPersons(newOrder);

    // サーバーに保存
    try {
      await fetch("/api/persons/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: newOrder.map((p) => p.id),
        }),
      });
    } catch (error) {
      console.error("並び替え保存エラー:", error);
      fetchPersons(); // ロールバック
    }
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    nickname: string
  ) => {
    e.stopPropagation();
    if (!confirm(`「${nickname}」を削除しますか？`)) return;
    try {
      await fetch(`/api/persons?id=${id}`, { method: "DELETE" });
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  // ===== ラベル管理 =====
  const createLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      if (res.ok) {
        const label = await res.json();
        setAllLabels((prev) => [...prev, label]);
        setNewLabelName("");
      }
    } catch (error) {
      console.error("ラベル作成エラー:", error);
    }
  };

  const deleteLabel = async (labelId: number) => {
    if (!confirm("このラベルを削除しますか？")) return;
    try {
      await fetch(`/api/labels/${labelId}`, { method: "DELETE" });
      setAllLabels((prev) => prev.filter((l) => l.id !== labelId));
      // 人物のラベルも更新
      setPersons((prev) =>
        prev.map((p) => ({
          ...p,
          labels: p.labels.filter((pl) => pl.labelId !== labelId),
        }))
      );
    } catch (error) {
      console.error("ラベル削除エラー:", error);
    }
  };

  // ===== ラベル割り当て =====
  const openLabelAssign = (e: React.MouseEvent, person: PersonData) => {
    e.stopPropagation();
    setLabelAssignPersonId(person.id);
    setLabelAssignPersonName(person.nickname);
    setSelectedLabelIds(person.labels.map((pl) => pl.labelId));
    setShowLabelAssign(true);
  };

  const saveLabelAssign = async () => {
    if (!labelAssignPersonId) return;
    try {
      const res = await fetch(`/api/persons/${labelAssignPersonId}/labels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds: selectedLabelIds }),
      });
      if (res.ok) {
        const updatedPerson = await res.json();
        setPersons((prev) =>
          prev.map((p) => (p.id === updatedPerson.id ? { ...p, labels: updatedPerson.labels } : p))
        );
        setShowLabelAssign(false);
      }
    } catch (error) {
      console.error("ラベル割り当てエラー:", error);
    }
  };

  const toggleLabelSelection = (labelId: number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  // ===== 相談モーダル =====
  const openConsultModal = (e: React.MouseEvent, person: PersonData) => {
    e.stopPropagation();
    setConsultPersonId(person.id);
    setConsultPersonName(person.nickname);
    setConsultRelationship(person.relationship);
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
    if (!consultContext.trim() || !consultPersonId) return;
    setConsultLoading(true);
    setConsultResult(null);
    setConsultSaved(false);
    setConsultCostInfo(null);
    setConsultType("standard");
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: consultPersonId,
          consultationContext: consultContext.trim(),
          consultType: "standard",
        }),
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

  const runDeepConsult = useCallback(async () => {
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
        body: JSON.stringify({
          personId: consultPersonId,
          consultationContext: consultContext.trim(),
          consultType: "deep",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsultResult(data.actionPlan);
        setConsultSaved(true);
        if (data.costInfo) setConsultCostInfo(data.costInfo);
      } else {
        setConsultResult(data.error || "深掘り相談処理に失敗しました");
      }
    } catch {
      setConsultResult("ネットワークエラーが発生しました");
    } finally {
      setConsultLoading(false);
    }
  }, [consultPersonId, consultContext]);

  const startDeepCountdown = () => {
    if (!consultContext.trim()) return;
    setCountdown(3);
    setShowDeepCountdown(true);
  };

  useEffect(() => {
    if (showDeepCountdown && countdown > 0) {
      countdownRef.current = setInterval(
        () => setCountdown((p) => p - 1),
        1000
      );
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } else if (showDeepCountdown && countdown === 0) {
      runDeepConsult();
    }
  }, [showDeepCountdown, countdown, runDeepConsult]);

  const consultPlaceholder =
    PLACEHOLDERS[consultRelationship] || DEFAULT_PLACEHOLDER;

  // ===== フィルター・ソート適用 =====
  const filteredPersons = persons.filter((p) => {
    if (filterRelationship && p.relationship !== filterRelationship) return false;
    if (filterLabelId && !p.labels.some((pl) => pl.labelId === parseInt(filterLabelId))) return false;
    return true;
  });

  const sortedPersons = [...filteredPersons].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.nickname.localeCompare(b.nickname, "ja");
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "score":
        return (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1);
      default: // manual
        return 0; // 既にsortOrder順でAPIから返される
    }
  });

  const isDragEnabled = sortBy === "manual" && !filterRelationship && !filterLabelId;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-text-muted text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
          People
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabelManager(!showLabelManager)}
            className="text-[12px] text-text-secondary hover:text-gold border border-border-subtle hover:border-gold-dim rounded-[4px] px-3 py-1.5 transition-colors"
          >
            ラベル管理
          </button>
          <Link href="/persons/new" className="btn-ghost">
            新規登録
          </Link>
        </div>
      </div>

      {/* ラベル管理パネル */}
      {showLabelManager && (
        <div className="card space-y-3">
          <h3 className="text-xs text-text-muted uppercase font-display tracking-widest">
            Label Management
          </h3>

          {/* 既存ラベル一覧 */}
          <div className="flex flex-wrap gap-2">
            {allLabels.map((label) => (
              <div
                key={label.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-border-subtle"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-text-primary">{label.name}</span>
                <button
                  onClick={() => deleteLabel(label.id)}
                  className="text-text-muted hover:text-danger transition-colors ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
            {allLabels.length === 0 && (
              <p className="text-text-muted text-xs">ラベルはまだありません</p>
            )}
          </div>

          {/* 新規ラベル作成 */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="ラベル名"
              className="input-underline flex-1"
              onKeyDown={(e) => e.key === "Enter" && createLabel()}
            />
            <button
              onClick={createLabel}
              disabled={!newLabelName.trim()}
              className="text-xs text-jade hover:text-gold transition-colors disabled:opacity-40"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* フィルター・ソートバー */}
      {persons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterRelationship}
            onChange={(e) => setFilterRelationship(e.target.value)}
            className="input-underline text-xs !py-1.5 !w-auto min-w-[100px]"
          >
            <option value="">関係性: すべて</option>
            {RELATIONSHIP_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={filterLabelId}
            onChange={(e) => setFilterLabelId(e.target.value)}
            className="input-underline text-xs !py-1.5 !w-auto min-w-[100px]"
          >
            <option value="">ラベル: すべて</option>
            {allLabels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="input-underline text-xs !py-1.5 !w-auto min-w-[100px]"
          >
            <option value="manual">手動並べ替え</option>
            <option value="name">名前順</option>
            <option value="updated">更新日順</option>
            <option value="score">スコア順</option>
          </select>

          {!isDragEnabled && sortBy === "manual" && (filterRelationship || filterLabelId) && (
            <span className="text-[10px] text-text-muted">
              ※フィルター中はドラッグ無効
            </span>
          )}
        </div>
      )}

      {/* 人物一覧 */}
      {persons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-muted mb-4">まだ人物が登録されていません</p>
          <Link href="/persons/new" className="btn-ghost">
            最初の人物を登録する
          </Link>
        </div>
      ) : sortedPersons.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-text-muted text-sm">
            条件に一致する人物がいません
          </p>
        </div>
      ) : isDragEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedPersons.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedPersons.map((person) => (
                <SortablePersonCard
                  key={person.id}
                  person={person}
                  onConsult={openConsultModal}
                  onDelete={handleDelete}
                  onClick={() => router.push(`/persons/${person.id}`)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {sortedPersons.map((person) => {
            const hasNote = person.quickNote !== null;
            return (
              <div
                key={person.id}
                onClick={() => router.push(`/persons/${person.id}`)}
                className="card !py-3 cursor-pointer hover:border-gold-dim transition-colors duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-primary text-[15px]">
                    {person.nickname}
                  </span>
                  {!hasNote && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/30">
                      未分析
                    </span>
                  )}
                  <span className="inline-block px-2 py-0.5 border border-border-subtle rounded-[4px] text-[11px] text-text-secondary">
                    {person.relationship}
                  </span>
                  {person.labels?.map((pl) => (
                    <span
                      key={pl.labelId}
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] text-white/90"
                      style={{ backgroundColor: pl.label.color }}
                    >
                      {pl.label.name}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-gold tracking-wider">
                    {scoreToStars(person.compatibilityScore)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => openConsultModal(e, person)}
                      className="text-jade text-xs hover:text-gold transition-colors"
                    >
                      この人物について相談する ›
                    </button>
                    {allLabels.length > 0 && (
                      <button
                        onClick={(e) => openLabelAssign(e, person)}
                        className="text-text-muted text-[11px] hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ラベル
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, person.id, person.nickname)}
                    className="text-text-muted hover:text-danger transition-colors text-xs opacity-0 group-hover:opacity-100"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== ラベル割り当てモーダル ===== */}
      {showLabelAssign && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLabelAssign(false);
          }}
        >
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="font-display text-lg text-gold tracking-wide">
              {labelAssignPersonName}のラベル
            </h3>

            {allLabels.length === 0 ? (
              <p className="text-text-muted text-sm">
                ラベルがありません。まずラベルを作成してください。
              </p>
            ) : (
              <div className="space-y-2">
                {allLabels.map((label) => (
                  <label
                    key={label.id}
                    className="flex items-center gap-3 py-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabelIds.includes(label.id)}
                      onChange={() => toggleLabelSelection(label.id)}
                      className="accent-jade"
                    />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-text-primary">
                      {label.name}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={saveLabelAssign} className="btn-ghost flex-1 text-sm">
                保存
              </button>
              <button
                onClick={() => setShowLabelAssign(false)}
                className="flex-1 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 相談モーダル ===== */}
      {showConsultModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConsultModal();
          }}
        >
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border-subtle">
              <h3 className="font-display text-lg text-gold tracking-wide">
                {consultPersonName}について相談する
              </h3>
              <button
                onClick={closeConsultModal}
                className="text-text-muted hover:text-text-primary text-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!consultResult ? (
                <>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">
                      相談内容
                    </label>
                    <textarea
                      value={consultContext}
                      onChange={(e) => setConsultContext(e.target.value)}
                      placeholder={consultPlaceholder}
                      rows={4}
                      className="w-full bg-transparent border border-border-subtle rounded px-3 py-2 text-text-primary text-sm outline-none resize-none placeholder:text-text-muted leading-relaxed focus:border-gold transition-colors"
                    />
                  </div>

                  {showDeepCountdown && (
                    <div className="text-center py-4">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <svg
                          className="w-full h-full -rotate-90"
                          viewBox="0 0 64 64"
                        >
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="rgba(201,168,76,0.15)"
                            strokeWidth="3"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="#7ec8c0"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${
                              2 * Math.PI * 28 * (countdown / 3)
                            }`}
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-display text-xl text-gold">
                          {countdown}
                        </span>
                      </div>
                      <p className="text-text-muted text-xs">
                        広告の代わりに{countdown}秒お待ちください...
                      </p>
                      <button
                        onClick={() => {
                          setShowDeepCountdown(false);
                          if (countdownRef.current)
                            clearInterval(countdownRef.current);
                        }}
                        className="mt-2 text-text-muted text-xs hover:text-text-secondary transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {consultLoading && (
                    <div className="flex items-center justify-center py-6 gap-3">
                      <div
                        className={`w-5 h-5 border-2 ${
                          consultType === "deep"
                            ? "border-jade"
                            : "border-gold"
                        } border-t-transparent rounded-full animate-spin`}
                      />
                      <span className="text-text-muted text-sm">
                        {consultType === "deep"
                          ? "深掘り相談中..."
                          : "相談中..."}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="relative">
                    <div
                      className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${
                        consultType === "deep"
                          ? "via-jade-dim"
                          : "via-gold-dim"
                      } to-transparent`}
                    />
                    <div className="py-4">
                      <h4 className="font-display text-base mb-3 tracking-wide">
                        {consultType === "deep" ? (
                          <span className="text-jade">✦ Deep Insight</span>
                        ) : (
                          <span className="text-gold">Action Plan</span>
                        )}
                      </h4>
                      <div className="markdown-body text-[13px]">
                        <ReactMarkdown>{consultResult}</ReactMarkdown>
                      </div>
                    </div>
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${
                        consultType === "deep"
                          ? "via-jade-dim"
                          : "via-gold-dim"
                      } to-transparent`}
                    />
                  </div>

                  {consultSaved && (
                    <p className="text-jade text-xs">
                      保存しました。履歴で確認できます。
                    </p>
                  )}

                  {consultCostInfo && (
                    <div className="text-[10px] text-text-muted bg-surface-hover rounded px-2 py-1 font-mono">
                      IN:{consultCostInfo.inputTokens} OUT:
                      {consultCostInfo.outputTokens} COST:¥
                      {consultCostInfo.estimatedCostJPY.toFixed(4)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* フッター */}
            {!consultResult && !consultLoading && !showDeepCountdown && (
              <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
                <button
                  onClick={runStandardConsult}
                  disabled={!consultContext.trim()}
                  className="btn-ghost flex-1 text-sm py-2.5"
                >
                  標準相談
                </button>
                <button
                  onClick={startDeepCountdown}
                  disabled={!consultContext.trim()}
                  className="flex-1 py-2.5 inline-flex items-center justify-center border border-jade/30 text-jade bg-transparent rounded-[4px] text-sm cursor-pointer transition-all duration-300 hover:bg-jade hover:text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="font-display mr-1">✦</span> 深掘り相談
                  <span className="ml-1 text-[10px] text-text-muted">📺</span>
                </button>
              </div>
            )}
            {consultResult && (
              <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border-subtle">
                <button
                  onClick={() => {
                    setConsultResult(null);
                    setConsultSaved(false);
                    setConsultContext("");
                  }}
                  className="btn-ghost flex-1 text-sm py-2.5"
                >
                  新しい相談
                </button>
                <button
                  onClick={closeConsultModal}
                  className="flex-1 py-2.5 text-text-secondary text-sm hover:text-text-primary transition-colors"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
