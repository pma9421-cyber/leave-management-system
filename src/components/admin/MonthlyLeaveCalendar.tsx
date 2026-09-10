import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveRequest } from '../../types.ts';

interface MonthlyLeaveCalendarProps {
  requests: LeaveRequest[];
  title?: string;
  subtitle?: string;
}

interface CalendarCell {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
}

interface DayEntry {
  requestId: string;
  userId: string;
  userName: string;
  leaveTypeName: string;
}

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isSameDate = (a: Date, b: Date): boolean => (
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
);

const buildCalendarCells = (visibleMonth: Date): CalendarCell[] => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
  const startDate = addDays(firstDay, -startOffset);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      date,
      iso: formatIsoDate(date),
      inCurrentMonth: date.getMonth() === month,
    };
  });
};

export const MonthlyLeaveCalendar: React.FC<MonthlyLeaveCalendarProps> = ({
  requests,
  title = '월별 휴가 캘린더',
}) => {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === 'APPROVED' && request.startDate && request.endDate),
    [requests]
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();

    approvedRequests.forEach((request) => {
      let cursor = parseLocalDate(request.startDate);
      const endDate = parseLocalDate(request.endDate);

      while (cursor.getTime() <= endDate.getTime()) {
        const iso = formatIsoDate(cursor);
        const entries = map.get(iso) ?? [];
        entries.push({
          requestId: request.id,
          userId: request.userId,
          userName: request.userName,
          leaveTypeName: request.leaveTypeName,
        });
        map.set(iso, entries);
        cursor = addDays(cursor, 1);
      }
    });

    return map;
  }, [approvedRequests]);

  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const visibleMonthLabel = `${visibleMonth.getFullYear()}.${`${visibleMonth.getMonth() + 1}`.padStart(2, '0')}`;

  const moveMonth = (offset: number) => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between gap-1 pb-2 sm:pb-3 border-b border-slate-100">
        <div className="min-w-0 shrink">
          <h3 className="text-[12px] sm:text-base font-bold text-slate-900 flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
            <span>{title}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white px-0.5 py-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="min-w-[58px] sm:min-w-[72px] text-center text-[10px] sm:text-xs font-bold text-slate-900 px-0.5 sm:px-1.5">
              {visibleMonthLabel}
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="다음 달"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="px-1.5 sm:px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] sm:text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            오늘
          </button>
        </div>
      </div>

      <div className="mt-2 sm:mt-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2">
          {WEEK_LABELS.map((label, index) => (
            <div
              key={label}
              className={`text-center text-[10px] sm:text-xs font-bold py-1.5 sm:py-2 ${
                index === 0 ? 'text-rose-500' : index === 6 ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            const dayEntries = entriesByDate.get(cell.iso) ?? [];
            const uniqueUserCount = new Set(dayEntries.map((entry) => entry.userId)).size;
            const visibleEntries = dayEntries.slice(0, 2);
            const extraCount = Math.max(dayEntries.length - visibleEntries.length, 0);
            const isToday = isSameDate(cell.date, today);
            const isSunday = cell.date.getDay() === 0;
            const isSaturday = cell.date.getDay() === 6;

            return (
              <div
                key={cell.iso}
                className={`rounded-lg sm:rounded-xl border transition-colors overflow-hidden ${
                  uniqueUserCount > 0
                    ? 'border-blue-300 bg-blue-50/70'
                    : cell.inCurrentMonth
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div className="sm:hidden aspect-square p-1 flex flex-col">
                  <div className="h-1/2 flex items-start justify-start">
                    <div
                      className={`text-[11px] font-semibold ${
                        !cell.inCurrentMonth
                          ? 'text-slate-300'
                          : isSunday
                          ? 'text-rose-500'
                          : isSaturday
                          ? 'text-blue-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {isToday ? (
                        <span className="inline-flex items-center justify-center min-w-[19px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                          {cell.date.getDate()}
                        </span>
                      ) : (
                        cell.date.getDate()
                      )}
                    </div>
                  </div>

                  <div className="h-1/2 flex items-center justify-center">
                    {uniqueUserCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[21px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-sm">
                        {uniqueUserCount}명
                      </span>
                    ) : (
                      <span className="h-[18px]" />
                    )}
                  </div>
                </div>

                <div className="hidden sm:block p-2 min-h-[96px] lg:min-h-[108px]">
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className={`text-sm font-semibold ${
                        !cell.inCurrentMonth
                          ? 'text-slate-300'
                          : isSunday
                          ? 'text-rose-500'
                          : isSaturday
                          ? 'text-blue-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {isToday ? (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                          {cell.date.getDate()}
                        </span>
                      ) : (
                        cell.date.getDate()
                      )}
                    </div>

                    {uniqueUserCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-sm">
                        {uniqueUserCount}명
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {visibleEntries.map((entry) => (
                      <div key={`${cell.iso}-${entry.requestId}-${entry.userId}`} className="text-[11px] leading-4 text-slate-700 font-medium">
                        <span className="font-bold text-slate-900">{entry.userName}</span>
                        <span className="text-blue-700"> ({entry.leaveTypeName})</span>
                      </div>
                    ))}

                    {extraCount > 0 && (
                      <div className="text-[11px] font-semibold text-blue-600">+{extraCount}명 더보기</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
