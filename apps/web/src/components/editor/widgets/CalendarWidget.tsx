import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { CalendarConfig } from "../../../types/widgets";

interface CalendarWidgetProps {
  config: CalendarConfig;
}

interface CalendarEvent {
  title: string;
  start: string;
}

const parseICal = (text: string): CalendarEvent[] => {
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  return blocks.map((block) => {
    const summary = block.match(/SUMMARY:(.+)/)?.[1]?.trim() ?? "Event";
    const dtstart = block.match(/DTSTART[^:]*:(.+)/)?.[1]?.trim() ?? "";
    return { title: summary, start: dtstart };
  });
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ config }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!config.calendarUrl) return;
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
    const timer = window.setInterval(load, config.refreshInterval * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [config.calendarUrl, config.refreshInterval]);

  const initialView = useMemo(() => {
    if (config.displayMode === "week") return "timeGridWeek";
    if (config.displayMode === "day") return "timeGridDay";
    return "dayGridMonth";
  }, [config.displayMode]);

  return (
    <div className="signage-calendar-host w-full h-full rounded overflow-hidden">
      <style>{`.signage-calendar-host > .fc { height: 100% !important; }`}</style>
      <FullCalendar
        key={config.displayMode}
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView={initialView}
        events={events}
        height="100%"
        expandRows
        headerToolbar={false}
      />
    </div>
  );
};

export default CalendarWidget;
