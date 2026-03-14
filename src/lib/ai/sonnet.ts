// Sonnet（ディープ相談）呼び出しモジュール
// 用途: 具体的なアクションプランの生成

import {
  DIVINATION_SYSTEM_PROMPT,
  SONNET_CONSULT_FREE_INSTRUCTION,
  SONNET_CONSULT_PREMIUM_INSTRUCTION,
  SONNET_CONSULT_DEEP_INSTRUCTION,
  SONNET_MONTHLY_GUIDANCE_INSTRUCTION,
  SONNET_WEEKLY_GUIDANCE_INSTRUCTION,
} from "./prompts";
import { getClient } from "./client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import type { CostInfo, ConsultPayload, DivinationResult } from "@/lib/types";

const SONNET_MODEL = "claude-sonnet-4-6";

// ユーザータイプ別の出力トークン上限
const TOKEN_LIMITS = {
  FREE: 600,
  PREMIUM: 1200,
  DEEP: 1500,
} as const;

/** usageからキャッシュトークン数を安全に取得するヘルパー */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCacheTokens(usage: any): { read: number; write: number } {
  return {
    read: (usage.cache_read_input_tokens as number) ?? 0,
    write: (usage.cache_creation_input_tokens as number) ?? 0,
  };
}

/** ディープ相談の結果型 */
export interface ConsultResult {
  actionPlan: string;
  costInfo?: CostInfo;
  isTruncated?: boolean;
  truncatedContext?: string;
}

/**
 * Sonnetでディープ相談のアクションプランを生成する
 */
