// POST /api/profile/analyze-deep
// Sonnet で自分の深掘り分析ノートを生成・保存
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/ai/client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import { calcDivinationProfile } from "@/lib/divination";
import { resolveTraits, formatWuxing } from "@/lib/ai/trait-resolver";
import { checkRateLimit, RATE_LIMITS, rateLimitError } from "@/lib/rate-limiter";
import {
  DIVINATION_SYSTEM_PROMPT,
  SONNET_SELF_DEEP_ANALYSIS_INSTRUCTION,
} from "@/lib/ai/prompts";

const SONNET_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

export async function POST() {
  try {
    const globalCheck = checkRateLimit("global", RATE_LIMITS.global);
    if (!globalCheck.allowed) return NextResponse.json(rateLimitError(globalCheck.remaining), { status: 429 });
    const featureCheck = checkRateLimit("deep_analysis", RATE_LIMITS.deep_analysis);
    if (!featureCheck.allowed) return NextResponse.json(rateLimitError(featureCheck.remaining), { status: 429 });

    const userProfile = await prisma.userProfile.findUnique({ where: { id: 1 } });

    if (!userProfile) {
      return NextResponse.json(
        { error: "プロフィールが登録されていません" },
        { status: 404 }
      );
    }

    // キャッシュチェック: プロフィール更新後に分析結果がある場合はキャッシュを返す
    if (
      userProfile.profileAnalysis &&
      userProfile.profileAnalysisUpdatedAt &&
      userProfile.profileAnalysisUpdatedAt > userProfile.updatedAt
    ) {
      return NextResponse.json({
        deepNote: userProfile.profileAnalysis,
        deepNoteUpdatedAt: userProfile.profileAnalysisUpdatedAt.toISOString(),
        fromCache: true,
      });
    }

    const div = calcDivinationProfile({
      birthDate: userProfile.birthDate,
      birthYear: userProfile.birthYear,
      birthCountry: userProfile.birthCountry,
    });

    const traits: string[] = userProfile.memoTags
      ? JSON.parse(userProfile.memoTags)
      : [];

    const quickNoteRef = userProfile.quickNote
      ? `\n## 既存のクイック分析結果\n${userProfile.quickNote}\n`
      : "";

    const userMessage = `## ユーザー自身のプロフィール
ニックネーム: ${userProfile.nickname}
特性メモ: ${traits.length > 0 ? traits.join("、") : "なし"}
MBTI: ${userProfile.mbti ?? "不明"}
性別: ${userProfile.gender ?? "不明"}
血液型: ${userProfile.bloodType ?? "不明"}
${resolveTraits(div)}
五行バランス: ${formatWuxing(div)}
${quickNoteRef}`;

    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: SONNET_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: DIVINATION_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: SONNET_SELF_DEEP_ANALYSIS_INSTRUCTION,
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const isTruncated = response.stop_reason === "max_tokens";

    const now = new Date();
    await prisma.userProfile.update({
      where: { id: 1 },
      data: {
        deepNote: text.trim(),
        deepNoteUpdatedAt: now,
        profileAnalysis: text.trim(),
        profileAnalysisUpdatedAt: now,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cacheRead = ((response.usage as any).cache_read_input_tokens as number) ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cacheWrite = ((response.usage as any).cache_creation_input_tokens as number) ?? 0;
    const costInfo =
      process.env.NODE_ENV === "development"
        ? calculateCost(SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cacheRead, cacheWrite)
        : undefined;

    // コストログDB書き込み（全環境）
    logApiCost("deep_analysis", SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cacheRead, cacheWrite);

    return NextResponse.json({
      deepNote: text.trim(),
      deepNoteUpdatedAt: now.toISOString(),
      costInfo,
      isTruncated,
      truncatedContext: isTruncated ? text.trim() : undefined,
    });
  } catch (error) {
    console.error("プロフィール深掘り分析エラー:", error);
    return NextResponse.json(
      { error: "深掘り分析に失敗しました" },
      { status: 500 }
    );
  }
}
