// DELETE /api/consultations/[id]
// 相談履歴を削除
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
