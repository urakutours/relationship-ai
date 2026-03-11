// ラベル削除 API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/labels/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const labelId = parseInt(id, 10);

  if (isNaN(labelId)) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  }

  try {
    await prisma.label.delete({ where: { id: labelId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ラベル削除エラー:", error);
    return NextResponse.json(
      { error: "ラベルの削除に失敗しました" },
      { status: 500 }
    );
  }
}
