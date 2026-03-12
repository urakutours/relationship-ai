// ダッシュボード統合API
// イベント（誕生日・記念日）＋ 未相談人物を一括取得
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 月日が today から何日後か（今年ベースで計算、過ぎていたら来年） */
function daysUntilAnniversary(
  month: number,
  day: number,
  today: Date
): number {
  const thisYear = today.getFullYear();
  let target = new Date(thisYear, month - 1, day);
  // 今年の記念日が過ぎていたら来年
  if (target < new Date(thisYear, today.getMonth(), today.getDate())) {
    target = new Date(thisYear + 1, month - 1, day);
  }
  const diffMs = target.getTime() - new Date(thisYear, today.getMonth(), today.getDate()).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

interface EventItem {
  type: "birthday" | "anniversary";
  personId: string;
  nickname: string;
  honorific: string | null;
  daysUntil: number; // 0 = 今日
  dateLabel: string; // "3月15日"
}

interface InactivePerson {
  id: string;
  nickname: string;
  honorific: string | null;
  relationship: string;
  intimacyScore: number | null;
  daysSinceConsult: number;
  lastConsultDate: string | null;
}

export async function GET() {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // 全人物を取得（誕生日・記念日・最終相談日の計算に使う）
    const persons = await prisma.person.findMany({
      include: {
        consultations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    // ===== 1. イベント（誕生日・記念日）=====
    const events: EventItem[] = [];

    for (const p of persons) {
      // 誕生日チェック（YYYY-MM-DD）
      if (p.birthDate) {
        const parts = p.birthDate.split("-");
        if (parts.length === 3) {
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          if (!isNaN(bMonth) && !isNaN(bDay)) {
            const daysUntil = daysUntilAnniversary(bMonth, bDay, today);
            if (daysUntil <= 7) {
              events.push({
                type: "birthday",
                personId: p.id,
                nickname: p.nickname,
                honorific: p.honorific,
                daysUntil,
                dateLabel: `${bMonth}月${bDay}日`,
              });
            }
          }
        }
      }

      // 知り合った記念日チェック
      if (p.acquaintanceDate) {
        const parts = p.acquaintanceDate.split("-");
        // YYYY-MM-DD or YYYY-MM の場合のみ（年だけでは記念日として不十分）
        if (parts.length >= 2) {
          const aMonth = parseInt(parts[1], 10);
          const aDay = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
          if (!isNaN(aMonth) && !isNaN(aDay) && parts.length >= 3) {
            const daysUntil = daysUntilAnniversary(aMonth, aDay, today);
            if (daysUntil <= 7) {
              // 何周年かを計算
              const startYear = parseInt(parts[0], 10);
              const yearsAgo = today.getFullYear() - startYear + (daysUntil > 0 ? 0 : 0);
              // 1年以上経っている場合のみ記念日として表示
              if (!isNaN(startYear) && yearsAgo >= 1) {
                events.push({
                  type: "anniversary",
                  personId: p.id,
                  nickname: p.nickname,
                  honorific: p.honorific,
                  daysUntil,
                  dateLabel: `${aMonth}月${aDay}日（${yearsAgo}周年）`,
                });
              }
            }
          }
        }
      }
    }

    // 日数が近い順にソート
    events.sort((a, b) => a.daysUntil - b.daysUntil);

    // ===== 2. 最近相談していない人物（30日以上経過、親密度高い順、最大3名）=====
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactivePersons: InactivePerson[] = [];

    for (const p of persons) {
      const lastConsult = p.consultations[0]?.createdAt;
      let daysSince: number;
      let lastDateStr: string | null = null;

      if (lastConsult) {
        const lastDate = new Date(lastConsult);
        daysSince = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        lastDateStr = lastDate.toISOString();
      } else {
        // 一度も相談していない場合、作成日からの経過日数
        daysSince = Math.floor(
          (today.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      if (daysSince >= 30) {
        inactivePersons.push({
          id: p.id,
          nickname: p.nickname,
          honorific: p.honorific,
          relationship: p.relationship,
          intimacyScore: p.intimacyScore,
          daysSinceConsult: daysSince,
          lastConsultDate: lastDateStr,
        });
      }
    }

    // 親密度の高い順にソートし、最大3名
    inactivePersons.sort(
      (a, b) => (b.intimacyScore ?? 5) - (a.intimacyScore ?? 5)
    );
    const topInactive = inactivePersons.slice(0, 3);

    return NextResponse.json({
      events,
      inactivePersons: topInactive,
    });
  } catch (error) {
    console.error("ダッシュボードAPI エラー:", error);
    return NextResponse.json(
      { error: "ダッシュボードデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
