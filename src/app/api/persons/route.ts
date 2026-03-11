// 人物CRUD APIルート
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 人物一覧取得
export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      include: {
        observations: true,
        labels: { include: { label: true } },
      },
      orderBy: [
        { sortOrder: { sort: "asc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
    });
    return NextResponse.json(persons);
  } catch (error) {
    console.error("人物一覧取得エラー:", error);
    return NextResponse.json(
      { error: "人物一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 人物登録
export async function POST(request: NextRequest) {
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
      observations,
    } = body;

    // ニックネームは必須
    if (!nickname || !relationship) {
      return NextResponse.json(
        { error: "ニックネームと関係性は必須です" },
        { status: 400 }
      );
    }

    const person = await prisma.person.create({
      data: {
        nickname,
        relationship,
        birthDate: birthDate || null,
        birthYear: birthYear ? parseInt(birthYear, 10) : null,
        gender: gender || null,
        bloodType: bloodType || null,
        birthCountry: birthCountry || null,
        birthOrder: birthOrder || null,
        personalContext: personalContext || null,
        observations: {
          create: (observations as string[])
            ?.filter((o: string) => o.trim())
            .map((content: string) => ({ content: content.trim() })),
        },
      },
      include: { observations: true },
    });

    // 保存成功後にバックグラウンドで分析を開始
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/persons/${person.id}/analyze`, { method: "POST" })
      .catch((err) => console.error("バックグラウンド分析エラー:", err));

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("人物登録エラー:", error);
    return NextResponse.json(
      { error: "人物の登録に失敗しました" },
      { status: 500 }
    );
  }
}

// 人物削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "IDが必要です" },
        { status: 400 }
      );
    }

    await prisma.person.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("人物削除エラー:", error);
    return NextResponse.json(
      { error: "人物の削除に失敗しました" },
      { status: 500 }
    );
  }
}
