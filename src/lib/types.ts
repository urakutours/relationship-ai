// アプリ全体で使用する型定義

// 関係性タイプの選択肢
export const RELATIONSHIP_TYPES = [
  "上司",
  "部下",
  "配偶者",
  "クライアント",
  "友人",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// 性別の選択肢
export const GENDER_OPTIONS = ["男性", "女性", "その他"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

// 血液型の選択肢
export const BLOOD_TYPE_OPTIONS = ["A", "B", "O", "AB"] as const;
export type BloodType = (typeof BLOOD_TYPE_OPTIONS)[number];

// 出生順位の選択肢
export const BIRTH_ORDER_OPTIONS = [
  "長子",
  "中間",
  "末子",
  "一人っ子",
  "不明",
] as const;
export type BirthOrder = (typeof BIRTH_ORDER_OPTIONS)[number];

// 人物の入力データ
export interface PersonInput {
  nickname: string;
  relationship: RelationshipType;
  birthDate?: string | null;
  birthYear?: number | null;
  gender?: Gender | null;
  bloodType?: BloodType | null;
  birthCountry?: string | null;
  birthOrder?: BirthOrder | null;
  observations: string[];
}

// 接触頻度の選択肢
export const CONTACT_FREQUENCY_OPTIONS = [
  { value: "daily", label: "毎日会う" },
  { value: "weekly", label: "週1程度" },
  { value: "monthly", label: "月1程度" },
  { value: "few_times_year", label: "年数回" },
  { value: "rarely", label: "ほとんど会わない" },
] as const;
export type ContactFrequency = (typeof CONTACT_FREQUENCY_OPTIONS)[number]["value"];

// MBTI 16タイプ（英語名 + 日本語説明）
export const MBTI_TYPES_DATA = [
  { code: "INTJ", name: "Architect", desc: "戦略的な思考家" },
  { code: "INTP", name: "Logician", desc: "論理的な発明家" },
  { code: "ENTJ", name: "Commander", desc: "大胆な指導者" },
  { code: "ENTP", name: "Debater", desc: "知的な挑戦者" },
  { code: "INFJ", name: "Advocate", desc: "静かな理想主義者" },
  { code: "INFP", name: "Mediator", desc: "共感的な仲介者" },
  { code: "ENFJ", name: "Protagonist", desc: "カリスマ的な指導者" },
  { code: "ENFP", name: "Campaigner", desc: "情熱的な自由人" },
  { code: "ISTJ", name: "Logistician", desc: "誠実な管理者" },
  { code: "ISFJ", name: "Defender", desc: "献身的な守護者" },
  { code: "ESTJ", name: "Executive", desc: "秩序ある管理者" },
  { code: "ESFJ", name: "Consul", desc: "社交的な世話役" },
  { code: "ISTP", name: "Virtuoso", desc: "大胆な職人" },
  { code: "ISFP", name: "Adventurer", desc: "柔軟な芸術家" },
  { code: "ESTP", name: "Entrepreneur", desc: "エネルギッシュな起業家" },
  { code: "ESFP", name: "Entertainer", desc: "陽気なエンターテイナー" },
] as const;

// 後方互換: コード配列
export const MBTI_TYPES = MBTI_TYPES_DATA.map((m) => m.code) as unknown as readonly [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];
export type MbtiType = (typeof MBTI_TYPES)[number];

// 婚姻状況の選択肢
export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "独身" },
  { value: "married", label: "既婚" },
  { value: "divorced", label: "離婚" },
  { value: "unknown", label: "不明" },
] as const;
export type MaritalStatus = (typeof MARITAL_STATUS_OPTIONS)[number]["value"];

// 子供の有無
export const HAS_CHILDREN_OPTIONS = [
  { value: "yes", label: "あり" },
  { value: "no", label: "なし" },
  { value: "unknown", label: "不明" },
] as const;
export type HasChildren = (typeof HAS_CHILDREN_OPTIONS)[number]["value"];

// 観察メモカテゴリ
export const OBSERVATION_CATEGORIES = [
  { value: "behavior", label: "行動パターン", icon: "🔄" },
  { value: "preference", label: "好み・趣味", icon: "❤️" },
  { value: "ng", label: "地雷・NG事項", icon: "⚠️" },
  { value: "success", label: "成功体験", icon: "✨" },
  { value: "change", label: "最近の変化", icon: "📈" },
  { value: "other", label: "その他", icon: "📝" },
] as const;
export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]["value"];

