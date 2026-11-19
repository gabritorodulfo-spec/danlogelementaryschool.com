import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  Download,
  Laptop,
  Layers,
  Lock,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { AcademicYear } from '../data/schoolData';
import {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
  SiteFrontendConfig,
} from '../types/schoolConfig';

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'Equipment',
  'School Supplies',
  'Books',
  'Buildings',
  'Others',
];

const INVENTORY_STATUSES: InventoryStatus[] = [
  'Available',
  'Issued',
  'Low Stock',
  'For Repair',
  'Condemned',
];

const CATEGORY_META: Record<
  InventoryCategory,
  {
    color: string;
    shortDesc: string;
    defaultUnit: string;
  }
> = {
  Equipment: {
    color: '#0F766E',
    shortDesc: 'Microscopes, projectors, ICT & fans',
    defaultUnit: 'units',
  },
  'School Supplies': {
    color: '#15803D',
    shortDesc: 'Bond paper, markers, chalk & kits',
    defaultUnit: 'boxes',
  },
  Books: {
    color: '#1D4ED8',
    shortDesc: 'Storybooks, textbooks & workbooks',
    defaultUnit: 'copies',
  },
  Buildings: {
    color: '#9A3412',
    shortDesc: 'Academic wings, rooms & pavilions',
    defaultUnit: 'rooms',
  },
  Others: {
    color: '#4338CA',
    shortDesc: 'DRRM kits, garden & miscellaneous',
    defaultUnit: 'sets',
  },
};

function CategoryIcon({ category, className }: { category: InventoryCategory; className?: string }) {
  switch (category) {
    case 'Equipment':
      return <Laptop className={className} />;
    case 'School Supplies':
      return <Package className={className} />;
    case 'Books':
      return <BookOpen className={className} />;
    case 'Buildings':
      return <Building2 className={className} />;
    case 'Others':
    default:
      return <Layers className={className} />;
  }
}

