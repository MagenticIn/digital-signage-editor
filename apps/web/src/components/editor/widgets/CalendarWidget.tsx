import React, { useEffect, useMemo, useState } from "react";
import type { CalendarConfig } from "../../../types/widgets";

interface CalendarWidgetProps {
  config: CalendarConfig;
}

interface CalendarEvent {
  title: string;
  start: string;
}

const parseICalDate = (raw: string): string | null => {
  if (!raw) return null;
  const compact = raw.split("T")[0];
  if (compact.length !== 8) return null;
  const y = compact.slice(0, 4);
  const m = compact.slice(4, 6);
  const d = compact.slice(6, 8);
  return `${y}-${m}-${d}`;
};

const parseICal = (text: string): CalendarEvent[] => {
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  return blocks.map((block) => {
    const summary = block.match(/SUMMARY:(.+)/)?.[1]?.trim() ?? "Event";
    const dtstart = block.match(/DTSTART[^:]*:(.+)/)?.[1]?.trim() ?? "";
    return { title: summary, start: dtstart };
  });
};

const isoKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LABELS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ config }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!config.calendarUrl) {
      setEvents([]);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(config.calendarUrl);
        const text = await response.text();
        if (active) setEvents(parseICal(text));
      } catch (error) {
        console.error("Failed to load calendar", error);
      }
    };
    load();
    const timer = window.setInterval(load, Math.max(15, config.refreshInterval) * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [config.calendarUrl, config.refreshInterval]);

  const eventDays = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      const key = parseICalDate(ev.start);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => isoKey(today), [today]);
  const weekdayLabels = config.firstDayOfWeek === 1 ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS_SUN;

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() - config.firstDayOfWeek + 7) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);
    const items: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      items.push({ date, inMonth: date.getMonth() === month });
    }
    // Trim trailing all-out-of-month row to keep grid 5 rows where possible.
    const lastRowStart = items.length - 7;
    const lastRowAllOut = items.slice(lastRowStart).every((c) => !c.inMonth);
    return lastRowAllOut ? items.slice(0, lastRowStart) : items;
  }, [viewDate, config.firstDayOfWeek]);

  const rowCount = cells.length / 7;
  const goPrev = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div
      className="signage-calendar-host flex flex-col w-full h-full overflow-hidden rounded"
      style={{
        background: config.backgroundColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
        containerType: "size",
        fontSize: "clamp(6px, 3.2cqh, 22px)",
        lineHeight: 1.15,
      }}
    >
      {config.showHeader && (
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ padding: "0.6em 0.8em", borderBottom: `1px solid ${config.borderColor}` }}
        >
          <div style={{ fontWeight: 600, fontSize: "1.25em" }}>
            {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
          </div>
          {config.showNavigation && (
            <div className="flex items-center" style={{ gap: "0.3em" }}>
              <NavButton onClick={goPrev} color={config.accentColor} label="‹" />
              <NavButton onClick={goToday} color={config.accentColor} label="Today" wide />
              <NavButton onClick={goNext} color={config.accentColor} label="›" />
            </div>
          )}
        </div>
      )}

      {config.showWeekdayLabels && (
        <div
          className="grid shrink-0"
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            color: config.mutedTextColor,
            fontSize: "0.8em",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "0.3em 0.4em",
          }}
        >
          {weekdayLabels.map((label) => (
            <div key={label} style={{ textAlign: "center" }}>{label}</div>
          ))}
        </div>
      )}

      <div
        className="grid flex-1 min-h-0"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${rowCount}, 1fr)`,
          gap: "1px",
          background: config.borderColor,
          padding: "1px",
        }}
      >
        {cells.map(({ date, inMonth }) => {
          const key = isoKey(date);
          const isToday = key === todayKey;
          const eventCount = eventDays.get(key) ?? 0;
          return (
            <div
              key={key}
              style={{
                background: isToday ? config.todayColor : config.backgroundColor,
                color: inMonth ? config.textColor : config.mutedTextColor,
                opacity: inMonth ? 1 : 0.55,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "space-between",
                padding: "0.3em 0.4em",
                fontSize: "0.95em",
                fontWeight: isToday ? 700 : 500,
                overflow: "hidden",
              }}
            >
              <div style={{ textAlign: "right" }}>{date.getDate()}</div>
              {eventCount > 0 && (
                <div
                  className="flex items-center"
                  style={{ gap: "0.2em", justifyContent: "flex-start" }}
                >
                  {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: "0.45em",
                        height: "0.45em",
                        borderRadius: "50%",
                        background: isToday ? config.textColor : config.accentColor,
                        display: "inline-block",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NavButton: React.FC<{
  onClick: () => void;
  color: string;
  label: string;
  wide?: boolean;
}> = ({ onClick, color, label, wide }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      color,
      background: "transparent",
      border: `1px solid ${color}`,
      borderRadius: "0.3em",
      padding: wide ? "0.15em 0.7em" : "0.15em 0.45em",
      fontSize: "0.9em",
      lineHeight: 1,
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

export default CalendarWidget;
