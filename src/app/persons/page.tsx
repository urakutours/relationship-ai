"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PersonData, DivinationResult } from "@/lib/types";

export default function PersonsListPage() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);
  // 占術データのキャッシュ
  const [divinations, setDivinations] = useState<
    Record<string, DivinationResult>
  >({});

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      setPersons(data);

      // 各人物の占術データを取得
      for (const person of data) {
        if (person.birthDate || person.birthYear) {
          fetch(`/api/persons/divination?id=${person.id}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.divination) {
                setDivinations((prev) => ({
                  ...prev,
                  [person.id]: d.divination,
                }));
              }
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error("人物一覧取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nickname: string) => {
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
        <div className="space-y-0">
          {/* ヘッダー行 */}
          <div className="flex items-center px-4 py-2 text-[11px] text-text-muted uppercase font-display tracking-widest border-b border-border-subtle">
            <span className="flex-1">Name</span>
            <span className="w-24 text-center">Relation</span>
            <span className="w-20 text-center">Score</span>
            <span className="w-16" />
          </div>

          {/* 人物リスト */}
          {persons.map((person) => {
            const div = divinations[person.id];
            return (
              <div
                key={person.id}
                className="flex items-center px-4 py-4 border-b border-border-subtle hover:bg-surface-hover transition-colors duration-200 group"
              >
                {/* 名前・観察メモ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary text-[15px]">
                      {person.nickname}
                    </span>
                    {person.observations.length > 0 && (
                      <span className="text-text-muted text-xs truncate max-w-[200px]">
                        {person.observations.map((o) => o.content).join("、")}
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

                {/* 簡易スコア（占術データから星表示） */}
                <div className="w-20 text-center text-xs text-gold">
                  {div ? "★".repeat(Math.min(5, Math.max(1, Math.ceil((div.numerology || 3) / 2)))) : "—"}
                </div>

                {/* アクション */}
                <div className="w-16 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDelete(person.id, person.nickname)}
                    className="text-text-muted hover:text-danger transition-colors text-xs opacity-0 group-hover:opacity-100"
                  >
                    削除
                  </button>
                  <span className="text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                    &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
