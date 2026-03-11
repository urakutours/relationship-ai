// ラベル一覧取得・作成 API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/labels - 全ラベル一覧
export async function GET() {
  try {
    const labels = await prisma.label.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(labels);
  } catch (error) {
    console.error("ラベル一覧取得エラー:", error);
    return NextResponse.json(
      { error: "ラベル一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/labels - ラベル作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "ラベル名は必須です" },
        { status: 400 }
      );
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color: color || "#7ec8c0",
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("ラベル作成エラー:", error);
    return NextResponse.json(
      { error: "ラベルの作成に失敗しました" },
      { status: 500 }
    );
  }
}
