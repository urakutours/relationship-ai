// 人物ラベル一括更新 API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/persons/[id]/labels
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id: personId } = await params;

  try {
    const body = await request.json();
    const { labelIds } = body;

    if (!Array.isArray(labelIds)) {
      return NextResponse.json(
        { error: "labelIdsは配列で指定してください" },
        { status: 400 }
      );
    }

    // 既存のラベル紐付けを全削除
    await prisma.personLabel.deleteMany({
      where: { personId },
    });

    // 新しいラベル紐付けを作成
    if (labelIds.length > 0) {
      await prisma.personLabel.createMany({
        data: labelIds.map((labelId: number) => ({
          personId,
          labelId,
        })),
      });
    }

    // 更新後のPerson（labels含む）を返す
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        labels: { include: { label: true } },
        observations: true,
      },
    });

    return NextResponse.json(person);
  } catch (error) {
    console.error("人物ラベル更新エラー:", error);
    return NextResponse.json(
      { error: "ラベルの更新に失敗しました" },
      { status: 500 }
    );
  }
}
