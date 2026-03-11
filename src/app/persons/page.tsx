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
      <div className="flex justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">人物一覧</h1>
        <Link
          href="/persons/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          新規登録
        </Link>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">まだ人物が登録されていません</p>
          <Link
            href="/persons/new"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            最初の人物を登録する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {persons.map((person) => {
            const div = divinations[person.id];
            return (
              <div
                key={person.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {person.nickname}
                      </h2>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                        {person.relationship}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      {person.birthDate && (
                        <span>生年月日: {person.birthDate}</span>
                      )}
                      {person.birthYear && !person.birthDate && (
                        <span>生まれ年: {person.birthYear}年</span>
                      )}
                      {person.gender && <span>{person.gender}</span>}
                      {person.bloodType && (
                        <span>{person.bloodType}型</span>
                      )}
                      {person.birthCountry && (
                        <span>{person.birthCountry}</span>
                      )}
                      {person.birthOrder && person.birthOrder !== "不明" && (
                        <span>{person.birthOrder}</span>
                      )}
                    </div>

                    {/* 占術結果 */}
                    {div && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {div.solarSign && (
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                            {div.solarSign}
                          </span>
                        )}
                        {div.numerology && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                            誕生数{div.numerology}
                          </span>
                        )}
                        {div.kyusei && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                            {div.kyusei}
                          </span>
                        )}
                        {div.dayPillar && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                            日柱: {div.dayPillar}
                          </span>
                        )}
                        {div.wuxingProfile && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                            五行: 木{div.wuxingProfile.wood} 火
                            {div.wuxingProfile.fire} 土
                            {div.wuxingProfile.earth} 金
                            {div.wuxingProfile.metal} 水
                            {div.wuxingProfile.water}
                          </span>
                        )}
                      </div>
                    )}

                    {person.observations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {person.observations.map((obs) => (
                          <span
                            key={obs.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {obs.content}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(person.id, person.nickname)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm ml-4"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
