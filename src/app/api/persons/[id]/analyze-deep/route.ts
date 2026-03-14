// POST /api/persons/[id]/analyze-deep
// Sonnet で詳細ノートを生成・保存
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/ai/client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import { calcDivinationProfile } from "@/lib/divination";
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
西洋星座: ${myselfDiv.solarSign ?? "不明"}
数秘術: ${myselfDiv.numerology ?? "不明"}
九星: ${myselfDiv.kyusei ?? "不明"}
日干: ${myselfDiv.dayKan ?? "不明"}
五行バランス: ${
        myselfDiv.wuxingProfile
          ? `木${myselfDiv.wuxingProfile.wood} 火${myselfDiv.wuxingProfile.fire} 土${myselfDiv.wuxingProfile.earth} 金${myselfDiv.wuxingProfile.metal} 水${myselfDiv.wuxingProfile.water}`
          : "不明"
      }
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
西洋星座: ${personDiv.solarSign ?? "不明"}
数秘術: ${personDiv.numerology ?? "不明"}
九星: ${personDiv.kyusei ?? "不明"}
日干: ${personDiv.dayKan ?? "不明"}
五行バランス: ${
      personDiv.wuxingProfile
        ? `木${personDiv.wuxingProfile.wood} 火${personDiv.wuxingProfile.fire} 土${personDiv.wuxingProfile.earth} 金${personDiv.wuxingProfile.metal} 水${personDiv.wuxingProfile.water}`
        : "不明"
    }
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
