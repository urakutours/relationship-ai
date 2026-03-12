// POST /api/persons/[id]/compress-memory
// 圧縮記憶を手動生成する
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCompressedMemory } from "@/lib/ai/compress-memory";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const person = await prisma.person.findUnique({
      where: { id },
      select: { nickname: true },
    });

    if (!person) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    const logs = await prisma.consultationLog.findMany({
      where: { personId: id },
      orderBy: { createdAt: "asc" },
    });

    if (logs.length === 0) {
      return NextResponse.json(
        { error: "相談履歴がありません" },
        { status: 400 }
      );
    }

    const result = await generateCompressedMemory(person.nickname, logs);

    if (!result) {
      return NextResponse.json(
        { error: "圧縮記憶の生成に失敗しました" },
        { status: 500 }
      );
    }

    await prisma.person.update({
      where: { id },
      data: {
        compressedMemory: JSON.stringify(result.memory),
        memoryUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      memory: result.memory,
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("圧縮記憶生成エラー:", error);
    return NextResponse.json(
      { error: "圧縮記憶の生成に失敗しました" },
      { status: 500 }
    );
  }
}
