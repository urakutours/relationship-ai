"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PersonData } from "@/lib/types";

/** 相性スコア→星表示（1〜5、未生成は"--"） */
function scoreToStars(score: number | null): string {
  if (score === null) return "--";
  const stars = Math.min(5, Math.max(1, Math.round(score / 20)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export default function PersonsListPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersons();
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

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    nickname: string
  ) => {
    e.stopPropagation(); // 行クリック遷移を防止
    if (!confirm(`「${nickname}」を削除しますか？`)) return;
    try {
      await fetch(`/api/persons?id=${id}`, { method: "DELETE" });
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("削除エラー:", error);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
          People
        </h1>
        <Link href="/persons/new" className="btn-ghost">
          新規登録
        </Link>
      </div>

      {persons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-muted mb-4">まだ人物が登録されていません</p>
          <Link href="/persons/new" className="btn-ghost">
            最初の人物を登録する
          </Link>
        </div>
      ) : (
        <>
          {/* === デスクトップ: テーブル形式 === */}
          <div className="hidden md:block space-y-0">
            {/* ヘッダー行 */}
            <div className="flex items-center px-4 py-2 text-[11px] text-text-muted uppercase font-display tracking-widest border-b border-border-subtle">
              <span className="flex-1">Name</span>
              <span className="w-24 text-center">Relation</span>
              <span className="w-28 text-center">Score</span>
              <span className="w-24 text-center">Action</span>
              <span className="w-12" />
            </div>

            {/* 人物リスト */}
            {persons.map((person) => {
              const hasNote = person.quickNote !== null;
              return (
                <div
                  key={person.id}
                  onClick={() => router.push(`/persons/${person.id}`)}
                  className="flex items-center px-4 py-4 border-b border-border-subtle hover:bg-surface-hover transition-colors duration-200 group cursor-pointer"
                >
                  {/* 名前・観察メモ + 未分析バッジ */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-text-primary text-[15px]">
                        {person.nickname}
                      </span>
                      {!hasNote && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/30">
                          未分析
                        </span>
                      )}
                      {person.observations.length > 0 && (
                        <span className="text-text-muted text-xs truncate max-w-[200px]">
                          {person.observations
                            .map((o) => o.content)
                            .join("、")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 関係性タグ */}
                  <div className="w-24 text-center">
                    <span className="inline-block px-2 py-0.5 border border-border-subtle rounded-[4px] text-[11px] text-text-secondary">
                      {person.relationship}
                    </span>
                  </div>

                  {/* 相性スコア（星） */}
                  <div className="w-28 text-center text-xs text-gold tracking-wider">
                    {scoreToStars(person.compatibilityScore)}
                  </div>

                  {/* 相談ボタン */}
                  <div className="w-24 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/consult?personId=${person.id}`);
                      }}
                      className="inline-block px-2 py-1 border border-gold-dim rounded-[4px] text-[11px] text-gold hover:bg-gold hover:text-base transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      相談する
                    </button>
                  </div>

                  {/* 削除 */}
                  <div className="w-12 flex items-center justify-end">
                    <button
                      onClick={(e) =>
                        handleDelete(e, person.id, person.nickname)
                      }
                      className="text-text-muted hover:text-danger transition-colors text-xs opacity-0 group-hover:opacity-100"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* === モバイル: カード形式 === */}
          <div className="md:hidden space-y-3">
            {persons.map((person) => {
              const hasNote = person.quickNote !== null;
              return (
                <div
                  key={person.id}
                  onClick={() => router.push(`/persons/${person.id}`)}
                  className="card !p-4 cursor-pointer active:bg-surface-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* 左: 名前 + 関係性 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
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
                      </div>

                      {/* 観察メモ（1行にトランケート） */}
                      {person.observations.length > 0 && (
                        <p className="text-text-muted text-xs truncate">
                          {person.observations
                            .map((o) => o.content)
                            .join("、")}
                        </p>
                      )}
                    </div>

                    {/* 右: スコア + 削除 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gold">
                        {scoreToStars(person.compatibilityScore)}
                      </span>
                      <button
                        onClick={(e) =>
                          handleDelete(e, person.id, person.nickname)
                        }
                        className="text-text-muted hover:text-danger transition-colors text-xs"
                      >
                        &#x2715;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
