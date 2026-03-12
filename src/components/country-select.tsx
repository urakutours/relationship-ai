"use client";

import { useState, useRef, useEffect } from "react";
import { COUNTRIES, type CountryEntry } from "@/lib/countries";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CountrySelect({ value, onChange, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // value から表示テキストを解決
  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }
    const entry = COUNTRIES.find(
      (c) => c.ja === value || c.iso === value.toUpperCase() || c.en.toLowerCase() === value.toLowerCase()
    );
    setQuery(entry ? entry.ja : value);
  }, [value]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // フィルタリング: 日本語・英語・ISOで検索
  const filtered = COUNTRIES.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.ja.toLowerCase().includes(q) ||
      c.en.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  const handleSelect = (entry: CountryEntry) => {
    setQuery(entry.ja);
    onChange(entry.ja);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    onChange(v);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder="国名を入力（日本語・英語どちらでも）"
        className="input-underline"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-bg-primary border border-border-subtle rounded-lg shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gold/10 hover:text-gold ${
                  c.ja === value || c.iso === value?.toUpperCase() ? "text-gold bg-gold/5" : "text-text-secondary"
                }`}
              >
                <span>{c.ja}</span>
                <span className="text-text-muted ml-2 text-xs">({c.en})</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-text-muted">
              {query ? `「${query}」をそのまま使用` : "候補がありません"}
            </div>
          )}
          {query && !COUNTRIES.some((c) => c.ja === query || c.en.toLowerCase() === query.toLowerCase()) && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange(query); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-jade hover:bg-jade/10 border-t border-border-subtle"
            >
              その他: 「{query}」を使用
            </button>
          )}
        </div>
      )}
    </div>
  );
}
