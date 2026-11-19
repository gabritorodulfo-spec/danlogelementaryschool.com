import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileEdit,
  Forward,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Ao2LeaveEndorsementStatus,
  LeaveApplication,
  LeaveDecisionStatus,
  LeaveType,
} from '../types/schoolConfig';

export const LEAVE_TYPES: LeaveType[] = [
  'Vacation Leave',
  'Sick Leave',
  'Wellness Leave',
  'Special Privilege Leave',
  'Maternity / Paternity Leave',
  'Emergency / Calamity Leave',
  'Study / Official Business Leave',
  'Other',
];

function calculateInclusiveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function statusColors(status: LeaveDecisionStatus): string {
  switch (status) {
    case 'Approved':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    case 'Disapproved':
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    default:
      return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
  }
}

export interface LeaveFormPayload {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  contactDuringLeave?: string;
  coveringStaff?: string;
}

export interface Ao2LeaveEditPayload extends LeaveFormPayload {
  ao2EditNote?: string;
}

interface LeaveApplicationWorkspaceProps {
  mode: 'teacher' | 'principal' | 'ao2';
  accentColor: string;
  actorAccountId: string;
  actorRole: 'Teacher' | 'Principal' | 'AO-II';
  actorName: string;
  actorDepartmentOrGrade: string;
  leaveApplications: LeaveApplication[];
  onSubmitLeaveApplication: (
    payload: LeaveFormPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onPrincipalDecideLeave?: (
    id: string,
    payload: { principalStatus: 'Approved' | 'Disapproved'; principalNote?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2EditLeaveApplication?: (
    id: string,
    payload: Ao2LeaveEditPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2EndorseLeaveApplication?: (
    id: string,
    endorsementStatus?: 'Endorsed' | 'Pending Endorsement'
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteLeaveApplication?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function LeaveApplicationWorkspace({
  mode,
  accentColor,
  actorAccountId,
  actorRole,
  actorName,
  actorDepartmentOrGrade,
  leaveApplications,
  onSubmitLeaveApplication,
  onPrincipalDecideLeave,
  onAo2EditLeaveApplication,
  onAo2EndorseLeaveApplication,
  onAo2DeleteLeaveApplication,
}: LeaveApplicationWorkspaceProps) {
  // Apply modal state (available to ALL accounts: Teacher, Principal, AO-II)
  const [showApplyModal, setShowApplyModal] = useState(false);
  const applyReasonRef = useRef<HTMLTextAreaElement>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('Vacation Leave');
  const [startDate, setStartDate] = useState<string>(todayIsoDate());
  const [endDate, setEndDate] = useState<string>(todayIsoDate());
  const [numberOfDays, setNumberOfDays] = useState<string>('1');
  const [reason, setReason] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');
  const [coveringStaff, setCoveringStaff] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );
  const [modalError, setModalError] = useState('');

  // Filters & search
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeaveDecisionStatus>('ALL');
  const [endorsementFilter, setEndorsementFilter] = useState<'ALL' | Ao2LeaveEndorsementStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Teacher' | 'Principal' | 'AO-II'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Principal decision notes per application
  const [principalNotes, setPrincipalNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // AO-II edit modal state
  const [editingApp, setEditingApp] = useState<LeaveApplication | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType>('Vacation Leave');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNumberOfDays, setEditNumberOfDays] = useState('1');
  const [editReason, setEditReason] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editCovering, setEditCovering] = useState('');
  const [editAo2Note, setEditAo2Note] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // AO-II delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!showApplyModal) return;
    const t = window.setTimeout(() => applyReasonRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setShowApplyModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [showApplyModal, submitting]);

  const handleOpenApplyModal = () => {
    const today = todayIsoDate();
    setLeaveType('Vacation Leave');
    setStartDate(today);
    setEndDate(today);
    setNumberOfDays('1');
    setReason('');
    setContactDuringLeave('');
    setCoveringStaff('');
    setModalError('');
    setShowApplyModal(true);
  };

  const handleDatesChange = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    if (nextStart && nextEnd && nextEnd >= nextStart) {
      setNumberOfDays(String(calculateInclusiveDays(nextStart, nextEnd)));
    }
  };

  const handleSubmitApply = async (e: FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!startDate || !endDate) {
      setModalError('Select both start and end dates for your leave.');
      return;
    }
    if (endDate < startDate) {
      setModalError('End date cannot be earlier than the start date.');
      return;
    }
    const daysNum = Number(numberOfDays);
    if (!Number.isFinite(daysNum) || daysNum < 0.5) {
      setModalError('Number of days must be at least 0.5.');
      return;
    }
    if (reason.trim().length < 4) {
      setModalError('Provide a brief reason or purpose for the leave application.');
      return;
    }

    setSubmitting(true);
    const res = await onSubmitLeaveApplication({
      leaveType,
      startDate,
      endDate,
      numberOfDays: daysNum,
      reason: reason.trim(),
      contactDuringLeave: contactDuringLeave.trim() || undefined,
      coveringStaff: coveringStaff.trim() || undefined,
    });
    setSubmitting(false);

    if (!res.ok) {
      setModalError(res.error || 'Could not submit leave application.');
      return;
    }
    setShowApplyModal(false);
    setFeedback({
      kind: 'success',
      message:
        'Leave application submitted and saved to the school database. It will appear in the Principal review queue once endorsed by AO-II.',
    });
  };

  const handleOpenEditModal = (app: LeaveApplication) => {
    setEditingApp(app);
    setEditLeaveType(app.leaveType);
    setEditStartDate(app.startDate);
    setEditEndDate(app.endDate);
    setEditNumberOfDays(String(app.numberOfDays));
    setEditReason(app.reason);
    setEditContact(app.contactDuringLeave ?? '');
    setEditCovering(app.coveringStaff ?? '');
    setEditAo2Note(app.ao2EditNote ?? '');
    setEditError('');
  };

  const handleSaveAo2Edit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingApp || !onAo2EditLeaveApplication) return;
    setEditError('');
    if (!editStartDate || !editEndDate || editEndDate < editStartDate) {
      setEditError('Please provide valid inclusive start and end dates.');
      return;
    }
    const daysNum = Number(editNumberOfDays);
    if (!Number.isFinite(daysNum) || daysNum < 0.5) {
      setEditError('Number of days must be at least 0.5.');
      return;
    }
    if (editReason.trim().length < 4) {
      setEditError('Reason must be at least 4 characters.');
      return;
    }

    setEditSubmitting(true);
    const res = await onAo2EditLeaveApplication(editingApp.id, {
      leaveType: editLeaveType,
      startDate: editStartDate,
      endDate: editEndDate,
      numberOfDays: daysNum,
      reason: editReason.trim(),
      contactDuringLeave: editContact.trim() || undefined,
      coveringStaff: editCovering.trim() || undefined,
      ao2EditNote: editAo2Note.trim() || undefined,
    });
    setEditSubmitting(false);

    if (!res.ok) {
      setEditError(res.error || 'Could not update leave application entry.');
      return;
    }
    const editedName = editingApp.applicantName;
    setEditingApp(null);
    setFeedback({
      kind: 'success',
      message: `Updated leave application entry for ${editedName} in the database.`,
    });
  };

