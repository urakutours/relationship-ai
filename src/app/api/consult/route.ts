// ディープ相談API（Sonnet呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations, calcDivinationProfile } from "@/lib/divination";
import { generateConsultation } from "@/lib/ai/sonnet";
import { generateCompressedMemory } from "@/lib/ai/compress-memory";
import type { ConsultPayload, MyselfInfo, CompressedMemory } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { personId, consultationContext, userType = "FREE", consultType = "standard" } = await request.json();

    if (!personId || !consultationContext) {
      return NextResponse.json(
        { error: "人物IDと相談内容が必要です" },
        { status: 400 }
      );
    }

    // 人物情報・ユーザープロフィール・直近相談を並行取得
    const [person, userProfile, recentLogs] = await Promise.all([
      prisma.person.findUnique({
        where: { id: personId },
        include: { observations: true },
      }),
      prisma.userProfile.findUnique({
        where: { id: 1 },
      }),
      prisma.consultationLog.findMany({
        where: { personId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { createdAt: true, context: true },
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

    // 圧縮記憶のパース
    let compressedMemory: CompressedMemory | null = null;
    if (person.compressedMemory) {
      try {
        compressedMemory = JSON.parse(person.compressedMemory);
      } catch {
        // パース失敗は無視
      }
    }

    // 直近相談の整形
    const recentConsultations = recentLogs.map((l) => ({
      date: new Date(l.createdAt).toISOString().split("T")[0],
      query: l.context.slice(0, 30),
    }));

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
        compressedMemory,
        recentConsultations,
      },
      consultationContext,
    };

    // Sonnet呼び出し
    const result = await generateConsultation(payload);

    // ConsultationLogに保存 + consultCountインクリメント
    const [log] = await Promise.all([
      prisma.consultationLog.create({
        data: {
          personId,
          consultType: consultType || "standard",
          context: consultationContext,
          result: result.actionPlan,
        },
      }),
      prisma.person.update({
        where: { id: personId },
        data: { consultCount: { increment: 1 } },
      }),
    ]);

    // 5回ごとに圧縮記憶を非同期生成
    const newCount = person.consultCount + 1;
    if (newCount % 5 === 0) {
      // 非同期で実行（レスポンスをブロックしない）
      (async () => {
        try {
          const allLogs = await prisma.consultationLog.findMany({
            where: { personId },
            orderBy: { createdAt: "asc" },
          });
          const memResult = await generateCompressedMemory(person.nickname, allLogs);
          if (memResult) {
            await prisma.person.update({
              where: { id: personId },
              data: {
                compressedMemory: JSON.stringify(memResult.memory),
                memoryUpdatedAt: new Date(),
              },
            });
          }
        } catch (error) {
          console.error("圧縮記憶の自動生成エラー:", error);
        }
      })();
    }

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
