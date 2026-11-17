import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Maximize2,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AcademicYear,
  AttendanceStatus,
  DocumentReviewStatus,
  GradeEnrollmentRow,
  TEACHER_PORTAL_PROFILES,
  TeacherProfile,
  TeacherSubmittedDocument,
} from '../data/schoolData';
import {
  AdminAuditEntry,
  AdmissionsSubmission,
  InventoryItem,
  InventoryStatus,
  PrincipalDocumentStatus,
  SiteBackendConfig,
  SiteFrontendConfig,
  StaffAccountSummary,
  TeacherAccountSummary,
  UploadedCourseDocument,
} from '../types/schoolConfig';

export type RoleWorkspace = 'teacher' | 'principal' | 'ao2';
type TeacherTab = 'submitted' | 'upload' | 'roster' | 'schedule' | 'security';
type PrincipalTab = 'documents' | 'security';
type Ao2Tab = 'dashboard' | 'endorsed' | 'frontend' | 'backend' | 'accounts' | 'admissions' | 'audit';

export interface TeacherAuthSession {
  teacherId: string;
  username: string;
  token: string;
}

export interface StaffAuthSession {
  username: string;
  token: string;
}

const DEFAULT_FACULTY_PASSWORDS: Record<string, string> = {
  't-sato': 'Sampaguita#1975',
  't-chen': 'NarraLab#2026',
  't-brooks': 'MolaveRead#2026',
};

const DEFAULT_PRINCIPAL_PASSWORD = 'DanlogPrincipal#1975';
const DEFAULT_AO2_PASSWORD = 'DanlogAO2#1975';