export async function generateConsultation(
  payload: ConsultPayload
): Promise<ConsultResult> {
  const anthropic = getClient();
  const { userType, myself, target, consultationContext } = payload;

  const maxTokens = TOKEN_LIMITS[userType] ?? TOKEN_LIMITS.FREE;
  const instruction =
    userType === "DEEP"
      ? SONNET_CONSULT_DEEP_INSTRUCTION
      : userType === "PREMIUM"
        ? SONNET_CONSULT_PREMIUM_INSTRUCTION
        : SONNET_CONSULT_FREE_INSTRUCTION;

  // myself（自分）セクションの構築
  let myselfSection = "";
  if (myself) {
    const myselfDiv = myself.divination;
    myselfSection = `
## myself（相談者自身）
ニックネーム: ${myself.nickname}
特性メモ: ${myself.observedTraits.length > 0 ? myself.observedTraits.join("、") : "なし"}
西洋星座: ${myselfDiv?.solarSign ?? "不明"}
数秘術（誕生数）: ${myselfDiv?.numerology ?? "不明"}
九星: ${myselfDiv?.kyusei ?? "不明"}
日干: ${myselfDiv?.dayKan ?? "不明"}
五行バランス: ${
      myselfDiv?.wuxingProfile
        ? `木${myselfDiv.wuxingProfile.wood} 火${myselfDiv.wuxingProfile.fire} 土${myselfDiv.wuxingProfile.earth} 金${myselfDiv.wuxingProfile.metal} 水${myselfDiv.wuxingProfile.water}`
        : "不明"
    }
`;
  }

  // 圧縮記憶セクションの構築
  let compressedMemorySection = "";
  if (target.compressedMemory) {
    const cm = target.compressedMemory;
    compressedMemorySection = `
## 過去の相談から判明した情報
性格特性: ${cm.keyTraits.length > 0 ? cm.keyTraits.join("、") : "なし"}
成功パターン: ${cm.successPatterns.length > 0 ? cm.successPatterns.join("、") : "なし"}
失敗パターン: ${cm.failurePatterns.length > 0 ? cm.failurePatterns.join("、") : "なし"}
重要な文脈: ${cm.importantContext.length > 0 ? cm.importantContext.join("、") : "なし"}
過去の相談回数: ${cm.consultCount}回
`;
  }

  // 直近の相談履歴セクション
  let recentSection = "";
  if (target.recentConsultations && target.recentConsultations.length > 0) {
    recentSection = `
## 直近の相談
${target.recentConsultations.map((c) => `- ${c.date}: ${c.query}`).join("\n")}
`;
  }

  // 敬称指示
  const honorificSuffix = target.honorific || "さん";
  const honorificNote = `
## 名前の呼び方
- ${target.nickname}を呼ぶ際は「${target.nickname}${honorificSuffix}」と呼んでください
${myself ? `- ${myself.nickname}を呼ぶ際は「${myself.nickname}さん」と呼んでください` : ""}
`;

  // ユーザーメッセージの構築
  const userMessage = `${myselfSection}
## target（相談相手）
ニックネーム: ${target.nickname}
敬称: ${honorificSuffix}
関係性: ${target.relationship}
観察メモ: ${target.observedTraits.length > 0 ? target.observedTraits.join("、") : "なし"}
西洋星座: ${target.divination.solarSign ?? "不明"}
数秘術（誕生数）: ${target.divination.numerology ?? "不明"}
九星: ${target.divination.kyusei ?? "不明"}
日干: ${target.divination.dayKan ?? "不明"}
五行バランス: ${
    target.divination.wuxingProfile
      ? `木${target.divination.wuxingProfile.wood} 火${target.divination.wuxingProfile.fire} 土${target.divination.wuxingProfile.earth} 金${target.divination.wuxingProfile.metal} 水${target.divination.wuxingProfile.water}`
      : "不明"
  }
${compressedMemorySection}${recentSection}${honorificNote}
## consultationContext（相談内容）
${consultationContext}
`;

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: DIVINATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: instruction,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const cache = getCacheTokens(response.usage);

  // コスト計算（開発環境のみ）
  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
      : undefined;

  // コストログDB書き込み（全環境）
  logApiCost("consultation", SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const isTruncated = response.stop_reason === "max_tokens";

  return {
    actionPlan: text.trim() || "アクションプランを生成できませんでした。",
    costInfo,
    isTruncated,
    truncatedContext: isTruncated ? text.trim() : undefined,
  };
}

/** ガイダンス生成結果 */
export interface GuidanceResult {
  content: string;
  costInfo?: CostInfo;
}

/** ユーザープロフィール情報（ガイダンス用） */
interface GuidanceUserProfile {
  nickname: string;
  mbti?: string | null;
  gender?: string | null;
  memoTags?: string[];
}

/**
 * Sonnetで月次ガイダンスを生成する
 */
export async function generateMonthlyGuidance(
  userProfile: GuidanceUserProfile,
  divination: DivinationResult,
  monthKey: string
): Promise<GuidanceResult> {
  const anthropic = getClient();

  const userMessage = `## 対象期間
${monthKey}（${parseInt(monthKey.split("-")[1])}月）

## ユーザープロフィール
ニックネーム: ${userProfile.nickname}
MBTI: ${userProfile.mbti ?? "不明"}
性別: ${userProfile.gender ?? "不明"}
特性メモ: ${userProfile.memoTags && userProfile.memoTags.length > 0 ? userProfile.memoTags.join("、") : "なし"}

## 占術情報
西洋星座: ${divination.solarSign ?? "不明"}
数秘術（誕生数）: ${divination.numerology ?? "不明"}
九星: ${divination.kyusei ?? "不明"}
日干: ${divination.dayKan ?? "不明"}
五行バランス: ${
    divination.wuxingProfile
      ? `木${divination.wuxingProfile.wood} 火${divination.wuxingProfile.fire} 土${divination.wuxingProfile.earth} 金${divination.wuxingProfile.metal} 水${divination.wuxingProfile.water}`
      : "不明"
  }

今月のパーソナルガイダンスをJSON形式で生成してください。`;

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 800,
    system: [
      {
        type: "text",
        text: DIVINATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: SONNET_MONTHLY_GUIDANCE_INSTRUCTION,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const cache = getCacheTokens(response.usage);

  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
      : undefined;

  // コストログDB書き込み（全環境）
  logApiCost("monthly_guidance", SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return { content: text.trim(), costInfo };
}

/**
 * Sonnetで週次ガイダンスを生成する
 */
export async function generateWeeklyGuidance(
  userProfile: GuidanceUserProfile,
  divination: DivinationResult,
  weekKey: string,
  weekRangeStr: string,
  monthlyContext: string | null
): Promise<GuidanceResult> {
  const anthropic = getClient();

  let monthlySection = "";
  if (monthlyContext) {
    try {
      const monthly = JSON.parse(monthlyContext);
      monthlySection = `
## 今月のテーマ（参考）
テーマ: ${monthly.monthlyTheme ?? ""}
概要: ${monthly.overview ?? ""}
人間関係: ${monthly.relationships ?? ""}
`;
    } catch {
      // パース失敗時は無視
    }
  }

  const userMessage = `## 対象期間
${weekKey}（${weekRangeStr}）
${monthlySection}
## ユーザープロフィール
ニックネーム: ${userProfile.nickname}
MBTI: ${userProfile.mbti ?? "不明"}
性別: ${userProfile.gender ?? "不明"}
特性メモ: ${userProfile.memoTags && userProfile.memoTags.length > 0 ? userProfile.memoTags.join("、") : "なし"}

## 占術情報
西洋星座: ${divination.solarSign ?? "不明"}
数秘術（誕生数）: ${divination.numerology ?? "不明"}
九星: ${divination.kyusei ?? "不明"}
日干: ${divination.dayKan ?? "不明"}
五行バランス: ${
    divination.wuxingProfile
      ? `木${divination.wuxingProfile.wood} 火${divination.wuxingProfile.fire} 土${divination.wuxingProfile.earth} 金${divination.wuxingProfile.metal} 水${divination.wuxingProfile.water}`
      : "不明"
  }

今週のパーソナルガイダンスをJSON形式で生成してください。`;

  const response = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: DIVINATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: SONNET_WEEKLY_GUIDANCE_INSTRUCTION,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const cache = getCacheTokens(response.usage);

  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
      : undefined;

  // コストログDB書き込み（全環境）
  logApiCost("weekly_guidance", SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return { content: text.trim(), costInfo };
}
