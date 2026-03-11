// 人物の占術計算結果を取得するAPI
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations } from "@/lib/divination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "IDが必要です" },
        { status: 400 }
      );
    }

    const person = await prisma.person.findUnique({
      where: { id },
    });

    if (!person) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    const divination = calculateAllDivinations(
      person.birthDate,
      person.birthYear
    );

    return NextResponse.json({
      personId: id,
      nickname: person.nickname,
      divination,
    });
  } catch (error) {
    console.error("占術計算エラー:", error);
    return NextResponse.json(
      { error: "占術計算に失敗しました" },
      { status: 500 }
    );
  }
}
