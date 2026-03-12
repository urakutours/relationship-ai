// 関係性カテゴリとサブタイプの2階層定義

export interface RelationshipSubtype {
  value: string;
  label: string;
}

export interface RelationshipCategoryDef {
  value: string;
  label: string;
  icon: string;
  subtypes: RelationshipSubtype[];
}

export const RELATIONSHIP_CATEGORIES: RelationshipCategoryDef[] = [
  {
    value: "workplace",
    label: "職場・仕事",
    icon: "💼",
    subtypes: [
      { value: "boss", label: "上司" },
      { value: "subordinate", label: "部下" },
      { value: "colleague", label: "同僚（同期）" },
      { value: "senior", label: "先輩" },
      { value: "junior", label: "後輩" },
      { value: "client", label: "取引先・クライアント" },
      { value: "partner", label: "ビジネスパートナー" },
    ],
  },
  {
    value: "family",
    label: "家族・親族",
    icon: "🏠",
    subtypes: [
      { value: "father", label: "父" },
      { value: "mother", label: "母" },
      { value: "grandfather", label: "祖父" },
      { value: "grandmother", label: "祖母" },
      { value: "older_brother", label: "兄" },
      { value: "older_sister", label: "姉" },
      { value: "younger_brother", label: "弟" },
      { value: "younger_sister", label: "妹" },
      { value: "son", label: "息子" },
      { value: "daughter", label: "娘" },
      { value: "grandchild", label: "孫" },
      { value: "uncle", label: "叔父・伯父" },
      { value: "aunt", label: "叔母・伯母" },
      { value: "father_in_law", label: "義父" },
      { value: "mother_in_law", label: "義母" },
      { value: "sibling_in_law", label: "義兄弟・義姉妹" },
      { value: "other_relative", label: "その他親族" },
    ],
  },
  {
    value: "romantic",
    label: "恋愛・パートナー",
    icon: "❤️",
    subtypes: [
      { value: "lover", label: "恋人・パートナー" },
      { value: "spouse", label: "配偶者・夫・妻" },
      { value: "ex", label: "元恋人" },
      { value: "crush", label: "片思いの相手" },
    ],
  },
  {
    value: "friend",
    label: "友人・知人",
    icon: "🤝",
    subtypes: [
      { value: "best_friend", label: "親友" },
      { value: "friend", label: "友人" },
      { value: "acquaintance", label: "知人" },
      { value: "childhood_friend", label: "幼なじみ" },
      { value: "online_friend", label: "ネット上の友人" },
    ],
  },
  {
    value: "school",
    label: "学校",
    icon: "🎓",
    subtypes: [
      { value: "teacher", label: "先生・教師・講師" },
      { value: "classmate", label: "同級生・クラスメート" },
      { value: "school_senior", label: "先輩（学校）" },
      { value: "school_junior", label: "後輩（学校）" },
    ],
  },
  {
    value: "community",
    label: "近隣・コミュニティ",
    icon: "🏘️",
    subtypes: [
      { value: "neighbor", label: "ご近所" },
      { value: "parent_friend", label: "ママ友・パパ友" },
      { value: "hobby_friend", label: "趣味仲間" },
      { value: "community_member", label: "コミュニティメンバー" },
    ],
  },
  {
    value: "other",
    label: "その他",
    icon: "📌",
    subtypes: [
      { value: "other", label: "その他" },
    ],
  },
];

/** カテゴリ値からカテゴリ定義を取得 */
export function getCategoryDef(categoryValue: string): RelationshipCategoryDef | undefined {
  return RELATIONSHIP_CATEGORIES.find(c => c.value === categoryValue);
}

/** サブタイプ値からサブタイプ定義を取得 */
export function getSubtypeDef(categoryValue: string, subtypeValue: string): RelationshipSubtype | undefined {
  const cat = getCategoryDef(categoryValue);
  return cat?.subtypes.find(s => s.value === subtypeValue);
}

/** 表示用ラベルを生成：「カテゴリ > サブタイプ（補足）」 */
export function formatRelationshipLabel(
  category: string | null,
  subtype: string | null,
  detail?: string | null
): string {
  if (!category || !subtype) {
    // 旧データ互換
    return subtype || category || "不明";
  }
  const catDef = getCategoryDef(category);
  const subDef = catDef?.subtypes.find(s => s.value === subtype);
  const subLabel = subDef?.label || subtype;
  if (detail) return `${subLabel}（${detail}）`;
  return subLabel;
}

/** 短い表示用（カードなど） */
export function formatRelationshipShort(
  category: string | null,
  subtype: string | null,
  relationship?: string | null
): string {
  if (subtype) {
    const catDef = getCategoryDef(category || "");
    const subDef = catDef?.subtypes.find(s => s.value === subtype);
    return subDef?.label || subtype;
  }
  // 旧データ互換: relationshipフィールドをそのまま使う
  return relationship || "不明";
}

/** 旧関係性→新構造へのマッピング */
export const LEGACY_RELATIONSHIP_MAP: Record<string, { category: string; subtype: string }> = {
  "上司": { category: "workplace", subtype: "boss" },
  "部下": { category: "workplace", subtype: "subordinate" },
  "配偶者": { category: "romantic", subtype: "spouse" },
  "クライアント": { category: "workplace", subtype: "client" },
  "友人": { category: "friend", subtype: "friend" },
};
