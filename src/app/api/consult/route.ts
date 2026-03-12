// ディープ相談API（Sonnet呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations, calcDivinationProfile } from "@/lib/divination";
import { generateConsultation } from "@/lib/ai/sonnet";
import type { ConsultPayload, MyselfInfo } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { personId, consultationContext, userType = "FREE", consultType = "standard" } = await request.json();

    if (!personId || !consultationContext) {
      return NextResponse.json(
        { error: "人物IDと相談内容が必要です" },
        { status: 400 }
      );
    }

    // 人物情報とユーザープロフィールを並行取得
    const [person, userProfile] = await Promise.all([
      prisma.person.findUnique({
        where: { id: personId },
        include: { observations: true },
      }),
      prisma.userProfile.findUnique({
        where: { id: 1 },
      }),
    ]);

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

    // 自分のプロフィール情報を構築（登録済みの場合のみ）
    let myself: MyselfInfo | null = null;
    if (userProfile) {
      const myselfDiv = calcDivinationProfile({
        birthDate: userProfile.birthDate,
        birthYear: userProfile.birthYear,
      });
      let memoTags: string[] = [];
      try {
        memoTags = JSON.parse(userProfile.memoTags || "[]");
      } catch {
        memoTags = [];
      }
      myself = {
        nickname: userProfile.nickname,
        observedTraits: memoTags,
        divination: myselfDiv,
      };
    }

    // ペイロード構築
    const resolvedUserType = consultType === "deep" ? "DEEP" : (userType === "PREMIUM" ? "PREMIUM" : "FREE");
    const payload: ConsultPayload = {
      userType: resolvedUserType,
      myself,
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

    // ConsultationLogに保存
    const log = await prisma.consultationLog.create({
      data: {
        personId,
        consultType: consultType || "standard",
        context: consultationContext,
        result: result.actionPlan,
      },
    });

    return NextResponse.json({
      actionPlan: result.actionPlan,
      consultationLogId: log.id,
      target: {
        nickname: person.nickname,
        relationship: person.relationship,
        divination,
      },
      isTruncated: result.isTruncated,
      truncatedContext: result.truncatedContext,
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
