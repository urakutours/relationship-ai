// 国名データ（日本語・英語・ISOコード）

export interface CountryEntry {
  ja: string;
  en: string;
  iso: string;
}

export const COUNTRIES: CountryEntry[] = [
  { ja: "日本", en: "Japan", iso: "JP" },
  { ja: "アメリカ", en: "United States", iso: "US" },
  { ja: "中国", en: "China", iso: "CN" },
  { ja: "韓国", en: "South Korea", iso: "KR" },
  { ja: "台湾", en: "Taiwan", iso: "TW" },
  { ja: "香港", en: "Hong Kong", iso: "HK" },
  { ja: "イギリス", en: "United Kingdom", iso: "GB" },
  { ja: "フランス", en: "France", iso: "FR" },
  { ja: "ドイツ", en: "Germany", iso: "DE" },
  { ja: "イタリア", en: "Italy", iso: "IT" },
  { ja: "スペイン", en: "Spain", iso: "ES" },
  { ja: "ポルトガル", en: "Portugal", iso: "PT" },
  { ja: "オランダ", en: "Netherlands", iso: "NL" },
  { ja: "ベルギー", en: "Belgium", iso: "BE" },
  { ja: "スイス", en: "Switzerland", iso: "CH" },
  { ja: "オーストリア", en: "Austria", iso: "AT" },
  { ja: "スウェーデン", en: "Sweden", iso: "SE" },
  { ja: "ノルウェー", en: "Norway", iso: "NO" },
  { ja: "デンマーク", en: "Denmark", iso: "DK" },
  { ja: "フィンランド", en: "Finland", iso: "FI" },
  { ja: "ポーランド", en: "Poland", iso: "PL" },
  { ja: "チェコ", en: "Czech Republic", iso: "CZ" },
  { ja: "ハンガリー", en: "Hungary", iso: "HU" },
  { ja: "ルーマニア", en: "Romania", iso: "RO" },
  { ja: "ギリシャ", en: "Greece", iso: "GR" },
  { ja: "トルコ", en: "Turkey", iso: "TR" },
  { ja: "ロシア", en: "Russia", iso: "RU" },
  { ja: "ウクライナ", en: "Ukraine", iso: "UA" },
  { ja: "オーストラリア", en: "Australia", iso: "AU" },
  { ja: "ニュージーランド", en: "New Zealand", iso: "NZ" },
  { ja: "カナダ", en: "Canada", iso: "CA" },
  { ja: "ブラジル", en: "Brazil", iso: "BR" },
  { ja: "アルゼンチン", en: "Argentina", iso: "AR" },
  { ja: "メキシコ", en: "Mexico", iso: "MX" },
  { ja: "チリ", en: "Chile", iso: "CL" },
  { ja: "コロンビア", en: "Colombia", iso: "CO" },
  { ja: "ペルー", en: "Peru", iso: "PE" },
  { ja: "インド", en: "India", iso: "IN" },
  { ja: "パキスタン", en: "Pakistan", iso: "PK" },
  { ja: "バングラデシュ", en: "Bangladesh", iso: "BD" },
  { ja: "スリランカ", en: "Sri Lanka", iso: "LK" },
  { ja: "ネパール", en: "Nepal", iso: "NP" },
  { ja: "タイ", en: "Thailand", iso: "TH" },
  { ja: "ベトナム", en: "Vietnam", iso: "VN" },
  { ja: "フィリピン", en: "Philippines", iso: "PH" },
  { ja: "インドネシア", en: "Indonesia", iso: "ID" },
  { ja: "マレーシア", en: "Malaysia", iso: "MY" },
  { ja: "シンガポール", en: "Singapore", iso: "SG" },
  { ja: "ミャンマー", en: "Myanmar", iso: "MM" },
  { ja: "カンボジア", en: "Cambodia", iso: "KH" },
  { ja: "ラオス", en: "Laos", iso: "LA" },
  { ja: "エジプト", en: "Egypt", iso: "EG" },
  { ja: "南アフリカ", en: "South Africa", iso: "ZA" },
  { ja: "ナイジェリア", en: "Nigeria", iso: "NG" },
  { ja: "ケニア", en: "Kenya", iso: "KE" },
  { ja: "モロッコ", en: "Morocco", iso: "MA" },
  { ja: "サウジアラビア", en: "Saudi Arabia", iso: "SA" },
  { ja: "UAE", en: "United Arab Emirates", iso: "AE" },
  { ja: "イスラエル", en: "Israel", iso: "IL" },
  { ja: "イラン", en: "Iran", iso: "IR" },
  { ja: "イラク", en: "Iraq", iso: "IQ" },
  { ja: "モンゴル", en: "Mongolia", iso: "MN" },
  { ja: "北朝鮮", en: "North Korea", iso: "KP" },
];

/**
 * ISOコードまたは日本語名から表示用の国名を取得
 * DB内に "JP" や "日本" などが混在していても正しく解決する
 */
export function resolveCountryDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const entry = COUNTRIES.find(
    (c) => c.iso === value.toUpperCase() || c.ja === value || c.en.toLowerCase() === value.toLowerCase()
  );
  return entry ? `${entry.ja}（${entry.en}）` : value;
}

/**
 * ISOコードまたは日本語名から日本語国名のみを取得
 */
export function resolveCountryJa(value: string | null | undefined): string {
  if (!value) return "";
  const entry = COUNTRIES.find(
    (c) => c.iso === value.toUpperCase() || c.ja === value || c.en.toLowerCase() === value.toLowerCase()
  );
  return entry ? entry.ja : value;
}
