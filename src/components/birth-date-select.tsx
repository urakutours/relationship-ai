"use client";

interface BirthDateSelectProps {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onDayChange: (value: string) => void;
}

const currentYear = new Date().getFullYear();

// 年の選択肢（1920〜現在）
const YEARS = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);

// 月の選択肢
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// 日数を計算
function getDaysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

export function BirthDateSelect({
  birthYear,
  birthMonth,
  birthDay,
  onYearChange,
  onMonthChange,
  onDayChange,
}: BirthDateSelectProps) {
  const daysInMonth = getDaysInMonth(
    birthYear ? parseInt(birthYear) : 0,
    birthMonth ? parseInt(birthMonth) : 0
  );
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex gap-3 items-end">
      {/* 年 */}
      <div className="flex-1">
        <select
          value={birthYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="input-underline"
        >
          <option value="">年</option>
          {YEARS.map((y) => (
            <option key={y} value={String(y)}>
              {y}年
            </option>
          ))}
        </select>
      </div>

      {/* 月 */}
      <div className="w-24">
        <select
          value={birthMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="input-underline"
        >
          <option value="">月</option>
          {MONTHS.map((m) => (
            <option key={m} value={String(m)}>
              {m}月
            </option>
          ))}
        </select>
      </div>

      {/* 日 */}
      <div className="w-24">
        <select
          value={birthDay}
          onChange={(e) => onDayChange(e.target.value)}
          className="input-underline"
        >
          <option value="">日</option>
          {DAYS.map((d) => (
            <option key={d} value={String(d)}>
              {d}日
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
