// POST /api/persons/[id]/analyze-continue
// 途中で切れた深掘り分析の続きを生成
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClient } from "@/lib/ai/client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import { DIVINATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const SONNET_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { truncatedContent } = await request.json();

    if (!truncatedContent) {
      return NextResponse.json(
        { error: "途中の内容が必要です" },
        { status: 400 }
      );
    }

    const person = await prisma.person.findUnique({ where: { id } });
    if (!person) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    // 続きを生成
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
    const fullNote = `${person.deepNote || ""}\n\n${text.trim()}`;
    const now = new Date();
    await prisma.person.update({
      where: { id },
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
    console.error("続き生成エラー:", error);
    return NextResponse.json(
      { error: "続きの生成に失敗しました" },
      { status: 500 }
    );
  }
}