  // Determine scoped dataset
  // Principal ONLY sees leave applications that have been endorsed by AO-II.
  const baseApplications = useMemo(() => {
    if (mode === 'teacher') {
      return leaveApplications.filter((a) => a.applicantAccountId === actorAccountId);
    }
    if (mode === 'principal') {
      return leaveApplications.filter((a) => a.ao2EndorsementStatus === 'Endorsed');
    }
    return leaveApplications;
  }, [leaveApplications, mode, actorAccountId]);

  const counts = useMemo(() => {
    const pending = baseApplications.filter((a) => a.principalStatus === 'Pending').length;
    const approved = baseApplications.filter((a) => a.principalStatus === 'Approved').length;
    const disapproved = baseApplications.filter((a) => a.principalStatus === 'Disapproved').length;
    return {
      total: baseApplications.length,
      pending,
      approved,
      disapproved,
    };
  }, [baseApplications]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseApplications.filter((app) => {
      const effectiveEndorsement: Ao2LeaveEndorsementStatus =
        app.ao2EndorsementStatus ?? 'Pending Endorsement';
      if (statusFilter !== 'ALL' && app.principalStatus !== statusFilter) return false;
      if (mode === 'ao2' && endorsementFilter !== 'ALL' && effectiveEndorsement !== endorsementFilter) {
        return false;
      }
      if (roleFilter !== 'ALL' && app.applicantRole !== roleFilter) return false;
      if (!q) return true;
      return (
        app.applicantName.toLowerCase().includes(q) ||
        app.applicantDepartmentOrGrade.toLowerCase().includes(q) ||
        app.leaveType.toLowerCase().includes(q) ||
        app.reason.toLowerCase().includes(q) ||
        app.startDate.includes(q) ||
        app.endDate.includes(q)
      );
    });
  }, [baseApplications, statusFilter, endorsementFilter, roleFilter, searchQuery, mode]);

  const handleAo2EndorseAction = async (
    app: LeaveApplication,
    nextStatus: 'Endorsed' | 'Pending Endorsement' = 'Endorsed'
  ) => {
    if (!onAo2EndorseLeaveApplication) return;
    setBusyId(app.id);
    setFeedback(null);
    const res = await onAo2EndorseLeaveApplication(app.id, nextStatus);
    setBusyId(null);
    if (!res.ok) {
      setFeedback({
        kind: 'error',
        message: res.error || 'Could not update AO-II leave endorsement.',
      });
      return;
    }
    setFeedback({
      kind: 'success',
      message:
        nextStatus === 'Endorsed'
          ? `Endorsed ${app.applicantName}'s leave application to the School Principal.`
          : `Returned ${app.applicantName}'s leave application to Pending Endorsement.`,
    });
  };

  const handlePrincipalAction = async (
    app: LeaveApplication,
    decision: 'Approved' | 'Disapproved'
  ) => {
    if (!onPrincipalDecideLeave) return;
    setBusyId(app.id);
    setFeedback(null);
    const note = (principalNotes[app.id] ?? app.principalNote ?? '').trim();
    const res = await onPrincipalDecideLeave(app.id, {
      principalStatus: decision,
      principalNote: note || undefined,
    });
    setBusyId(null);
    if (!res.ok) {
      setFeedback({
        kind: 'error',
        message: res.error || 'Could not record Principal leave decision.',
      });
      return;
    }
    setFeedback({
      kind: 'success',
      message: `Leave application for ${app.applicantName} marked as ${decision}.`,
    });
  };

  const handleConfirmDelete = async (app: LeaveApplication) => {
    if (!onAo2DeleteLeaveApplication) return;
    setBusyId(app.id);
    const res = await onAo2DeleteLeaveApplication(app.id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      setFeedback({
        kind: 'error',
        message: res.error || 'Could not delete leave application.',
      });
      return;
    }
    setFeedback({
      kind: 'success',
      message: `Deleted leave application ${app.id} (${app.applicantName}) from database.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Apply CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-[#E2E5E9] p-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: accentColor }}>
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {mode === 'principal'
                ? 'Principal Leave Approval & Personal Filing'
                : mode === 'ao2'
                  ? 'AO-II Leave Records Editor & Personal Filing'
                  : 'Faculty Leave Application'}
            </span>
          </div>
          <h4 className="font-display text-lg font-semibold text-[#111315]">
            {mode === 'teacher'
              ? 'Leave Application Form & My Filing Status'
              : mode === 'principal'
                ? 'Staff Leave Applications & Principal Decisions'
                : 'All Staff & Teacher Leave Applications'}
          </h4>
          <p className="text-xs text-[#525866]">
            {mode === 'teacher'
              ? 'Submit your leave application form here. AO-II reviews and endorses it to the School Principal for final approval or disapproval.'
              : mode === 'principal'
                ? 'Only leave applications endorsed by AO-II appear here for Principal approval or disapproval. You may also submit your own leave application (which goes through AO-II endorsement first).'
                : 'Review all submitted leave applications, edit entries on any teacher or staff application, endorse applications so the Principal can see and decide on them, or submit your own leave application.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenApplyModal}
          style={{ backgroundColor: accentColor }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-lg shadow-xs hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 bg-white ${
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

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: mode === 'teacher' ? 'My Applications' : 'Total Applications',
            value: counts.total,
            filter: 'ALL' as const,
            tone: 'text-[#111315]',
          },
          {
            label: 'Pending Decision',
            value: counts.pending,
            filter: 'Pending' as const,
            tone: 'text-[#B45309]',
          },
          {
            label: 'Approved',
            value: counts.approved,
            filter: 'Approved' as const,
            tone: 'text-[#047857]',
          },
          {
            label: 'Disapproved',
            value: counts.disapproved,
            filter: 'Disapproved' as const,
            tone: 'text-[#B91C1C]',
          },
        ].map((kpi) => {
          const active = statusFilter === kpi.filter;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setStatusFilter(kpi.filter)}
              className={`text-left p-4 rounded-xl border bg-white transition-all cursor-pointer ${
                active
                  ? 'border-[#15803D] ring-2 ring-[#15803D]/20'
                  : 'border-[#E2E5E9] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="text-[11px] font-medium text-[#525866]">{kpi.label}</div>
              <div className={`font-display text-2xl font-semibold tabular-nums mt-1 ${kpi.tone}`}>
                {kpi.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F8F9FA] rounded-xl border border-[#E2E5E9] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'Pending', 'Approved', 'Disapproved'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={active ? { backgroundColor: accentColor } : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'text-white'
                    : 'bg-white border border-[#DCE0E6] text-[#525866] hover:text-[#111315]'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            );
          })}

          {mode === 'ao2' && (
            <select
              aria-label="Filter by AO-II endorsement"
              value={endorsementFilter}
              onChange={(e) =>
                setEndorsementFilter(e.target.value as 'ALL' | Ao2LeaveEndorsementStatus)
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DCE0E6] text-[#111315]"
            >
              <option value="ALL">All Endorsements</option>
              <option value="Pending Endorsement">Pending Endorsement</option>
              <option value="Endorsed">Endorsed to Principal</option>
            </select>
          )}

          {mode !== 'teacher' && (
            <select
              aria-label="Filter by applicant role"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as 'ALL' | 'Teacher' | 'Principal' | 'AO-II')
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DCE0E6] text-[#111315]"
            >
              <option value="ALL">All Account Roles</option>
              <option value="Teacher">Teachers Only</option>
              <option value="Principal">Principal</option>
              <option value="AO-II">AO-II</option>
            </select>
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, leave type, date..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
          />
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#CBD5E1] p-10 text-center space-y-2">
          <ClipboardCheck className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <div className="text-sm font-semibold text-[#111315]">
            {mode === 'principal'
              ? 'No AO-II-endorsed leave applications in view'
              : 'No leave applications match the current view'}
          </div>
          <p className="text-xs text-[#525866]">
            {mode === 'principal'
              ? 'Submitted leave applications only appear in the Principal portal once endorsed by AO-II.'
              : 'Use \u201cApply for Leave\u201d to submit a new leave application form.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const isOwnApplication = app.applicantAccountId === actorAccountId;
            const isBusy = busyId === app.id;
            const noteValue = principalNotes[app.id] ?? app.principalNote ?? '';

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-4 shadow-2xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-semibold text-[#111315]">
                        {app.applicantName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F1F5F9] text-[#334155]">
                        {app.applicantRole}
                      </span>
                      {isOwnApplication && mode !== 'teacher' && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                          My Application
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          app.ao2EndorsementStatus === 'Endorsed'
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                            : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]'
                        }`}
                      >
                        {app.ao2EndorsementStatus === 'Endorsed'
                          ? 'Endorsed by AO-II'
                          : 'Pending AO-II Endorsement'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${statusColors(
                          app.principalStatus
                        )}`}
                      >
                        {app.principalStatus === 'Pending'
                          ? 'Pending Principal Decision'
                          : app.principalStatus}
                      </span>
                    </div>

                    <div className="text-xs text-[#525866]">
                      {app.applicantDepartmentOrGrade} · @{app.applicantUsername} · Submitted{' '}
                      {app.submittedAt}
                      {app.ao2EndorsedAt ? ` · Endorsed ${app.ao2EndorsedAt}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E5E9] text-xs font-mono text-[#111315]">
                      {app.leaveType} · {app.startDate} to {app.endDate} ({app.numberOfDays}{' '}
                      {app.numberOfDays === 1 ? 'day' : 'days'})
                    </div>

                    {/* AO-II Endorse to Principal action */}
                    {mode === 'ao2' &&
                      onAo2EndorseLeaveApplication &&
                      (app.ao2EndorsementStatus !== 'Endorsed' ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAo2EndorseAction(app, 'Endorsed')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#047857] text-white hover:bg-[#065F46] transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Forward className="w-3.5 h-3.5" />
                          <span>Endorse to Principal</span>
                        </button>
                      ) : (
                        app.principalStatus === 'Pending' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAo2EndorseAction(app, 'Pending Endorsement')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#CBD5E1] text-[#475569] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <span>Recall Endorsement</span>
                          </button>
                        )
                      ))}

                    {/* AO-II can edit the entry on any teacher/staff application */}
                    {mode === 'ao2' && onAo2EditLeaveApplication && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#1D4ED8] text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit Entry</span>
                      </button>
                    )}

                    {/* AO-II-only delete button */}
                    {mode === 'ao2' && onAo2DeleteLeaveApplication && (
                      confirmDeleteId === app.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleConfirmDelete(app)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#DCE0E6] text-[#525866] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(app.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Details Box */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F8FAFC] rounded-lg border border-[#E2E5E9] p-4 text-xs">
                  <div className="md:col-span-6 space-y-1">
                    <div className="font-semibold text-[#525866] uppercase tracking-wider text-[10px]">
                      Reason / Purpose of Leave
                    </div>
                    <p className="text-[#111315] whitespace-pre-wrap">{app.reason}</p>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <div className="font-semibold text-[#525866] uppercase tracking-wider text-[10px]">
                      Covering / Substitute Staff
                    </div>
                    <div className="text-[#111315]">
                      {app.coveringStaff || 'None specified'}
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <div className="font-semibold text-[#525866] uppercase tracking-wider text-[10px]">
                      Contact While on Leave
                    </div>
                    <div className="text-[#111315]">
                      {app.contactDuringLeave || 'Use school directory contact'}
                    </div>
                  </div>
                </div>

                {/* AO-II Entry Edit Audit Note (if edited by AO-II) */}
                {(app.lastEditedByAo2At || app.ao2EditNote) && (
                  <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF]/70 px-3.5 py-2.5 text-xs text-[#1E3A8A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">
                        Edited by {app.lastEditedByAo2Name || 'AO-II Administrator'}
                      </span>
                      {app.lastEditedByAo2At ? ` · ${app.lastEditedByAo2At}` : ''}
                      {app.ao2EditNote ? ` — "${app.ao2EditNote}"` : ''}
                    </div>
                  </div>
                )}

                {/* Principal Decision Summary or Controls */}
                {mode === 'principal' && onPrincipalDecideLeave ? (
                  <div className="pt-2 border-t border-[#E2E5E9] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) =>
                          setPrincipalNotes((prev) => ({
                            ...prev,
                            [app.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional Principal decision remarks (e.g., Approved with class coverage noted)..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {app.principalReviewedAt && (
                        <span className="text-[11px] text-[#525866] mr-1">
                          Last decided: {app.principalReviewedAt}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handlePrincipalAction(app, 'Approved')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          app.principalStatus === 'Approved'
                            ? 'bg-[#047857] text-white'
                            : 'border border-[#047857] text-[#047857] bg-white hover:bg-[#ECFDF5]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handlePrincipalAction(app, 'Disapproved')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          app.principalStatus === 'Disapproved'
                            ? 'bg-[#B91C1C] text-white'
                            : 'border border-[#B91C1C] text-[#B91C1C] bg-white hover:bg-[#FEF2F2]'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Disapprove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#E2E5E9] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[#525866]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Principal Decision:{' '}
                        <strong className="text-[#111315]">{app.principalStatus}</strong>
                        {app.principalReviewedBy ? ` by ${app.principalReviewedBy}` : ''}
                        {app.principalReviewedAt ? ` (${app.principalReviewedAt})` : ''}
                      </span>
                    </div>
                    {app.principalNote && (
                      <div className="text-[#111315] italic">
                        Remarks: &ldquo;{app.principalNote}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* APPLY FOR LEAVE MODAL (ALL ACCOUNTS) */}
      {showApplyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-apply-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#E2E5E9] shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
              <div>
                <h3
                  id="leave-apply-modal-title"
                  className="font-display text-lg font-semibold text-[#111315]"
                >
                  Application for Leave Form
                </h3>
                <p className="text-xs text-[#525866]">
                  Applicant: <strong>{actorName}</strong> ({actorRole} · {actorDepartmentOrGrade})
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-lg text-[#525866] hover:bg-[#F1F5F9] cursor-pointer"
                aria-label="Close leave form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="p-6 space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#B91C1C] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#B91C1C] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Type of Leave
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDatesChange(e.target.value, endDate)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => handleDatesChange(startDate, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    No. of Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={numberOfDays}
                    onChange={(e) => setNumberOfDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Reason / Details of Leave
                </label>
                <textarea
                  ref={applyReasonRef}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for leave and any important class or office hand-off notes..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Covering / Substitute Staff (Optional)
                  </label>
                  <input
                    type="text"
                    value={coveringStaff}
                    onChange={(e) => setCoveringStaff(e.target.value)}
                    placeholder="e.g., Co-teacher or reliever"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Contact Number / Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={contactDuringLeave}
                    onChange={(e) => setContactDuringLeave(e.target.value)}
                    placeholder="e.g., +63 917 555 0192"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E5E9]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#DCE0E6] text-[#525866] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Leave Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AO-II EDIT ENTRY MODAL */}
      {editingApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ao2-edit-leave-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#E2E5E9] shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
              <div>
                <h3
                  id="ao2-edit-leave-modal-title"
                  className="font-display text-lg font-semibold text-[#111315]"
                >
                  AO-II Edit Leave Application Entry
                </h3>
                <p className="text-xs text-[#525866]">
                  Editing entry for <strong>{editingApp.applicantName}</strong> (
                  {editingApp.applicantRole} · {editingApp.applicantDepartmentOrGrade})
                </p>
              </div>
              <button
                type="button"
                disabled={editSubmitting}
                onClick={() => setEditingApp(null)}
                className="p-1.5 rounded-lg text-[#525866] hover:bg-[#F1F5F9] cursor-pointer"
                aria-label="Close edit leave modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAo2Edit} className="p-6 space-y-4">
              {editError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#B91C1C] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#B91C1C] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Type of Leave
                </label>
                <select
                  value={editLeaveType}
                  onChange={(e) => setEditLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setEditStartDate(nextStart);
                      if (nextStart && editEndDate && editEndDate >= nextStart) {
                        setEditNumberOfDays(
                          String(calculateInclusiveDays(nextStart, editEndDate))
                        );
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    min={editStartDate}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setEditEndDate(nextEnd);
                      if (editStartDate && nextEnd && nextEnd >= editStartDate) {
                        setEditNumberOfDays(
                          String(calculateInclusiveDays(editStartDate, nextEnd))
                        );
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    No. of Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editNumberOfDays}
                    onChange={(e) => setEditNumberOfDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Reason / Details of Leave
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Covering / Substitute Staff
                  </label>
                  <input
                    type="text"
                    value={editCovering}
                    onChange={(e) => setEditCovering(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                    Contact While on Leave
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  AO-II Verification / Edit Note (Optional)
                </label>
                <input
                  type="text"
                  value={editAo2Note}
                  onChange={(e) => setEditAo2Note(e.target.value)}
                  placeholder="e.g., Adjusted working days count per school calendar"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E5E9]">
                <button
                  type="button"
                  disabled={editSubmitting}
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#DCE0E6] text-[#525866] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editSubmitting ? 'Saving...' : 'Save Entry Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
