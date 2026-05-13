"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { localDateKeyFromDate } from "@/lib/utils/date";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function buildCells(viewYear: number, viewMonth: number): (Date | null)[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length < 42) cells.push(null);
  return cells;
}

export interface DayCounts {
  active: number;
  pending: number;
}

export interface PhysicianMonthCalendarProps {
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  countsByDay: Record<string, DayCounts>;
  selectedDayKey: string | null;
  onSelectDay: (dayKey: string) => void;
  todayKey: string;
}

export function PhysicianMonthCalendar({
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  countsByDay,
  selectedDayKey,
  onSelectDay,
  todayKey,
}: PhysicianMonthCalendarProps) {
  const cells = buildCells(viewYear, viewMonth);
  const label = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevMonth}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 text-center text-lg font-medium tracking-tight text-slate-900">{label}</h2>
        <button
          type="button"
          onClick={onNextMonth}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`pad-${i}`} className="min-h-10 sm:min-h-11" />;
          }
          const key = localDateKeyFromDate(cell);
          const { active = 0, pending = 0 } = countsByDay[key] ?? { active: 0, pending: 0 };
          const isToday = key === todayKey;
          const isSelected = key === selectedDayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-pressed={isSelected}
              aria-label={`${cell.getDate()}, ${active} appointment${active !== 1 ? "s" : ""}`}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-xl border py-1.5 text-sm transition-colors sm:min-h-11",
                isSelected
                  ? "border-teal-500 bg-teal-50 text-teal-900"
                  : "border-transparent bg-slate-50/80 text-slate-800 hover:bg-slate-100",
                isToday && !isSelected && "ring-1 ring-teal-200 ring-offset-1 ring-offset-white"
              )}
            >
              <span className="font-semibold tabular-nums">{cell.getDate()}</span>
              {active > 0 && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden />
                  {pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