interface InventoryDashboardPageProps {
  frontendConfig: SiteFrontendConfig;
  activeAcademicYear: AcademicYear;
  inventoryItems: InventoryItem[];
  ao2Username: string | null;
  principalUsername: string | null;
  preferredReturnRole: 'ao2' | 'principal';
  onBackToPortal: (role: 'ao2' | 'principal') => void;
  onNavigateHome: () => void;
  onAddInventoryItem: (
    payload: Omit<InventoryItem, 'id'>
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateInventoryItem: (
    id: string,
    patch: Partial<Omit<InventoryItem, 'id'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteInventoryItem: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function InventoryDashboardPage({
  frontendConfig,
  activeAcademicYear,
  inventoryItems,
  ao2Username,
  principalUsername,
  preferredReturnRole,
  onBackToPortal,
  onNavigateHome,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
}: InventoryDashboardPageProps) {
  const isAuthorized = Boolean(ao2Username || principalUsername);
  const activeRoleLabel = ao2Username
    ? `AO-II (${ao2Username})`
    : principalUsername
    ? `Principal (${principalUsername})`
    : 'Guest';
  const returnRole: 'ao2' | 'principal' =
    preferredReturnRole === 'principal' && principalUsername
      ? 'principal'
      : ao2Username
      ? 'ao2'
      : principalUsername
      ? 'principal'
      : preferredReturnRole;

  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'ALL' | 'ATTENTION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'itemName' | 'category' | 'quantity' | 'status'>('itemName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [showAddForm, setShowAddForm] = useState(false);
  const addNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAddForm) return;
    const timer = window.setTimeout(() => {
      addNameInputRef.current?.focus();
    }, 20);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showAddForm]);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('Equipment');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('units');
  const [newStatus, setNewStatus] = useState<InventoryStatus>('Available');
  const [newLocation, setNewLocation] = useState('');
  const [newDateReceived, setNewDateReceived] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newUser, setNewUser] = useState('');
  const [newDateIssued, setNewDateIssued] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    itemName: string;
    category: InventoryCategory;
    quantity: number;
    unit: string;
    status: InventoryStatus;
    location: string;
    dateReceived: string;
    issuedToUser: string;
    dateIssued: string;
    conditionNotes: string;
  }>({
    itemName: '',
    category: 'Equipment',
    quantity: 0,
    unit: 'units',
    status: 'Available',
    location: '',
    dateReceived: '',
    issuedToUser: '',
    dateIssued: '',
    conditionNotes: '',
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const categoryBreakdown = useMemo(() => {
    const totalEntriesAll = inventoryItems.length;
    const totalUnitsAll = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

    return INVENTORY_CATEGORIES.map((category) => {
      const items = inventoryItems.filter((item) => item.category === category);
      const entries = items.length;
      const units = items.reduce((sum, item) => sum + item.quantity, 0);
      const available = items.filter((item) => item.status === 'Available').length;
      const issued = items.filter((item) => item.status === 'Issued').length;
      const attention = items.filter(
        (item) =>
          item.status === 'Low Stock' ||
          item.status === 'For Repair' ||
          item.status === 'Condemned'
      ).length;
      const sharePct =
        totalUnitsAll > 0 ? Math.round((units / totalUnitsAll) * 100) : 0;

      return {
        category,
        entries,
        units,
        available,
        issued,
        attention,
        sharePct,
        totalEntriesAll,
        totalUnitsAll,
      };
    });
  }, [inventoryItems]);

  const statusBreakdown = useMemo(() => {
    const scopedItems =
      categoryFilter === 'ALL'
        ? inventoryItems
        : inventoryItems.filter((item) => item.category === categoryFilter);

    return INVENTORY_STATUSES.map((status) => {
      const matches = scopedItems.filter((item) => item.status === status);
      return {
        status,
        entries: matches.length,
        units: matches.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
  }, [inventoryItems, categoryFilter]);

  const totals = useMemo(() => {
    const totalEntries = inventoryItems.length;
    const totalUnits = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const attentionCount = inventoryItems.filter(
      (item) =>
        item.status === 'Low Stock' ||
        item.status === 'For Repair' ||
        item.status === 'Condemned'
    ).length;
    const issuedCount = inventoryItems.filter((item) => item.status === 'Issued').length;
    const availableCount = inventoryItems.filter((item) => item.status === 'Available').length;
    return { totalEntries, totalUnits, attentionCount, issuedCount, availableCount };
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = inventoryItems.filter((item) => {
      const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ATTENTION'
          ? item.status === 'Low Stock' ||
            item.status === 'For Repair' ||
            item.status === 'Condemned'
          : item.status === statusFilter;
      const matchesQuery =
        q.length === 0 ||
        item.itemName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.location ?? '').toLowerCase().includes(q) ||
        item.issuedToUser.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        (item.conditionNotes ?? '').toLowerCase().includes(q);
      return matchesCat && matchesStatus && matchesQuery;
    });

    return [...matches].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'quantity') return (a.quantity - b.quantity) * dir;
      return a[sortField].localeCompare(b[sortField]) * dir;
    });
  }, [inventoryItems, categoryFilter, statusFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: 'itemName' | 'category' | 'quantity' | 'status') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'quantity' ? 'desc' : 'asc');
    }
  };

  const handleOpenAddForCategory = (category?: InventoryCategory) => {
    const chosen = category ?? (categoryFilter === 'ALL' ? 'Equipment' : categoryFilter);
    setNewCategory(chosen);
    setNewUnit(CATEGORY_META[chosen].defaultUnit);
    setShowAddForm(true);
    setFeedbackError('');
    setFeedbackSuccess('');
  };

  const handleCreateItem = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    const qtyNum = Number(newQty);
    if (newName.trim().length < 2) {
      setFeedbackError('Item or facility name must be at least 2 characters.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      setFeedbackError('Quantity must be 0 or greater.');
      return;
    }
    if (!newDateReceived.trim()) {
      setFeedbackError('Date received is required.');
      return;
    }

    setIsSaving(true);
    const result = await onAddInventoryItem({
      itemName: newName.trim(),
      category: newCategory,
      quantity: Math.round(qtyNum),
      unit: newUnit.trim() || CATEGORY_META[newCategory].defaultUnit,
      status: newStatus,
      location: newLocation.trim() || 'AO-II Supply Room',
      dateReceived: newDateReceived.trim(),
      issuedToUser: newUser.trim() || 'Supply Room / Unassigned',
      dateIssued: newDateIssued.trim() || '—',
      conditionNotes: newNotes.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.ok) {
      setFeedbackError(result.error || 'Could not add inventory record.');
      return;
    }

    setNewName('');
    setNewQty('1');
    setNewStatus('Available');
    setNewLocation('');
    setNewUser('');
    setNewDateIssued('');
    setNewNotes('');
    setShowAddForm(false);
    setFeedbackSuccess(`Added [${newCategory}] record to campus property inventory.`);
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setConfirmDeleteId(null);
    setFeedbackError('');
    setFeedbackSuccess('');
    setEditDraft({
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit ?? CATEGORY_META[item.category].defaultUnit,
      status: item.status,
      location: item.location ?? '',
      dateReceived: item.dateReceived,
      issuedToUser: item.issuedToUser,
      dateIssued: item.dateIssued === '—' ? '' : item.dateIssued,
      conditionNotes: item.conditionNotes ?? '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    setFeedbackError('');
    setFeedbackSuccess('');

    if (editDraft.itemName.trim().length < 2) {
      setFeedbackError('Item name must be at least 2 characters.');
      return;
    }
    if (!Number.isFinite(editDraft.quantity) || editDraft.quantity < 0) {
      setFeedbackError('Quantity must be 0 or greater.');
      return;
    }
    if (!editDraft.dateReceived.trim()) {
      setFeedbackError('Date received is required.');
      return;
    }

    setIsSaving(true);
    const result = await onUpdateInventoryItem(id, {
      itemName: editDraft.itemName.trim(),
      category: editDraft.category,
      quantity: Math.round(editDraft.quantity),
      unit: editDraft.unit.trim() || CATEGORY_META[editDraft.category].defaultUnit,
      status: editDraft.status,
      location: editDraft.location.trim() || 'Campus Property Room',
      dateReceived: editDraft.dateReceived.trim(),
      issuedToUser: editDraft.issuedToUser.trim() || 'Supply Room / Unassigned',
      dateIssued: editDraft.dateIssued.trim() || '—',
      conditionNotes: editDraft.conditionNotes.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.ok) {
      setFeedbackError(result.error || 'Could not update inventory record.');
      return;
    }

    setEditingId(null);
    setFeedbackSuccess('Inventory record updated and saved.');
  };

  const handleConfirmDelete = async (id: string) => {
    setFeedbackError('');
    setFeedbackSuccess('');
    setIsSaving(true);
    const result = await onDeleteInventoryItem(id);
    setIsSaving(false);
    setConfirmDeleteId(null);

    if (!result.ok) {
      setFeedbackError(result.error || 'Could not delete inventory record.');
      return;
    }
    setFeedbackSuccess('Inventory record removed from property ledger.');
  };

  const handleExportCsv = () => {
    const csvEscape = (val: string | number | undefined) => {
      const text = String(val ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };
    const headers = [
      'ID',
      'Name of Item',
      'Category',
      'Quantity',
      'Unit',
      'Status',
      'Location',
      'Date Received',
      'Custodian / User',
      'Date Issued',
      'Condition Notes',
    ];
    const rows = filteredItems.map((item) =>
      [
        item.id,
        item.itemName,
        item.category,
        item.quantity,
        item.unit ?? 'units',
        item.status,
        item.location ?? '',
        item.dateReceived,
        item.issuedToUser,
        item.dateIssued,
        item.conditionNotes ?? '',
      ]
        .map(csvEscape)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danlog_inventory_${categoryFilter === 'ALL' ? 'all' : categoryFilter.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrintLedger = () => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsHtml = filteredItems
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(item.itemName)}</strong></td>
            <td>${escapeHtml(item.category)}</td>
            <td style="text-align:right;">${item.quantity} ${escapeHtml(item.unit ?? 'units')}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.location ?? '—')}</td>
            <td>${escapeHtml(item.issuedToUser)}</td>
            <td>${escapeHtml(item.dateReceived)}</td>
          </tr>`
      )
      .join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const printableHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Property &amp; Inventory Ledger — ${escapeHtml(frontendConfig.schoolName)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111315; margin: 28px; font-size: 12px; }
      .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #15803D; padding-bottom: 12px; margin-bottom: 16px; }
      .school { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; }
      .sub { font-size: 11px; color: #525866; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #DCE0E6; padding: 7px 9px; text-align: left; font-size: 11px; }
      th { background: #F8F9FA; font-weight: 700; color: #111315; }
      .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; color: #525866; }
      @media print { body { margin: 16px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="school">${escapeHtml(frontendConfig.schoolName)} — Property &amp; Inventory Ledger</p>
        <p class="sub">${escapeHtml(frontendConfig.campusAddress)} · SY ${escapeHtml(activeAcademicYear)} · Category: ${escapeHtml(categoryFilter === 'ALL' ? 'All Categories' : categoryFilter)}</p>
      </div>
      <div class="sub">Entries: ${filteredItems.length} · Total Units: ${filteredItems.reduce((s, i) => s + i.quantity, 0)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item / Facility</th>
          <th>Category</th>
          <th style="text-align:right;">Quantity</th>
          <th>Status</th>
          <th>Location</th>
          <th>Custodian / User</th>
          <th>Date Received</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="8" style="text-align:center;">No inventory records match the active filters.</td></tr>'}
      </tbody>
    </table>
    <div class="footer">
      <div>Generated by ${escapeHtml(activeRoleLabel)}</div>
      <div>Printed ${escapeHtml(new Date().toLocaleString('en-US'))}</div>
    </div>
  </body>
</html>`;

    const docRef = iframe.contentWindow?.document;
    if (!docRef) return;
    docRef.open();
    docRef.write(printableHtml);
    docRef.close();

    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1500);
    }, 300);
  };

  return (
    <main className="relative z-10 flex-1 bg-transparent">
      {/* Contextual Top Return Strip */}
      <div className="bg-[#E5EFE8]/90 backdrop-blur-xs border-b border-[#CBDAD0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => (isAuthorized ? onBackToPortal(returnRole) : onNavigateHome())}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B291E] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {isAuthorized
                  ? returnRole === 'principal'
                    ? "Back to Principal's Office Portal"
                    : 'Back to AO-II Admin Console'
                  : `Back to ${frontendConfig.schoolName} Home`}
              </span>
            </button>
            <span className="text-xs text-[#64748B]" aria-hidden="true">
              /
            </span>
            <span className="text-xs font-medium text-[#3F5348]">
              Property &amp; Inventory Dashboard · SY {activeAcademicYear}
            </span>
          </div>

          {isAuthorized && (
            <div className="flex items-center gap-3 text-xs text-[#3F5348]">
              <span>Signed in as {activeRoleLabel}</span>
            </div>
          )}
        </div>
      </div>

      {!isAuthorized ? (
        <section className="py-16 lg:py-24">
          <div className="max-w-[680px] mx-auto px-6">
            <div className="bg-white/95 rounded-2xl border border-[#D2DFD7] p-8 md:p-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-[#15803D]" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-2xl font-semibold text-[#111315]">
                    Property &amp; Inventory Dashboard Access
                  </h1>
                  <p className="text-sm text-[#525866] leading-relaxed">
                    The dedicated campus inventory dashboard (Equipment, School Supplies, Books,
                    Buildings, and Others) is restricted to authenticated{' '}
                    <strong className="text-[#111315]">AO-II</strong> and{' '}
                    <strong className="text-[#111315]">Principal</strong> accounts.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onBackToPortal('ao2')}
                  style={{ backgroundColor: frontendConfig.accentColor }}
                  className="px-4 py-2.5 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0"
                >
                  Sign In as AO-II
                </button>
                <button
                  type="button"
                  onClick={() => onBackToPortal('principal')}
                  className="px-4 py-2.5 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sign In as Principal
                </button>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="px-4 py-2.5 text-xs font-medium text-[#525866] hover:text-[#111315] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-10 lg:py-12">
          <div className="max-w-[1200px] mx-auto px-6 space-y-8">
            {/* Page Header & Primary Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div
                  className="text-xs font-medium"
                  style={{ color: frontendConfig.accentColor }}
                >
                  Campus Asset Custody · Equipment, School Supplies, Books, Buildings &amp; Others
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-[#111315]">
                  School Inventory &amp; Property Dashboard
                </h1>
                <p className="text-sm text-[#525866]">
                  Track campus equipment, consumable supplies, library books, instructional
                  buildings, and other school assets across custodians and locations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111315] bg-white hover:bg-[#F8F9FA] border border-[#D2DFD7] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintLedger}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111315] bg-white hover:bg-[#F8F9FA] border border-[#D2DFD7] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddForCategory()}
                  style={{ backgroundColor: frontendConfig.accentColor }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Inventory Item</span>
                </button>
              </div>
            </div>

            {/* 5-Category Dashboard Cards: Equipment, School Supplies, Books, Buildings, Others */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {categoryBreakdown.map((cat) => {
                const active = categoryFilter === cat.category;
                const meta = CATEGORY_META[cat.category];
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === cat.category ? 'ALL' : cat.category
                      )
                    }
                    className={`text-left bg-white/95 rounded-xl border p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                      active
                        ? 'border-[#15803D] ring-1 ring-[#15803D]/30 bg-[#F7FCF9]'
                        : 'border-[#D2DFD7] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[#111315]">
                          {cat.category}
                        </div>
                        <div className="text-[11px] text-[#525866] mt-0.5">
                          {meta.shortDesc}
                        </div>
                      </div>
                      <CategoryIcon
                        category={cat.category}
                        className="w-4 h-4 text-[#525866] shrink-0 mt-0.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-2xl font-bold tabular-nums text-[#111315]">
                          {cat.units}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-[#525866]">
                          {cat.entries} {cat.entries === 1 ? 'record' : 'records'} ·{' '}
                          {cat.sharePct}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-[#EEF2F0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(cat.sharePct, cat.entries > 0 ? 6 : 0)}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>

                      <div className="text-[11px] text-[#525866] font-mono tabular-nums">
                        <span className="text-[#047857]">{cat.available} avail</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-[#1D4ED8]">{cat.issued} issued</span>
                        {cat.attention > 0 && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-[#B45309]">{cat.attention} alert</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 2-Column Analytics Strip: Category Distribution + Operational Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Asset Distribution by Category */}
              <div className="lg:col-span-7 bg-white/95 rounded-xl border border-[#D2DFD7] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#111315]">
                      Category Distribution Overview
                    </h2>
                    <p className="text-xs text-[#525866]">
                      Total ledger footprint: {totals.totalEntries} entries ·{' '}
                      <span className="font-mono tabular-nums font-semibold text-[#111315]">
                        {totals.totalUnits}
                      </span>{' '}
                      total units tracked
                    </p>
                  </div>
                  {categoryFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('ALL')}
                      className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Show All Categories
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[#EEF2F0]">
                  {categoryBreakdown.map((row) => {
                    const meta = CATEGORY_META[row.category];
                    const active = categoryFilter === row.category;
                    return (
                      <button
                        key={`dist-${row.category}`}
                        type="button"
                        onClick={() =>
                          setCategoryFilter((prev) =>
                            prev === row.category ? 'ALL' : row.category
                          )
                        }
                        aria-pressed={active}
                        className={`w-full py-2.5 px-2 -mx-2 rounded-lg grid grid-cols-12 items-center gap-3 text-xs text-left transition-colors cursor-pointer ${
                          active ? 'bg-[#ECFDF5]' : 'hover:bg-[#F8FAF9]'
                        }`}
                      >
                        <div className="col-span-4 sm:col-span-3 font-medium text-[#111315] truncate">
                          {row.category}
                        </div>
                        <div className="col-span-5 sm:col-span-6">
                          <div className="w-full h-2 bg-[#EEF2F0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(row.sharePct, row.entries > 0 ? 4 : 0)}%`,
                                backgroundColor: meta.color,
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-span-3 text-right font-mono tabular-nums text-[#525866]">
                          <strong className="text-[#111315]">{row.units}</strong> ({row.sharePct}%)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Status & Attention Summary */}
              <div className="lg:col-span-5 bg-white/95 rounded-xl border border-[#D2DFD7] p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#111315]">
                      Condition &amp; Custody Breakdown
                    </h2>
                    <p className="text-xs text-[#525866]">
                      {categoryFilter === 'ALL'
                        ? 'Click any condition row to filter the ledger'
                        : `Filtered to ${categoryFilter}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {totals.attentionCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev === 'ATTENTION' ? 'ALL' : 'ATTENTION'
                          )
                        }
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                          statusFilter === 'ATTENTION'
                            ? 'bg-[#B45309] text-white border-[#B45309]'
                            : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7]'
                        }`}
                      >
                        {totals.attentionCount} Alerts
                      </button>
                    )}
                    {statusFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-[#EEF2F0]">
                  {statusBreakdown.map((row) => {
                    const active = statusFilter === row.status;
                    const textColor =
                      row.status === 'Available'
                        ? 'text-[#047857]'
                        : row.status === 'Issued'
                        ? 'text-[#1D4ED8]'
                        : row.status === 'Low Stock' || row.status === 'For Repair'
                        ? 'text-[#B45309]'
                        : 'text-[#B91C1C]';

                    return (
                      <button
                        key={`stat-${row.status}`}
                        type="button"
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev === row.status ? 'ALL' : row.status
                          )
                        }
                        className={`w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          active ? 'bg-[#ECFDF5]' : 'hover:bg-[#F8FAF9]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${textColor}`}>{row.status}</span>
                          {active && (
                            <span className="text-[11px] text-[#15803D] font-medium">
                              · Active Filter
                            </span>
                          )}
                        </div>
                        <div className="font-mono tabular-nums text-[#525866]">
                          <strong className="text-[#111315]">{row.entries}</strong> entries ·{' '}
                          <strong className="text-[#111315]">{row.units}</strong> units
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feedback Banner */}
            {feedbackSuccess && (
              <div
                role="status"
                className="bg-white rounded-xl border border-[#047857] px-4 py-3 text-xs font-medium text-[#047857] flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{feedbackSuccess}</span>
              </div>
            )}
            {feedbackError && !showAddForm && (
              <div
                role="alert"
                className="bg-white rounded-xl border border-[#B91C1C] px-4 py-3 text-xs font-medium text-[#B91C1C] flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}

            {/* Add Inventory Item Dialog Modal */}
            {showAddForm && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-inventory-dialog-title"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1426]/60 backdrop-blur-xs"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddForm(false);
                  }
                }}
              >
                <form
                  onSubmit={handleCreateItem}
                  className="w-full max-w-2xl bg-white rounded-2xl border border-[#D2DFD7] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="px-6 py-4 bg-[#F5F9F7] border-b border-[#E2E8E4] flex items-start justify-between gap-4">
                    <div>
                      <h3
                        id="add-inventory-dialog-title"
                        className="font-display text-lg font-semibold text-[#111315]"
                      >
                        Add New Inventory Item
                      </h3>
                      <p className="text-xs text-[#525866] mt-0.5">
                        Classify under Equipment, School Supplies, Books, Buildings, or Others.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      aria-label="Close Add Inventory dialog"
                      className="p-1.5 text-[#525866] hover:text-[#111315] hover:bg-white rounded-lg border border-transparent hover:border-[#DCE0E6] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 overflow-y-auto">
                    {feedbackError && (
                      <div
                        role="alert"
                        className="bg-[#FEF2F2] rounded-lg border border-[#FECACA] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C] flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="inv-page-name"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Name of Item / Building / Facility
                        </label>
                        <input
                          ref={addNameInputRef}
                          id="inv-page-name"
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g., Grade 3 Science Laboratory Kit"
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="inv-page-category"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Category
                        </label>
                        <select
                          id="inv-page-category"
                          value={newCategory}
                          onChange={(e) => {
                            const cat = e.target.value as InventoryCategory;
                            setNewCategory(cat);
                            setNewUnit(CATEGORY_META[cat].defaultUnit);
                          }}
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        >
                          {INVENTORY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor="inv-page-qty"
                            className="block text-[11px] font-semibold text-[#525866] mb-1"
                          >
                            Quantity
                          </label>
                          <input
                            id="inv-page-qty"
                            type="number"
                            min={0}
                            required
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="inv-page-unit"
                            className="block text-[11px] font-semibold text-[#525866] mb-1"
                          >
                            Unit
                          </label>
                          <input
                            id="inv-page-unit"
                            type="text"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            placeholder="units"
                            className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="inv-page-status"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Status
                        </label>
                        <select
                          id="inv-page-status"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as InventoryStatus)}
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        >
                          {INVENTORY_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="inv-page-location"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Campus Location / Room
                        </label>
                        <input
                          id="inv-page-location"
                          type="text"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="e.g., Science Room 204"
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="inv-page-received"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Date Received / Built
                        </label>
                        <input
                          id="inv-page-received"
                          type="date"
                          required
                          value={newDateReceived}
                          onChange={(e) => setNewDateReceived(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="inv-page-issued-date"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Date Issued
                        </label>
                        <input
                          id="inv-page-issued-date"
                          type="date"
                          value={newDateIssued}
                          onChange={(e) => setNewDateIssued(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="inv-page-user"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Custodian / Assigned User
                        </label>
                        <input
                          id="inv-page-user"
                          type="text"
                          value={newUser}
                          onChange={(e) => setNewUser(e.target.value)}
                          placeholder="e.g., Ms. Marisol Mendoza · Grade 1 Sampaguita"
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="inv-page-notes"
                          className="block text-[11px] font-semibold text-[#525866] mb-1"
                        >
                          Condition / Maintenance Notes
                        </label>
                        <input
                          id="inv-page-notes"
                          type="text"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          placeholder="Optional inspection or serial number remarks"
                          className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#E2E5E9] flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#525866] hover:text-[#111315] bg-white border border-[#DCE0E6] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      style={{ backgroundColor: frontendConfig.accentColor }}
                      className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      {isSaving ? 'Saving...' : 'Save Inventory Item'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Main Ledger Card */}
            <div className="bg-white/95 rounded-xl border border-[#D2DFD7] overflow-hidden">
              {/* Category Segmented Tabs & Search Toolbar */}
              <div className="p-4 border-b border-[#E2E5E9] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F6F4] rounded-lg border border-[#E2E8E4]">
                    {(['ALL', ...INVENTORY_CATEGORIES] as const).map((catOption) => {
                      const active = categoryFilter === catOption;
                      return (
                        <button
                          key={catOption}
                          type="button"
                          onClick={() => setCategoryFilter(catOption)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-white text-[#111315] shadow-xs'
                              : 'text-[#525866] hover:text-[#111315]'
                          }`}
                        >
                          {catOption === 'ALL' ? 'All Categories' : catOption}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search item, location, custodian..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', ...INVENTORY_STATUSES] as const).map((statusOption) => {
                      const active = statusFilter === statusOption;
                      return (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => setStatusFilter(statusOption)}
                          style={
                            active
                              ? {
                                  backgroundColor: frontendConfig.accentColor,
                                  borderColor: frontendConfig.accentColor,
                                }
                              : undefined
                          }
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'text-white'
                              : 'bg-white text-[#525866] border-[#DCE0E6] hover:text-[#111315]'
                          }`}
                        >
                          {statusOption === 'ALL' ? 'All Statuses' : statusOption}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs font-mono tabular-nums text-[#525866]">
                    Showing <strong className="text-[#111315]">{filteredItems.length}</strong> of{' '}
                    {inventoryItems.length} records
                  </div>
                </div>
              </div>

              {/* Property & Inventory Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E5E9] bg-[#F8F9FA] text-[11px] font-semibold text-[#525866]">
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort('itemName')}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111315]"
                        >
                          <span>Item / Facility</span>
                          <ArrowDownUp className="w-3 h-3 opacity-75" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSort('category')}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111315]"
                        >
                          <span>Category</span>
                          <ArrowDownUp className="w-3 h-3 opacity-75" />
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('quantity')}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111315]"
                        >
                          <span>Quantity</span>
                          <ArrowDownUp className="w-3 h-3 opacity-75" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSort('status')}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111315]"
                        >
                          <span>Status</span>
                          <ArrowDownUp className="w-3 h-3 opacity-75" />
                        </button>
                      </th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Custodian / User</th>
                      <th className="py-3 px-3">Dates</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E5E9]">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 px-4 text-center space-y-3">
                          <div className="text-sm font-medium text-[#111315]">
                            No inventory records match the active filter.
                          </div>
                          <p className="text-xs text-[#525866]">
                            Adjust the category, status filter, or search query, or add a new item.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryFilter('ALL');
                                setStatusFilter('ALL');
                                setSearchQuery('');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-[#111315] bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg cursor-pointer"
                            >
                              Reset Filters
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddForCategory()}
                              style={{ backgroundColor: frontendConfig.accentColor }}
                              className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                            >
                              Add Inventory Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isEditing = editingId === item.id;
                        const isConfirmDelete = confirmDeleteId === item.id;
                        const statusTextClass =
                          item.status === 'Available'
                            ? 'text-[#047857]'
                            : item.status === 'Issued'
                            ? 'text-[#1D4ED8]'
                            : item.status === 'Low Stock' || item.status === 'For Repair'
                            ? 'text-[#B45309]'
                            : 'text-[#B91C1C]';

                        if (isEditing) {
                          return (
                            <tr key={item.id} className="bg-[#F8FAF9]">
                              <td className="py-2.5 px-4 space-y-1.5">
                                <input
                                  type="text"
                                  value={editDraft.itemName}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({ ...p, itemName: e.target.value }))
                                  }
                                  className="w-full min-w-[180px] px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                />
                                <input
                                  type="text"
                                  value={editDraft.conditionNotes}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({
                                      ...p,
                                      conditionNotes: e.target.value,
                                    }))
                                  }
                                  placeholder="Condition / notes"
                                  className="w-full min-w-[180px] px-2 py-1 text-[11px] bg-white border border-[#DCE0E6] rounded"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={editDraft.category}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({
                                      ...p,
                                      category: e.target.value as InventoryCategory,
                                    }))
                                  }
                                  className="px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                >
                                  {INVENTORY_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    value={editDraft.quantity}
                                    onChange={(e) =>
                                      setEditDraft((p) => ({
                                        ...p,
                                        quantity: Number(e.target.value),
                                      }))
                                    }
                                    className="w-16 px-2 py-1 text-xs text-right font-mono bg-white border border-[#DCE0E6] rounded"
                                  />
                                  <input
                                    type="text"
                                    value={editDraft.unit}
                                    onChange={(e) =>
                                      setEditDraft((p) => ({ ...p, unit: e.target.value }))
                                    }
                                    className="w-16 px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={editDraft.status}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({
                                      ...p,
                                      status: e.target.value as InventoryStatus,
                                    }))
                                  }
                                  className="px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                >
                                  {INVENTORY_STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={editDraft.location}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({ ...p, location: e.target.value }))
                                  }
                                  className="w-full min-w-[130px] px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={editDraft.issuedToUser}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({
                                      ...p,
                                      issuedToUser: e.target.value,
                                    }))
                                  }
                                  className="w-full min-w-[150px] px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                />
                              </td>
                              <td className="py-2.5 px-3 space-y-1">
                                <input
                                  type="date"
                                  value={editDraft.dateReceived}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({
                                      ...p,
                                      dateReceived: e.target.value,
                                    }))
                                  }
                                  className="px-2 py-1 text-[11px] font-mono bg-white border border-[#DCE0E6] rounded"
                                />
                                <input
                                  type="date"
                                  value={editDraft.dateIssued}
                                  onChange={(e) =>
                                    setEditDraft((p) => ({ ...p, dateIssued: e.target.value }))
                                  }
                                  className="px-2 py-1 text-[11px] font-mono bg-white border border-[#DCE0E6] rounded"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSaveEdit(item.id)}
                                    style={{ backgroundColor: frontendConfig.accentColor }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="px-2 py-1 text-[11px] font-semibold text-[#525866] hover:text-[#111315] bg-white border border-[#DCE0E6] rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={item.id} className="hover:bg-[#F8FAF9]">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#111315]">{item.itemName}</div>
                              {item.conditionNotes && (
                                <div className="text-[11px] text-[#525866] mt-0.5">
                                  {item.conditionNotes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#3F5348] font-medium whitespace-nowrap">
                              {item.category}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <strong className="text-[#111315]">{item.quantity}</strong>{' '}
                              <span className="text-[#525866]">{item.unit ?? 'units'}</span>
                            </td>
                            <td className={`py-3 px-3 font-semibold whitespace-nowrap ${statusTextClass}`}>
                              {item.status}
                            </td>
                            <td className="py-3 px-3 text-[#525866]">
                              {item.location || '—'}
                            </td>
                            <td className="py-3 px-3 text-[#111315]">{item.issuedToUser}</td>
                            <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-[#525866] whitespace-nowrap">
                              <div>Recv: {item.dateReceived}</div>
                              <div>Iss: {item.dateIssued}</div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isConfirmDelete ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleConfirmDelete(item.id)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[11px] font-semibold text-[#525866] bg-white border border-[#DCE0E6] rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  {ao2Username && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(item.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded cursor-pointer"
                                      title="Delete item (AO-II only)"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
