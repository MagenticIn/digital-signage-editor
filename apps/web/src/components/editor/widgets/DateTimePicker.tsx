import React, { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DateTimePickerProps {
  /** ISO string (UTC). Read/written as local wall-clock so the picked instant is the one that counts down. */
  value: string;
  onChange: (iso: string) => void;
}

interface LocalParts {
  y: number;
  m: number; // 1-12
  d: number;
  hh: number;
  mm: number;
}

/** Parse an ISO string into local wall-clock parts. Falls back to "now + 1h" when empty/invalid. */
function isoToLocalParts(iso: string): LocalParts {
  const date = iso ? new Date(iso) : new Date(NaN);
  const safe = Number.isNaN(date.getTime())
    ? new Date(Date.now() + 60 * 60 * 1000)
    : date;
  return {
    y: safe.getFullYear(),
    m: safe.getMonth() + 1,
    d: safe.getDate(),
    hh: safe.getHours(),
    mm: safe.getMinutes(),
  };
}

function localPartsToIso(p: LocalParts): string {
  return new Date(p.y, p.m - 1, p.d, p.hh, p.mm, 0, 0).toISOString();
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
  const parts = useMemo(() => isoToLocalParts(value), [value]);
  const [viewYear, setViewYear] = useState(parts.y);
  const [viewMonth, setViewMonth] = useState(parts.m); // 1-12

  // Re-sync the visible month to the selected value whenever it changes externally.
  React.useEffect(() => {
    setViewYear(parts.y);
    setViewMonth(parts.m);
  }, [parts.y, parts.m]);

  const today = new Date();

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const commit = (next: Partial<LocalParts>) => {
    onChange(localPartsToIso({ ...parts, ...next }));
  };

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const triggerLabel = `${parts.y}-${pad(parts.m)}-${pad(parts.d)}  ${pad(parts.hh)}:${pad(parts.mm)}`;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 bg-background border border-border rounded px-2 py-1 text-xs hover:bg-background-elevated"
        >
          <span>{triggerLabel}</span>
          <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[2147483000] w-64 rounded-lg border border-border bg-background-elevated p-3 shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="p-1 rounded hover:bg-background" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </span>
            <button type="button" className="p-1 rounded hover:bg-background" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-text-muted">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, i) => {
              if (day === null) return <div key={i} />;
              const isSelected =
                day === parts.d && viewMonth === parts.m && viewYear === parts.y;
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() + 1 &&
                viewYear === today.getFullYear();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => commit({ y: viewYear, m: viewMonth, d: day })}
                  className={[
                    "text-[11px] h-7 rounded flex items-center justify-center",
                    isSelected
                      ? "bg-primary text-white"
                      : isToday
                        ? "border border-primary/60 text-text-primary"
                        : "hover:bg-background text-text-secondary",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="text-[10px] text-text-secondary">Time</label>
            <input
              type="time"
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
              value={`${pad(parts.hh)}:${pad(parts.mm)}`}
              onChange={(e) => {
                const [hh, mm] = e.target.value.split(":").map((v) => Number(v));
                if (Number.isFinite(hh) && Number.isFinite(mm)) {
                  commit({ hh, mm });
                }
              }}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default DateTimePicker;
