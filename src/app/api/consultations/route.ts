// 相談履歴一覧 API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/consultations?personId=xxx&cursor=xxx&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = 20;

    const where = personId ? { personId } : {};

    const logs = await prisma.consultationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        person: {
          select: { id: true, nickname: true, relationship: true },
        },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      logs: items,
      nextCursor,
    });
  } catch (error) {
    console.error("相談履歴一覧取得エラー:", error);
    return NextResponse.json(
      { error: "相談履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}
