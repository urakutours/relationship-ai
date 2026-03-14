"use client";

import { useMemo } from "react";
import { calcDivinationProfile, getDominantElement, getWeakestElement } from "@/lib/divination";

interface DivinationDebugProps {
  birthDate: string | null;
  birthYear: number | null;
  visible: boolean; // debugMode
}

/**
 * 開発環境用の占術計算結果デバッグ表示コンポーネント
 * debugMode=true の場合のみ表示される
 */
export function DivinationDebug({ birthDate, birthYear, visible }: DivinationDebugProps) {
  const result = useMemo(() => {
    if (!visible) return null;
    if (!birthDate && !birthYear) return null;
    return calcDivinationProfile({ birthDate, birthYear });
  }, [birthDate, birthYear, visible]);

  if (!visible || !result) return null;

  // 少なくとも1つのデータがあるか
  const hasData = result.solarSign || result.numerology || result.kyusei || result.dayPillar || result.yearPillar;
  if (!hasData) return null;

  return (
    <div className="mt-6 p-4 bg-[#2a2a2e] border border-[#444] rounded-lg">
      <h3 className="text-[11px] text-[#999] tracking-widest mb-3 font-mono">
        DEBUG: 占術計算結果
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
        {/* 太陽星座 */}
        <div className="text-[#888]">太陽星座</div>
        <div className="text-[#ccc]">{result.solarSign ?? "—"}</div>

        {/* 九星気学 */}
        <div className="text-[#888]">九星気学</div>
        <div className="text-[#ccc]">{result.kyusei ?? "—"}</div>

        {/* 数秘術 */}
        <div className="text-[#888]">数秘術</div>
        <div className="text-[#ccc]">
          {result.numerology !== null ? (
            <>
              {result.numerology}
              {[11, 22, 33].includes(result.numerology) && (
                <span className="text-gold ml-1">(Master)</span>
              )}
            </>
          ) : "—"}
        </div>

        {/* 年柱 */}
        <div className="text-[#888]">年柱（立春考慮）</div>
        <div className="text-[#ccc]">{result.yearPillar ?? "—"}</div>

        {/* 日柱 */}
        <div className="text-[#888]">日柱</div>
        <div className="text-[#ccc]">
          {result.dayPillar ?? "—"}
          {result.dayKan && (
            <span className="text-[#888] ml-1">（日干: {result.dayKan}）</span>
          )}
        </div>

        {/* 五行バランス */}
        {result.wuxingProfile && (
          <>
            <div className="text-[#888]">五行バランス</div>
            <div className="text-[#ccc]">
              木{result.wuxingProfile.wood}{" "}
              火{result.wuxingProfile.fire}{" "}
              土{result.wuxingProfile.earth}{" "}
              金{result.wuxingProfile.metal}{" "}
              水{result.wuxingProfile.water}
            </div>

            <div className="text-[#888]">最強/最弱要素</div>
            <div className="text-[#ccc]">
              <span className="text-jade">{getDominantElement(result.wuxingProfile)}</span>
              {" / "}
              <span className="text-[#c45c5c]">{getWeakestElement(result.wuxingProfile)}</span>
            </div>
          </>
        )}
      </div>

      {/* 入力データ表示 */}
      <div className="mt-3 pt-2 border-t border-[#444] text-[10px] text-[#666] font-mono">
        入力: birthDate={birthDate ?? "null"} birthYear={birthYear ?? "null"}
      </div>
    </div>
  );
}
