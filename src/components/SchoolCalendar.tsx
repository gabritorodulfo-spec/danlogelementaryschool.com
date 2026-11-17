import { useMemo, useState } from 'react';
import { Calendar, Check, Clock, MapPin } from 'lucide-react';
import {
  CalendarActivityItem,
  CalendarMonthFilter,
  SCHOOL_CALENDAR_EVENTS,
} from '../data/schoolData';

interface SchoolCalendarProps {
  accentColor: string;
}

const MONTHS: CalendarMonthFilter[] = [
  'All Months',
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
];

const DIVISION_SCOPES: ('All Divisions' | CalendarActivityItem['divisionScope'])[] = [
  'All Divisions',
  'All-School (K–6)',
  'Primary (K–3)',
  'Intermediate (4–6)',
];

export function SchoolCalendar({ accentColor }: SchoolCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<CalendarMonthFilter>('All Months');
  const [selectedDivision, setSelectedDivision] = useState<
    'All Divisions' | CalendarActivityItem['divisionScope']
  >('All Divisions');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  const visibleEvents = useMemo(() => {
    return SCHOOL_CALENDAR_EVENTS.filter((ev) => {
      const monthOk = selectedMonth === 'All Months' || ev.monthGroup === selectedMonth;
      const divOk =
        selectedDivision === 'All Divisions' || ev.divisionScope === selectedDivision;
      return monthOk && divOk;
    });
  }, [selectedMonth, selectedDivision]);

  const toggleSaveReminder = (id: string) => {
    setSavedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section id="calendar" className="py-16 lg:py-24 bg-transparent border-b border-[#D2DFD7]">
      <div className="max-w-[1200px] mx-auto px-6 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium" style={{ color: accentColor }}>
              School Calendar of Activities
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#111315]">
              Upcoming academic symposia, arts recitals, athletics, and family dates.
            </h2>
            <p className="text-sm md:text-base text-[#525866]">
              Filter the 2026–2027 term calendar by month or school division and bookmark key dates
              for your family schedule.
            </p>
          </div>

          <div className="text-xs font-mono tabular-nums text-[#525866] shrink-0">
            {savedEventIds.length > 0
              ? `${savedEventIds.length} Event${savedEventIds.length === 1 ? '' : 's'} Bookmarked`
              : `${visibleEvents.length} Scheduled Activities`}
          </div>
        </div>

        {/* Calendar Filters */}
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-[#D2DFD7] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
          <div
            role="group"
            aria-label="Filter calendar by month"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EAF2ED] rounded-lg border border-[#D2DFD7]"
          >
            {MONTHS.map((month) => {
              const active = selectedMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => setSelectedMonth(month)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#111315] shadow-xs'
                      : 'text-[#525866] hover:text-[#111315]'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <select
            value={selectedDivision}
            onChange={(e) =>
              setSelectedDivision(
                e.target.value as 'All Divisions' | CalendarActivityItem['divisionScope']
              )
            }
            aria-label="Filter calendar by school division"
            className="px-3.5 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] focus:outline-none"
          >
            {DIVISION_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </div>

        {/* Calendar Rows */}
        {visibleEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E5E9] p-10 text-center space-y-3">
            <p className="text-sm font-medium text-[#111315]">
              No scheduled activities match {selectedMonth} for {selectedDivision}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('All Months');
                setSelectedDivision('All Divisions');
              }}
              style={{ backgroundColor: accentColor }}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
            >
              Show Full Calendar
            </button>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-[#D2DFD7] divide-y divide-[#E4ECE7] shadow-xs">
            {visibleEvents.map((ev) => {
              const isSaved = savedEventIds.includes(ev.id);
              return (
                <article
                  key={ev.id}
                  className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center hover:bg-[#F8F9FA] transition-colors"
                >
                  {/* Date Block */}
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] flex flex-col items-center justify-center shrink-0">
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{ color: accentColor }}
                      >
                        {ev.monthShort}
                      </span>
                      <span className="font-display text-2xl font-semibold text-[#111315] leading-none tabular-nums mt-0.5">
                        {ev.dayNumber}
                      </span>
                    </div>
                    <div className="md:hidden text-xs font-medium text-[#525866]">
                      {ev.dayOfWeek} · {ev.monthGroup}
                    </div>
                  </div>

                  {/* Event Narrative */}
                  <div className="md:col-span-7 space-y-1.5">
                    <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                      <span className="hidden md:inline font-medium text-[#111315]">
                        {ev.dayOfWeek}
                      </span>
                      <span className="hidden md:inline" aria-hidden="true">
                        ·
                      </span>
                      <span>{ev.divisionScope}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ev.category}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#111315]">
                      {ev.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#525866]">{ev.details}</p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#525866]">
                      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {ev.timeRange}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {ev.venue}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="md:col-span-3 md:text-right">
                    <button
                      type="button"
                      onClick={() => toggleSaveReminder(ev.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isSaved
                          ? 'bg-[#ECFDF5] border-[#047857] text-[#047857]'
                          : 'bg-white border-[#DCE0E6] text-[#111315] hover:bg-[#F2F4F6]'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved to List</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Save Date</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
