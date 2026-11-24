import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { CalendarActivityItem } from '../data/schoolData';

export interface CalendarActivityMutationPayload {
  eventDate: string;
  title: string;
  divisionScope: CalendarActivityItem['divisionScope'];
  category: CalendarActivityItem['category'];
  timeRange: string;
  venue: string;
  details: string;
}

interface CalendarActivityManagerProps {
  accentColor: string;
  actorRoleLabel: 'AO-II' | 'Principal';
  activities: CalendarActivityItem[];
  onCreateActivity: (
    payload: CalendarActivityMutationPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateActivity: (
    id: string,
    payload: CalendarActivityMutationPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteActivity: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const DIVISION_OPTIONS: CalendarActivityItem['divisionScope'][] = [
  'All-School (K–6)',
  'Primary (K–3)',
  'Intermediate (4–6)',
];

const CATEGORY_OPTIONS: CalendarActivityItem['category'][] = [
  'Academic',
  'Arts & Culture',
  'Athletics',
  'Community & PTA',
];

function inferIsoDateFromActivity(ev: CalendarActivityItem): string {
  if (ev.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.eventDate)) {
    return ev.eventDate;
  }
  const parsed = new Date(`${ev.monthGroup.replace(' ', ` ${Number(ev.dayNumber)}, `)}`);
  if (Number.isNaN(parsed.getTime())) {
    return '2026-11-25';
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarActivityManager({
  accentColor,
  actorRoleLabel,
  activities,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
}: CalendarActivityManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<
    'ALL' | CalendarActivityItem['divisionScope']
  >('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventDate, setNewEventDate] = useState('2026-11-26');
  const [newTitle, setNewTitle] = useState('');
  const [newDivision, setNewDivision] =
    useState<CalendarActivityItem['divisionScope']>('All-School (K–6)');
  const [newCategory, setNewCategory] = useState<CalendarActivityItem['category']>('Academic');
  const [newTimeRange, setNewTimeRange] = useState('8:30 a.m. – 11:30 a.m.');
  const [newVenue, setNewVenue] = useState('Danlog Central Courtyard');
  const [newDetails, setNewDetails] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CalendarActivityMutationPayload>({
    eventDate: '2026-11-26',
    title: '',
    divisionScope: 'All-School (K–6)',
    category: 'Academic',
    timeRange: '',
    venue: '',
    details: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );

  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const ev of activities) {
      if (ev.monthGroup && !seen.has(ev.monthGroup)) {
        seen.add(ev.monthGroup);
        list.push(ev.monthGroup);
      }
    }
    return list;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((ev) => {
      const monthOk = monthFilter === 'ALL' || ev.monthGroup === monthFilter;
      const divOk = divisionFilter === 'ALL' || ev.divisionScope === divisionFilter;
      const queryOk =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.details.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.monthGroup.toLowerCase().includes(q);
      return monthOk && divOk && queryOk;
    });
  }, [activities, monthFilter, divisionFilter, searchQuery]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSavingNew(true);
    const res = await onCreateActivity({
      eventDate: newEventDate,
      title: newTitle.trim(),
      divisionScope: newDivision,
      category: newCategory,
      timeRange: newTimeRange.trim(),
      venue: newVenue.trim(),
      details: newDetails.trim(),
    });
    setIsSavingNew(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', message: res.error || 'Could not add calendar activity.' });
      return;
    }
    setNewTitle('');
    setNewDetails('');
    setShowAddForm(false);
    setFeedback({
      kind: 'success',
      message: 'Added new activity to the School Calendar and saved to database.',
    });
  };

  const startEdit = (ev: CalendarActivityItem) => {
    setConfirmDeleteId(null);
    setFeedback(null);
    setEditingId(ev.id);
    setEditDraft({
      eventDate: inferIsoDateFromActivity(ev),
      title: ev.title,
      divisionScope: ev.divisionScope,
      category: ev.category,
      timeRange: ev.timeRange,
      venue: ev.venue,
      details: ev.details,
    });
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setFeedback(null);
    setIsSavingEdit(true);
    const res = await onUpdateActivity(editingId, {
      ...editDraft,
      title: editDraft.title.trim(),
      timeRange: editDraft.timeRange.trim(),
      venue: editDraft.venue.trim(),
      details: editDraft.details.trim(),
    });
    setIsSavingEdit(false);
    if (!res.ok) {
      setFeedback({ kind: 'error', message: res.error || 'Could not update calendar activity.' });
      return;
    }
    setEditingId(null);
    setFeedback({
      kind: 'success',
      message: 'Updated Calendar of Activities entry and synced to Home Page notice board.',
    });
  };

  const handleConfirmDelete = async (id: string, title: string) => {
    setFeedback(null);
    setDeletingId(id);
    const res = await onDeleteActivity(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      setFeedback({ kind: 'error', message: res.error || 'Could not delete calendar activity.' });
      return;
    }
    setFeedback({
      kind: 'success',
      message: `Removed "${title}" from the School Calendar of Activities.`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
            <Calendar className="w-4 h-4" />
            <span>School Calendar of Activities ({activities.length} Scheduled)</span>
          </div>
          <p className="text-xs text-[#525866]">
            {actorRoleLabel} management workspace — add, edit, or remove school activities. Changes
            are saved to the database and published live to the Home Page calendar and notice
            board.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setEditingId(null);
            setConfirmDeleteId(null);
            setFeedback(null);
          }}
          style={{ backgroundColor: accentColor }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? 'Close Form' : 'Add Calendar Activity'}</span>
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`bg-white rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            feedback.kind === 'error'
              ? 'border-[#B91C1C] text-[#B91C1C]'
              : 'border-[#047857] text-[#047857]'
          }`}
        >
          {feedback.kind === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-[#A7F3D0] p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-base font-semibold text-[#111315]">
              Add New School Calendar Activity
            </h4>
            <span className="text-[11px] font-medium text-[#525866]">
              Authorized: {actorRoleLabel} Account
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Activity Date *
              </label>
              <input
                type="date"
                required
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Quarter 2 PTA Assembly & Reading Camp"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Category *
              </label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as CalendarActivityItem['category'])
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Division Scope *
              </label>
              <select
                value={newDivision}
                onChange={(e) =>
                  setNewDivision(e.target.value as CalendarActivityItem['divisionScope'])
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                {DIVISION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Time Schedule *
              </label>
              <input
                type="text"
                required
                value={newTimeRange}
                onChange={(e) => setNewTimeRange(e.target.value)}
                placeholder="e.g., 8:30 a.m. – 11:30 a.m."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Venue / Location *
              </label>
              <input
                type="text"
                required
                value={newVenue}
                onChange={(e) => setNewVenue(e.target.value)}
                placeholder="e.g., Danlog Multi-Purpose Covered Court"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                Activity Details &amp; Notes
              </label>
              <textarea
                rows={2}
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Describe participants, program highlights, or preparation reminders..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingNew}
              style={{ backgroundColor: accentColor }}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
            >
              {isSavingNew ? 'Saving...' : 'Save Calendar Activity'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity title, venue, or details..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter calendar management by month"
            className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
          >
            <option value="ALL">All Months ({activities.length})</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={divisionFilter}
            onChange={(e) =>
              setDivisionFilter(e.target.value as 'ALL' | CalendarActivityItem['divisionScope'])
            }
            aria-label="Filter calendar management by division"
            className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
          >
            <option value="ALL">All Divisions</option>
            {DIVISION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9] overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#111315]">
              No calendar activities match your current filter.
            </p>
            <p className="text-xs text-[#525866]">
              Clear your filters or click &ldquo;Add Calendar Activity&rdquo; to schedule a new
              event.
            </p>
          </div>
        ) : (
          filteredActivities.map((ev) => {
            const isEditing = editingId === ev.id;
            const isConfirmingDelete = confirmDeleteId === ev.id;

            if (isEditing) {
              return (
                <form key={ev.id} onSubmit={handleSaveEdit} className="p-5 bg-[#F8FBF9] space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#047857]">
                      Editing Calendar Activity
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs font-medium text-[#525866] hover:text-[#111315] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={editDraft.eventDate}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, eventDate: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Category
                      </label>
                      <select
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            category: e.target.value as CalendarActivityItem['category'],
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Division Scope
                      </label>
                      <select
                        value={editDraft.divisionScope}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            divisionScope: e.target.value as CalendarActivityItem['divisionScope'],
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      >
                        {DIVISION_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Time Range
                      </label>
                      <input
                        type="text"
                        required
                        value={editDraft.timeRange}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, timeRange: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Venue
                      </label>
                      <input
                        type="text"
                        required
                        value={editDraft.venue}
                        onChange={(e) => setEditDraft((p) => ({ ...p, venue: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                        Details
                      </label>
                      <textarea
                        rows={2}
                        value={editDraft.details}
                        onChange={(e) => setEditDraft((p) => ({ ...p, details: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-[#DCE0E6] text-[#525866] bg-white rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      style={{ backgroundColor: accentColor }}
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={ev.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] flex flex-col items-center justify-center shrink-0">
                    <span
                      className="text-[10px] font-bold tracking-wider"
                      style={{ color: accentColor }}
                    >
                      {ev.monthShort}
                    </span>
                    <span className="font-display text-xl font-semibold text-[#111315] leading-none tabular-nums mt-0.5">
                      {ev.dayNumber}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] text-[#525866] flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#111315]">
                        {ev.dayOfWeek} · {ev.monthGroup}
                      </span>
                      <span>·</span>
                      <span>{ev.divisionScope}</span>
                      <span>·</span>
                      <span className="font-medium text-[#047857]">{ev.category}</span>
                    </div>
                    <h5 className="font-display text-base font-semibold text-[#111315]">
                      {ev.title}
                    </h5>
                    <p className="text-xs text-[#525866] leading-relaxed">{ev.details}</p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-[#525866]">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3 h-3" />
                        {ev.timeRange}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ev.venue}
                      </span>
                      {ev.updatedBy && (
                        <span className="text-[#64748B]">
                          Last updated by {ev.updatedBy}
                          {ev.updatedAt ? ` (${ev.updatedAt})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => startEdit(ev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#DCE0E6] bg-white hover:bg-[#F2F4F6] text-[#111315] rounded-lg cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {isConfirmingDelete ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={deletingId === ev.id}
                        onClick={() => void handleConfirmDelete(ev.id, ev.title)}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg cursor-pointer disabled:opacity-60"
                      >
                        {deletingId === ev.id ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-xs font-semibold border border-[#DCE0E6] text-[#525866] bg-white rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(ev.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] bg-white rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