// 観察メモ
export interface ObservationData {
  id: string;
  content: string;
  category: ObservationCategory | null;
  createdAt: string;
}

// ラベルデータ
export interface LabelData {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

// 人物×ラベル中間データ
export interface PersonLabelData {
  personId: string;
  labelId: number;
  label: LabelData;
}

// 人物データ（DB取得後）
export interface PersonData {
  id: string;
  nickname: string;
  relationship: string;
  relationshipCategory: string | null;
  relationshipSubtype: string | null;
  relationshipDetail: string | null;
  birthDate: string | null;
  birthYear: number | null;
  gender: string | null;
  bloodType: string | null;
  birthCountry: string | null;
  birthOrder: string | null;
  honorific: string | null;
  personalContext: string | null;
  acquaintanceDate: string | null;
  intimacyScore: number | null;
  contactFrequency: string | null;
  mbti: string | null;
  maritalStatus: string | null;
  hasChildren: string | null;
  observations: ObservationData[];
  labels: PersonLabelData[];
  sortOrder: number | null;
  // AI生成ノート
  quickNote: string | null;
  deepNote: string | null;
  compatibilityScore: number | null;
  quickNoteUpdatedAt: string | null;
  deepNoteUpdatedAt: string | null;
  // 圧縮記憶
  compressedMemory: string | null;
  memoryUpdatedAt: string | null;
  consultCount: number;
  createdAt: string;
  updatedAt: string;
}

// 占術計算結果
export interface DivinationResult {
  solarSign: string | null; // 西洋星座
  numerology: number | null; // 誕生数
  kyusei: string | null; // 九星
  dayKan: string | null; // 日干
  dayPillar: string | null; // 日柱（干支）
  wuxingProfile: WuxingProfile | null; // 五行プロフィール
}

// 五行プロフィール
export interface WuxingProfile {
  wood: number; // 木
  fire: number; // 火
  earth: number; // 土
  metal: number; // 金
  water: number; // 水
}

// 自分のプロフィール情報（AI送信用）
export interface MyselfInfo {
  nickname: string;
  observedTraits: string[];
  divination: DivinationResult | null;
}

// AI相談ペイロード
export interface ConsultPayload {
  userType: "FREE" | "PREMIUM" | "DEEP";
  myself: MyselfInfo | null; // 自分のプロフィール（未登録時はnull）
  target: {
    nickname: string;
    honorific?: string | null;
    relationship: string;
    observedTraits: string[];
    divination: DivinationResult;
    compressedMemory?: CompressedMemory | null;
    recentConsultations?: { date: string; query: string }[];
  };
  consultationContext: string;
}

// 圧縮記憶
export interface CompressedMemory {
  keyTraits: string[];          // 判明した性格特性（最大5件）
  successPatterns: string[];    // うまくいったアプローチ（最大5件）
  failurePatterns: string[];    // 失敗したアプローチ（最大3件）
  importantContext: string[];   // 重要な文脈メモ（最大3件）
  lastConsulted: string;        // ISO日付文字列
  consultCount: number;
}

// 相談履歴
export interface ConsultationLogData {
  id: string;
  personId: string;
  consultType: string;
  context: string;
  result: string;
  outcome?: string | null;
  outcomeRating?: number | null;
  createdAt: string;
  person?: { id: string; nickname: string; relationship: string };
}

// APIレスポンスに含めるコスト情報（開発環境用）
export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostJPY: number;
}

// 月次ガイダンスJSON構造
export interface MonthlyGuidance {
  monthlyTheme: string;    // 今月のテーマ（20文字以内）
  overview: string;        // 全体的な運勢・傾向（100文字程度）
  relationships: string;   // 人間関係の注意点と活かし方（100文字程度）
  keyAction: string;       // 今月中に実行する具体的アクション（50文字以内）
  luckyPoint: string;      // 意識すると良いこと（20文字以内）
}

// 週次ガイダンスJSON構造
export interface WeeklyGuidance {
  weeklyFocus: string;     // 今週の焦点（20文字以内）
  overview: string;        // 今週の傾向（80文字程度）
  relationships: string;   // 人間関係で意識すること（80文字程度）
  bestDays: string;        // おすすめ行動日（例: 「水曜・木曜は交渉事に◎」）
  keyAction: string;       // 今週の具体的アクション（50文字以内）
}
