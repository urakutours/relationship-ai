// 観察メモ個別 API（PUT / DELETE）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string; memoId: string }> };

// 観察メモ更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id, memoId } = await params;
  try {
    const body = await request.json();
    const { content, category } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "内容を入力してください" }, { status: 400 });
    }

    // 指定のメモが該当人物のものか確認
    const existing = await prisma.observation.findFirst({
      where: { id: memoId, personId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "メモが見つかりません" }, { status: 404 });
    }

    const updated = await prisma.observation.update({
      where: { id: memoId },
      data: {
        content: content.trim(),
        ...(category !== undefined ? { category } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("メモ更新エラー:", error);
    return NextResponse.json({ error: "メモの更新に失敗しました" }, { status: 500 });
  }
}
