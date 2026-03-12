// 人物個別 API（GET / PATCH）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// 人物取得
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  try {
    const person = await prisma.person.findUnique({
      where: { id },
      include: { observations: true, labels: { include: { label: true } } },
    });
    if (!person) {
      return NextResponse.json({ error: "人物が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    console.error("人物取得エラー:", error);
    return NextResponse.json({ error: "人物の取得に失敗しました" }, { status: 500 });
  }
}

// 人物更新
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const {
      nickname,
      relationship,
      birthDate,
      birthYear,
      gender,
      bloodType,
      birthCountry,
      birthOrder,
      personalContext,
      observations, // { add: string[], delete: string[] }
    } = body;

    // 基本フィールドを更新
    const updateData: Record<string, unknown> = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (relationship !== undefined) updateData.relationship = relationship;
    if (birthDate !== undefined) updateData.birthDate = birthDate || null;
    if (birthYear !== undefined) updateData.birthYear = birthYear ? parseInt(String(birthYear), 10) : null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (bloodType !== undefined) updateData.bloodType = bloodType || null;
    if (birthCountry !== undefined) updateData.birthCountry = birthCountry || null;
    if (birthOrder !== undefined) updateData.birthOrder = birthOrder || null;
    if (personalContext !== undefined) updateData.personalContext = personalContext || null;

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
      include: { observations: true, labels: { include: { label: true } } },
    });

    // 観察メモの追加・削除
    if (observations?.delete?.length) {
      await prisma.observation.deleteMany({
        where: { id: { in: observations.delete }, personId: id },
      });
    }
    if (observations?.add?.length) {
      const addItems = observations.add as Array<string | { content: string; category?: string }>;
      await prisma.observation.createMany({
        data: addItems
          .map((item) => {
            if (typeof item === "string") {
              return { content: item.trim(), category: "other", personId: id };
            }
            return { content: item.content.trim(), category: item.category || "other", personId: id };
          })
          .filter((d) => d.content),
      });
    }

    // 最新データを再取得
    const updated = await prisma.person.findUnique({
      where: { id },
      include: { observations: true, labels: { include: { label: true } } },
    });

    // 再分析が必要かどうかのフラグ
    const shouldReanalyze = body._reanalyze === true;
    if (shouldReanalyze) {
      const baseUrl = request.nextUrl.origin;
      fetch(`${baseUrl}/api/persons/${id}/analyze`, { method: "POST" })
        .catch((err) => console.error("バックグラウンド再分析エラー:", err));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("人物更新エラー:", error);
    return NextResponse.json({ error: "人物の更新に失敗しました" }, { status: 500 });
  }
}