interface PortalWorkspaceProps {
  initialRole?: RoleWorkspace;
  frontendConfig: SiteFrontendConfig;
  backendConfig: SiteBackendConfig;
  enrollmentByYear: Record<AcademicYear, GradeEnrollmentRow[]>;
  uploadedDocuments: UploadedCourseDocument[];
  admissionsSubmissions: AdmissionsSubmission[];
  inventoryItems: InventoryItem[];
  auditLog: AdminAuditEntry[];
  teacherAccounts: TeacherAccountSummary[];
  principalAccount: StaffAccountSummary | null;
  ao2Account: StaffAccountSummary | null;
  teacherSession: TeacherAuthSession | null;
  principalSession: StaffAuthSession | null;
  ao2Session: StaffAuthSession | null;
  onTeacherLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onTeacherLogout: () => Promise<void>;
  onTeacherChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onPrincipalLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onPrincipalLogout: () => Promise<void>;
  onPrincipalChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2Login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2Logout: () => Promise<void>;
  onAo2UpdateTeacherAccount: (
    teacherId: string,
    username: string,
    newPassword?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdatePrincipalAccount: (
    username: string,
    newPassword?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateOwnAccount: (
    username: string,
    newPassword?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSaveFrontendConfig: (next: SiteFrontendConfig) => Promise<void>;
  onSaveBackendConfig: (next: SiteBackendConfig) => Promise<void>;
  onUpdateCapacity: (year: AcademicYear, gradeId: string, nextCap: number) => Promise<void>;
  onUploadTeacherDocument: (payload: {
    teacherId: string;
    title: string;
    category: UploadedCourseDocument['category'];
    targetCourse: string;
    fileName: string;
    fileSizeBytes: number;
    notes: string;
    documentContent?: string;
    mimeType?: string;
    file?: File | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteUploadedDocument: (docId: string) => Promise<void>;
  onPrincipalReviewDocument: (
    docId: string,
    status: PrincipalDocumentStatus,
    note?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateAdmissionStatus: (id: string, status: AdmissionsSubmission['status']) => Promise<void>;
  onAo2AddInventoryItem: (
    payload: Omit<InventoryItem, 'id'>
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateInventoryItem: (
    id: string,
    patch: Partial<Omit<InventoryItem, 'id'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteInventoryItem: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onResetSystemDefaults: () => Promise<void>;
}

const HERO_PRESETS = [
  {
    label: 'Danlog Elementary School Campus (Official)',
    url: '/assets/aistudio/image_608d5cb7_43662196.jpg',
  },
  {
    label: 'Botanical Learning Garden (Colorful)',
    url: '/src/assets/images/hero_colorful_education_1794812726997.jpg',
  },
  {
    label: 'Danlog Main Courtyard & Bridge',
    url: '/src/assets/images/school_campus_quad_1794812653685.jpg',
  },
  {
    label: 'Danlog Timber Reading Commons',
    url: '/src/assets/images/school_library_study_1794812654182.jpg',
  },
];

const ACCENT_PRESETS: { label: string; hex: SiteFrontendConfig['accentColor'] }[] = [
  { label: 'Danlog Green', hex: '#15803D' },
  { label: 'Lapis Navy', hex: '#1E3A8A' },
  { label: 'Forest Teal', hex: '#0F766E' },
  { label: 'Kiln Terracotta', hex: '#9A3412' },
  { label: 'Academic Indigo', hex: '#4338CA' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalWorkspace({
  initialRole = 'teacher',
  frontendConfig,
  backendConfig,
  enrollmentByYear,
  uploadedDocuments,
  admissionsSubmissions,
  inventoryItems,
  auditLog,
  teacherAccounts,
  principalAccount,
  ao2Account,
  teacherSession,
  principalSession,
  ao2Session,
  onTeacherLogin,
  onTeacherLogout,
  onTeacherChangePassword,
  onPrincipalLogin,
  onPrincipalLogout,
  onPrincipalChangePassword,
  onAo2Login,
  onAo2Logout,
  onAo2UpdateTeacherAccount,
  onAo2UpdatePrincipalAccount,
  onAo2UpdateOwnAccount,
  onSaveFrontendConfig,
  onSaveBackendConfig,
  onUpdateCapacity,
  onUploadTeacherDocument,
  onDeleteUploadedDocument,
  onPrincipalReviewDocument,
  onUpdateAdmissionStatus,
  onAo2AddInventoryItem,
  onAo2UpdateInventoryItem,
  onAo2DeleteInventoryItem,
  onResetSystemDefaults,
}: PortalWorkspaceProps) {
  const [roleWorkspace, setRoleWorkspace] = useState<RoleWorkspace>(initialRole);

  useEffect(() => {
    setRoleWorkspace(initialRole);
  }, [initialRole]);

  // --- TEACHER PORTAL AUTH & STATE ---
  const [teacherUsernameInput, setTeacherUsernameInput] = useState('');
  const [teacherPasswordInput, setTeacherPasswordInput] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [isTeacherSigningIn, setIsTeacherSigningIn] = useState(false);
  const [teacherLoginError, setTeacherLoginError] = useState('');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('submitted');
  const [docStatusFilter, setDocStatusFilter] = useState<'All' | DocumentReviewStatus>('All');
  const [selectedStudentDocId, setSelectedStudentDocId] = useState<string | null>(null);
  const [studentDocCommentDraft, setStudentDocCommentDraft] = useState('');

  // Teacher self-service password change
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeError, setPassChangeError] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [rostersByTeacher, setRostersByTeacher] = useState(() =>
    Object.fromEntries(TEACHER_PORTAL_PROFILES.map((t) => [t.id, t.students]))
  );
  const [studentDocsByTeacher, setStudentDocsByTeacher] = useState<
    Record<string, TeacherSubmittedDocument[]>
  >(() =>
    Object.fromEntries(TEACHER_PORTAL_PROFILES.map((t) => [t.id, t.submittedDocuments]))
  );
  const [notesByTeacher, setNotesByTeacher] = useState(() =>
    Object.fromEntries(TEACHER_PORTAL_PROFILES.map((t) => [t.id, t.initialNotes]))
  );
  const [newAdvisoryNote, setNewAdvisoryNote] = useState('');

  // Teacher file upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] =
    useState<UploadedCourseDocument['category']>('Lab Handout');
  const [uploadCourse, setUploadCourse] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadDocumentContent, setUploadDocumentContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- PRINCIPAL ACCOUNT AUTH & STATE ---
  const [principalUsernameInput, setPrincipalUsernameInput] = useState('');
  const [principalPasswordInput, setPrincipalPasswordInput] = useState('');
  const [showPrincipalPassword, setShowPrincipalPassword] = useState(false);
  const [isPrincipalSigningIn, setIsPrincipalSigningIn] = useState(false);
  const [principalLoginError, setPrincipalLoginError] = useState('');
  const [principalTab, setPrincipalTab] = useState<PrincipalTab>('documents');
  const [principalCurPass, setPrincipalCurPass] = useState('');
  const [principalNewPass, setPrincipalNewPass] = useState('');
  const [principalConfirmPass, setPrincipalConfirmPass] = useState('');
  const [principalPassErr, setPrincipalPassErr] = useState('');
  const [principalPassOk, setPrincipalPassOk] = useState('');
  const [isChangingPrincipalPass, setIsChangingPrincipalPass] = useState(false);
  const [principalTeacherFilter, setPrincipalTeacherFilter] = useState<string>('ALL');
  const [principalCategoryFilter, setPrincipalCategoryFilter] = useState<string>('ALL');
  const [principalStatusFilter, setPrincipalStatusFilter] = useState<
    'ALL' | PrincipalDocumentStatus
  >('ALL');
  const [principalSearch, setPrincipalSearch] = useState('');
  const [selectedPrincipalDocId, setSelectedPrincipalDocId] = useState<string | null>(null);
  const [principalNoteDraft, setPrincipalNoteDraft] = useState('');
  const [principalContentMode, setPrincipalContentMode] = useState<'content' | 'file'>('content');
  const [principalModalOpen, setPrincipalModalOpen] = useState(false);
  const [principalReviewFeedback, setPrincipalReviewFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  // --- AO-II ADMIN ACCOUNT AUTH & STATE ---
  const [ao2UsernameInput, setAo2UsernameInput] = useState('');
  const [ao2PasswordInput, setAo2PasswordInput] = useState('');
  const [showAo2Password, setShowAo2Password] = useState(false);
  const [isAo2SigningIn, setIsAo2SigningIn] = useState(false);
  const [ao2LoginError, setAo2LoginError] = useState('');
  const [ao2Tab, setAo2Tab] = useState<Ao2Tab>('dashboard');
  const [frontendDraft, setFrontendDraft] = useState<SiteFrontendConfig>(frontendConfig);
  const [backendDraft, setBackendDraft] = useState<SiteBackendConfig>(backendConfig);
  const [extensionsText, setExtensionsText] = useState(backendConfig.allowedExtensions.join(', '));
  const [ao2SaveMessage, setAo2SaveMessage] = useState('');
  const [ao2ErrorMessage, setAo2ErrorMessage] = useState('');
  const [accountDrafts, setAccountDrafts] = useState<
    Record<string, { username: string; newPassword: string }>
  >({});
  const [principalDraft, setPrincipalDraft] = useState({ username: '', newPassword: '' });
  const [ao2OwnDraft, setAo2OwnDraft] = useState({ username: '', newPassword: '' });
  const [ao2DocTeacherFilter, setAo2DocTeacherFilter] = useState<string>('ALL');
  const [ao2DocSearch, setAo2DocSearch] = useState('');
  const [selectedAo2DocId, setSelectedAo2DocId] = useState<string | null>(null);
  const [ao2DocViewMode, setAo2DocViewMode] = useState<'content' | 'file'>('content');
  const [ao2DocModalOpen, setAo2DocModalOpen] = useState(false);

  // AO-II Inventory List state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'ALL' | InventoryStatus>('ALL');
  const [showAddInventoryForm, setShowAddInventoryForm] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState('1');
  const [newInvStatus, setNewInvStatus] = useState<InventoryStatus>('Available');
  const [newInvDateReceived, setNewInvDateReceived] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newInvUser, setNewInvUser] = useState('');
  const [newInvDateIssued, setNewInvDateIssued] = useState('');
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [editInvDraft, setEditInvDraft] = useState<Omit<InventoryItem, 'id'>>({
    itemName: '',
    quantity: 1,
    status: 'Available',
    dateReceived: '',
    issuedToUser: '',
    dateIssued: '',
  });

  useEffect(() => {
    setFrontendDraft(frontendConfig);
  }, [frontendConfig]);

  useEffect(() => {
    setBackendDraft(backendConfig);
    setExtensionsText(backendConfig.allowedExtensions.join(', '));
  }, [backendConfig]);

  useEffect(() => {
    setAccountDrafts((prev) => {
      const next: Record<string, { username: string; newPassword: string }> = {};
      for (const acc of teacherAccounts) {
        next[acc.teacherId] = {
          username: acc.username,
          newPassword: prev[acc.teacherId]?.newPassword ?? '',
        };
      }
      return next;
    });
  }, [teacherAccounts]);

  useEffect(() => {
    if (principalAccount) {
      setPrincipalDraft((prev) => ({
        username: principalAccount.username,
        newPassword: prev.newPassword,
      }));
    }
  }, [principalAccount]);

  useEffect(() => {
    if (ao2Account) {
      setAo2OwnDraft((prev) => ({
        username: ao2Account.username,
        newPassword: prev.newPassword,
      }));
    }
  }, [ao2Account]);

  const activeTeacher: TeacherProfile | null = useMemo(
    () =>
      teacherSession
        ? TEACHER_PORTAL_PROFILES.find((t) => t.id === teacherSession.teacherId) ?? null
        : null,
    [teacherSession]
  );

  const currentStudents = activeTeacher ? rostersByTeacher[activeTeacher.id] ?? [] : [];
  const currentStudentDocs = activeTeacher ? studentDocsByTeacher[activeTeacher.id] ?? [] : [];
  const currentTeacherUploadedDocs = useMemo(
    () =>
      activeTeacher ? uploadedDocuments.filter((d) => d.teacherId === activeTeacher.id) : [],
    [uploadedDocuments, activeTeacher]
  );
  const currentNotes = activeTeacher ? notesByTeacher[activeTeacher.id] ?? [] : [];

  const filteredStudentDocs = useMemo(() => {
    if (docStatusFilter === 'All') return currentStudentDocs;
    return currentStudentDocs.filter((d) => d.status === docStatusFilter);
  }, [currentStudentDocs, docStatusFilter]);

  const inspectedStudentDoc = useMemo(
    () =>
      currentStudentDocs.find((d) => d.id === selectedStudentDocId) ??
      filteredStudentDocs[0] ??
      null,
    [currentStudentDocs, filteredStudentDocs, selectedStudentDocId]
  );

  const teacherKpis = useMemo(() => {
    const presentCount = currentStudents.filter((s) => s.attendance === 'Present').length;
    const pendingStudentDocs = currentStudentDocs.filter(
      (d) => d.status === 'Pending Review'
    ).length;
    return {
      studentCount: currentStudents.length,
      presentCount,
      pendingStudentDocs,
      uploadedCount: currentTeacherUploadedDocs.length,
    };
  }, [currentStudents, currentStudentDocs, currentTeacherUploadedDocs]);

  // Principal cross-faculty documents view
  const principalFilteredDocs = useMemo(() => {
    const q = principalSearch.trim().toLowerCase();
    return uploadedDocuments.filter((doc) => {
      const matchesTeacher =
        principalTeacherFilter === 'ALL' || doc.teacherId === principalTeacherFilter;
      const matchesCategory =
        principalCategoryFilter === 'ALL' || doc.category === principalCategoryFilter;
      const matchesStatus =
        principalStatusFilter === 'ALL' ||
        doc.principalReviewStatus === principalStatusFilter ||
        (principalStatusFilter === 'Approved' &&
          doc.principalReviewStatus === 'Endorsed/Principal');
      const teacherName =
        TEACHER_PORTAL_PROFILES.find((t) => t.id === doc.teacherId)?.name.toLowerCase() ?? '';
      const matchesQuery =
        q.length === 0 ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.targetCourse.toLowerCase().includes(q) ||
        (doc.documentContent ?? '').toLowerCase().includes(q) ||
        teacherName.includes(q);
      return matchesTeacher && matchesCategory && matchesStatus && matchesQuery;
    });
  }, [
    uploadedDocuments,
    principalTeacherFilter,
    principalCategoryFilter,
    principalStatusFilter,
    principalSearch,
  ]);

  const inspectedPrincipalDoc = useMemo(
    () =>
      principalFilteredDocs.find((d) => d.id === selectedPrincipalDocId) ??
      principalFilteredDocs[0] ??
      null,
    [principalFilteredDocs, selectedPrincipalDocId]
  );

  const isDocEndorsedToAo2 = (doc: UploadedCourseDocument) =>
    Boolean(
      doc.endorsedToAo2 ||
        doc.ao2EndorsementStatus === 'Endorsed/Principal' ||
        doc.principalReviewStatus === 'Approved' ||
        doc.principalReviewStatus === 'Endorsed/Principal'
    );

  const ao2EndorsedDocs = useMemo(
    () => uploadedDocuments.filter((doc) => isDocEndorsedToAo2(doc)),
    [uploadedDocuments]
  );

  const ao2SchoolTotals = useMemo(() => {
    const activeRows = enrollmentByYear[backendConfig.activeAcademicYear] ?? [];
    const totalStudents = activeRows.reduce((sum, r) => sum + r.enrolledStudents, 0);
    const totalCapacity = activeRows.reduce((sum, r) => sum + r.capacity, 0);
    const totalTeachers = activeRows.reduce((sum, r) => sum + r.teachers, 0);
    const totalSections = activeRows.reduce((sum, r) => sum + r.sections, 0);
    const ratio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '0.0';
    return {
      activeRows,
      totalStudents,
      totalCapacity,
      totalTeachers,
      totalSections,
      ratio,
    };
  }, [enrollmentByYear, backendConfig.activeAcademicYear]);

  const ao2FilteredEndorsedDocs = useMemo(() => {
    const q = ao2DocSearch.trim().toLowerCase();
    return ao2EndorsedDocs.filter((doc) => {
      const matchesTeacher =
        ao2DocTeacherFilter === 'ALL' || doc.teacherId === ao2DocTeacherFilter;
      const teacherName =
        TEACHER_PORTAL_PROFILES.find((t) => t.id === doc.teacherId)?.name.toLowerCase() ?? '';
      const matchesQuery =
        q.length === 0 ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.targetCourse.toLowerCase().includes(q) ||
        (doc.documentContent ?? '').toLowerCase().includes(q) ||
        teacherName.includes(q);
      return matchesTeacher && matchesQuery;
    });
  }, [ao2EndorsedDocs, ao2DocTeacherFilter, ao2DocSearch]);

  const inspectedAo2Doc = useMemo(
    () =>
      ao2FilteredEndorsedDocs.find((d) => d.id === selectedAo2DocId) ??
      ao2FilteredEndorsedDocs[0] ??
      null,
    [ao2FilteredEndorsedDocs, selectedAo2DocId]
  );

  const inventorySummary = useMemo(() => {
    const totalEntries = inventoryItems.length;
    const totalQty = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const availableCount = inventoryItems.filter((item) => item.status === 'Available').length;
    const issuedCount = inventoryItems.filter((item) => item.status === 'Issued').length;
    const attentionCount = inventoryItems.filter(
      (item) =>
        item.status === 'Low Stock' ||
        item.status === 'For Repair' ||
        item.status === 'Condemned'
    ).length;
    return { totalEntries, totalQty, availableCount, issuedCount, attentionCount };
  }, [inventoryItems]);

  const filteredInventoryItems = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const matchesStatus =
        inventoryStatusFilter === 'ALL' || item.status === inventoryStatusFilter;
      const matchesQuery =
        q.length === 0 ||
        item.itemName.toLowerCase().includes(q) ||
        item.issuedToUser.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.dateReceived.toLowerCase().includes(q) ||
        item.dateIssued.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [inventoryItems, inventorySearch, inventoryStatusFilter]);

  const handlePrintEndorsedDocument = (doc: UploadedCourseDocument) => {
    if (!ao2Session) return;
    const author = TEACHER_PORTAL_PROFILES.find((t) => t.id === doc.teacherId);
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const ext = doc.fileName.toLowerCase().split('.').pop();
    const isImage = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp';
    const fileUrl = `/api/documents/${encodeURIComponent(
      doc.id
    )}/file?ao2Token=${encodeURIComponent(ao2Session.token)}`;

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
    <title>${escapeHtml(doc.title)} — Danlog Elementary School</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111315; margin: 36px; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #15803D; padding-bottom: 14px; margin-bottom: 20px; }
      .school { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; }
      .sub { font-size: 11px; color: #525866; margin: 0; }
      .stamp { border: 2px solid #047857; color: #047857; font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
      h1 { font-size: 20px; margin: 0 0 8px 0; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; background: #F8F9FA; border: 1px solid #DCE0E6; padding: 12px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 18px; }
      .remark { background: #ECFDF5; border: 1px solid #A7F3D0; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 18px; }
      .content-box { border: 1px solid #DCE0E6; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 12.5px; line-height: 1.6; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 38px; font-size: 12px; }
      .sig-line { border-top: 1px solid #111315; padding-top: 6px; }
      @media print { body { margin: 20px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="school">${escapeHtml(frontendConfig.schoolName)}</p>
        <p class="sub">${escapeHtml(frontendConfig.campusAddress)} · Est. 1975</p>
      </div>
      <div class="stamp">Endorsed/Principal</div>
    </div>
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="meta">
      <div><strong>Submitted By:</strong> ${escapeHtml(author?.name ?? 'Faculty Member')}</div>
      <div><strong>Category:</strong> ${escapeHtml(doc.category)}</div>
      <div><strong>Grade / Section:</strong> ${escapeHtml(doc.targetCourse)}</div>
      <div><strong>Uploaded File:</strong> ${escapeHtml(doc.fileName)} (${escapeHtml(doc.fileSizeLabel)})</div>
      <div><strong>Submitted:</strong> ${escapeHtml(doc.uploadedAt)}</div>
      <div><strong>Endorsed At:</strong> ${escapeHtml(doc.endorsedAt ?? 'Upon Principal Approval')}</div>
    </div>
    ${
      doc.principalNote
        ? `<div class="remark"><strong>Principal Approval Remark:</strong> ${escapeHtml(doc.principalNote)}</div>`
        : ''
    }
    <div class="content-box">${
      doc.documentContent
        ? escapeHtml(doc.documentContent)
        : escapeHtml(doc.notes || 'Attached school document verified for AO-II records.')
    }</div>
    ${
      isImage
        ? `<div style="margin-top:16px;text-align:center;"><img src="${fileUrl}" style="max-width:100%;max-height:420px;border:1px solid #DCE0E6;" /></div>`
        : ''
    }
    <div class="sig-grid">
      <div>
        <div class="sig-line"><strong>${escapeHtml(doc.endorsedBy ?? 'Dr. Elena Vance')}</strong><br/>School Principal · Endorsed/Principal</div>
      </div>
      <div>
        <div class="sig-line"><strong>Administrative Officer II (AO-II)</strong><br/>Recorded &amp; Printed by @${escapeHtml(ao2Session.username)}</div>
      </div>
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
    }, 350);
  };

  const handlePrintAttachedFile = (doc: UploadedCourseDocument) => {
    if (!ao2Session) return;
    const fileUrl = `/api/documents/${encodeURIComponent(
      doc.id
    )}/file?ao2Token=${encodeURIComponent(ao2Session.token)}`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = fileUrl;
    iframe.onload = () => {
      window.setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          iframe.remove();
        }, 2000);
      }, 300);
    };
    document.body.appendChild(iframe);
  };

  const handlePrintInventoryList = () => {
    if (!ao2Session) return;
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsHtml = filteredInventoryItems
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(item.itemName)}</strong></td>
            <td style="text-align:right;">${item.quantity}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.dateReceived)}</td>
            <td>${escapeHtml(item.issuedToUser)}</td>
            <td>${escapeHtml(item.dateIssued)}</td>
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
    <title>School Inventory List — ${escapeHtml(frontendConfig.schoolName)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111315; margin: 28px; font-size: 12px; }
      .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #15803D; padding-bottom: 12px; margin-bottom: 16px; }
      .school { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; }
      .sub { font-size: 11px; color: #525866; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #DCE0E6; padding: 7px 9px; text-align: left; font-size: 11.5px; }
      th { background: #F8F9FA; font-weight: 700; color: #111315; }
      .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 11px; color: #525866; }
      @media print { body { margin: 16px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="school">${escapeHtml(frontendConfig.schoolName)} — School Inventory List</p>
        <p class="sub">${escapeHtml(frontendConfig.campusAddress)} · SY ${escapeHtml(
      backendConfig.activeAcademicYear
    )}</p>
      </div>
      <div class="sub">Records Shown: ${filteredInventoryItems.length} · Total Units: ${filteredInventoryItems.reduce(
      (s, i) => s + i.quantity,
      0
    )}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name of Item</th>
          <th style="text-align:right;">Qty</th>
          <th>Status</th>
          <th>Date Received</th>
          <th>User</th>
          <th>Date Issued</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">No inventory items found.</td></tr>'}
      </tbody>
    </table>
    <div class="footer">
      <div>Prepared by AO-II (@${escapeHtml(ao2Session.username)})</div>
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

  const handleCreateInventoryItem = async (e: FormEvent) => {
    e.preventDefault();
    setAo2SaveMessage('');
    setAo2ErrorMessage('');
    const qtyNum = Number(newInvQty);
    if (newInvName.trim().length < 2) {
      setAo2ErrorMessage('Enter an item name of at least 2 characters.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      setAo2ErrorMessage('Quantity must be 0 or greater.');
      return;
    }
    if (!newInvDateReceived.trim()) {
      setAo2ErrorMessage('Date received is required.');
      return;
    }

    setIsSavingInventory(true);
    const result = await onAo2AddInventoryItem({
      itemName: newInvName.trim(),
      quantity: Math.round(qtyNum),
      status: newInvStatus,
      dateReceived: newInvDateReceived.trim(),
      issuedToUser: newInvUser.trim() || 'Supply Room / Unassigned',
      dateIssued: newInvDateIssued.trim() || '—',
    });
    setIsSavingInventory(false);

    if (!result.ok) {
      setAo2ErrorMessage(result.error || 'Could not add inventory item.');
      return;
    }

    setNewInvName('');
    setNewInvQty('1');
    setNewInvStatus('Available');
    setNewInvUser('');
    setNewInvDateIssued('');
    setShowAddInventoryForm(false);
    setAo2SaveMessage('Added new inventory item to AO-II School Property records.');
  };

  const handleStartEditInventory = (item: InventoryItem) => {
    setAo2SaveMessage('');
    setAo2ErrorMessage('');
    setEditingInventoryId(item.id);
    setEditInvDraft({
      itemName: item.itemName,
      quantity: item.quantity,
      status: item.status,
      dateReceived: item.dateReceived,
      issuedToUser: item.issuedToUser,
      dateIssued: item.dateIssued === '—' ? '' : item.dateIssued,
    });
  };

  const handleSaveEditInventory = async (id: string) => {
    setAo2SaveMessage('');
    setAo2ErrorMessage('');
    setIsSavingInventory(true);
    const result = await onAo2UpdateInventoryItem(id, {
      ...editInvDraft,
      itemName: editInvDraft.itemName.trim(),
      quantity: Math.max(0, Math.round(Number(editInvDraft.quantity) || 0)),
      issuedToUser: editInvDraft.issuedToUser.trim() || 'Supply Room / Unassigned',
      dateIssued: editInvDraft.dateIssued.trim() || '—',
    });
    setIsSavingInventory(false);
    if (!result.ok) {
      setAo2ErrorMessage(result.error || 'Could not update inventory item.');
      return;
    }
    setEditingInventoryId(null);
    setAo2SaveMessage('Updated inventory item record.');
  };

  const handleDeleteInventory = async (id: string) => {
    setAo2SaveMessage('');
    setAo2ErrorMessage('');
    const result = await onAo2DeleteInventoryItem(id);
    if (!result.ok) {
      setAo2ErrorMessage(result.error || 'Could not remove inventory item.');
      return;
    }
    if (editingInventoryId === id) {
      setEditingInventoryId(null);
    }
    setAo2SaveMessage('Removed inventory item from AO-II records.');
  };

  const handlePrincipalReviewAction = async (
    docId: string,
    status: PrincipalDocumentStatus
  ) => {
    const res = await onPrincipalReviewDocument(docId, status, principalNoteDraft);
    if (!res.ok) {
      setPrincipalReviewFeedback({
        kind: 'error',
        message: res.error || 'Could not update document status.',
      });
      return;
    }
    setPrincipalNoteDraft('');
    setPrincipalReviewFeedback({
      kind: 'success',
      message:
        status === 'Approved' || status === 'Endorsed/Principal'
          ? 'Document marked as Approved and forwarded to the AO-II Dashboard.'
          : status === 'Needs Revision'
          ? 'Document marked as Needs Revision.'
          : 'Document returned to Pending Review.',
    });
  };

  const handleTeacherCredentialSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherUsernameInput.trim() || !teacherPasswordInput) {
      setTeacherLoginError('Enter both your assigned username and password.');
      return;
    }

    setIsTeacherSigningIn(true);
    setTeacherLoginError('');
    const result = await onTeacherLogin(teacherUsernameInput.trim(), teacherPasswordInput);
    setIsTeacherSigningIn(false);

    if (!result.ok) {
      setTeacherLoginError(result.error || 'Invalid teacher username or password.');
      return;
    }

    setTeacherPasswordInput('');
    setTeacherUsernameInput('');
    setSelectedStudentDocId(null);
    setTeacherTab('submitted');
  };

  const handleTeacherChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess('');

    if (newPassInput.trim().length < 6) {
      setPassChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPass(true);
    const result = await onTeacherChangePassword(currentPassInput, newPassInput.trim());
    setIsChangingPass(false);

    if (!result.ok) {
      setPassChangeError(result.error || 'Could not update password.');
      return;
    }

    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setPassChangeSuccess('Your personal teacher password has been updated.');
  };

  const handleSaveStudentDocFeedback = (docId: string) => {
    if (!activeTeacher || !studentDocCommentDraft.trim()) return;
    setStudentDocsByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: (prev[activeTeacher.id] ?? []).map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              teacherComment: studentDocCommentDraft.trim(),
            }
          : doc
      ),
    }));
    setStudentDocCommentDraft('');
  };

  const handleAttendanceToggle = (studentId: string, status: AttendanceStatus) => {
    if (!activeTeacher) return;
    setRostersByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: (prev[activeTeacher.id] ?? []).map((s) =>
        s.id === studentId ? { ...s, attendance: status } : s
      ),
    }));
  };

  const handleFileChosen = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess('');
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
    }
    const lower = file.name.toLowerCase();
    if (
      (lower.endsWith('.txt') ||
        lower.endsWith('.csv') ||
        lower.endsWith('.md') ||
        file.type.startsWith('text/')) &&
      file.size <= 512 * 1024
    ) {
      void file.text().then((text) => {
        if (text.trim()) {
          setUploadDocumentContent((prev) => prev.trim() || text.slice(0, 60000));
        }
      });
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileChosen(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileChosen(event.dataTransfer.files?.[0] ?? null);
  };

  const handleTeacherUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;

    if (!selectedFile) {
      setUploadError('Select a document file to upload.');
      return;
    }
    if (uploadTitle.trim().length < 3) {
      setUploadError('Provide a document title (at least 3 characters).');
      return;
    }

    setIsUploading(true);
    const result = await onUploadTeacherDocument({
      teacherId: activeTeacher.id,
      title: uploadTitle.trim(),
      category: uploadCategory,
      targetCourse: uploadCourse.trim() || activeTeacher.assignedGradeLabel,
      fileName: selectedFile.name,
      fileSizeBytes: selectedFile.size,
      notes: uploadNotes.trim() || 'Uploaded via Danlog Elementary School Teacher Portal.',
      documentContent: uploadDocumentContent.trim() || undefined,
      mimeType: selectedFile.type || undefined,
      file: selectedFile,
    });
    setIsUploading(false);

    if (!result.ok) {
      setUploadError(result.error || 'Upload rejected by AO-II system policy.');
      return;
    }

    setUploadTitle('');
    setUploadCourse('');
    setUploadNotes('');
    setUploadDocumentContent('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError('');
    setUploadSuccess('Document uploaded and synced to both your dashboard and the Principal archive.');
  };

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!activeTeacher || newAdvisoryNote.trim().length < 3) return;
    setNotesByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: [
        { id: `note-${Date.now()}`, timestamp: 'Just now', text: newAdvisoryNote.trim() },
        ...(prev[activeTeacher.id] ?? []),
      ],
    }));
    setNewAdvisoryNote('');
  };

  const handleSaveFrontend = async (e: FormEvent) => {
    e.preventDefault();
    await onSaveFrontendConfig(frontendDraft);
    setAo2SaveMessage('Front-end website settings saved and applied live.');
  };

  const handleSaveBackend = async (e: FormEvent) => {
    e.preventDefault();
    const parsedExts = extensionsText
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((s) => (s.startsWith('.') ? s : `.${s}`));

    await onSaveBackendConfig({
      ...backendDraft,
      allowedExtensions: parsedExts.length > 0 ? parsedExts : ['.pdf'],
    });
    setAo2SaveMessage('Back-end policies and upload limits saved to server.');
  };

  const handlePrincipalCredentialSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!principalUsernameInput.trim() || !principalPasswordInput) {
      setPrincipalLoginError('Enter both the Principal username and password.');
      return;
    }
    setIsPrincipalSigningIn(true);
    setPrincipalLoginError('');
    const result = await onPrincipalLogin(principalUsernameInput.trim(), principalPasswordInput);
    setIsPrincipalSigningIn(false);
    if (!result.ok) {
      setPrincipalLoginError(result.error || 'Invalid Principal username or password.');
      return;
    }
    setPrincipalPasswordInput('');
    setPrincipalUsernameInput('');
    setPrincipalTab('documents');
  };

  const handlePrincipalChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPrincipalPassErr('');
    setPrincipalPassOk('');
    if (principalNewPass.trim().length < 6) {
      setPrincipalPassErr('New password must be at least 6 characters long.');
      return;
    }
    if (principalNewPass !== principalConfirmPass) {
      setPrincipalPassErr('New password and confirmation do not match.');
      return;
    }
    setIsChangingPrincipalPass(true);
    const res = await onPrincipalChangePassword(principalCurPass, principalNewPass.trim());
    setIsChangingPrincipalPass(false);
    if (!res.ok) {
      setPrincipalPassErr(res.error || 'Could not update Principal password.');
      return;
    }
    setPrincipalCurPass('');
    setPrincipalNewPass('');
    setPrincipalConfirmPass('');
    setPrincipalPassOk('Principal password updated.');
  };

  const handleAo2CredentialSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!ao2UsernameInput.trim() || !ao2PasswordInput) {
      setAo2LoginError('Enter both your AO-II administrator username and password.');
      return;
    }
    setIsAo2SigningIn(true);
    setAo2LoginError('');
    const result = await onAo2Login(ao2UsernameInput.trim(), ao2PasswordInput);
    setIsAo2SigningIn(false);
    if (!result.ok) {
      setAo2LoginError(result.error || 'Invalid AO-II administrator username or password.');
      return;
    }
    setAo2PasswordInput('');
    setAo2UsernameInput('');
    setAo2Tab('dashboard');
  };

  const handleExportBackup = async () => {
    const res = await fetch('/api/admin/export', {
      headers: {
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'danlog_elementary_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="portals"
      className="relative overflow-hidden py-12 lg:py-16 bg-transparent border-b border-[#D2DFD7]"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 space-y-8">
        {/* Campus Backdrop Portal Header & Role Switcher */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1E4D3B]/40 shadow-sm">
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <img
              src="/src/assets/images/dashboard_campus_backdrop_1794821642444.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09231A]/94 via-[#0E3326]/88 to-[#13293E]/86" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-[#A7F3D0]">
                School Role Portals · Danlog Elementary School
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
                D-ES-S/Portal
              </h2>
              <p className="text-sm md:text-base text-[#D7E9E0]">
                Switch between school accounts to manage classroom uploads and student submissions,
                review all faculty documents as Principal, or configure full front-end and back-end
                settings as AO-II.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Select school portal account role"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-white/12 backdrop-blur-sm rounded-xl border border-white/25 shrink-0 self-start lg:self-auto"
            >
              {[
                { id: 'teacher' as RoleWorkspace, label: 'Teacher Dashboard' },
                { id: 'principal' as RoleWorkspace, label: "Principal's Office" },
                { id: 'ao2' as RoleWorkspace, label: 'AO-II Admin Console' },
              ].map((role) => {
                const active = roleWorkspace === role.id;
                return (
                  <button
                    key={role.id}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    onClick={() => setRoleWorkspace(role.id)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#0B291E] shadow-xs'
                        : 'text-[#E2F3EA] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {role.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================
            ROLE 1: TEACHER DASHBOARD (USERNAME & PASSWORD PROTECTED)
           ============================================================ */}
        {roleWorkspace === 'teacher' && (
          <div className="space-y-6">
            {!activeTeacher ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Username + Password Login Card */}
                <div className="lg:col-span-6 bg-[#F8F9FA] rounded-2xl border border-[#E2E5E9] p-8 space-y-6">
                  <div className="space-y-1.5">
                    <div
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: frontendConfig.accentColor }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Individual Faculty Authentication</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#111315]">
                      Teacher Portal Sign In
                    </h3>
                    <p className="text-sm text-[#525866]">
                      Each teacher must enter their own assigned username and password to access
                      classroom rosters, student submissions, and document uploads.
                    </p>
                  </div>

                  <form onSubmit={handleTeacherCredentialSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="teacher-username-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        Teacher Username
                      </label>
                      <input
                        id="teacher-username-login"
                        type="text"
                        autoComplete="username"
                        value={teacherUsernameInput}
                        onChange={(e) => {
                          setTeacherUsernameInput(e.target.value);
                          setTeacherLoginError('');
                        }}
                        placeholder="e.g., m.mendoza"
                        className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="teacher-password-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="teacher-password-login"
                          type={showTeacherPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={teacherPasswordInput}
                          onChange={(e) => {
                            setTeacherPasswordInput(e.target.value);
                            setTeacherLoginError('');
                          }}
                          placeholder="Enter your teacher password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTeacherPassword((prev) => !prev)}
                          aria-label={showTeacherPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#525866] hover:text-[#111315] cursor-pointer"
                        >
                          {showTeacherPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {teacherLoginError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{teacherLoginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isTeacherSigningIn}
                      style={{ backgroundColor: frontendConfig.accentColor }}
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      {isTeacherSigningIn ? 'Verifying Credentials...' : 'Sign In to Teacher Portal'}
                    </button>
                  </form>
                </div>

                {/* Assigned Faculty Credentials Directory (for testing distinct logins) */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E5E9] p-8 space-y-5">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#525866]">
                      Faculty Credential Directory
                    </div>
                    <h4 className="font-display text-xl font-semibold text-[#111315]">
                      Distinct Username &amp; Password per Teacher
                    </h4>
                    <p className="text-xs text-[#525866]">
                      Each faculty account uses unique credentials verified against the server. AO-II
                      can update any teacher&apos;s username or reset passwords in the Admin Console.
                    </p>
                  </div>

                  <div className="divide-y divide-[#E2E5E9] border-t border-b border-[#E2E5E9]">
                    {TEACHER_PORTAL_PROFILES.map((t) => {
                      const account = teacherAccounts.find((a) => a.teacherId === t.id);
                      const username = account?.username ?? t.email.split('@')[0];
                      const defaultPass = DEFAULT_FACULTY_PASSWORDS[t.id];
                      const canPrefillDefault = !account?.hasCustomPassword && Boolean(defaultPass);

                      return (
                        <div
                          key={t.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-[#111315]">{t.name}</div>
                            <div className="text-xs text-[#525866]">{t.assignedGradeLabel}</div>
                            <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs font-mono">
                              <span className="text-[#111315]">
                                User: <strong>{username}</strong>
                              </span>
                              <span className="text-[#525866]">
                                Pass:{' '}
                                {canPrefillDefault ? (
                                  <strong className="text-[#111315]">{defaultPass}</strong>
                                ) : (
                                  <span className="italic">Custom password set</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setTeacherUsernameInput(username);
                              if (canPrefillDefault) {
                                setTeacherPasswordInput(defaultPass);
                              } else {
                                setTeacherPasswordInput('');
                              }
                              setTeacherLoginError('');
                            }}
                            style={{ color: frontendConfig.accentColor }}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            {canPrefillDefault ? 'Fill Credentials' : 'Fill Username'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-[#CCE0D4] overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#15803D] via-[#0F766E] to-[#0284C7]" />
                <div className="bg-gradient-to-r from-[#ECFDF5] via-white to-[#EFF6FF] px-6 py-5 border-b border-[#DCE6E0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#475569]">
                      <span className="font-semibold text-[#15803D]">
                        {activeTeacher.department}
                      </span>{' '}
                      · {activeTeacher.room} · Account:{' '}
                      <span className="font-mono font-semibold text-[#111315]">
                        @{teacherSession?.username}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#0B291E]">
                      {activeTeacher.name}
                    </h3>
                    <p className="text-xs text-[#475569]">
                      {activeTeacher.title} · {activeTeacher.assignedGradeLabel} · Office Hours:{' '}
                      {activeTeacher.officeHours}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onTeacherLogout()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B291E] bg-white hover:bg-[#ECFDF5] border border-[#BBF7D0] rounded-lg cursor-pointer self-start md:self-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out / Switch Teacher</span>
                  </button>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#DCE6E0] divide-y sm:divide-y-0 sm:divide-x divide-[#DCE6E0]">
                  <div className="p-5 space-y-1 bg-[#F0FDF4]/85">
                    <div className="text-xs font-medium text-[#166534]">Student Docs Pending Review</div>
                    <div className="font-display text-2xl font-semibold text-[#15803D] tabular-nums">
                      {teacherKpis.pendingStudentDocs}
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#EFF6FF]/85">
                    <div className="text-xs font-medium text-[#1E40AF]">My Uploaded Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums">
                      {teacherKpis.uploadedCount}
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#F0FDFA]/85">
                    <div className="text-xs font-medium text-[#115E59]">Attendance Present Today</div>
                    <div className="font-display text-2xl font-semibold text-[#0F766E] tabular-nums">
                      {teacherKpis.presentCount} / {teacherKpis.studentCount}
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#FFFBEB]/85">
                    <div className="text-xs font-medium text-[#92400E]">Upload Policy Limit</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {backendConfig.teacherUploadsEnabled
                        ? `${backendConfig.maxUploadSizeMb} MB`
                        : 'Paused'}
                    </div>
                  </div>
                </div>

                {/* Teacher Tabs */}
                <div className="px-6 pt-4 border-b border-[#E2E5E9] bg-white flex flex-wrap gap-2">
                  {[
                    {
                      id: 'submitted' as TeacherTab,
                      label: `Submitted Student Documents (${currentStudentDocs.length})`,
                    },
                    {
                      id: 'upload' as TeacherTab,
                      label: `Upload My Documents (${currentTeacherUploadedDocs.length})`,
                    },
                    {
                      id: 'roster' as TeacherTab,
                      label: `Class Roster & Attendance (${currentStudents.length})`,
                    },
                    { id: 'schedule' as TeacherTab, label: 'Schedule & Notes' },
                    { id: 'security' as TeacherTab, label: 'Account & Password' },
                  ].map((tab) => {
                    const active = teacherTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTeacherTab(tab.id)}
                        style={
                          active
                            ? {
                                borderBottomColor: frontendConfig.accentColor,
                                color: frontendConfig.accentColor,
                              }
                            : undefined
                        }
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? ''
                            : 'border-transparent text-[#525866] hover:text-[#111315]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6">
                  {/* TEACHER TAB 1: STUDENT SUBMITTED DOCUMENTS */}
                  {teacherTab === 'submitted' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Documents Submitted by Students
                          </h4>
                          <p className="text-xs text-[#525866]">
                            Review incoming lab reports, essays, and consent packets for your
                            cohort.
                          </p>
                        </div>

                        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg border border-[#E2E5E9]">
                          {(
                            ['All', 'Pending Review', 'Approved', 'Revision Requested'] as const
                          ).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setDocStatusFilter(status)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                                docStatusFilter === status
                                  ? 'bg-[#111315] text-white'
                                  : 'text-[#525866] hover:text-[#111315]'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredStudentDocs.length === 0 ? (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] p-10 text-center space-y-3">
                          <p className="text-sm font-medium text-[#111315]">
                            No submitted documents match “{docStatusFilter}”.
                          </p>
                          <button
                            type="button"
                            onClick={() => setDocStatusFilter('All')}
                            style={{ backgroundColor: frontendConfig.accentColor }}
                            className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                          >
                            Show All
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                            {filteredStudentDocs.map((doc) => {
                              const isSelected = inspectedStudentDoc?.id === doc.id;
                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => setSelectedStudentDocId(doc.id)}
                                  className={`w-full text-left p-5 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                                    isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8F9FA]'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs text-[#525866]">
                                      {doc.studentName} · {doc.documentType} · {doc.submittedAt}
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                        doc.status === 'Approved'
                                          ? 'text-[#047857]'
                                          : doc.status === 'Revision Requested'
                                          ? 'text-[#B45309]'
                                          : 'text-[#1E3A8A]'
                                      }`}
                                    >
                                      {doc.status === 'Approved' && (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      {doc.status === 'Revision Requested' && (
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      )}
                                      {doc.status === 'Pending Review' && (
                                        <Clock className="w-3.5 h-3.5" />
                                      )}
                                      <span>{doc.status}</span>
                                    </span>
                                  </div>
                                  <div className="font-semibold text-sm text-[#111315]">
                                    {doc.title}
                                  </div>
                                  <div className="font-mono text-[11px] text-[#525866]">
                                    {doc.fileName} · {doc.fileSize}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {inspectedStudentDoc && (
                            <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
                              <div className="flex items-start justify-between gap-3 border-b border-[#E2E5E9] pb-4">
                                <div className="space-y-1">
                                  <div className="text-xs text-[#525866]">
                                    {inspectedStudentDoc.documentType} ·{' '}
                                    {inspectedStudentDoc.submittedAt}
                                  </div>
                                  <h5 className="font-display text-lg font-semibold text-[#111315]">
                                    {inspectedStudentDoc.title}
                                  </h5>
                                  <p className="text-xs text-[#525866]">
                                    Student:{' '}
                                    <span className="font-semibold text-[#111315]">
                                      {inspectedStudentDoc.studentName}
                                    </span>
                                  </p>
                                </div>
                                <FileText
                                  className="w-5 h-5 shrink-0"
                                  style={{ color: frontendConfig.accentColor }}
                                />
                              </div>

                              <p className="text-xs leading-relaxed text-[#525866]">
                                {inspectedStudentDoc.summaryNote}
                              </p>

                              {inspectedStudentDoc.teacherComment && (
                                <div className="bg-[#F8F9FA] rounded-lg border border-[#E2E5E9] p-3 text-xs text-[#525866]">
                                  <span className="font-semibold text-[#111315] block mb-0.5">
                                    Feedback Recorded:
                                  </span>
                                  {inspectedStudentDoc.teacherComment}
                                </div>
                              )}

                              <div className="space-y-3 pt-2 border-t border-[#E2E5E9]">
                                <textarea
                                  rows={2}
                                  value={studentDocCommentDraft}
                                  onChange={(e) => setStudentDocCommentDraft(e.target.value)}
                                  placeholder="Optional feedback note..."
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                                />
                                <button
                                  type="button"
                                  disabled={!studentDocCommentDraft.trim()}
                                  onClick={() => handleSaveStudentDocFeedback(inspectedStudentDoc.id)}
                                  style={{ backgroundColor: frontendConfig.accentColor }}
                                  className="w-full py-2 px-3 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 rounded-lg cursor-pointer"
                                >
                                  Save Feedback Note
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TEACHER TAB 2: UPLOAD & PUBLISH TEACHER DOCUMENTS */}
                  {teacherTab === 'upload' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <form
                        onSubmit={handleTeacherUploadSubmit}
                        className="lg:col-span-6 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Upload &amp; Submit Teacher Document
                          </h4>
                          <p className="text-xs text-[#525866]">
                            Uploaded files are saved to the school server and immediately visible to
                            the Principal&apos;s Office. Max size: {backendConfig.maxUploadSizeMb}{' '}
                            MB ({backendConfig.allowedExtensions.join(', ')}).
                          </p>
                        </div>

                        {!backendConfig.teacherUploadsEnabled && (
                          <div className="p-3.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B] text-xs text-[#92400E] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                              Document uploads are currently paused by the AO-II Administrator in
                              Back-End Settings.
                            </span>
                          </div>
                        )}

                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                            isDragging
                              ? 'border-[#1E3A8A] bg-[#EFF6FF]'
                              : 'border-[#DCE0E6] bg-[#F8F9FA]'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={backendConfig.allowedExtensions.join(',')}
                            onChange={handleFileInputChange}
                            className="sr-only"
                            id="teacher-portal-file-upload"
                          />
                          <Upload
                            className="w-6 h-6 mx-auto mb-2"
                            style={{ color: frontendConfig.accentColor }}
                          />
                          {selectedFile ? (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-[#111315]">
                                {selectedFile.name}
                              </p>
                              <p className="font-mono text-[11px] text-[#525866]">
                                {formatFileSize(selectedFile.size)}
                              </p>
                              <label
                                htmlFor="teacher-portal-file-upload"
                                className="inline-block text-xs font-semibold underline cursor-pointer"
                                style={{ color: frontendConfig.accentColor }}
                              >
                                Choose a different file
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-[#111315]">
                                Drag and drop a file here, or{' '}
                                <label
                                  htmlFor="teacher-portal-file-upload"
                                  className="font-semibold underline cursor-pointer"
                                  style={{ color: frontendConfig.accentColor }}
                                >
                                  browse from computer
                                </label>
                              </p>
                              <p className="text-[11px] text-[#525866]">
                                Allowed: {backendConfig.allowedExtensions.join(', ')} · Max{' '}
                                {backendConfig.maxUploadSizeMb} MB
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="up-title"
                              className="block text-xs font-semibold text-[#111315] mb-1"
                            >
                              Document Title
                            </label>
                            <input
                              id="up-title"
                              type="text"
                              value={uploadTitle}
                              onChange={(e) => setUploadTitle(e.target.value)}
                              placeholder="e.g., Unit 3 Lab Safety Protocol"
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="up-cat"
                              className="block text-xs font-semibold text-[#111315] mb-1"
                            >
                              Category
                            </label>
                            <select
                              id="up-cat"
                              value={uploadCategory}
                              onChange={(e) =>
                                setUploadCategory(
                                  e.target.value as UploadedCourseDocument['category']
                                )
                              }
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            >
                              <option value="Lab Handout">Lab Handout</option>
                              <option value="Syllabus">Syllabus</option>
                              <option value="Study Guide">Study Guide</option>
                              <option value="Parent Notice">Parent Notice</option>
                              <option value="Assessment Rubric">Assessment Rubric</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="up-course"
                            className="block text-xs font-semibold text-[#111315] mb-1"
                          >
                            Course / Cohort
                          </label>
                          <input
                            id="up-course"
                            type="text"
                            value={uploadCourse}
                            onChange={(e) => setUploadCourse(e.target.value)}
                            placeholder={activeTeacher.assignedGradeLabel}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="up-notes"
                            className="block text-xs font-semibold text-[#111315] mb-1"
                          >
                            Summary Notes
                          </label>
                          <textarea
                            id="up-notes"
                            rows={2}
                            value={uploadNotes}
                            onChange={(e) => setUploadNotes(e.target.value)}
                            placeholder="Brief summary for Principal review and class distribution..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="up-content"
                            className="block text-xs font-semibold text-[#111315] mb-1"
                          >
                            Document Content / Body Text (for Principal Review)
                          </label>
                          <textarea
                            id="up-content"
                            rows={4}
                            value={uploadDocumentContent}
                            onChange={(e) => setUploadDocumentContent(e.target.value)}
                            placeholder="Paste or type the full lesson plan, rubric, or notice content (auto-filled for .txt / .csv files)..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>

                        {uploadError && (
                          <p className="text-xs text-[#B91C1C] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{uploadError}</span>
                          </p>
                        )}
                        {uploadSuccess && (
                          <p className="text-xs text-[#047857] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{uploadSuccess}</span>
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isUploading || !backendConfig.teacherUploadsEnabled}
                          style={{ backgroundColor: frontendConfig.accentColor }}
                          className="w-full py-2.5 px-4 text-xs font-semibold text-white rounded-lg disabled:opacity-50 cursor-pointer"
                        >
                          {isUploading ? 'Uploading...' : 'Upload & Submit Document'}
                        </button>
                      </form>

                      <div className="lg:col-span-6 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
                        <div className="flex items-baseline justify-between border-b border-[#E2E5E9] pb-3">
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            My Uploaded Documents
                          </h4>
                          <span className="font-mono text-xs tabular-nums text-[#525866]">
                            {currentTeacherUploadedDocs.length} Files
                          </span>
                        </div>

                        {currentTeacherUploadedDocs.length === 0 ? (
                          <p className="text-xs text-[#525866] py-8 text-center">
                            You have not uploaded any documents yet.
                          </p>
                        ) : (
                          <div className="divide-y divide-[#E2E5E9]">
                            {currentTeacherUploadedDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="py-4 flex items-start justify-between gap-4"
                              >
                                <div className="space-y-1">
                                  <div className="text-[11px] text-[#525866]">
                                    {doc.category} · {doc.targetCourse} · {doc.uploadedAt}
                                  </div>
                                  <div className="text-sm font-semibold text-[#111315]">
                                    {doc.title}
                                  </div>
                                  <p className="text-xs text-[#525866]">{doc.notes}</p>
                                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                                    <span className="font-mono text-[#111315]">
                                      {doc.fileName} ({doc.fileSizeLabel})
                                    </span>
                                    <span
                                      className={`font-semibold ${
                                        doc.principalReviewStatus === 'Approved' ||
                                        doc.principalReviewStatus === 'Endorsed/Principal'
                                          ? 'text-[#047857]'
                                          : doc.principalReviewStatus === 'Needs Revision'
                                          ? 'text-[#B45309]'
                                          : 'text-[#1E3A8A]'
                                      }`}
                                    >
                                      Principal: {doc.principalReviewStatus}
                                      {doc.ao2EndorsementStatus === 'Endorsed/Principal' &&
                                      doc.principalReviewStatus !== 'Endorsed/Principal'
                                        ? ' · AO-II: Endorsed/Principal'
                                        : ''}
                                    </span>
                                  </div>
                                  {doc.principalNote && (
                                    <div className="mt-1.5 text-[11px] text-[#525866] bg-[#F8F9FA] px-2.5 py-1.5 rounded border border-[#E2E5E9]">
                                      <span className="font-semibold text-[#111315]">
                                        Principal Remark:{' '}
                                      </span>
                                      {doc.principalNote}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void onDeleteUploadedDocument(doc.id)}
                                  aria-label={`Remove ${doc.title}`}
                                  className="p-2 text-[#525866] hover:text-[#B91C1C] rounded-lg cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TEACHER TAB 3: ROSTER & ATTENDANCE */}
                  {teacherTab === 'roster' && (
                    <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-center justify-between">
                        <div>
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Class Roster &amp; Daily Attendance
                          </h4>
                          <p className="text-xs text-[#525866]">
                            {activeTeacher.assignedGradeLabel}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: frontendConfig.accentColor }}
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>
                            {teacherKpis.presentCount} of {teacherKpis.studentCount} Present
                          </span>
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2E5E9] bg-[#F8F9FA] text-[11px] font-semibold text-[#525866]">
                              <th className="py-3 px-6">Student</th>
                              <th className="py-3 px-4">Cohort</th>
                              <th className="py-3 px-4 text-right">Term Avg.</th>
                              <th className="py-3 px-6 text-right">Attendance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E5E9] text-xs">
                            {currentStudents.map((student) => (
                              <tr key={student.id}>
                                <td className="py-3 px-6 font-semibold text-[#111315]">
                                  {student.studentName}
                                </td>
                                <td className="py-3 px-4 text-[#525866]">
                                  {student.gradeLabel} · {student.advisorGroup}
                                </td>
                                <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111315]">
                                  {student.currentAverage}%
                                </td>
                                <td className="py-3 px-6 text-right">
                                  <div className="inline-flex gap-1 p-0.5 bg-[#F2F4F6] rounded-md border border-[#E2E5E9]">
                                    {(['Present', 'Late', 'Absent'] as AttendanceStatus[]).map(
                                      (st) => (
                                        <button
                                          key={st}
                                          type="button"
                                          onClick={() => handleAttendanceToggle(student.id, st)}
                                          className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer ${
                                            student.attendance === st
                                              ? st === 'Present'
                                                ? 'bg-[#047857] text-white'
                                                : st === 'Late'
                                                ? 'bg-[#B45309] text-white'
                                                : 'bg-[#B91C1C] text-white'
                                              : 'text-[#525866]'
                                          }`}
                                        >
                                          {st}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TEACHER TAB 4: SCHEDULE & NOTES */}
                  {teacherTab === 'schedule' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
                        <h4 className="font-display text-lg font-semibold text-[#111315]">
                          Daily Teaching Schedule
                        </h4>
                        <div className="divide-y divide-[#E2E5E9]">
                          {activeTeacher.schedule.map((block) => (
                            <div
                              key={block.period}
                              className="py-3 flex items-center justify-between gap-4 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-[#111315]">{block.course}</div>
                                <div className="text-[#525866]">
                                  {block.period} · {block.room}
                                </div>
                              </div>
                              <div className="text-right font-mono tabular-nums">
                                <div className="text-[#111315]">{block.time}</div>
                                <div className="text-[#525866]">{block.enrolled} Students</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
                        <h4 className="font-display text-lg font-semibold text-[#111315]">
                          Advisory Notes
                        </h4>
                        <form onSubmit={handleAddNote} className="flex gap-2">
                          <input
                            type="text"
                            value={newAdvisoryNote}
                            onChange={(e) => setNewAdvisoryNote(e.target.value)}
                            placeholder="Add class note..."
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                          <button
                            type="submit"
                            style={{ backgroundColor: frontendConfig.accentColor }}
                            className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                          >
                            Post
                          </button>
                        </form>
                        <div className="divide-y divide-[#E2E5E9]">
                          {currentNotes.map((note) => (
                            <div key={note.id} className="py-3 space-y-1">
                              <div className="font-mono text-[11px] text-[#525866]">
                                {note.timestamp}
                              </div>
                              <p className="text-xs text-[#111315]">{note.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TEACHER TAB 5: ACCOUNT & PASSWORD */}
                  {teacherTab === 'security' && (
                    <div className="max-w-xl bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                      <div className="space-y-1">
                        <div
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: frontendConfig.accentColor }}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Faculty Account Security</span>
                        </div>
                        <h4 className="font-display text-lg font-semibold text-[#111315]">
                          Change Teacher Password (@{teacherSession?.username})
                        </h4>
                        <p className="text-xs text-[#525866]">
                          Update your personal password used to sign in to the Danlog Elementary
                          School Teacher Portal.
                        </p>
                      </div>

                      <form onSubmit={handleTeacherChangePasswordSubmit} className="space-y-4">
                        <div>
                          <label
                            htmlFor="cur-teacher-pass"
                            className="block text-xs font-semibold text-[#111315] mb-1"
                          >
                            Current Password
                          </label>
                          <input
                            id="cur-teacher-pass"
                            type="password"
                            value={currentPassInput}
                            onChange={(e) => setCurrentPassInput(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="new-teacher-pass"
                              className="block text-xs font-semibold text-[#111315] mb-1"
                            >
                              New Password (min 6 chars)
                            </label>
                            <input
                              id="new-teacher-pass"
                              type="password"
                              value={newPassInput}
                              onChange={(e) => setNewPassInput(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="conf-teacher-pass"
                              className="block text-xs font-semibold text-[#111315] mb-1"
                            >
                              Confirm New Password
                            </label>
                            <input
                              id="conf-teacher-pass"
                              type="password"
                              value={confirmPassInput}
                              onChange={(e) => setConfirmPassInput(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                        </div>

                        {passChangeError && (
                          <p className="text-xs text-[#B91C1C] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{passChangeError}</span>
                          </p>
                        )}
                        {passChangeSuccess && (
                          <p className="text-xs text-[#047857] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{passChangeSuccess}</span>
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isChangingPass}
                          style={{ backgroundColor: frontendConfig.accentColor }}
                          className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {isChangingPass ? 'Updating...' : 'Update My Password'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ROLE 2: PRINCIPAL'S OFFICE (USERNAME & PASSWORD PROTECTED)
           ============================================================ */}
        {roleWorkspace === 'principal' && (
          <div className="space-y-6">
            {!principalSession ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 bg-[#F8F9FA] rounded-2xl border border-[#E2E5E9] p-8 space-y-6">
                  <div className="space-y-1.5">
                    <div
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: frontendConfig.accentColor }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Principal Oversight Authentication</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#111315]">
                      Principal&apos;s Office Sign In
                    </h3>
                    <p className="text-sm text-[#525866]">
                      Sign in with the School Principal username and password to access all
                      documents submitted by every teacher across Kindergarten through Grade 6.
                    </p>
                  </div>

                  <form onSubmit={handlePrincipalCredentialSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="principal-username-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        Principal Username
                      </label>
                      <input
                        id="principal-username-login"
                        type="text"
                        autoComplete="username"
                        value={principalUsernameInput}
                        onChange={(e) => {
                          setPrincipalUsernameInput(e.target.value);
                          setPrincipalLoginError('');
                        }}
                        placeholder="e.g., principal.vance"
                        className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="principal-password-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="principal-password-login"
                          type={showPrincipalPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={principalPasswordInput}
                          onChange={(e) => {
                            setPrincipalPasswordInput(e.target.value);
                            setPrincipalLoginError('');
                          }}
                          placeholder="Enter Principal password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPrincipalPassword((prev) => !prev)}
                          aria-label={showPrincipalPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#525866] hover:text-[#111315] cursor-pointer"
                        >
                          {showPrincipalPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {principalLoginError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{principalLoginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isPrincipalSigningIn}
                      style={{ backgroundColor: frontendConfig.accentColor }}
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      {isPrincipalSigningIn
                        ? 'Verifying Principal Account...'
                        : 'Sign In to Principal Dashboard'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E5E9] p-8 space-y-5">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#525866]">
                      Principal Credential Reference
                    </div>
                    <h4 className="font-display text-xl font-semibold text-[#111315]">
                      Dr. Elena Vance — School Principal
                    </h4>
                    <p className="text-xs text-[#525866]">
                      Privileged oversight access across all teacher-submitted files, endorsements,
                      and curriculum follow-ups.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs font-mono">
                      <div className="text-[#111315]">
                        Username:{' '}
                        <strong>{principalAccount?.username ?? 'principal.vance'}</strong>
                      </div>
                      <div className="text-[#525866]">
                        Password:{' '}
                        {!principalAccount?.hasCustomPassword ? (
                          <strong className="text-[#111315]">{DEFAULT_PRINCIPAL_PASSWORD}</strong>
                        ) : (
                          <span className="italic">Custom password set</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPrincipalUsernameInput(
                          principalAccount?.username ?? 'principal.vance'
                        );
                        if (!principalAccount?.hasCustomPassword) {
                          setPrincipalPasswordInput(DEFAULT_PRINCIPAL_PASSWORD);
                        } else {
                          setPrincipalPasswordInput('');
                        }
                        setPrincipalLoginError('');
                      }}
                      style={{ color: frontendConfig.accentColor }}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer shrink-0 self-start sm:self-center"
                    >
                      {!principalAccount?.hasCustomPassword ? 'Fill Credentials' : 'Fill Username'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-[#CBD8EC] overflow-hidden shadow-xs">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#1E3A8A] via-[#0F766E] to-[#D97706]" />
                <div className="bg-gradient-to-r from-[#EFF6FF] via-white to-[#FFFBEB] px-6 py-5 border-b border-[#DCE4F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#475569]">
                      <span className="font-semibold text-[#1E3A8A]">
                        Principal Oversight Privilege
                      </span>{' '}
                      · Full Cross-Faculty Document Access · Account:{' '}
                      <span className="font-mono font-semibold text-[#111315]">
                        @{principalSession.username}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#172554]">
                      Dr. Elena Vance — School Principal
                    </h3>
                    <p className="text-xs text-[#475569]">
                      Inspect, endorse, or request revisions on all syllabi, lab protocols,
                      rubrics, and parent notices uploaded by every teacher.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onPrincipalLogout()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#172554] bg-white hover:bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg cursor-pointer self-start md:self-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Principal Cross-Faculty KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#DCE4F0] divide-y sm:divide-y-0 sm:divide-x divide-[#DCE4F0]">
                  <div className="p-5 space-y-1 bg-[#F8FAFC]">
                    <div className="text-xs font-medium text-[#334155]">Total Teacher Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#0F172A] tabular-nums">
                      {uploadedDocuments.length}
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#EFF6FF]/85">
                    <div className="text-xs font-medium text-[#1E40AF]">Pending Review</div>
                    <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums">
                      {
                        uploadedDocuments.filter((d) => d.principalReviewStatus === 'Pending Review')
                          .length
                      }
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#ECFDF5]/85">
                    <div className="text-xs font-medium text-[#065F46]">Approved</div>
                    <div className="font-display text-2xl font-semibold text-[#047857] tabular-nums">
                      {ao2EndorsedDocs.length}
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-[#FFFBEB]/85">
                    <div className="text-xs font-medium text-[#92400E]">Needs Revision</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {
                        uploadedDocuments.filter((d) => d.principalReviewStatus === 'Needs Revision')
                          .length
                      }
                    </div>
                  </div>
                </div>

                {/* Principal Navigation Tabs */}
                <div className="px-6 pt-4 border-b border-[#E2E5E9] bg-white flex flex-wrap gap-2">
                  {[
                    {
                      id: 'documents' as PrincipalTab,
                      label: `All Teacher Documents (${uploadedDocuments.length})`,
                    },
                    { id: 'security' as PrincipalTab, label: 'Account & Password' },
                  ].map((tab) => {
                    const active = principalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPrincipalTab(tab.id)}
                        style={
                          active
                            ? {
                                borderBottomColor: frontendConfig.accentColor,
                                color: frontendConfig.accentColor,
                              }
                            : undefined
                        }
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? ''
                            : 'border-transparent text-[#525866] hover:text-[#111315]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {principalTab === 'security' ? (
                  <div className="p-6">
                    <div className="max-w-xl bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                      <div className="space-y-1">
                        <div
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: frontendConfig.accentColor }}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Principal Account Security</span>
                        </div>
                        <h4 className="font-display text-lg font-semibold text-[#111315]">
                          Change Principal Password (@{principalSession.username})
                        </h4>
                        <p className="text-xs text-[#525866]">
                          Update the password required to enter the Principal&apos;s Office portal.
                        </p>
                      </div>

                      <form onSubmit={handlePrincipalChangePasswordSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={principalCurPass}
                            onChange={(e) => setPrincipalCurPass(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1">
                              New Password (min 6 chars)
                            </label>
                            <input
                              type="password"
                              value={principalNewPass}
                              onChange={(e) => setPrincipalNewPass(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={principalConfirmPass}
                              onChange={(e) => setPrincipalConfirmPass(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                        </div>
                        {principalPassErr && (
                          <p className="text-xs text-[#B91C1C] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{principalPassErr}</span>
                          </p>
                        )}
                        {principalPassOk && (
                          <p className="text-xs text-[#047857] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{principalPassOk}</span>
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isChangingPrincipalPass}
                          style={{ backgroundColor: frontendConfig.accentColor }}
                          className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {isChangingPrincipalPass ? 'Updating...' : 'Update Principal Password'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (

                <div className="p-6 space-y-6">
                  {/* Filters across ALL Teachers */}
                  <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={principalTeacherFilter}
                        onChange={(e) => setPrincipalTeacherFilter(e.target.value)}
                        aria-label="Filter by teacher"
                        className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                      >
                        <option value="ALL">All Teachers ({uploadedDocuments.length})</option>
                        {TEACHER_PORTAL_PROFILES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={principalCategoryFilter}
                        onChange={(e) => setPrincipalCategoryFilter(e.target.value)}
                        aria-label="Filter by document category"
                        className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="Syllabus">Syllabus</option>
                        <option value="Lab Handout">Lab Handout</option>
                        <option value="Study Guide">Study Guide</option>
                        <option value="Parent Notice">Parent Notice</option>
                        <option value="Assessment Rubric">Assessment Rubric</option>
                      </select>

                      <select
                        value={principalStatusFilter}
                        onChange={(e) =>
                          setPrincipalStatusFilter(
                            e.target.value as 'ALL' | PrincipalDocumentStatus
                          )
                        }
                        aria-label="Filter by review status"
                        className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                      >
                        <option value="ALL">All Review Statuses</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Needs Revision">Needs Revision</option>
                      </select>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={principalSearch}
                        onChange={(e) => setPrincipalSearch(e.target.value)}
                        placeholder="Search title, file, or content..."
                        className="w-full lg:w-64 pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                      />
                    </div>
                  </div>

                  {principalFilteredDocs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#E2E5E9] p-10 text-center space-y-3">
                      <p className="text-sm font-medium text-[#111315]">
                        No teacher documents match the active filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPrincipalTeacherFilter('ALL');
                          setPrincipalCategoryFilter('ALL');
                          setPrincipalStatusFilter('ALL');
                          setPrincipalSearch('');
                        }}
                        style={{ backgroundColor: frontendConfig.accentColor }}
                        className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                        {principalFilteredDocs.map((doc) => {
                          const teacher = TEACHER_PORTAL_PROFILES.find(
                            (t) => t.id === doc.teacherId
                          );
                          const isSelected = inspectedPrincipalDoc?.id === doc.id;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedPrincipalDocId(doc.id);
                                setPrincipalReviewFeedback(null);
                              }}
                              className={`w-full text-left p-4 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                                isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8F9FA]'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] text-[#525866]">
                                  <span className="font-semibold text-[#111315]">
                                    {teacher?.name ?? 'Faculty Member'}
                                  </span>{' '}
                                  · {doc.category}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                                    doc.principalReviewStatus === 'Approved' ||
                                    doc.principalReviewStatus === 'Endorsed/Principal'
                                      ? 'bg-[#ECFDF5] text-[#047857]'
                                      : doc.principalReviewStatus === 'Needs Revision'
                                      ? 'bg-[#FEF3C7] text-[#B45309]'
                                      : 'bg-[#EFF6FF] text-[#1E3A8A]'
                                  }`}
                                >
                                  {(doc.principalReviewStatus === 'Approved' ||
                                    doc.principalReviewStatus === 'Endorsed/Principal') && (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  {doc.principalReviewStatus === 'Needs Revision' && (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  {doc.principalReviewStatus === 'Pending Review' && (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  <span>
                                    {doc.principalReviewStatus === 'Endorsed/Principal'
                                      ? 'Approved'
                                      : doc.principalReviewStatus}
                                  </span>
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-[#111315]">{doc.title}</div>
                              <div className="flex items-center justify-between gap-2 text-[11px] text-[#525866]">
                                <span className="font-mono truncate">
                                  {doc.fileName} ({doc.fileSizeLabel})
                                </span>
                                <span className="inline-flex items-center gap-1 font-semibold text-[#111315] shrink-0">
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {inspectedPrincipalDoc && (
                        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                          {(() => {
                            const author = TEACHER_PORTAL_PROFILES.find(
                              (t) => t.id === inspectedPrincipalDoc.teacherId
                            );
                            const fileExt = inspectedPrincipalDoc.fileName
                              .toLowerCase()
                              .split('.')
                              .pop();
                            const isImageFile =
                              fileExt === 'png' ||
                              fileExt === 'jpg' ||
                              fileExt === 'jpeg' ||
                              fileExt === 'webp';
                            const isInlineFrameFile =
                              fileExt === 'pdf' ||
                              fileExt === 'txt' ||
                              fileExt === 'csv' ||
                              fileExt === 'md';
                            const fileViewUrl = `/api/documents/${encodeURIComponent(
                              inspectedPrincipalDoc.id
                            )}/file?principalToken=${encodeURIComponent(principalSession.token)}`;
                            const fileDownloadUrl = `${fileViewUrl}&download=1`;

                            return (
                              <>
                                <div className="border-b border-[#E2E5E9] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="text-xs text-[#525866]">
                                      {inspectedPrincipalDoc.category} ·{' '}
                                      {inspectedPrincipalDoc.targetCourse} ·{' '}
                                      {inspectedPrincipalDoc.uploadedAt}
                                    </div>
                                    <h4 className="font-display text-xl font-semibold text-[#111315]">
                                      {inspectedPrincipalDoc.title}
                                    </h4>
                                    <p className="text-xs text-[#525866]">
                                      Submitted by{' '}
                                      <span className="font-semibold text-[#111315]">
                                        {author?.name}
                                      </span>{' '}
                                      ({author?.department})
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md self-start ${
                                        inspectedPrincipalDoc.principalReviewStatus === 'Approved' ||
                                        inspectedPrincipalDoc.principalReviewStatus ===
                                          'Endorsed/Principal'
                                          ? 'bg-[#ECFDF5] text-[#047857]'
                                          : inspectedPrincipalDoc.principalReviewStatus ===
                                            'Needs Revision'
                                          ? 'bg-[#FEF3C7] text-[#B45309]'
                                          : 'bg-[#EFF6FF] text-[#1E3A8A]'
                                      }`}
                                    >
                                      {inspectedPrincipalDoc.principalReviewStatus ===
                                      'Endorsed/Principal'
                                        ? 'Approved'
                                        : inspectedPrincipalDoc.principalReviewStatus}
                                    </span>
                                  </div>
                                </div>

                                {/* Document Content Viewer */}
                                <div className="rounded-xl border border-[#DCE0E6] bg-[#F8F9FA] overflow-hidden">
                                  <div className="px-4 py-2.5 bg-white border-b border-[#E2E5E9] flex flex-wrap items-center justify-between gap-2">
                                    <div className="inline-flex items-center gap-1 p-0.5 bg-[#F2F4F6] rounded-md border border-[#E2E5E9]">
                                      <button
                                        type="button"
                                        onClick={() => setPrincipalContentMode('content')}
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                                          principalContentMode === 'content'
                                            ? 'bg-white text-[#111315] shadow-xs'
                                            : 'text-[#525866]'
                                        }`}
                                      >
                                        Document Content
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPrincipalContentMode('file')}
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                                          principalContentMode === 'file'
                                            ? 'bg-white text-[#111315] shadow-xs'
                                            : 'text-[#525866]'
                                        }`}
                                      >
                                        File Preview ({fileExt?.toUpperCase() || 'FILE'})
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setPrincipalModalOpen(true)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-md cursor-pointer"
                                      >
                                        <Maximize2 className="w-3 h-3" />
                                        <span>Expand View</span>
                                      </button>
                                      <a
                                        href={fileDownloadUrl}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-md"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Download</span>
                                      </a>
                                    </div>
                                  </div>

                                  {principalContentMode === 'content' ? (
                                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                                      <div className="text-xs text-[#525866] bg-white px-3 py-2 rounded-lg border border-[#E2E5E9]">
                                        <span className="font-semibold text-[#111315]">
                                          Teacher Summary:{' '}
                                        </span>
                                        {inspectedPrincipalDoc.notes}
                                      </div>

                                      {inspectedPrincipalDoc.documentContent ? (
                                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#111315] bg-white p-4 rounded-lg border border-[#E2E5E9]">
                                          {inspectedPrincipalDoc.documentContent}
                                        </pre>
                                      ) : isImageFile ? (
                                        <div className="bg-white p-3 rounded-lg border border-[#E2E5E9]">
                                          <img
                                            src={fileViewUrl}
                                            alt={inspectedPrincipalDoc.title}
                                            className="max-h-64 mx-auto rounded object-contain"
                                          />
                                        </div>
                                      ) : (
                                        <div className="bg-white p-4 rounded-lg border border-[#E2E5E9] text-xs text-[#525866] space-y-2">
                                          <p>
                                            Attached binary file:{' '}
                                            <span className="font-mono font-semibold text-[#111315]">
                                              {inspectedPrincipalDoc.fileName}
                                            </span>{' '}
                                            ({inspectedPrincipalDoc.fileSizeLabel})
                                          </p>
                                          <p>
                                            Switch to <strong>File Preview</strong> or click{' '}
                                            <strong>Download</strong> above to inspect the file
                                            contents.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-4 bg-white">
                                      {isImageFile ? (
                                        <img
                                          src={fileViewUrl}
                                          alt={inspectedPrincipalDoc.title}
                                          className="max-h-80 mx-auto rounded-lg object-contain border border-[#E2E5E9]"
                                        />
                                      ) : isInlineFrameFile ? (
                                        <iframe
                                          title={`Preview of ${inspectedPrincipalDoc.title}`}
                                          src={fileViewUrl}
                                          className="w-full h-80 rounded-lg border border-[#E2E5E9] bg-white"
                                        />
                                      ) : (
                                        <div className="py-10 px-4 text-center space-y-3">
                                          <FileText className="w-8 h-8 mx-auto text-[#525866]" />
                                          <p className="text-xs text-[#525866]">
                                            Browser inline preview is unavailable for{' '}
                                            <span className="font-mono font-semibold text-[#111315]">
                                              .{fileExt}
                                            </span>{' '}
                                            files. Download the original file or inspect the
                                            Document Content tab.
                                          </p>
                                          <a
                                            href={fileDownloadUrl}
                                            style={{ backgroundColor: frontendConfig.accentColor }}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download {inspectedPrincipalDoc.fileName}</span>
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {inspectedPrincipalDoc.principalNote && (
                                  <div className="bg-[#F8F9FA] rounded-lg border border-[#E2E5E9] p-3 text-xs text-[#525866]">
                                    <span className="font-semibold text-[#111315] block mb-0.5">
                                      Recorded Principal Remark:
                                    </span>
                                    {inspectedPrincipalDoc.principalNote}
                                  </div>
                                )}

                                {/* Principal Approval & Revision Controls */}
                                <div className="space-y-3 pt-3 border-t border-[#E2E5E9]">
                                  <div className="flex items-center justify-between">
                                    <label
                                      htmlFor="principal-review-note"
                                      className="text-xs font-semibold text-[#111315]"
                                    >
                                      Principal Review Decision &amp; Remarks
                                    </label>
                                    {inspectedPrincipalDoc.principalReviewStatus !==
                                      'Pending Review' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handlePrincipalReviewAction(
                                            inspectedPrincipalDoc.id,
                                            'Pending Review'
                                          )
                                        }
                                        className="text-[11px] text-[#525866] hover:text-[#111315] underline cursor-pointer"
                                      >
                                        Reset to Pending Review
                                      </button>
                                    )}
                                  </div>

                                  <textarea
                                    id="principal-review-note"
                                    rows={2}
                                    value={principalNoteDraft}
                                    onChange={(e) => setPrincipalNoteDraft(e.target.value)}
                                    placeholder="Enter approval remarks or specific revision instructions for the teacher..."
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />

                                  {principalReviewFeedback && (
                                    <p
                                      className={`text-xs flex items-center gap-1.5 ${
                                        principalReviewFeedback.kind === 'error'
                                          ? 'text-[#B91C1C]'
                                          : 'text-[#047857]'
                                      }`}
                                    >
                                      {principalReviewFeedback.kind === 'error' ? (
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      <span>{principalReviewFeedback.message}</span>
                                    </p>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handlePrincipalReviewAction(
                                          inspectedPrincipalDoc.id,
                                          'Approved'
                                        )
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065F46] rounded-lg cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Approve Document</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handlePrincipalReviewAction(
                                          inspectedPrincipalDoc.id,
                                          'Needs Revision'
                                        )
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] rounded-lg cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      <span>Need for Revision</span>
                                    </button>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Document Content Viewer Modal for Principal */}
                  {principalModalOpen && inspectedPrincipalDoc && (
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Full document view: ${inspectedPrincipalDoc.title}`}
                      className="fixed inset-0 z-50 bg-[#0B1426]/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
                    >
                      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[#E2E5E9] shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs text-[#525866]">
                              {inspectedPrincipalDoc.category} ·{' '}
                              {inspectedPrincipalDoc.targetCourse} ·{' '}
                              {inspectedPrincipalDoc.fileName} (
                              {inspectedPrincipalDoc.fileSizeLabel})
                            </div>
                            <h4 className="font-display text-xl font-semibold text-[#111315]">
                              {inspectedPrincipalDoc.title}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPrincipalModalOpen(false)}
                            aria-label="Close document viewer"
                            className="p-2 rounded-lg border border-[#E2E5E9] text-[#525866] hover:text-[#111315] hover:bg-[#F8F9FA] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA] space-y-4">
                          {(() => {
                            const modalExt = inspectedPrincipalDoc.fileName
                              .toLowerCase()
                              .split('.')
                              .pop();
                            const modalIsImage =
                              modalExt === 'png' ||
                              modalExt === 'jpg' ||
                              modalExt === 'jpeg' ||
                              modalExt === 'webp';
                            const modalIsFrame =
                              modalExt === 'pdf' ||
                              modalExt === 'txt' ||
                              modalExt === 'csv' ||
                              modalExt === 'md';
                            const modalUrl = `/api/documents/${encodeURIComponent(
                              inspectedPrincipalDoc.id
                            )}/file?principalToken=${encodeURIComponent(principalSession.token)}`;

                            return (
                              <>
                                {inspectedPrincipalDoc.documentContent && (
                                  <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-2">
                                    <div className="text-xs font-semibold text-[#525866]">
                                      Submitted Document Text
                                    </div>
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#111315]">
                                      {inspectedPrincipalDoc.documentContent}
                                    </pre>
                                  </div>
                                )}

                                {modalIsImage && (
                                  <div className="bg-white rounded-xl border border-[#E2E5E9] p-4">
                                    <img
                                      src={modalUrl}
                                      alt={inspectedPrincipalDoc.title}
                                      className="max-h-[460px] mx-auto rounded object-contain"
                                    />
                                  </div>
                                )}

                                {modalIsFrame && (
                                  <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                                    <div className="px-4 py-2 border-b border-[#E2E5E9] text-xs font-semibold text-[#525866]">
                                      Attached File Rendering ({inspectedPrincipalDoc.fileName})
                                    </div>
                                    <iframe
                                      title={`Full view of ${inspectedPrincipalDoc.title}`}
                                      src={modalUrl}
                                      className="w-full h-[460px] bg-white"
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="px-6 py-4 border-t border-[#E2E5E9] bg-white space-y-3">
                          <textarea
                            rows={2}
                            value={principalNoteDraft}
                            onChange={(e) => setPrincipalNoteDraft(e.target.value)}
                            placeholder="Record approval note or required revisions before saving..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <a
                              href={`/api/documents/${encodeURIComponent(
                                inspectedPrincipalDoc.id
                              )}/file?principalToken=${encodeURIComponent(
                                principalSession.token
                              )}&download=1`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Original File</span>
                            </a>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await handlePrincipalReviewAction(
                                    inspectedPrincipalDoc.id,
                                    'Needs Revision'
                                  );
                                  setPrincipalModalOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] rounded-lg cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Need for Revision</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handlePrincipalReviewAction(
                                    inspectedPrincipalDoc.id,
                                    'Approved'
                                  );
                                  setPrincipalModalOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065F46] rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve Document</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ROLE 3: AO-II ADMINISTRATOR CONSOLE (USERNAME & PASSWORD PROTECTED)
           ============================================================ */}
        {roleWorkspace === 'ao2' && (
          <div className="space-y-6">
            {!ao2Session ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 bg-[#F8F9FA] rounded-2xl border border-[#E2E5E9] p-8 space-y-6">
                  <div className="space-y-1.5">
                    <div
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: frontendConfig.accentColor }}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Administrative Officer II Authentication</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#111315]">
                      AO-II Admin Console Sign In
                    </h3>
                    <p className="text-sm text-[#525866]">
                      Sign in with your AO-II administrator username and password to manage all
                      front-end website settings, back-end upload policies, seat capacities, and
                      staff credentials.
                    </p>
                  </div>

                  <form onSubmit={handleAo2CredentialSignIn} className="space-y-4">
                    <div>
                      <label
                        htmlFor="ao2-username-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        AO-II Username
                      </label>
                      <input
                        id="ao2-username-login"
                        type="text"
                        autoComplete="username"
                        value={ao2UsernameInput}
                        onChange={(e) => {
                          setAo2UsernameInput(e.target.value);
                          setAo2LoginError('');
                        }}
                        placeholder="e.g., ao2.admin"
                        className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ao2-password-login"
                        className="block text-xs font-semibold text-[#111315] mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="ao2-password-login"
                          type={showAo2Password ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={ao2PasswordInput}
                          onChange={(e) => {
                            setAo2PasswordInput(e.target.value);
                            setAo2LoginError('');
                          }}
                          placeholder="Enter AO-II administrator password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-[#DCE0E6] bg-white text-[#111315]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAo2Password((prev) => !prev)}
                          aria-label={showAo2Password ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#525866] hover:text-[#111315] cursor-pointer"
                        >
                          {showAo2Password ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {ao2LoginError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{ao2LoginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAo2SigningIn}
                      style={{ backgroundColor: frontendConfig.accentColor }}
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      {isAo2SigningIn ? 'Verifying AO-II Credentials...' : 'Sign In to AO-II Console'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E5E9] p-8 space-y-5">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#525866]">
                      AO-II Administrator Credential Reference
                    </div>
                    <h4 className="font-display text-xl font-semibold text-[#111315]">
                      Administrative Officer II (AO-II)
                    </h4>
                    <p className="text-xs text-[#525866]">
                      Full authority over public site front-end appearance, back-end limits,
                      enrollment capacities, and all portal accounts.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs font-mono">
                      <div className="text-[#111315]">
                        Username: <strong>{ao2Account?.username ?? 'ao2.admin'}</strong>
                      </div>
                      <div className="text-[#525866]">
                        Password:{' '}
                        {!ao2Account?.hasCustomPassword ? (
                          <strong className="text-[#111315]">{DEFAULT_AO2_PASSWORD}</strong>
                        ) : (
                          <span className="italic">Custom password set</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAo2UsernameInput(ao2Account?.username ?? 'ao2.admin');
                        if (!ao2Account?.hasCustomPassword) {
                          setAo2PasswordInput(DEFAULT_AO2_PASSWORD);
                        } else {
                          setAo2PasswordInput('');
                        }
                        setAo2LoginError('');
                      }}
                      style={{ color: frontendConfig.accentColor }}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer shrink-0 self-start sm:self-center"
                    >
                      {!ao2Account?.hasCustomPassword ? 'Fill Credentials' : 'Fill Username'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#F6FAF7]/95 backdrop-blur-xs rounded-2xl border border-[#C7DBD0] overflow-hidden shadow-xs">
                <div className="bg-gradient-to-r from-[#0B2B20] via-[#113A2C] to-[#15394D] px-6 py-5 border-b border-[#1E4D3B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#C8E4D6]">
                      <span className="font-semibold text-[#6EE7B7]">
                        Administrative Officer II (AO-II)
                      </span>{' '}
                      · Full Front-End &amp; Back-End System Authority · Account:{' '}
                      <span className="font-mono font-semibold text-white">
                        @{ao2Session.username}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-white">
                      AO-II Web &amp; System Configuration Console
                    </h3>
                    <p className="text-xs text-[#D1E6DC]">
                      Changes saved here persist via Express API and update the live school website
                      immediately.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => void handleExportBackup()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/12 hover:bg-white/20 border border-white/25 rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onResetSystemDefaults();
                        setAo2SaveMessage('Restored all front-end & back-end settings to defaults.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/12 hover:bg-white/20 border border-white/25 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onAo2Logout()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0B291E] bg-white hover:bg-[#ECFDF5] border border-white rounded-lg cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* AO-II Top KPI Summary Strip (Students, Teachers, Endorsed Documents) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#D2E2D9] divide-y sm:divide-y-0 sm:divide-x divide-[#D2E2D9]">
                  <div className="p-5 space-y-1 bg-gradient-to-br from-white to-[#ECFDF5]">
                    <div className="text-xs font-semibold text-[#166534]">
                      Number of Students ({backendConfig.activeAcademicYear})
                    </div>
                    <div className="font-display text-2xl font-semibold text-[#0B291E] tabular-nums">
                      {ao2SchoolTotals.totalStudents}
                    </div>
                    <div className="text-[11px] text-[#15803D] font-mono tabular-nums font-medium">
                      {ao2SchoolTotals.totalCapacity} total seats · {ao2SchoolTotals.totalSections} sections
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-gradient-to-br from-white to-[#EFF6FF]">
                    <div className="text-xs font-semibold text-[#1E40AF]">Number of Teachers</div>
                    <div className="font-display text-2xl font-semibold text-[#172554] tabular-nums">
                      {ao2SchoolTotals.totalTeachers}
                    </div>
                    <div className="text-[11px] text-[#1D4ED8] font-mono tabular-nums font-medium">
                      {ao2SchoolTotals.ratio} : 1 pupil-teacher ratio
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-gradient-to-br from-white to-[#F0FDFA]">
                    <div className="text-xs font-semibold text-[#115E59]">Endorsed Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#0F766E] tabular-nums">
                      {ao2EndorsedDocs.length}
                    </div>
                    <div className="text-[11px] text-[#0F766E] font-medium">
                      Endorsed/Principal ready to print
                    </div>
                  </div>
                  <div className="p-5 space-y-1 bg-gradient-to-br from-white to-[#FFFBEB]">
                    <div className="text-xs font-semibold text-[#92400E]">Parents/Guardian Inquiries</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {admissionsSubmissions.length}
                    </div>
                    <div className="text-[11px] text-[#B45309] font-medium">
                      {backendConfig.admissionsOpen ? 'Inquiry Form Open' : 'Inquiry Form Paused'}
                    </div>
                  </div>
                </div>

                {/* AO-II Navigation Tabs */}
                <div className="px-6 pt-4 border-b border-[#E2E5E9] bg-white flex flex-wrap gap-2">
                  {[
                    { id: 'dashboard' as Ao2Tab, label: 'AO-II Dashboard' },
                    {
                      id: 'endorsed' as Ao2Tab,
                      label: `Endorsed Docs (${ao2EndorsedDocs.length})`,
                    },
                    { id: 'frontend' as Ao2Tab, label: 'Front-End Settings' },
                    { id: 'backend' as Ao2Tab, label: 'Back-End & Capacity Controls' },
                    {
                      id: 'accounts' as Ao2Tab,
                      label: `Staff & Portal Accounts (${teacherAccounts.length + 2})`,
                    },
                    {
                      id: 'admissions' as Ao2Tab,
                      label: `Parent Inquiries (${admissionsSubmissions.length})`,
                    },
                    { id: 'audit' as Ao2Tab, label: `System Audit Log (${auditLog.length})` },
                  ].map((tab) => {
                    const active = ao2Tab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setAo2Tab(tab.id);
                          setAo2SaveMessage('');
                          setAo2ErrorMessage('');
                        }}
                        style={
                          active
                            ? {
                                borderBottomColor: frontendConfig.accentColor,
                                color: frontendConfig.accentColor,
                              }
                            : undefined
                        }
                        className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? ''
                            : 'border-transparent text-[#525866] hover:text-[#111315]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6 space-y-4">
                  {ao2SaveMessage && (
                    <div
                      role="status"
                      className="bg-white rounded-xl border border-[#047857] px-4 py-3 text-xs font-medium text-[#047857] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{ao2SaveMessage}</span>
                    </div>
                  )}
                  {ao2ErrorMessage && (
                    <div
                      role="alert"
                      className="bg-white rounded-xl border border-[#B91C1C] px-4 py-3 text-xs font-medium text-[#B91C1C] flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{ao2ErrorMessage}</span>
                    </div>
                  )}

                  {/* AO-II TAB 0: OVERVIEW DASHBOARD (ENDORSED DOCS, TEACHERS, STUDENTS) */}
                  {ao2Tab === 'dashboard' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Endorsed Documents Queue Overview */}
                        <div className="lg:col-span-6 bg-white rounded-xl border border-[#CBE0D3] overflow-hidden shadow-xs">
                          <div className="px-5 py-4 bg-gradient-to-r from-[#ECFDF5] to-[#F6FAF8] border-b border-[#D2E4D9] flex items-center justify-between gap-3">
                            <div>
                              <h4 className="font-display text-lg font-semibold text-[#111315]">
                                Principal-Endorsed Documents
                              </h4>
                              <p className="text-xs text-[#525866]">
                                Automatically forwarded upon Principal approval as{' '}
                                <strong>Endorsed/Principal</strong>.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAo2Tab('endorsed')}
                              style={{ color: frontendConfig.accentColor }}
                              className="text-xs font-semibold hover:underline underline-offset-4 cursor-pointer shrink-0"
                            >
                              Open Full Archive ({ao2EndorsedDocs.length})
                            </button>
                          </div>

                          {ao2EndorsedDocs.length === 0 ? (
                            <p className="p-8 text-center text-xs text-[#525866]">
                              No documents have been endorsed by the Principal yet.
                            </p>
                          ) : (
                            <div className="divide-y divide-[#E2E5E9]">
                              {ao2EndorsedDocs.map((doc) => {
                                const author = TEACHER_PORTAL_PROFILES.find(
                                  (t) => t.id === doc.teacherId
                                );
                                return (
                                  <div
                                    key={doc.id}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA]"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#D1FAE5] text-[#065F46]">
                                          <Award className="w-3 h-3" />
                                          <span>Endorsed/Principal</span>
                                        </span>
                                        <span className="text-[11px] text-[#525866]">
                                          {doc.category} · {doc.endorsedAt ?? doc.uploadedAt}
                                        </span>
                                      </div>
                                      <div className="text-sm font-semibold text-[#111315] truncate">
                                        {doc.title}
                                      </div>
                                      <div className="text-[11px] text-[#525866]">
                                        {author?.name ?? 'Faculty Member'} · {doc.targetCourse}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedAo2DocId(doc.id);
                                          setAo2Tab('endorsed');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePrintEndorsedDocument(doc)}
                                        style={{ backgroundColor: frontendConfig.accentColor }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Print</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Grade-Level Students & Teachers Breakdown */}
                        <div className="lg:col-span-6 bg-white rounded-xl border border-[#C7D9EE] overflow-hidden shadow-xs">
                          <div className="px-5 py-4 bg-gradient-to-r from-[#EFF6FF] to-[#F4F8FD] border-b border-[#D4E2F2] flex items-center justify-between gap-3">
                            <div>
                              <h4 className="font-display text-lg font-semibold text-[#111315]">
                                Students &amp; Teachers by Grade Level
                              </h4>
                              <p className="text-xs text-[#525866]">
                                Active School Year {backendConfig.activeAcademicYear} ·{' '}
                                {ao2SchoolTotals.totalStudents} Students ·{' '}
                                {ao2SchoolTotals.totalTeachers} Teachers
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAo2Tab('backend')}
                              style={{ color: frontendConfig.accentColor }}
                              className="text-xs font-semibold hover:underline underline-offset-4 cursor-pointer shrink-0"
                            >
                              Manage Capacities
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-[#E2E5E9] bg-[#F8F9FA] text-[11px] font-semibold text-[#525866]">
                                  <th className="py-2.5 px-4">Grade</th>
                                  <th className="py-2.5 px-3 text-right">Students</th>
                                  <th className="py-2.5 px-3 text-right">Capacity</th>
                                  <th className="py-2.5 px-3 text-right">Teachers</th>
                                  <th className="py-2.5 px-4">Faculty Lead</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {ao2SchoolTotals.activeRows.map((row) => (
                                  <tr key={row.id} className="hover:bg-[#F8F9FA]">
                                    <td className="py-2.5 px-4 font-semibold text-[#111315]">
                                      {row.gradeLabel}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#111315]">
                                      {row.enrolledStudents}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525866]">
                                      {row.capacity}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#111315]">
                                      {row.teachers}
                                    </td>
                                    <td className="py-2.5 px-4 text-[#525866]">{row.facultyLead}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-[#DCE0E6] bg-[#F8F9FA] font-semibold text-[#111315]">
                                  <td className="py-2.5 px-4">School Total</td>
                                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                    {ao2SchoolTotals.totalStudents}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525866]">
                                    {ao2SchoolTotals.totalCapacity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                    {ao2SchoolTotals.totalTeachers}
                                  </td>
                                  <td className="py-2.5 px-4 text-[11px] text-[#525866]">
                                    {ao2SchoolTotals.totalSections} total sections
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* AO-II School Inventory List */}
                      <div className="bg-white rounded-xl border border-[#E7DCC4] overflow-hidden shadow-xs">
                        <div className="px-5 py-4 bg-gradient-to-r from-[#FFFBEB] via-[#FEF9EE] to-[#F7FAF8] border-b border-[#EADFC6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              style={{ backgroundColor: `${frontendConfig.accentColor}14` }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            >
                              <Package
                                className="w-4 h-4"
                                style={{ color: frontendConfig.accentColor }}
                              />
                            </div>
                            <div>
                              <h4 className="font-display text-lg font-semibold text-[#111315]">
                                School Inventory List
                              </h4>
                              <p className="text-xs text-[#525866]">
                                Property, equipment, and classroom supplies tracked by AO-II (Name of
                                Item, Qty, Status, Date Received, User, and Date Issued).
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handlePrintInventoryList}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Inventory</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddInventoryForm((prev) => !prev)}
                              style={{ backgroundColor: frontendConfig.accentColor }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{showAddInventoryForm ? 'Close Form' : 'Add Item'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inventory Summary Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#E2E5E9] bg-[#F8F9FA]/70 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E5E9]">
                          <div className="px-4 py-3">
                            <div className="text-[11px] text-[#525866]">Item Entries</div>
                            <div className="font-mono text-lg font-bold text-[#111315]">
                              {inventorySummary.totalEntries}
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="text-[11px] text-[#525866]">Total Units (Qty)</div>
                            <div className="font-mono text-lg font-bold text-[#111315]">
                              {inventorySummary.totalQty}
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="text-[11px] text-[#525866]">Available</div>
                            <div className="font-mono text-lg font-bold text-[#047857]">
                              {inventorySummary.availableCount}
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="text-[11px] text-[#525866]">Issued to Users</div>
                            <div className="font-mono text-lg font-bold text-[#1D4ED8]">
                              {inventorySummary.issuedCount}
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="text-[11px] text-[#525866]">Low Stock / Repair</div>
                            <div className="font-mono text-lg font-bold text-[#B45309]">
                              {inventorySummary.attentionCount}
                            </div>
                          </div>
                        </div>

                        {/* Add New Inventory Item Form */}
                        {showAddInventoryForm && (
                          <form
                            onSubmit={handleCreateInventoryItem}
                            className="p-5 bg-[#F8F9FA] border-b border-[#E2E5E9] space-y-4"
                          >
                            <div className="text-xs font-semibold text-[#111315]">
                              Add New Inventory Item
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                              <div className="lg:col-span-2">
                                <label
                                  htmlFor="inv-add-name"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  Name of Item
                                </label>
                                <input
                                  id="inv-add-name"
                                  type="text"
                                  required
                                  value={newInvName}
                                  onChange={(e) => setNewInvName(e.target.value)}
                                  placeholder="e.g., Grade 5 Math Manipulative Kit"
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="inv-add-qty"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  Qty
                                </label>
                                <input
                                  id="inv-add-qty"
                                  type="number"
                                  min={0}
                                  required
                                  value={newInvQty}
                                  onChange={(e) => setNewInvQty(e.target.value)}
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg font-mono focus:outline-none focus:border-[#111315]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="inv-add-status"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  Status
                                </label>
                                <select
                                  id="inv-add-status"
                                  value={newInvStatus}
                                  onChange={(e) =>
                                    setNewInvStatus(e.target.value as InventoryStatus)
                                  }
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                                >
                                  <option value="Available">Available</option>
                                  <option value="Issued">Issued</option>
                                  <option value="Low Stock">Low Stock</option>
                                  <option value="For Repair">For Repair</option>
                                  <option value="Condemned">Condemned</option>
                                </select>
                              </div>

                              <div>
                                <label
                                  htmlFor="inv-add-received"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  Date Received
                                </label>
                                <input
                                  id="inv-add-received"
                                  type="date"
                                  required
                                  value={newInvDateReceived}
                                  onChange={(e) => setNewInvDateReceived(e.target.value)}
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="inv-add-issued-date"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  Date Issued
                                </label>
                                <input
                                  id="inv-add-issued-date"
                                  type="date"
                                  value={newInvDateIssued}
                                  onChange={(e) => setNewInvDateIssued(e.target.value)}
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                                />
                              </div>

                              <div className="sm:col-span-2 lg:col-span-4">
                                <label
                                  htmlFor="inv-add-user"
                                  className="block text-[11px] font-semibold text-[#525866] mb-1"
                                >
                                  User (Issued To / Custodian)
                                </label>
                                <input
                                  id="inv-add-user"
                                  type="text"
                                  value={newInvUser}
                                  onChange={(e) => setNewInvUser(e.target.value)}
                                  placeholder="e.g., Ms. Mariel Sato · Kindergarten Sampaguita (leave blank for Supply Room)"
                                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                                />
                              </div>

                              <div className="lg:col-span-2 flex items-end gap-2">
                                <button
                                  type="submit"
                                  disabled={isSavingInventory}
                                  style={{ backgroundColor: frontendConfig.accentColor }}
                                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 disabled:opacity-60"
                                >
                                  {isSavingInventory ? 'Saving...' : 'Save Inventory Item'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddInventoryForm(false)}
                                  className="px-3 py-2 text-xs font-semibold text-[#525866] hover:text-[#111315] bg-white border border-[#DCE0E6] rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </form>
                        )}

                        {/* Search & Status Filter Toolbar */}
                        <div className="px-5 py-3 border-b border-[#E2E5E9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="relative flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={inventorySearch}
                              onChange={(e) => setInventorySearch(e.target.value)}
                              placeholder="Search item name, user, or date..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#DCE0E6] rounded-lg focus:outline-none focus:border-[#111315]"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {(
                              [
                                'ALL',
                                'Available',
                                'Issued',
                                'Low Stock',
                                'For Repair',
                                'Condemned',
                              ] as const
                            ).map((statusOption) => {
                              const active = inventoryStatusFilter === statusOption;
                              return (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => setInventoryStatusFilter(statusOption)}
                                  style={
                                    active
                                      ? {
                                          backgroundColor: frontendConfig.accentColor,
                                          borderColor: frontendConfig.accentColor,
                                        }
                                      : undefined
                                  }
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border cursor-pointer transition-colors ${
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
                        </div>

                        {/* Inventory Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-[#E2E5E9] bg-[#F8F9FA] text-[11px] font-semibold text-[#525866]">
                                <th className="py-2.5 px-4">Name of Item</th>
                                <th className="py-2.5 px-3 text-right">Qty</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Date Received</th>
                                <th className="py-2.5 px-3">User</th>
                                <th className="py-2.5 px-3">Date Issued</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E5E9]">
                              {filteredInventoryItems.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="py-8 px-4 text-center text-xs text-[#525866]"
                                  >
                                    No inventory items match the current search or status filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredInventoryItems.map((item) => {
                                  const isEditing = editingInventoryId === item.id;
                                  const statusBadgeClass =
                                    item.status === 'Available'
                                      ? 'bg-[#D1FAE5] text-[#065F46]'
                                      : item.status === 'Issued'
                                      ? 'bg-[#DBEAFE] text-[#1E40AF]'
                                      : item.status === 'Low Stock'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : item.status === 'For Repair'
                                      ? 'bg-[#FFEDD5] text-[#9A3412]'
                                      : 'bg-[#FEE2E2] text-[#991B1B]';

                                  if (isEditing) {
                                    return (
                                      <tr key={item.id} className="bg-[#F8F9FA]">
                                        <td className="py-2.5 px-4">
                                          <input
                                            type="text"
                                            value={editInvDraft.itemName}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                itemName: e.target.value,
                                              }))
                                            }
                                            className="w-full min-w-[180px] px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <input
                                            type="number"
                                            min={0}
                                            value={editInvDraft.quantity}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                quantity: Number(e.target.value),
                                              }))
                                            }
                                            className="w-16 px-2 py-1 text-xs text-right font-mono bg-white border border-[#DCE0E6] rounded"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <select
                                            value={editInvDraft.status}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                status: e.target.value as InventoryStatus,
                                              }))
                                            }
                                            className="px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                          >
                                            <option value="Available">Available</option>
                                            <option value="Issued">Issued</option>
                                            <option value="Low Stock">Low Stock</option>
                                            <option value="For Repair">For Repair</option>
                                            <option value="Condemned">Condemned</option>
                                          </select>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <input
                                            type="date"
                                            value={editInvDraft.dateReceived}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                dateReceived: e.target.value,
                                              }))
                                            }
                                            className="px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <input
                                            type="text"
                                            value={editInvDraft.issuedToUser}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                issuedToUser: e.target.value,
                                              }))
                                            }
                                            className="w-full min-w-[160px] px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <input
                                            type="date"
                                            value={editInvDraft.dateIssued}
                                            onChange={(e) =>
                                              setEditInvDraft((prev) => ({
                                                ...prev,
                                                dateIssued: e.target.value,
                                              }))
                                            }
                                            className="px-2 py-1 text-xs bg-white border border-[#DCE0E6] rounded"
                                          />
                                        </td>
                                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={isSavingInventory}
                                              onClick={() => handleSaveEditInventory(item.id)}
                                              style={{ backgroundColor: frontendConfig.accentColor }}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded cursor-pointer"
                                            >
                                              <Check className="w-3 h-3" />
                                              <span>Save</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingInventoryId(null)}
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
                                    <tr key={item.id} className="hover:bg-[#F8F9FA]">
                                      <td className="py-2.5 px-4 font-semibold text-[#111315]">
                                        {item.itemName}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#111315]">
                                        {item.quantity}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span
                                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${statusBadgeClass}`}
                                        >
                                          {item.status}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono tabular-nums text-[#525866]">
                                        {item.dateReceived}
                                      </td>
                                      <td className="py-2.5 px-3 text-[#111315]">
                                        {item.issuedToUser}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono tabular-nums text-[#525866]">
                                        {item.dateIssued}
                                      </td>
                                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditInventory(item)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded cursor-pointer"
                                            title="Edit item"
                                          >
                                            <Pencil className="w-3 h-3" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteInventory(item.id)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded cursor-pointer"
                                            title="Delete item"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
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
                  )}

                  {/* AO-II TAB 1: FRONT-END SETTINGS */}
                  {ao2Tab === 'frontend' && (
                    <form
                      onSubmit={handleSaveFrontend}
                      className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                            School Name (Header &amp; Footer)
                          </label>
                          <input
                            type="text"
                            value={frontendDraft.schoolName}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, schoolName: e.target.value }))
                            }
                            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                            Hero Kicker Line
                          </label>
                          <input
                            type="text"
                            value={frontendDraft.taglineLocation}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, taglineLocation: e.target.value }))
                            }
                            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                          Home Page Hero Headline
                        </label>
                        <input
                          type="text"
                          value={frontendDraft.heroHeadline}
                          onChange={(e) =>
                            setFrontendDraft((p) => ({ ...p, heroHeadline: e.target.value }))
                          }
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                          Home Page Hero Description
                        </label>
                        <textarea
                          rows={2}
                          value={frontendDraft.heroLead}
                          onChange={(e) =>
                            setFrontendDraft((p) => ({ ...p, heroLead: e.target.value }))
                          }
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                            Home Page Educational Background Image
                          </label>
                          <select
                            value={frontendDraft.heroImage}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, heroImage: e.target.value }))
                            }
                            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          >
                            {HERO_PRESETS.map((preset) => (
                              <option key={preset.url} value={preset.url}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-[#111315] mb-1.5">
                            Site-Wide Primary Accent Color
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ACCENT_PRESETS.map((color) => {
                              const selected = frontendDraft.accentColor === color.hex;
                              return (
                                <button
                                  key={color.hex}
                                  type="button"
                                  onClick={() =>
                                    setFrontendDraft((p) => ({ ...p, accentColor: color.hex }))
                                  }
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                                    selected
                                      ? 'border-[#111315] bg-[#F2F4F6] text-[#111315]'
                                      : 'border-[#DCE0E6] bg-white text-[#525866]'
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  <span>{color.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#E2E5E9]">
                        <div className="space-y-2">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111315] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={frontendDraft.announcementEnabled}
                              onChange={(e) =>
                                setFrontendDraft((p) => ({
                                  ...p,
                                  announcementEnabled: e.target.checked,
                                }))
                              }
                            />
                            <span>Show Top Campus Announcement Banner</span>
                          </label>
                          <input
                            type="text"
                            value={frontendDraft.announcementText}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, announcementText: e.target.value }))
                            }
                            className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="block text-xs font-semibold text-[#111315]">
                            Public Website Section Visibility
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(
                              [
                                { key: 'academics', label: 'Academics & Divisions' },
                                { key: 'dashboard', label: 'Enrollment Dashboard' },
                                { key: 'campus', label: 'Campus Facilities' },
                                { key: 'admissions', label: 'Admissions Form' },
                              ] as const
                            ).map((sec) => (
                              <label
                                key={sec.key}
                                className="inline-flex items-center gap-2 text-[#111315] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={frontendDraft.visibleSections[sec.key]}
                                  onChange={(e) =>
                                    setFrontendDraft((p) => ({
                                      ...p,
                                      visibleSections: {
                                        ...p.visibleSections,
                                        [sec.key]: e.target.checked,
                                      },
                                    }))
                                  }
                                />
                                <span>{sec.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E2E5E9]">
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1">
                            Campus Address
                          </label>
                          <input
                            type="text"
                            value={frontendDraft.campusAddress}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, campusAddress: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1">
                            Admissions Phone
                          </label>
                          <input
                            type="text"
                            value={frontendDraft.admissionsPhone}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, admissionsPhone: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#111315] mb-1">
                            Admissions Email
                          </label>
                          <input
                            type="email"
                            value={frontendDraft.admissionsEmail}
                            onChange={(e) =>
                              setFrontendDraft((p) => ({ ...p, admissionsEmail: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          style={{ backgroundColor: frontendConfig.accentColor }}
                          className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                        >
                          Save Front-End Settings
                        </button>
                      </div>
                    </form>
                  )}

                  {/* AO-II TAB 2: BACK-END & CAPACITY CONTROLS */}
                  {ao2Tab === 'backend' && (
                    <div className="space-y-6">
                      <form
                        onSubmit={handleSaveBackend}
                        className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                              Default Academic Year
                            </label>
                            <select
                              value={backendDraft.activeAcademicYear}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  activeAcademicYear: e.target.value as AcademicYear,
                                }))
                              }
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            >
                              <option value="2026-2027">2026–2027</option>
                              <option value="2025-2026">2025–2026</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                              Max Teacher Upload Size (MB)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={250}
                              value={backendDraft.maxUploadSizeMb}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  maxUploadSizeMb: Math.max(
                                    1,
                                    Math.min(250, Number(e.target.value) || 1)
                                  ),
                                }))
                              }
                              className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1.5">
                              Allowed Upload File Extensions
                            </label>
                            <input
                              type="text"
                              value={extensionsText}
                              onChange={(e) => setExtensionsText(e.target.value)}
                              placeholder=".pdf, .docx, .csv, .xlsx"
                              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E2E5E9] text-xs">
                          <label className="inline-flex items-center gap-2 font-medium text-[#111315] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={backendDraft.admissionsOpen}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  admissionsOpen: e.target.checked,
                                }))
                              }
                            />
                            <span>Admissions Tour API Open</span>
                          </label>

                          <label className="inline-flex items-center gap-2 font-medium text-[#111315] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={backendDraft.teacherUploadsEnabled}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  teacherUploadsEnabled: e.target.checked,
                                }))
                              }
                            />
                            <span>Allow Teacher Document Uploads</span>
                          </label>

                          <label className="inline-flex items-center gap-2 font-medium text-[#111315] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={backendDraft.maintenanceMode}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  maintenanceMode: e.target.checked,
                                }))
                              }
                            />
                            <span>Enable Registrar Maintenance Notice</span>
                          </label>
                        </div>

                        {backendDraft.maintenanceMode && (
                          <div>
                            <label className="block text-xs font-semibold text-[#111315] mb-1">
                              Maintenance Banner Copy
                            </label>
                            <input
                              type="text"
                              value={backendDraft.maintenanceMessage}
                              onChange={(e) =>
                                setBackendDraft((p) => ({
                                  ...p,
                                  maintenanceMessage: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            style={{ backgroundColor: frontendConfig.accentColor }}
                            className="px-5 py-2.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                          >
                            Save Back-End Policies
                          </button>
                        </div>
                      </form>

                      {/* AO-II Grade Seat Capacity Overrides */}
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4">
                        <div>
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Grade Seat Capacity Controls ({backendConfig.activeAcademicYear})
                          </h4>
                          <p className="text-xs text-[#525866]">
                            Adjust maximum seat capacities per grade level; changes sync immediately
                            to the public Enrollment Dashboard.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                          {(enrollmentByYear[backendConfig.activeAcademicYear] ?? []).map((row) => (
                            <div
                              key={row.id}
                              className="p-3 rounded-lg border border-[#E2E5E9] bg-[#F8F9FA] space-y-1.5"
                            >
                              <div className="text-xs font-semibold text-[#111315]">
                                {row.gradeLabel}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-[#525866]">
                                Enrolled: {row.enrolledStudents}
                              </div>
                              <input
                                type="number"
                                min={10}
                                max={150}
                                value={row.capacity}
                                aria-label={`Seat capacity for ${row.gradeLabel}`}
                                onChange={(e) =>
                                  void onUpdateCapacity(
                                    backendConfig.activeAcademicYear,
                                    row.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-[#DCE0E6] bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AO-II TAB 3: PRINCIPAL-ENDORSED DOCUMENTS (VIEW & PRINT) */}
                  {ao2Tab === 'endorsed' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
                            <Award className="w-4 h-4" />
                            <span>Endorsed/Principal Document Archive</span>
                          </div>
                          <p className="text-xs text-[#525866]">
                            Documents approved or endorsed by the School Principal automatically
                            appear here as <strong>Endorsed/Principal</strong> for AO-II records,
                            viewing, and printing.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={ao2DocTeacherFilter}
                            onChange={(e) => setAo2DocTeacherFilter(e.target.value)}
                            aria-label="Filter endorsed documents by teacher"
                            className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                          >
                            <option value="ALL">All Teachers ({ao2EndorsedDocs.length})</option>
                            {TEACHER_PORTAL_PROFILES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>

                          <div className="relative">
                            <Search className="w-4 h-4 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="search"
                              value={ao2DocSearch}
                              onChange={(e) => setAo2DocSearch(e.target.value)}
                              placeholder="Search endorsed docs..."
                              className="w-full sm:w-56 pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                            />
                          </div>
                        </div>
                      </div>

                      {ao2FilteredEndorsedDocs.length === 0 ? (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] p-10 text-center space-y-2">
                          <p className="text-sm font-medium text-[#111315]">
                            No endorsed documents match your current filter.
                          </p>
                          <p className="text-xs text-[#525866]">
                            Once Dr. Elena Vance approves a teacher submission in the Principal&apos;s
                            Office portal, it will appear here automatically as{' '}
                            <strong>Endorsed/Principal</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                            {ao2FilteredEndorsedDocs.map((doc) => {
                              const teacher = TEACHER_PORTAL_PROFILES.find(
                                (t) => t.id === doc.teacherId
                              );
                              const isSelected = inspectedAo2Doc?.id === doc.id;
                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => setSelectedAo2DocId(doc.id)}
                                  className={`w-full text-left p-4 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                                    isSelected ? 'bg-[#ECFDF5]' : 'hover:bg-[#F8F9FA]'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] text-[#525866]">
                                      <span className="font-semibold text-[#111315]">
                                        {teacher?.name ?? 'Faculty Member'}
                                      </span>{' '}
                                      · {doc.category}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-[#D1FAE5] text-[#065F46]">
                                      <Award className="w-3 h-3" />
                                      <span>Endorsed/Principal</span>
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold text-[#111315]">
                                    {doc.title}
                                  </div>
                                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#525866]">
                                    <span className="font-mono truncate">
                                      {doc.fileName} · {doc.endorsedAt ?? doc.uploadedAt}
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-[#047857] shrink-0">
                                      <Eye className="w-3 h-3" />
                                      <span>View &amp; Print</span>
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {inspectedAo2Doc && (
                            <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                              {(() => {
                                const author = TEACHER_PORTAL_PROFILES.find(
                                  (t) => t.id === inspectedAo2Doc.teacherId
                                );
                                const fileExt = inspectedAo2Doc.fileName
                                  .toLowerCase()
                                  .split('.')
                                  .pop();
                                const isImageFile =
                                  fileExt === 'png' ||
                                  fileExt === 'jpg' ||
                                  fileExt === 'jpeg' ||
                                  fileExt === 'webp';
                                const isInlineFrameFile =
                                  fileExt === 'pdf' ||
                                  fileExt === 'txt' ||
                                  fileExt === 'csv' ||
                                  fileExt === 'md';
                                const ao2FileViewUrl = `/api/documents/${encodeURIComponent(
                                  inspectedAo2Doc.id
                                )}/file?ao2Token=${encodeURIComponent(ao2Session.token)}`;
                                const ao2FileDownloadUrl = `${ao2FileViewUrl}&download=1`;

                                return (
                                  <>
                                    <div className="border-b border-[#E2E5E9] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="text-xs text-[#525866]">
                                          {inspectedAo2Doc.category} ·{' '}
                                          {inspectedAo2Doc.targetCourse} · Endorsed{' '}
                                          {inspectedAo2Doc.endorsedAt ?? inspectedAo2Doc.uploadedAt}
                                        </div>
                                        <h4 className="font-display text-xl font-semibold text-[#111315]">
                                          {inspectedAo2Doc.title}
                                        </h4>
                                        <p className="text-xs text-[#525866]">
                                          Author:{' '}
                                          <span className="font-semibold text-[#111315]">
                                            {author?.name}
                                          </span>{' '}
                                          · Certified by{' '}
                                          <span className="font-semibold text-[#111315]">
                                            {inspectedAo2Doc.endorsedBy ??
                                              'Dr. Elena Vance (School Principal)'}
                                          </span>
                                        </p>
                                      </div>

                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md bg-[#D1FAE5] text-[#065F46] shrink-0 self-start">
                                        <Award className="w-3.5 h-3.5" />
                                        <span>Endorsed/Principal</span>
                                      </span>
                                    </div>

                                    {inspectedAo2Doc.principalNote && (
                                      <div className="bg-[#ECFDF5] rounded-lg border border-[#A7F3D0] p-3 text-xs text-[#065F46]">
                                        <span className="font-semibold block mb-0.5">
                                          Principal Endorsement Note:
                                        </span>
                                        {inspectedAo2Doc.principalNote}
                                      </div>
                                    )}

                                    <div className="rounded-xl border border-[#DCE0E6] bg-[#F8F9FA] overflow-hidden">
                                      <div className="px-4 py-2.5 bg-white border-b border-[#E2E5E9] flex flex-wrap items-center justify-between gap-2">
                                        <div className="inline-flex items-center gap-1 p-0.5 bg-[#F2F4F6] rounded-md border border-[#E2E5E9]">
                                          <button
                                            type="button"
                                            onClick={() => setAo2DocViewMode('content')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                                              ao2DocViewMode === 'content'
                                                ? 'bg-white text-[#111315] shadow-xs'
                                                : 'text-[#525866]'
                                            }`}
                                          >
                                            Document Content
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setAo2DocViewMode('file')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                                              ao2DocViewMode === 'file'
                                                ? 'bg-white text-[#111315] shadow-xs'
                                                : 'text-[#525866]'
                                            }`}
                                          >
                                            File Preview ({fileExt?.toUpperCase() || 'FILE'})
                                          </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setAo2DocModalOpen(true)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-md cursor-pointer"
                                          >
                                            <Maximize2 className="w-3 h-3" />
                                            <span>Expand View</span>
                                          </button>
                                          <a
                                            href={ao2FileDownloadUrl}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-md"
                                          >
                                            <Download className="w-3 h-3" />
                                            <span>Download</span>
                                          </a>
                                        </div>
                                      </div>

                                      {ao2DocViewMode === 'content' ? (
                                        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                                          <div className="text-xs text-[#525866] bg-white px-3 py-2 rounded-lg border border-[#E2E5E9]">
                                            <span className="font-semibold text-[#111315]">
                                              Teacher Summary:{' '}
                                            </span>
                                            {inspectedAo2Doc.notes}
                                          </div>

                                          {inspectedAo2Doc.documentContent ? (
                                            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#111315] bg-white p-4 rounded-lg border border-[#E2E5E9]">
                                              {inspectedAo2Doc.documentContent}
                                            </pre>
                                          ) : isImageFile ? (
                                            <div className="bg-white p-3 rounded-lg border border-[#E2E5E9]">
                                              <img
                                                src={ao2FileViewUrl}
                                                alt={inspectedAo2Doc.title}
                                                className="max-h-64 mx-auto rounded object-contain"
                                              />
                                            </div>
                                          ) : (
                                            <div className="bg-white p-4 rounded-lg border border-[#E2E5E9] text-xs text-[#525866]">
                                              Attached file:{' '}
                                              <span className="font-mono font-semibold text-[#111315]">
                                                {inspectedAo2Doc.fileName}
                                              </span>{' '}
                                              ({inspectedAo2Doc.fileSizeLabel}). Switch to{' '}
                                              <strong>File Preview</strong> or download above.
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="p-4 bg-white">
                                          {isImageFile ? (
                                            <img
                                              src={ao2FileViewUrl}
                                              alt={inspectedAo2Doc.title}
                                              className="max-h-80 mx-auto rounded-lg object-contain border border-[#E2E5E9]"
                                            />
                                          ) : isInlineFrameFile ? (
                                            <iframe
                                              title={`AO-II preview of ${inspectedAo2Doc.title}`}
                                              src={ao2FileViewUrl}
                                              className="w-full h-80 rounded-lg border border-[#E2E5E9] bg-white"
                                            />
                                          ) : (
                                            <div className="py-10 px-4 text-center space-y-3">
                                              <FileText className="w-8 h-8 mx-auto text-[#525866]" />
                                              <p className="text-xs text-[#525866]">
                                                Inline preview unavailable for .{fileExt}. Download or
                                                use Print Summary Sheet below.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E5E9]">
                                      <span className="font-mono text-[11px] text-[#525866]">
                                        {inspectedAo2Doc.fileName} · {inspectedAo2Doc.fileSizeLabel}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2.5">
                                        {isInlineFrameFile && (
                                          <button
                                            type="button"
                                            onClick={() => handlePrintAttachedFile(inspectedAo2Doc)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer"
                                          >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Print Attached {fileExt?.toUpperCase()}</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handlePrintEndorsedDocument(inspectedAo2Doc)}
                                          style={{ backgroundColor: frontendConfig.accentColor }}
                                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                          <span>Print Endorsed Document</span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {ao2DocModalOpen && inspectedAo2Doc && (
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-label={`AO-II full view: ${inspectedAo2Doc.title}`}
                          className="fixed inset-0 z-50 bg-[#0B1426]/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
                        >
                          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[#E2E5E9] shadow-2xl flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded">
                                  <Award className="w-3 h-3" />
                                  <span>Endorsed/Principal</span>
                                </div>
                                <h4 className="font-display text-xl font-semibold text-[#111315]">
                                  {inspectedAo2Doc.title}
                                </h4>
                                <p className="text-xs text-[#525866]">
                                  {inspectedAo2Doc.category} · {inspectedAo2Doc.targetCourse} ·{' '}
                                  {inspectedAo2Doc.fileName}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAo2DocModalOpen(false)}
                                aria-label="Close AO-II document viewer"
                                className="p-2 rounded-lg border border-[#E2E5E9] text-[#525866] hover:text-[#111315] hover:bg-[#F8F9FA] cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA] space-y-4">
                              {inspectedAo2Doc.documentContent && (
                                <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-2">
                                  <div className="text-xs font-semibold text-[#525866]">
                                    Document Content
                                  </div>
                                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#111315]">
                                    {inspectedAo2Doc.documentContent}
                                  </pre>
                                </div>
                              )}
                              {(() => {
                                const mExt = inspectedAo2Doc.fileName
                                  .toLowerCase()
                                  .split('.')
                                  .pop();
                                const mIsImg =
                                  mExt === 'png' ||
                                  mExt === 'jpg' ||
                                  mExt === 'jpeg' ||
                                  mExt === 'webp';
                                const mIsFrame =
                                  mExt === 'pdf' || mExt === 'txt' || mExt === 'csv' || mExt === 'md';
                                const mUrl = `/api/documents/${encodeURIComponent(
                                  inspectedAo2Doc.id
                                )}/file?ao2Token=${encodeURIComponent(ao2Session.token)}`;
                                return (
                                  <>
                                    {mIsImg && (
                                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-4">
                                        <img
                                          src={mUrl}
                                          alt={inspectedAo2Doc.title}
                                          className="max-h-[460px] mx-auto rounded object-contain"
                                        />
                                      </div>
                                    )}
                                    {mIsFrame && (
                                      <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                                        <iframe
                                          title={`AO-II full file ${inspectedAo2Doc.title}`}
                                          src={mUrl}
                                          className="w-full h-[460px] bg-white"
                                        />
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            <div className="px-6 py-4 border-t border-[#E2E5E9] bg-white flex flex-wrap items-center justify-between gap-3">
                              <a
                                href={`/api/documents/${encodeURIComponent(
                                  inspectedAo2Doc.id
                                )}/file?ao2Token=${encodeURIComponent(
                                  ao2Session.token
                                )}&download=1`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111315] bg-[#F8F9FA] hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Original File</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handlePrintEndorsedDocument(inspectedAo2Doc)}
                                style={{ backgroundColor: frontendConfig.accentColor }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Endorsed Document</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AO-II TAB 4: STAFF & PORTAL ACCOUNTS (TEACHERS, PRINCIPAL, AO-II) */}
                  {ao2Tab === 'accounts' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                        <div>
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Teacher Portal Usernames &amp; Password Administration
                          </h4>
                          <p className="text-xs text-[#525866]">
                            Assign unique usernames and reset passwords for each teacher account.
                          </p>
                        </div>

                        <div className="divide-y divide-[#E2E5E9]">
                          {TEACHER_PORTAL_PROFILES.map((t) => {
                            const acc = teacherAccounts.find((a) => a.teacherId === t.id);
                            const draft = accountDrafts[t.id] ?? {
                              username: acc?.username ?? '',
                              newPassword: '',
                            };
                            return (
                              <div
                                key={t.id}
                                className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end"
                              >
                                <div className="lg:col-span-4 space-y-1">
                                  <div className="text-sm font-semibold text-[#111315]">
                                    {t.name}
                                  </div>
                                  <div className="text-xs text-[#525866]">
                                    {t.assignedGradeLabel}
                                  </div>
                                  <div className="text-[11px] font-mono text-[#525866]">
                                    Updated: {acc?.updatedAt ?? 'Default'}
                                  </div>
                                </div>

                                <div className="lg:col-span-3">
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Username
                                  </label>
                                  <input
                                    type="text"
                                    value={draft.username}
                                    onChange={(e) =>
                                      setAccountDrafts((prev) => ({
                                        ...prev,
                                        [t.id]: { ...draft, username: e.target.value },
                                      }))
                                    }
                                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div className="lg:col-span-3">
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Set / Reset Password
                                  </label>
                                  <input
                                    type="password"
                                    value={draft.newPassword}
                                    placeholder="Leave blank to keep current"
                                    onChange={(e) =>
                                      setAccountDrafts((prev) => ({
                                        ...prev,
                                        [t.id]: { ...draft, newPassword: e.target.value },
                                      }))
                                    }
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div className="lg:col-span-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setAo2SaveMessage('');
                                      setAo2ErrorMessage('');
                                      const res = await onAo2UpdateTeacherAccount(
                                        t.id,
                                        draft.username,
                                        draft.newPassword || undefined
                                      );
                                      if (!res.ok) {
                                        setAo2ErrorMessage(
                                          res.error || 'Failed to update teacher credentials.'
                                        );
                                        return;
                                      }
                                      setAccountDrafts((prev) => ({
                                        ...prev,
                                        [t.id]: { ...draft, newPassword: '' },
                                      }));
                                      setAo2SaveMessage(
                                        `Updated login credentials for ${t.name} (@${draft.username}).`
                                      );
                                    }}
                                    style={{ backgroundColor: frontendConfig.accentColor }}
                                    className="w-full lg:w-auto px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap"
                                  >
                                    Save Account
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Principal & AO-II Credential Administration */}
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                        <div>
                          <h4 className="font-display text-lg font-semibold text-[#111315]">
                            Principal &amp; AO-II Administrator Credentials
                          </h4>
                          <p className="text-xs text-[#525866]">
                            Manage login usernames and reset passwords for the School Principal and
                            AO-II Administrator accounts.
                          </p>
                        </div>

                        <div className="divide-y divide-[#E2E5E9]">
                          {/* Principal Credential Row */}
                          <div className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                            <div className="lg:col-span-4 space-y-1">
                              <div className="text-sm font-semibold text-[#111315]">
                                Dr. Elena Vance — School Principal
                              </div>
                              <div className="text-xs text-[#525866]">
                                Cross-Faculty Document Archive Oversight
                              </div>
                              <div className="text-[11px] font-mono text-[#525866]">
                                Updated: {principalAccount?.updatedAt ?? 'Default'}
                              </div>
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-semibold text-[#111315] mb-1">
                                Principal Username
                              </label>
                              <input
                                type="text"
                                value={principalDraft.username}
                                onChange={(e) =>
                                  setPrincipalDraft((p) => ({ ...p, username: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                              />
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-semibold text-[#111315] mb-1">
                                Set / Reset Password
                              </label>
                              <input
                                type="password"
                                value={principalDraft.newPassword}
                                placeholder="Leave blank to keep current"
                                onChange={(e) =>
                                  setPrincipalDraft((p) => ({ ...p, newPassword: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                              />
                            </div>

                            <div className="lg:col-span-2 flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  setAo2SaveMessage('');
                                  setAo2ErrorMessage('');
                                  const res = await onAo2UpdatePrincipalAccount(
                                    principalDraft.username,
                                    principalDraft.newPassword || undefined
                                  );
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Failed to update Principal credentials.'
                                    );
                                    return;
                                  }
                                  setPrincipalDraft((p) => ({ ...p, newPassword: '' }));
                                  setAo2SaveMessage(
                                    `Updated Principal login credentials (@${principalDraft.username}).`
                                  );
                                }}
                                style={{ backgroundColor: frontendConfig.accentColor }}
                                className="w-full lg:w-auto px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap"
                              >
                                Save Principal
                              </button>
                            </div>
                          </div>

                          {/* AO-II Own Credential Row */}
                          <div className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                            <div className="lg:col-span-4 space-y-1">
                              <div className="text-sm font-semibold text-[#111315]">
                                Administrative Officer II (AO-II)
                              </div>
                              <div className="text-xs text-[#525866]">
                                Full Front-End &amp; Back-End System Console
                              </div>
                              <div className="text-[11px] font-mono text-[#525866]">
                                Updated: {ao2Account?.updatedAt ?? 'Default'}
                              </div>
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-semibold text-[#111315] mb-1">
                                AO-II Username
                              </label>
                              <input
                                type="text"
                                value={ao2OwnDraft.username}
                                onChange={(e) =>
                                  setAo2OwnDraft((p) => ({ ...p, username: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                              />
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-semibold text-[#111315] mb-1">
                                Update Password
                              </label>
                              <input
                                type="password"
                                value={ao2OwnDraft.newPassword}
                                placeholder="Leave blank to keep current"
                                onChange={(e) =>
                                  setAo2OwnDraft((p) => ({ ...p, newPassword: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                              />
                            </div>

                            <div className="lg:col-span-2 flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  setAo2SaveMessage('');
                                  setAo2ErrorMessage('');
                                  const res = await onAo2UpdateOwnAccount(
                                    ao2OwnDraft.username,
                                    ao2OwnDraft.newPassword || undefined
                                  );
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Failed to update AO-II credentials.'
                                    );
                                    return;
                                  }
                                  setAo2OwnDraft((p) => ({ ...p, newPassword: '' }));
                                  setAo2SaveMessage(
                                    `Updated AO-II Administrator credentials (@${ao2OwnDraft.username}).`
                                  );
                                }}
                                style={{ backgroundColor: frontendConfig.accentColor }}
                                className="w-full lg:w-auto px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap"
                              >
                                Save AO-II
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AO-II TAB 4: ADMISSIONS INBOX */}
                  {ao2Tab === 'admissions' && (
                    <div className="bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                      {admissionsSubmissions.length === 0 ? (
                        <p className="p-8 text-center text-xs text-[#525866]">
                          No parent or guardian inquiries recorded yet.
                        </p>
                      ) : (
                        admissionsSubmissions.map((item) => (
                          <div
                            key={item.id}
                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="text-xs text-[#525866]">
                                <span className="font-mono font-semibold text-[#111315]">
                                  {item.referenceCode}
                                </span>{' '}
                                · {item.gradeApplying} · {item.entryYear} · {item.submittedAt}
                              </div>
                              <div className="text-sm font-semibold text-[#111315]">
                                {item.parentName} ({item.email})
                              </div>
                              <p className="text-xs text-[#525866]">{item.notes}</p>
                            </div>

                            <select
                              value={item.status}
                              onChange={(e) =>
                                void onUpdateAdmissionStatus(
                                  item.id,
                                  e.target.value as AdmissionsSubmission['status']
                                )
                              }
                              aria-label={`Status for ${item.parentName}`}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] shrink-0"
                            >
                              <option value="New Inquiry">New Inquiry</option>
                              <option value="Tour Scheduled">Tour Scheduled</option>
                              <option value="Reviewed">Reviewed</option>
                            </select>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* AO-II TAB 5: AUDIT LOG */}
                  {ao2Tab === 'audit' && (
                    <div className="bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                      {auditLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[#111315]">{entry.actor}</span>
                            <span className="text-[#525866]"> · {entry.scope}</span>
                            <p className="text-[#525866]">{entry.summary}</p>
                          </div>
                          <span className="font-mono text-[11px] text-[#525866] shrink-0">
                            {entry.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
