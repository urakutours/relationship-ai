// ディープ相談API（Sonnet呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations } from "@/lib/divination";
import { generateConsultation } from "@/lib/ai/sonnet";
import type { ConsultPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { personId, consultationContext, userType = "FREE" } = await request.json();

    if (!personId || !consultationContext) {
      return NextResponse.json(
        { error: "人物IDと相談内容が必要です" },
        { status: 400 }
      );
    }

    // 人物情報を取得
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { observations: true },
    });

    if (!person) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    // 占術計算
    const divination = calculateAllDivinations(
      person.birthDate,
      person.birthYear
    );

    // ペイロード構築
    const payload: ConsultPayload = {
      userType: userType === "PREMIUM" ? "PREMIUM" : "FREE",
      target: {
        nickname: person.nickname,
        relationship: person.relationship,
        observedTraits: person.observations.map((o) => o.content),
        divination,
      },
      consultationContext,
    };

    // Sonnet呼び出し
    const result = await generateConsultation(payload);

    return NextResponse.json({
      actionPlan: result.actionPlan,
      target: {
        nickname: person.nickname,
        relationship: person.relationship,
        divination,
      },
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("ディープ相談エラー:", error);
    return NextResponse.json(
      { error: "相談の処理に失敗しました" },
      { status: 500 }
    );
  }
}
