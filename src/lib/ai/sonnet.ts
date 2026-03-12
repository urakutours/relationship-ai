// Sonnet（ディープ相談）呼び出しモジュール
// 用途: 具体的なアクションプランの生成

import {
  DIVINATION_SYSTEM_PROMPT,
  SONNET_CONSULT_FREE_INSTRUCTION,
  SONNET_CONSULT_PREMIUM_INSTRUCTION,
  SONNET_CONSULT_DEEP_INSTRUCTION,
} from "./prompts";
import { getClient } from "./client";
import { calculateCost } from "@/lib/cost-tracker";
import type { CostInfo, ConsultPayload } from "@/lib/types";

const SONNET_MODEL = "claude-sonnet-4-6";

// ユーザータイプ別の出力トークン上限
const TOKEN_LIMITS = {
  FREE: 600,
  PREMIUM: 1200,
  DEEP: 1500,
} as const;

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

  // ユーザーメッセージの構築
  const userMessage = `${myselfSection}
## target（相談相手）
ニックネーム: ${target.nickname}
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

  // コスト計算（開発環境のみ）
  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(
          SONNET_MODEL,
          response.usage.input_tokens,
          response.usage.output_tokens,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((response.usage as any).cache_read_input_tokens as number) ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((response.usage as any).cache_creation_input_tokens as number) ?? 0
        )
      : undefined;

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
