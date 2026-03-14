// POST /api/persons/[id]/analyze-deep
// Sonnet で詳細ノートを生成・保存
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/ai/client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import { calcDivinationProfile } from "@/lib/divination";
import { resolveTraits, formatWuxing } from "@/lib/ai/trait-resolver";
import { checkRateLimit, RATE_LIMITS, rateLimitError } from "@/lib/rate-limiter";
import {
  DIVINATION_SYSTEM_PROMPT,
  SONNET_DEEP_ANALYSIS_INSTRUCTION,
} from "@/lib/ai/prompts";

const SONNET_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const globalCheck = checkRateLimit("global", RATE_LIMITS.global);
    if (!globalCheck.allowed) return NextResponse.json(rateLimitError(globalCheck.remaining), { status: 429 });
    const featureCheck = checkRateLimit("deep_analysis", RATE_LIMITS.deep_analysis);
    if (!featureCheck.allowed) return NextResponse.json(rateLimitError(featureCheck.remaining), { status: 429 });

    const { id } = await params;

    // Person と UserProfile を並列取得
    const [person, userProfile] = await Promise.all([
      prisma.person.findUnique({
        where: { id },
        include: { observations: true },
      }),
      prisma.userProfile.findUnique({ where: { id: 1 } }),
    ]);

    if (!person) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    // 双方の占術計算
    const personDiv = calcDivinationProfile({
      birthDate: person.birthDate,
      birthYear: person.birthYear,
    });

    const myselfDiv = userProfile
      ? calcDivinationProfile({
          birthDate: userProfile.birthDate,
          birthYear: userProfile.birthYear,
          birthCountry: userProfile.birthCountry,
        })
      : null;

    // 自分の情報セクション
    let myselfSection = "";
    if (userProfile && myselfDiv) {
      const traits: string[] = userProfile.memoTags
        ? JSON.parse(userProfile.memoTags)
        : [];
      myselfSection = `
## 相談者自身
ニックネーム: ${userProfile.nickname}
特性メモ: ${traits.length > 0 ? traits.join("、") : "なし"}
${resolveTraits(myselfDiv)}
五行バランス: ${formatWuxing(myselfDiv)}
`;
    }

    // 対象人物情報
    const observations = person.observations.map((o) => o.content);
    const quickNoteRef = person.quickNote
      ? `\n## 既存のクイック分析結果\n${person.quickNote}\n`
      : "";

    const honorificSuffix = person.honorific || "さん";
    const userMessage = `${myselfSection}
## 名前の呼び方
- ${person.nickname}を呼ぶ際は「${person.nickname}${honorificSuffix}」と呼んでください
${userProfile ? `- ${userProfile.nickname}を呼ぶ際は「${userProfile.nickname}さん」と呼んでください` : ""}

## 分析対象
ニックネーム: ${person.nickname}
敬称: ${honorificSuffix}
関係性: ${person.relationship}
観察メモ: ${observations.length > 0 ? observations.join("、") : "なし"}
${resolveTraits(personDiv)}
五行バランス: ${formatWuxing(personDiv)}
${quickNoteRef}`;

    // Sonnet呼び出し
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
          text: SONNET_DEEP_ANALYSIS_INSTRUCTION,
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const isTruncated = response.stop_reason === "max_tokens";

    // DB保存
    const now = new Date();
    await prisma.person.update({
      where: { id },
      data: {
        deepNote: text.trim(),
        deepNoteUpdatedAt: now,
      },
    });

    // コスト計算（開発環境のみ）
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
    console.error("深掘り分析エラー:", error);
    return NextResponse.json(
      { error: "深掘り分析に失敗しました" },
      { status: 500 }
    );
  }
}
