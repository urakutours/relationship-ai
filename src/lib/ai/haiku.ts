// Haiku（軽量AI）呼び出しモジュール
// 用途: 基本的な相性スコアと一言コメント、バイオリズムアドバイス

import {
  DIVINATION_SYSTEM_PROMPT,
  HAIKU_COMPATIBILITY_INSTRUCTION,
  HAIKU_DAILY_SYSTEM_PROMPT,
  HAIKU_BIORHYTHM_INSTRUCTION,
} from "./prompts";
import { getClient } from "./client";
import { resolveTraits } from "./trait-resolver";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import type { CostInfo, DivinationResult } from "@/lib/types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;

/** usageからキャッシュトークン数を安全に取得するヘルパー */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCacheTokens(usage: any): { read: number; write: number } {
  return {
    read: (usage.cache_read_input_tokens as number) ?? 0,
    write: (usage.cache_creation_input_tokens as number) ?? 0,
  };
}

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
${resolveTraits(person1Divination)}

## 人物2: ${person2Name}
観察メモ: ${person2Traits.length > 0 ? person2Traits.join("、") : "なし"}
${resolveTraits(person2Divination)}
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

  const cache = getCacheTokens(response.usage);

  // コスト計算（開発環境のみ）
  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
      : undefined;

  // コストログDB書き込み（全環境）
  logApiCost("compatibility", HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

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

/** 日次ガイダンス用のmax_tokens（軽量版） */
const DAILY_MAX_TOKENS = 150;

/**
 * Haikuで今日のバイオリズムアドバイスを生成する（軽量版）
 * 占術DBの代わりに月次・週次キャッシュを文脈として使用
 */
export async function generateBiorhythmAdvice(
  todayDate: string,
  weather: string,
  monthlyContext?: string | null,
  weeklyContext?: string | null,
  userProfile?: { mbti?: string | null; gender?: string | null } | null,
  extraContext?: { personCount?: number; lastConsultedPerson?: string | null } | null
): Promise<BiorhythmResult> {
  const anthropic = getClient();

  // 月次・週次の要約を100字以内で抽出
  let monthlyThemeSummary = "";
  if (monthlyContext) {
    try {
      const monthly = JSON.parse(monthlyContext);
      monthlyThemeSummary = `${monthly.monthlyTheme ?? ""}。${(monthly.keyAction ?? "").slice(0, 50)}`;
    } catch { /* パース失敗時は無視 */ }
  }

  let weeklyFocusSummary = "";
  if (weeklyContext) {
    try {
      const weekly = JSON.parse(weeklyContext);
      weeklyFocusSummary = `${weekly.weeklyFocus ?? ""}。${(weekly.keyAction ?? "").slice(0, 50)}`;
    } catch { /* パース失敗時は無視 */ }
  }

  // 曜日を計算
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][new Date().getDay()];

  // 軽量ユーザーメッセージ（目標: 入力トークン合計 1,200以下）
  const parts: string[] = [];
  if (monthlyThemeSummary) parts.push(`今月のテーマ: ${monthlyThemeSummary}`);
  if (weeklyFocusSummary) parts.push(`今週の重点: ${weeklyFocusSummary}`);
  parts.push(`今日の日付: ${todayDate}`);
  parts.push(`曜日: ${dayOfWeek}曜日`);
  parts.push(`天気: ${weather}`);
  if (userProfile?.mbti) parts.push(`MBTI: ${userProfile.mbti}`);
  if (userProfile?.gender) parts.push(`性別: ${userProfile.gender}`);
  if (extraContext?.personCount !== undefined) parts.push(`登録人物数: ${extraContext.personCount}`);
  if (extraContext?.lastConsultedPerson) parts.push(`直近の相談相手: ${extraContext.lastConsultedPerson}`);

  const userMessage = parts.join("\n");

  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: DAILY_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: HAIKU_DAILY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: HAIKU_BIORHYTHM_INSTRUCTION,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const cache = getCacheTokens(response.usage);

  const costInfo =
    process.env.NODE_ENV === "development"
      ? calculateCost(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
      : undefined;

  // コストログDB書き込み（全環境）
  logApiCost("daily_guidance", HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    advice: text.trim() || "今日も自分のペースで進もう。",
    costInfo,
  };
}
