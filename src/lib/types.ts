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

// 観察メモ
export interface ObservationData {
  id: string;
  content: string;
  createdAt: string;
}

// 人物データ（DB取得後）
export interface PersonData {
  id: string;
  nickname: string;
  relationship: string;
  birthDate: string | null;
  birthYear: number | null;
  gender: string | null;
  bloodType: string | null;
  birthCountry: string | null;
  birthOrder: string | null;
  personalContext: string | null;
  observations: ObservationData[];
  // AI生成ノート
  quickNote: string | null;
  deepNote: string | null;
  compatibilityScore: number | null;
  quickNoteUpdatedAt: string | null;
  deepNoteUpdatedAt: string | null;
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
    relationship: string;
    observedTraits: string[];
    divination: DivinationResult;
  };
  consultationContext: string;
}

// 相談履歴
export interface ConsultationLogData {
  id: string;
  personId: string;
  consultType: string;
  context: string;
  result: string;
  createdAt: string;
}

// APIレスポンスに含めるコスト情報（開発環境用）
export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostJPY: number;
}
