// Haiku（軽量AI）呼び出しモジュール
// 用途: 基本的な相性スコアと一言コメント、バイオリズムアドバイス

import {
  DIVINATION_SYSTEM_PROMPT,
  HAIKU_COMPATIBILITY_INSTRUCTION,
  HAIKU_BIORHYTHM_INSTRUCTION,
} from "./prompts";
import { getClient } from "./client";
import { calculateCost } from "@/lib/cost-tracker";
import type { CostInfo, DivinationResult } from "@/lib/types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;

/** 相性スコアの結果型 */
export interface CompatibilityResult {
  score: number;
  comment: string;
  costInfo?: CostInfo;
}

/**
 * Haikuで相性スコアを生成する
 */
export async function generateCompatibilityScore(
  person1Name: string,
  person1Traits: string[],
  person1Divination: DivinationResult,
  person2Name: string,
  person2Traits: string[],
  person2Divination: DivinationResult
): Promise<CompatibilityResult> {
  const anthropic = getClient();

  const userMessage = `
## 人物1: ${person1Name}
観察メモ: ${person1Traits.length > 0 ? person1Traits.join("、") : "なし"}
西洋星座: ${person1Divination.solarSign ?? "不明"}
数秘術: ${person1Divination.numerology ?? "不明"}
九星: ${person1Divination.kyusei ?? "不明"}
日干: ${person1Divination.dayKan ?? "不明"}

## 人物2: ${person2Name}
観察メモ: ${person2Traits.length > 0 ? person2Traits.join("、") : "なし"}
西洋星座: ${person2Divination.solarSign ?? "不明"}
数秘術: ${person2Divination.numerology ?? "不明"}
九星: ${person2Divination.kyusei ?? "不明"}
日干: ${person2Divination.dayKan ?? "不明"}
`;

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: DIVINATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: HAIKU_COMPATIBILITY_INSTRUCTION,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  // コスト計算（開発環境のみ）
  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(
          HAIKU_MODEL,
          response.usage.input_tokens,
          response.usage.output_tokens,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((response.usage as any).cache_read_input_tokens as number) ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((response.usage as any).cache_creation_input_tokens as number) ?? 0
        )
      : undefined;

  // レスポンスのパース
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, parsed.score ?? 50)),
        comment: parsed.comment ?? "相性データを分析中",
        costInfo,
      };
    }
  } catch {
    // JSONパース失敗
  }

  return { score: 50, comment: "分析結果を生成できませんでした", costInfo };
}

/** バイオリズムアドバイスの結果型 */
export interface BiorhythmResult {
  advice: string;
  costInfo?: CostInfo;
}

/**
 * Haikuで今日のバイオリズムアドバイスを生成する
 */
export async function generateBiorhythmAdvice(
  todayDate: string,
  weather: string
): Promise<BiorhythmResult> {
  const anthropic = getClient();

  const userMessage = `今日の日付: ${todayDate}
天気: ${weather}

今日の心がけるべきことを教えてください。`;

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: DIVINATION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: HAIKU_BIORHYTHM_INSTRUCTION,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(
          HAIKU_MODEL,
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

  return {
    advice: text.trim() || "今日も自分のペースで進もう。",
    costInfo,
  };
}
