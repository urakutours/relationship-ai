"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PersonData } from "@/lib/types";
import { formatRelationshipShort } from "@/lib/relationship-types";

export default function NewConsultPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/persons")
      .then((r) => r.json())
      .then((data) => setPersons(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
          新しい相談
        </h1>
        <Link
          href="/consult"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 履歴に戻る
        </Link>
      </div>

      <p className="text-text-secondary text-sm">
        相談したい人物を選んでください。
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : persons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary text-sm mb-3">
            人物が登録されていません
          </p>
          <Link
            href="/persons/new"
            className="btn-ghost text-sm"
          >
            人物を登録する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {persons.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/persons/${p.id}`)}
              className="card w-full text-left hover:border-gold transition-all duration-300 group flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary text-sm font-medium">
                    {p.nickname}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-muted">
                    {formatRelationshipShort(
                      p.relationshipCategory,
                      p.relationshipSubtype,
                      p.relationship
                    )}
                  </span>
                  {p.compatibilityScore && (
                    <span className="text-gold text-xs">
                      {"★".repeat(Math.round(p.compatibilityScore / 20))}
                    </span>
                  )}
                </div>
                {p.quickNote && (
                  <p className="text-text-muted text-xs mt-1 truncate">
                    {p.quickNote.split("\n")[0]?.replace(/^#+\s*/, "")}
                  </p>
                )}
              </div>
              <span className="text-text-muted group-hover:text-gold transition-colors shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
