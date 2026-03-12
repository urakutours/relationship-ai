// PATCH & DELETE /api/consultations/[id]
// 相談履歴の結果記録・削除
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 結果を記録する
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { outcome, outcomeRating } = await request.json();

    // バリデーション
    if (outcomeRating !== undefined && outcomeRating !== null) {
      const rating = Number(outcomeRating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "評価は1〜5の範囲で指定してください" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.consultationLog.update({
      where: { id },
      data: {
        outcome: outcome ?? undefined,
        outcomeRating: outcomeRating !== undefined ? Number(outcomeRating) : undefined,
      },
    });

    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    console.error("結果記録エラー:", error);
    return NextResponse.json(
      { error: "結果の記録に失敗しました" },
      { status: 500 }
    );
  }
}

// 相談履歴を削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.consultationLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("相談履歴削除エラー:", error);
    return NextResponse.json(
      { error: "相談履歴の削除に失敗しました" },
      { status: 500 }
    );
  }
}
