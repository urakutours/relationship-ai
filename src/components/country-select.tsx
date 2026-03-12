"use client";

import { useState, useRef, useEffect } from "react";

// 主要国リスト（50カ国以上）
const COUNTRIES = [
  "日本", "アメリカ", "中国", "韓国", "台湾", "香港",
  "イギリス", "フランス", "ドイツ", "イタリア", "スペイン", "ポルトガル",
  "オランダ", "ベルギー", "スイス", "オーストリア", "スウェーデン", "ノルウェー",
  "デンマーク", "フィンランド", "ポーランド", "チェコ", "ハンガリー", "ルーマニア",
  "ギリシャ", "トルコ", "ロシア", "ウクライナ",
  "オーストラリア", "ニュージーランド", "カナダ",
  "ブラジル", "アルゼンチン", "メキシコ", "チリ", "コロンビア", "ペルー",
  "インド", "パキスタン", "バングラデシュ", "スリランカ", "ネパール",
  "タイ", "ベトナム", "フィリピン", "インドネシア", "マレーシア", "シンガポール",
  "ミャンマー", "カンボジア", "ラオス",
  "エジプト", "南アフリカ", "ナイジェリア", "ケニア", "モロッコ",
  "サウジアラビア", "UAE", "イスラエル", "イラン", "イラク",
  "モンゴル", "北朝鮮",
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CountrySelect({ value, onChange, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [isCustom, setIsCustom] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部から value が変わった場合に同期
  useEffect(() => {
    setQuery(value);
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

  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (country: string) => {
    setQuery(country);
    onChange(country);
    setOpen(false);
    setIsCustom(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    setIsCustom(true);
    onChange(v);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder="国名を入力..."
        className="input-underline"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-bg-primary border border-border-subtle rounded-lg shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gold/10 hover:text-gold ${
                  c === value ? "text-gold bg-gold/5" : "text-text-secondary"
                }`}
              >
                {c}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-text-muted">
              {isCustom && query ? `「${query}」をそのまま使用` : "候補がありません"}
            </div>
          )}
          {query && !COUNTRIES.includes(query) && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelect(query)}
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
