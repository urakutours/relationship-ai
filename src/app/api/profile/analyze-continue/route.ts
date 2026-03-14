// POST /api/profile/analyze-continue
// 途中で切れたプロフィール深掘り分析の続きを生成
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/ai/client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import { checkRateLimit, RATE_LIMITS, rateLimitError } from "@/lib/rate-limiter";

const SONNET_MODEL = "claude-sonnet-4-6";

const CONTINUE_SYSTEM_PROMPT = `あなたは人間関係のアドバイザーです。
前回の分析の続きを書いてください。
占術・性格分析の専門用語は使わず、自然な日本語で記述してください。
前回の文体・トーンを維持してください。`;
const MAX_TOKENS = 1500;

export async function POST(request: NextRequest) {
  try {
    const globalCheck = checkRateLimit("global", RATE_LIMITS.global);
    if (!globalCheck.allowed) return NextResponse.json(rateLimitError(globalCheck.remaining), { status: 429 });

    const { truncatedContent } = await request.json();

    if (!truncatedContent) {
      return NextResponse.json(
        { error: "途中の内容が必要です" },
        { status: 400 }
      );
    }

    const userProfile = await prisma.userProfile.findUnique({ where: { id: 1 } });
    if (!userProfile) {
      return NextResponse.json(
        { error: "プロフィールが見つかりません" },
        { status: 404 }
      );
    }

    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: SONNET_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: CONTINUE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: "以下は途中で切れた分析の続きを書く依頼です。前の内容の続きから自然に書き始めてください。セクション見出しの繰り返しは不要です。",
        },
      ],
      messages: [
        {
          role: "user",
          content: `以下の分析の続きを書いてください。前のテキストの末尾から自然に続けてください。\n\n---前のテキスト（末尾部分）---\n${truncatedContent.slice(-500)}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const isTruncated = response.stop_reason === "max_tokens";

    // 既存のdeepNoteに追記して保存
    const fullNote = `${userProfile.deepNote || ""}\n\n${text.trim()}`;
    const now = new Date();
    await prisma.userProfile.update({
      where: { id: 1 },
      data: {
        deepNote: fullNote.trim(),
        deepNoteUpdatedAt: now,
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
    logApiCost("deep_analysis_continue", SONNET_MODEL, response.usage.input_tokens, response.usage.output_tokens, cacheRead, cacheWrite);

    return NextResponse.json({
      continuation: text.trim(),
      isTruncated,
      truncatedContext: isTruncated ? text.trim() : undefined,
      costInfo,
    });
  } catch (error) {
    console.error("プロフィール続き生成エラー:", error);
    return NextResponse.json(
      { error: "続きの生成に失敗しました" },
      { status: 500 }
    );
  }
}
