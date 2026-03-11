// 人物並び替え API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/persons/reorder
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIdsは配列で指定してください" },
        { status: 400 }
      );
    }

    // トランザクションで一括更新
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.person.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("並び替えエラー:", error);
    return NextResponse.json(
      { error: "並び替えに失敗しました" },
      { status: 500 }
    );
  }
}
