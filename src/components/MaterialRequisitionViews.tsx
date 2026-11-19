import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Forward,
  Package,
  Plus,
  Search,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Ao2RequisitionStatus,
  InventoryCategory,
  InventoryItem,
  MaterialRequisition,
  MaterialRequisitionCategory,
  PrincipalRequisitionStatus,
  RequisitionUrgency,
} from '../types/schoolConfig';

interface TeacherIdentity {
  id: string;
  name: string;
  assignedGradeLabel: string;
  room: string;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTeacherMatchTokens(teacher: TeacherIdentity): {
  fullBaseName: string;
  nameWords: string[];
  roomMatch: string;
  sectionWord: string;
} {
  // Strip academic suffixes such as ", M.Ed.", ", M.A.Ed.", ", LPT"
  const rawBase = teacher.name.split(',')[0]?.trim() ?? teacher.name;
  const fullBaseName = normalizeText(rawBase);
  const nameWords = fullBaseName
    .split(' ')
    .filter((w) => w.length >= 3 && !['mrs', 'mr', 'ms', 'dr', 'prof'].includes(w));

  const roomParts = teacher.room.split('·');
  const rawRoom = roomParts[roomParts.length - 1]?.trim() ?? '';
  const roomMatch = normalizeText(rawRoom);

  const sectionParts = teacher.assignedGradeLabel.split('·');
  const rawSection = sectionParts.length > 1 ? sectionParts[sectionParts.length - 1].trim() : '';
  const cleanSection = normalizeText(rawSection.replace(/\bsection\b/i, ''));

  return {
    fullBaseName,
    nameWords,
    roomMatch: roomMatch.length >= 4 ? roomMatch : '',
    sectionWord:
      cleanSection.length >= 4 && !['primary division', 'intermediate division'].includes(cleanSection)
        ? cleanSection
        : '',
  };
}

function itemBelongsToTeacher(item: InventoryItem, teacher: TeacherIdentity): boolean {
  const issuedNorm = normalizeText(item.issuedToUser ?? '');
  const locNorm = normalizeText(item.location ?? '');
  const combined = `${issuedNorm} ${locNorm}`;

  if (!combined.trim()) return false;

  const tokens = extractTeacherMatchTokens(teacher);
  if (tokens.fullBaseName && combined.includes(tokens.fullBaseName)) {
    return true;
  }

  // Match if at least two name words (first + last) appear, or unique surname + section/room
  const matchedNameWords = tokens.nameWords.filter((w) => issuedNorm.includes(w));
  if (matchedNameWords.length >= 2) {
    return true;
  }

  if (tokens.roomMatch && (issuedNorm.includes(tokens.roomMatch) || locNorm.includes(tokens.roomMatch))) {
    return true;
  }

  if (tokens.sectionWord && issuedNorm.includes(tokens.sectionWord)) {
    return true;
  }

  return false;
}

function statusTextTone(status: string): string {
  switch (status) {
    case 'Approved':
      return 'text-[#047857]';
    case 'Endorsed':
      return 'text-[#1D4ED8]';
    case 'Declined':
    case 'Disapproved':
    case 'Condemned':
    case 'For Repair':
      return 'text-[#B91C1C]';
    case 'Low Stock':
    case 'Pending Principal':
      return 'text-[#B45309]';
    case 'Issued':
    case 'Available':
      return 'text-[#0F766E]';
    default:
      return 'text-[#525866]';
  }
}

interface TeacherMaterialRequisitionViewProps {
  accentColor: string;
  teacher: TeacherIdentity;
  inventoryItems: InventoryItem[];
  requisitions: MaterialRequisition[];
  onCreateRequisition: (payload: {
    itemName: string;
    category: MaterialRequisitionCategory;
    quantity: number;
    unit: string;
    urgency: RequisitionUrgency;
    neededBy?: string;
    purpose: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteRequisition?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function TeacherMaterialRequisitionView({
  accentColor,
  teacher,
  inventoryItems,
  requisitions,
  onCreateRequisition,
}: TeacherMaterialRequisitionViewProps) {
  const [possessedFilter, setPossessedFilter] = useState<'ALL' | InventoryCategory>('ALL');
  const [possessedSearch, setPossessedSearch] = useState('');

  // New Requisition Slip modal & form state
  const [showSlipModal, setShowSlipModal] = useState(false);
  const slipItemInputRef = useRef<HTMLInputElement>(null);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<MaterialRequisitionCategory>('School Supplies');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [urgency, setUrgency] = useState<RequisitionUrgency>('Routine');
  const [neededBy, setNeededBy] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    if (!showSlipModal) return;
    const focusTimer = window.setTimeout(() => {
      slipItemInputRef.current?.focus();
    }, 30);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setShowSlipModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSlipModal, submitting]);

  const handleOpenSlipModal = () => {
    setFormError('');
    setFormSuccess('');
    setShowSlipModal(true);
  };

  const possessedItems = useMemo(
    () => inventoryItems.filter((item) => itemBelongsToTeacher(item, teacher)),
    [inventoryItems, teacher]
  );

  const possessedCounts = useMemo(() => {
    const equipment = possessedItems.filter((i) => i.category === 'Equipment').length;
    const supplies = possessedItems.filter((i) => i.category === 'School Supplies').length;
    const books = possessedItems.filter((i) => i.category === 'Books').length;
    const others = possessedItems.filter(
      (i) => i.category === 'Others' || i.category === 'Buildings'
    ).length;
    return { total: possessedItems.length, equipment, supplies, books, others };
  }, [possessedItems]);

  const filteredPossessed = useMemo(() => {
    const q = possessedSearch.trim().toLowerCase();
    return possessedItems.filter((item) => {
      const catOk = possessedFilter === 'ALL' || item.category === possessedFilter;
      const queryOk =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.location ?? '').toLowerCase().includes(q) ||
        (item.conditionNotes ?? '').toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [possessedItems, possessedFilter, possessedSearch]);

  const myRequisitions = useMemo(
    () => requisitions.filter((r) => r.teacherId === teacher.id),
    [requisitions, teacher.id]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const qtyNum = Math.round(Number(quantity) || 0);
    if (itemName.trim().length < 2) {
      setFormError('Enter the material or equipment name (at least 2 characters).');
      return;
    }
    if (qtyNum < 1) {
      setFormError('Requested quantity must be 1 or greater.');
      return;
    }
    if (purpose.trim().length < 4) {
      setFormError('Explain briefly how this material will be used in class.');
      return;
    }

    setSubmitting(true);
    const res = await onCreateRequisition({
      itemName: itemName.trim(),
      category,
      quantity: qtyNum,
      unit: unit.trim() || 'pcs',
      urgency,
      neededBy: neededBy.trim() || undefined,
      purpose: purpose.trim(),
    });
    setSubmitting(false);

    if (!res.ok) {
      setFormError(res.error || 'Could not submit material requisition.');
      return;
    }

    setItemName('');
    setQuantity('1');
    setUnit(category === 'Equipment' ? 'unit' : 'pcs');
    setNeededBy('');
    setPurpose('');
    setShowSlipModal(false);
    setFormSuccess('Material requisition slip submitted to AO-II for review.');
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Materials & Equipment Currently in Teacher's Possession */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h4 className="font-display text-lg font-semibold text-[#111315]">
              Materials &amp; Equipment Currently in Your Possession
            </h4>
            <p className="text-xs text-[#525866]">
              Issued school equipment, office &amp; classroom supplies, books, and other materials
              assigned to {teacher.name} ({teacher.room}).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="text-xs font-mono tabular-nums text-[#525866]">
              {possessedCounts.total} assigned records
            </span>
            <button
              type="button"
              onClick={handleOpenSlipModal}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Requisition Slip</span>
            </button>
          </div>
        </div>

        {/* Interactive Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setPossessedFilter('ALL')}
            aria-pressed={possessedFilter === 'ALL'}
            className={`text-left bg-[#F8FAFC] rounded-xl border p-4 cursor-pointer transition-all ${
              possessedFilter === 'ALL'
                ? 'border-[#111315] ring-2 ring-[#111315]/15'
                : 'border-[#E2E5E9] hover:border-[#94A3B8]'
            }`}
          >
            <div className="text-xs text-[#525866] font-medium">Total Possessed Items</div>
            <div className="font-display text-2xl font-semibold text-[#111315] tabular-nums mt-1">
              {possessedCounts.total}
            </div>
          </button>
          <button
            type="button"
            onClick={() =>
              setPossessedFilter((prev) => (prev === 'Equipment' ? 'ALL' : 'Equipment'))
            }
            aria-pressed={possessedFilter === 'Equipment'}
            className={`text-left bg-[#F8FAFC] rounded-xl border p-4 cursor-pointer transition-all ${
              possessedFilter === 'Equipment'
                ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/20'
                : 'border-[#E2E5E9] hover:border-[#1D4ED8]'
            }`}
          >
            <div className="text-xs text-[#525866] font-medium">Equipment Assigned</div>
            <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums mt-1">
              {possessedCounts.equipment}
            </div>
          </button>
          <button
            type="button"
            onClick={() =>
              setPossessedFilter((prev) => (prev === 'School Supplies' ? 'ALL' : 'School Supplies'))
            }
            aria-pressed={possessedFilter === 'School Supplies'}
            className={`text-left bg-[#F8FAFC] rounded-xl border p-4 cursor-pointer transition-all ${
              possessedFilter === 'School Supplies'
                ? 'border-[#047857] ring-2 ring-[#047857]/20'
                : 'border-[#E2E5E9] hover:border-[#047857]'
            }`}
          >
            <div className="text-xs text-[#525866] font-medium">Office &amp; School Supplies</div>
            <div className="font-display text-2xl font-semibold text-[#047857] tabular-nums mt-1">
              {possessedCounts.supplies}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPossessedFilter((prev) => (prev === 'Others' ? 'ALL' : 'Others'))}
            aria-pressed={possessedFilter === 'Others'}
            className={`text-left bg-[#F8FAFC] rounded-xl border p-4 cursor-pointer transition-all ${
              possessedFilter === 'Others'
                ? 'border-[#B45309] ring-2 ring-[#B45309]/20'
                : 'border-[#E2E5E9] hover:border-[#B45309]'
            }`}
          >
            <div className="text-xs text-[#525866] font-medium">Other Materials &amp; Books</div>
            <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums mt-1">
              {possessedCounts.others + possessedCounts.books}
            </div>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E2E5E9]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Possessed' },
                { id: 'Equipment', label: 'Equipment' },
                { id: 'School Supplies', label: 'Office / School Supplies' },
                { id: 'Books', label: 'Books' },
                { id: 'Others', label: 'Others' },
              ] as const
            ).map((tab) => {
              const active = possessedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPossessedFilter(tab.id)}
                  style={active ? { backgroundColor: accentColor } : undefined}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-white'
                      : 'bg-white text-[#525866] border border-[#DCE0E6] hover:text-[#111315]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={possessedSearch}
              onChange={(e) => setPossessedSearch(e.target.value)}
              placeholder="Search possessed items..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
            />
          </div>
        </div>

        {/* Possessed Items Ledger */}
        {filteredPossessed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DCE0E6] p-8 text-center space-y-2 bg-[#F8F9FA]">
            <Package className="w-6 h-6 text-[#525866] mx-auto" />
            <p className="text-sm font-medium text-[#111315]">
              No matching possessed equipment or supplies found.
            </p>
            <p className="text-xs text-[#525866]">
              Submit a material requisition below to request equipment, office supplies, or other
              classroom materials from AO-II.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                  <th className="py-3 px-4 font-semibold">Item / Material</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Location &amp; Date Issued</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5E9]">
                {filteredPossessed.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-semibold text-[#111315]">{item.itemName}</td>
                    <td className="py-3 px-4 text-[#525866] whitespace-nowrap">
                      {item.category === 'School Supplies'
                        ? 'Office / School Supplies'
                        : item.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111315] whitespace-nowrap">
                      {item.quantity} {item.unit ?? 'units'}
                    </td>
                    <td className={`py-3 px-4 font-semibold whitespace-nowrap ${statusTextTone(item.status)}`}>
                      {item.status}
                    </td>
                    <td className="py-3 px-4 text-[#525866]">
                      <div>{item.location ?? teacher.room}</div>
                      <div className="font-mono text-[11px] text-[#64748B] tabular-nums">
                        Issued: {item.dateIssued || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#525866] max-w-xs">
                      {item.conditionNotes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: My Submitted Requisitions Tracker */}
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E5E9]">
          <div>
            <h4 className="font-display text-lg font-semibold text-[#111315]">
              My Material Requisition Tracker
            </h4>
            <p className="text-xs text-[#525866]">
              Follow AO-II review status, endorsement forwarding, and Principal final action.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono tabular-nums font-semibold text-[#111315]">
              {myRequisitions.length} request{myRequisitions.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={handleOpenSlipModal}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Requisition Slip</span>
            </button>
          </div>
        </div>

        {formSuccess && (
          <div
            role="status"
            className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-2.5 text-xs font-medium text-[#047857] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {myRequisitions.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#525866] space-y-3">
            <p>You have not submitted any material requisitions yet.</p>
            <button
              type="button"
              onClick={handleOpenSlipModal}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Requisition Slip</span>
            </button>
          </div>
        ) : (
            <div className="space-y-3">
              {myRequisitions.map((req) => (
                  <article
                    key={req.id}
                    className="rounded-xl border border-[#E2E5E9] bg-[#F8FAFC] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] text-[#525866] flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[#111315]">{req.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {req.quantity} {req.unit}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{req.urgency}</span>
                          {req.neededBy && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">Needed {req.neededBy}</span>
                            </>
                          )}
                        </div>
                        <h5 className="font-display text-base font-semibold text-[#111315]">
                          {req.itemName}
                        </h5>
                        <p className="text-xs text-[#525866]">{req.purpose}</p>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className={`text-xs font-semibold ${statusTextTone(req.ao2Status)}`}>
                          AO-II: {req.ao2Status === 'Endorsed' ? 'Endorsed to Principal' : req.ao2Status}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[#64748B]">
                          {req.submittedAt}
                        </div>
                      </div>
                    </div>

                    {req.ao2Note && (
                      <div className="rounded-lg border border-[#DCE0E6] bg-white px-3 py-2 text-xs text-[#111315]">
                        <span className="font-semibold text-[#525866]">AO-II Note: </span>
                        {req.ao2Note}
                      </div>
                    )}

                    {req.ao2Status === 'Endorsed' && (
                      <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#1E3A8A]">
                            Principal Office Review:{' '}
                            <span className={statusTextTone(req.principalStatus ?? 'Pending Principal')}>
                              {req.principalStatus ?? 'Pending Principal'}
                            </span>
                          </span>
                          {req.principalReviewedAt && (
                            <span className="text-[11px] font-mono text-[#475569]">
                              {req.principalReviewedAt}
                            </span>
                          )}
                        </div>
                        {req.principalNote && (
                          <p className="text-[#1E293B]">
                            <span className="font-semibold">Principal Note: </span>
                            {req.principalNote}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                ))}
            </div>
          )}
      </div>

      {/* New Requisition Slip Modal Dialog */}
      {showSlipModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1426]/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-requisition-slip-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowSlipModal(false);
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl bg-white rounded-2xl border border-[#D2DFD7] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 bg-[#F7FAF8] border-b border-[#E2E5E9] flex items-start justify-between gap-4">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: accentColor }}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>New Requisition Slip · {teacher.name}</span>
                </div>
                <h4
                  id="new-requisition-slip-title"
                  className="font-display text-lg font-semibold text-[#111315] mt-0.5"
                >
                  Request School Supplies, Equipment, or Other Materials
                </h4>
              </div>
              <button
                type="button"
                aria-label="Close New Requisition Slip dialog"
                onClick={() => !submitting && setShowSlipModal(false)}
                className="p-1.5 rounded-lg text-[#525866] hover:text-[#111315] hover:bg-[#EAEDF1] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div
                  role="alert"
                  className="bg-[#FEF2F2] rounded-lg border border-[#FECACA] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="req-item-name"
                  className="block text-xs font-semibold text-[#111315] mb-1"
                >
                  Material / Equipment Name
                </label>
                <input
                  ref={slipItemInputRef}
                  id="req-item-name"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., A4 Bond Paper, HDMI Cable, Stapler Set"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] focus:outline-none focus:border-[#111315]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="req-category"
                    className="block text-xs font-semibold text-[#111315] mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="req-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaterialRequisitionCategory)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                  >
                    <option value="School Supplies">School Supplies</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="req-urgency"
                    className="block text-xs font-semibold text-[#111315] mb-1"
                  >
                    Priority Level
                  </label>
                  <select
                    id="req-urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as RequisitionUrgency)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Priority">Priority</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="req-qty"
                    className="block text-xs font-semibold text-[#111315] mb-1"
                  >
                    Quantity
                  </label>
                  <input
                    id="req-qty"
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="req-unit"
                    className="block text-xs font-semibold text-[#111315] mb-1"
                  >
                    Unit
                  </label>
                  <input
                    id="req-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs / boxes / sets"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="req-needed-by"
                    className="block text-xs font-semibold text-[#111315] mb-1"
                  >
                    Needed By
                  </label>
                  <input
                    id="req-needed-by"
                    type="date"
                    value={neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="req-purpose"
                  className="block text-xs font-semibold text-[#111315] mb-1"
                >
                  Purpose / Classroom Justification
                </label>
                <textarea
                  id="req-purpose"
                  rows={3}
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the lesson, activity, or classroom replacement need..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#E2E5E9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#525866] hover:text-[#111315] bg-white border border-[#DCE0E6] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: accentColor }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Material Requisition'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface Ao2MaterialRequisitionViewProps {
  accentColor: string;
  requisitions: MaterialRequisition[];
  onReviewRequisition: (
    id: string,
    payload: { ao2Status?: Ao2RequisitionStatus; ao2Note?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function Ao2MaterialRequisitionView({
  accentColor,
  requisitions,
  onReviewRequisition,
}: Ao2MaterialRequisitionViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | Ao2RequisitionStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | MaterialRequisitionCategory>('ALL');
  const [search, setSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );

  const counts = useMemo(
    () => ({
      total: requisitions.length,
      pending: requisitions.filter((r) => r.ao2Status === 'Pending Review').length,
      approved: requisitions.filter((r) => r.ao2Status === 'Approved').length,
      declined: requisitions.filter((r) => r.ao2Status === 'Declined').length,
      endorsed: requisitions.filter((r) => r.ao2Status === 'Endorsed').length,
    }),
    [requisitions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requisitions.filter((r) => {
      const statusOk = statusFilter === 'ALL' || r.ao2Status === statusFilter;
      const catOk = categoryFilter === 'ALL' || r.category === categoryFilter;
      const queryOk =
        !q ||
        r.itemName.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        r.teacherGradeSection.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q);
      return statusOk && catOk && queryOk;
    });
  }, [requisitions, statusFilter, categoryFilter, search]);

  const handleAction = async (
    req: MaterialRequisition,
    nextStatus?: Ao2RequisitionStatus
  ) => {
    const draft = noteDrafts[req.id] ?? req.ao2Note ?? '';
    setBusyId(req.id);
    setFeedback(null);
    const res = await onReviewRequisition(req.id, {
      ao2Status: nextStatus,
      ao2Note: draft,
    });
    setBusyId(null);
    if (!res.ok) {
      setFeedback({ kind: 'error', message: res.error || 'Could not save AO-II review.' });
      return;
    }
    setFeedback({
      kind: 'success',
      message: nextStatus
        ? `Updated "${req.itemName}" (${req.teacherName}) to ${nextStatus}.`
        : `Saved AO-II note on "${req.itemName}".`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h4 className="font-display text-lg font-semibold text-[#111315]">
            Faculty Material Requisitions — AO-II Review Desk
          </h4>
          <p className="text-xs text-[#525866]">
            Review teacher requests for school supplies, equipment, and other materials. Add notes,
            approve or decline directly, or endorse to the School Principal for executive action.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-[#525866]">
          {counts.total} total request{counts.total === 1 ? '' : 's'}
        </div>
      </div>

      {/* Interactive KPI Summary Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) => (prev === 'Pending Review' ? 'ALL' : 'Pending Review'))
          }
          aria-pressed={statusFilter === 'Pending Review'}
          className={`text-left bg-[#FFFBEB] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Pending Review'
              ? 'border-[#D97706] ring-2 ring-[#D97706]/25'
              : 'border-[#FDE68A] hover:border-[#D97706]'
          }`}
        >
          <div className="text-xs font-medium text-[#92400E]">Pending AO-II Review</div>
          <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums mt-1">
            {counts.pending}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'Approved' ? 'ALL' : 'Approved'))}
          aria-pressed={statusFilter === 'Approved'}
          className={`text-left bg-[#ECFDF5] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Approved'
              ? 'border-[#047857] ring-2 ring-[#047857]/25'
              : 'border-[#A7F3D0] hover:border-[#047857]'
          }`}
        >
          <div className="text-xs font-medium text-[#065F46]">Approved by AO-II</div>
          <div className="font-display text-2xl font-semibold text-[#047857] tabular-nums mt-1">
            {counts.approved}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'Endorsed' ? 'ALL' : 'Endorsed'))}
          aria-pressed={statusFilter === 'Endorsed'}
          className={`text-left bg-[#EFF6FF] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Endorsed'
              ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25'
              : 'border-[#BFDBFE] hover:border-[#1D4ED8]'
          }`}
        >
          <div className="text-xs font-medium text-[#1E40AF]">Endorsed to Principal</div>
          <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums mt-1">
            {counts.endorsed}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'Declined' ? 'ALL' : 'Declined'))}
          aria-pressed={statusFilter === 'Declined'}
          className={`text-left bg-[#FEF2F2] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Declined'
              ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/25'
              : 'border-[#FECACA] hover:border-[#B91C1C]'
          }`}
        >
          <div className="text-xs font-medium text-[#991B1B]">Declined</div>
          <div className="font-display text-2xl font-semibold text-[#B91C1C] tabular-nums mt-1">
            {counts.declined}
          </div>
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            feedback.kind === 'error'
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
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

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#F8F9FA] p-3.5 rounded-xl border border-[#E2E5E9]">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'Pending Review', 'Endorsed', 'Approved', 'Declined'] as const).map(
            (st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={active ? { backgroundColor: accentColor } : undefined}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-white'
                      : 'bg-white text-[#525866] border border-[#DCE0E6] hover:text-[#111315]'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              );
            }
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as 'ALL' | MaterialRequisitionCategory)
            }
            aria-label="Filter requisitions by category"
            className="px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
          >
            <option value="ALL">All Categories</option>
            <option value="School Supplies">School Supplies</option>
            <option value="Equipment">Equipment</option>
            <option value="Other">Other</option>
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher or item..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
            />
          </div>
        </div>
      </div>

      {/* Request Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DCE0E6] p-10 text-center space-y-2 bg-[#F8F9FA]">
          <Boxes className="w-6 h-6 text-[#525866] mx-auto" />
          <p className="text-sm font-medium text-[#111315]">No material requisitions match the filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const noteValue = noteDrafts[req.id] ?? req.ao2Note ?? '';
            const isBusy = busyId === req.id;
            return (
              <article
                key={req.id}
                className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E2E5E9]">
                  <div className="space-y-1">
                    <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#111315]">{req.teacherName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{req.teacherGradeSection}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold">{req.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-[#111315]">
                        {req.quantity} {req.unit}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{req.urgency}</span>
                      {req.neededBy && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Needed {req.neededBy}</span>
                        </>
                      )}
                    </div>
                    <h5 className="font-display text-base font-semibold text-[#111315]">
                      {req.itemName}
                    </h5>
                    <p className="text-xs text-[#525866]">{req.purpose}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-0.5">
                    <div className={`text-xs font-semibold ${statusTextTone(req.ao2Status)}`}>
                      AO-II Status: {req.ao2Status}
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
                      Submitted {req.submittedAt}
                    </div>
                    {req.ao2ReviewedAt && (
                      <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
                        Reviewed {req.ao2ReviewedAt}
                      </div>
                    )}
                  </div>
                </div>

                {req.ao2Status === 'Endorsed' && (
                  <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[#1E3A8A]">Principal Decision: </span>
                      <span className={`font-semibold ${statusTextTone(req.principalStatus ?? 'Pending Principal')}`}>
                        {req.principalStatus ?? 'Pending Principal'}
                      </span>
                      {req.principalNote && (
                        <span className="text-[#1E293B]"> — “{req.principalNote}”</span>
                      )}
                    </div>
                    {req.principalReviewedAt && (
                      <span className="font-mono text-[11px] text-[#475569] tabular-nums">
                        {req.principalReviewedAt}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-6">
                    <label
                      htmlFor={`ao2-note-${req.id}`}
                      className="block text-xs font-semibold text-[#111315] mb-1"
                    >
                      AO-II Review &amp; Endorsement Note
                    </label>
                    <textarea
                      id={`ao2-note-${req.id}`}
                      rows={2}
                      value={noteValue}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Write stock verification notes, release pickup instructions, or endorsement remarks for the Principal..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                    />
                  </div>

                  <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#DCE0E6] bg-white text-[#111315] hover:bg-[#F8FAFC] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <span>Save Note</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, 'Approved')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#047857] hover:bg-[#065F46] text-white cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, 'Declined')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, 'Endorsed')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1E3A8A] hover:bg-[#1E40AF] text-white cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <Forward className="w-3.5 h-3.5" />
                      <span>Endorse to Principal</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PrincipalMaterialRequisitionViewProps {
  accentColor: string;
  requisitions: MaterialRequisition[];
  onReviewRequisition: (
    id: string,
    payload: { principalStatus?: PrincipalRequisitionStatus; principalNote?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function PrincipalMaterialRequisitionView({
  accentColor,
  requisitions,
  onReviewRequisition,
}: PrincipalMaterialRequisitionViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | PrincipalRequisitionStatus>('ALL');
  const [search, setSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );

  const endorsedOnly = useMemo(
    () => requisitions.filter((r) => r.ao2Status === 'Endorsed'),
    [requisitions]
  );

  const counts = useMemo(
    () => ({
      total: endorsedOnly.length,
      pending: endorsedOnly.filter(
        (r) => !r.principalStatus || r.principalStatus === 'Pending Principal'
      ).length,
      approved: endorsedOnly.filter((r) => r.principalStatus === 'Approved').length,
      disapproved: endorsedOnly.filter((r) => r.principalStatus === 'Disapproved').length,
    }),
    [endorsedOnly]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endorsedOnly.filter((r) => {
      const pStatus: PrincipalRequisitionStatus = r.principalStatus ?? 'Pending Principal';
      const statusOk = statusFilter === 'ALL' || pStatus === statusFilter;
      const queryOk =
        !q ||
        r.itemName.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        (r.ao2Note ?? '').toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [endorsedOnly, statusFilter, search]);

  const handleAction = async (
    req: MaterialRequisition,
    nextStatus?: PrincipalRequisitionStatus
  ) => {
    const draft = noteDrafts[req.id] ?? req.principalNote ?? '';
    setBusyId(req.id);
    setFeedback(null);
    const res = await onReviewRequisition(req.id, {
      principalStatus: nextStatus,
      principalNote: draft,
    });
    setBusyId(null);
    if (!res.ok) {
      setFeedback({ kind: 'error', message: res.error || 'Could not save Principal decision.' });
      return;
    }
    setFeedback({
      kind: 'success',
      message: nextStatus
        ? `Principal decision saved: "${req.itemName}" marked ${nextStatus}.`
        : `Saved Principal note on "${req.itemName}".`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h4 className="font-display text-lg font-semibold text-[#111315]">
            AO-II Endorsed Material Requisitions
          </h4>
          <p className="text-xs text-[#525866]">
            Only material requisitions formally endorsed by the Administrative Officer II (AO-II)
            appear here for School Principal review, notes, approval, or disapproval.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-[#525866]">
          {counts.total} endorsed item{counts.total === 1 ? '' : 's'}
        </div>
      </div>

      {/* Interactive KPI Summary Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === 'Pending Principal' ? 'ALL' : 'Pending Principal'
            )
          }
          aria-pressed={statusFilter === 'Pending Principal'}
          className={`text-left bg-[#FFFBEB] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Pending Principal'
              ? 'border-[#D97706] ring-2 ring-[#D97706]/25'
              : 'border-[#FDE68A] hover:border-[#D97706]'
          }`}
        >
          <div className="text-xs font-medium text-[#92400E]">Awaiting Principal Decision</div>
          <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums mt-1">
            {counts.pending}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'Approved' ? 'ALL' : 'Approved'))}
          aria-pressed={statusFilter === 'Approved'}
          className={`text-left bg-[#ECFDF5] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Approved'
              ? 'border-[#047857] ring-2 ring-[#047857]/25'
              : 'border-[#A7F3D0] hover:border-[#047857]'
          }`}
        >
          <div className="text-xs font-medium text-[#065F46]">Approved by Principal</div>
          <div className="font-display text-2xl font-semibold text-[#047857] tabular-nums mt-1">
            {counts.approved}
          </div>
        </button>
        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) => (prev === 'Disapproved' ? 'ALL' : 'Disapproved'))
          }
          aria-pressed={statusFilter === 'Disapproved'}
          className={`text-left bg-[#FEF2F2] rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'Disapproved'
              ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/25'
              : 'border-[#FECACA] hover:border-[#B91C1C]'
          }`}
        >
          <div className="text-xs font-medium text-[#991B1B]">Disapproved by Principal</div>
          <div className="font-display text-2xl font-semibold text-[#B91C1C] tabular-nums mt-1">
            {counts.disapproved}
          </div>
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            feedback.kind === 'error'
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA] p-3.5 rounded-xl border border-[#E2E5E9]">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'Pending Principal', 'Approved', 'Disapproved'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={active ? { backgroundColor: accentColor } : undefined}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-white'
                    : 'bg-white text-[#525866] border border-[#DCE0E6] hover:text-[#111315]'
                }`}
              >
                {st === 'ALL' ? 'All Endorsed' : st}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endorsed requests..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DCE0E6] p-10 text-center space-y-2 bg-[#F8F9FA]">
          <ClipboardList className="w-6 h-6 text-[#525866] mx-auto" />
          <p className="text-sm font-medium text-[#111315]">
            No AO-II-endorsed material requisitions in this view.
          </p>
          <p className="text-xs text-[#525866]">
            Requisitions appear here once the AO-II reviews and clicks Endorse to Principal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const noteValue = noteDrafts[req.id] ?? req.principalNote ?? '';
            const currentStatus = req.principalStatus ?? 'Pending Principal';
            const isBusy = busyId === req.id;

            return (
              <article
                key={req.id}
                className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E2E5E9]">
                  <div className="space-y-1">
                    <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#111315]">{req.teacherName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{req.teacherGradeSection}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold">{req.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-[#111315]">
                        {req.quantity} {req.unit}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{req.urgency}</span>
                      {req.neededBy && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Needed {req.neededBy}</span>
                        </>
                      )}
                    </div>
                    <h5 className="font-display text-base font-semibold text-[#111315]">
                      {req.itemName}
                    </h5>
                    <p className="text-xs text-[#525866]">{req.purpose}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-0.5">
                    <div className={`text-xs font-semibold ${statusTextTone(currentStatus)}`}>
                      Principal Status: {currentStatus}
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
                      Endorsed {req.ao2ReviewedAt ?? req.submittedAt}
                    </div>
                    {req.principalReviewedAt && (
                      <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
                        Decided {req.principalReviewedAt}
                      </div>
                    )}
                  </div>
                </div>

                {/* AO-II Endorsement Context */}
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2.5 text-xs text-[#1E293B]">
                  <span className="font-semibold text-[#1E3A8A]">
                    AO-II Endorsement Note ({req.ao2ReviewedBy ?? 'AO-II'}):{' '}
                  </span>
                  <span>{req.ao2Note || 'Endorsed to Principal for final disposition.'}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-7">
                    <label
                      htmlFor={`principal-req-note-${req.id}`}
                      className="block text-xs font-semibold text-[#111315] mb-1"
                    >
                      Principal&apos;s Note / Directive
                    </label>
                    <textarea
                      id={`principal-req-note-${req.id}`}
                      rows={2}
                      value={noteValue}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Add budget, procurement, or release instructions for AO-II and teacher..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                    />
                  </div>

                  <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#DCE0E6] bg-white text-[#111315] hover:bg-[#F8FAFC] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <span>Save Note</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, 'Disapproved')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Disapprove</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAction(req, 'Approved')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#047857] hover:bg-[#065F46] text-white cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
