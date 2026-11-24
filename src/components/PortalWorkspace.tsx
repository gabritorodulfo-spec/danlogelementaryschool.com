import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Maximize2,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
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
  CalendarActivityItem,
  DocumentReviewStatus,
  GradeEnrollmentRow,
  TEACHER_PORTAL_PROFILES,
  TeacherProfile,
  TeacherSubmittedDocument,
} from '../data/schoolData';
import {
  AccountNotification,
  ActivityPostCategory,
  ActivityPostItem,
  AdminAuditEntry,
  AdmissionsSubmission,
  Ao2AccountSummary,
  Ao2RequisitionStatus,
  DatabaseOverview,
  DatabaseRecordCollection,
  HomeFeedPost,
  HomePostCategory,
  InventoryItem,
  LeaveApplication,
  LeaveType,
  MaterialRequisition,
  MaterialRequisitionCategory,
  PrincipalDocument,
  PrincipalDocumentCategory,
  PrincipalDocumentStatus,
  PrincipalRequisitionStatus,
  RequisitionUrgency,
  SchoolSystemBootstrap,
  SiteBackendConfig,
  SiteFrontendConfig,
  StaffAccountSummary,
  StaffMemberRecord,
  StudentDocFeedbackEntry,
  StudentRecord,
  TeacherAccountSummary,
  TeacherAdvisoryNote,
  UploadedCourseDocument,
} from '../types/schoolConfig';
import { Ao2StaffStudentsManager } from './Ao2StaffStudentsManager';
import {
  CalendarActivityManager,
  type CalendarActivityMutationPayload,
} from './CalendarActivityManager';
import { LeaveApplicationWorkspace } from './LeaveApplicationViews';
import {
  Ao2MaterialRequisitionView,
  PrincipalMaterialRequisitionView,
  TeacherMaterialRequisitionView,
} from './MaterialRequisitionViews';
import { PortalPostPublisher } from './PortalPostPublisher';
import {
  AccountNotificationsBar,
  PrincipalDocumentsManager,
} from './PrincipalDocumentsViews';

export type RoleWorkspace = 'teacher' | 'principal' | 'ao2';
type TeacherTab =
  | 'submitted'
  | 'upload'
  | 'principalDocs'
  | 'roster'
  | 'schedule'
  | 'requisitions'
  | 'leave'
  | 'posts'
  | 'security';
type PrincipalTab =
  | 'documents'
  | 'principalDocs'
  | 'requisitions'
  | 'leave'
  | 'calendar'
  | 'posts'
  | 'security';
type Ao2Tab =
  | 'dashboard'
  | 'records'
  | 'requisitions'
  | 'leave'
  | 'calendar'
  | 'posts'
  | 'endorsed'
  | 'principalDocs'
  | 'frontend'
  | 'backend'
  | 'accounts'
  | 'admissions'
  | 'audit'
  | 'database';

export interface TeacherAuthSession {
  teacherId: string;
  username: string;
  token: string;
}

export interface StaffAuthSession {
  accountId?: string;
  username: string;
  fullName?: string;
  token: string;
}

const DEFAULT_PRINCIPAL_PASSWORD = 'DanlogPrincipal#1975';
const DEFAULT_AO2_PASSWORD = 'DanlogAO2#1975';

interface PortalWorkspaceProps {
  initialRole?: RoleWorkspace;
  frontendConfig: SiteFrontendConfig;
  backendConfig: SiteBackendConfig;
  enrollmentByYear: Record<AcademicYear, GradeEnrollmentRow[]>;
  uploadedDocuments: UploadedCourseDocument[];
  principalDocuments?: PrincipalDocument[];
  accountNotifications?: AccountNotification[];
  admissionsSubmissions: AdmissionsSubmission[];
  inventoryItems: InventoryItem[];
  materialRequisitions: MaterialRequisition[];
  leaveApplications?: LeaveApplication[];
  staffRecords: StaffMemberRecord[];
  studentRecords: StudentRecord[];
  activityPosts: ActivityPostItem[];
  homePosts: HomeFeedPost[];
  calendarActivities?: CalendarActivityItem[];
  teacherNotes?: TeacherAdvisoryNote[];
  studentDocFeedback?: StudentDocFeedbackEntry[];
  auditLog: AdminAuditEntry[];
  teacherAccounts: TeacherAccountSummary[];
  principalAccount: StaffAccountSummary | null;
  ao2Account: StaffAccountSummary | null;
  ao2Accounts?: Ao2AccountSummary[];
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
  onAo2CreateTeacherAccount: (payload: {
    fullName: string;
    title: string;
    department: string;
    assignedGradeId: string;
    assignedGradeLabel: string;
    email: string;
    phone?: string;
    room: string;
    officeHours?: string;
    employmentStatus?: StaffMemberRecord['employmentStatus'];
    username: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateTeacherAccount: (
    teacherId: string,
    username: string,
    newPassword?: string,
    profilePatch?: Partial<Omit<StaffMemberRecord, 'id' | 'updatedAt'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteTeacherAccount: (teacherId: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdatePrincipalAccount: (
    username: string,
    newPassword?: string,
    profilePatch?: {
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2CreatePrincipalAccount?: (payload: {
    fullName: string;
    title: string;
    department: string;
    email: string;
    phone?: string;
    room: string;
    officeHours?: string;
    employmentStatus?: StaffMemberRecord['employmentStatus'];
    username: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeletePrincipalAccount?: () => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateOwnAccount: (
    username: string,
    newPassword?: string,
    profilePatch?: {
      accountId?: string;
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2CreateAdminAccount?: (payload: {
    fullName: string;
    title: string;
    department: string;
    email: string;
    phone?: string;
    room: string;
    officeHours?: string;
    employmentStatus?: StaffMemberRecord['employmentStatus'];
    username: string;
    newPassword: string;
    setAsPrimary?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAo2SetPrimaryAdminAccount?: (accountId: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteAdminAccount?: (accountId: string) => Promise<{ ok: boolean; error?: string }>;
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
  onUploadPrincipalDocument?: (payload: {
    title: string;
    category: PrincipalDocumentCategory;
    fileName: string;
    fileSizeBytes: number;
    notes: string;
    documentContent?: string;
    mimeType?: string;
    file?: File | null;
  }) => Promise<{ ok: boolean; error?: string; notifiedCount?: number }>;
  onAo2DeletePrincipalDocument?: (docId: string) => Promise<{ ok: boolean; error?: string }>;
  onMarkNotificationRead?: (
    id: string,
    roleHint?: 'teacher' | 'principal' | 'ao2'
  ) => Promise<void>;
  onMarkAllNotificationsRead?: (
    roleHint?: 'teacher' | 'principal' | 'ao2'
  ) => Promise<void>;
  onUpdateAdmissionStatus: (id: string, status: AdmissionsSubmission['status']) => Promise<void>;
  onAo2AddStaffRecord: (
    payload: Omit<StaffMemberRecord, 'id' | 'updatedAt'> & {
      createPortalLogin?: boolean;
      initialPassword?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateStaffRecord: (
    id: string,
    patch: Partial<Omit<StaffMemberRecord, 'id' | 'updatedAt'>> & { newPassword?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteStaffRecord: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2AddStudentRecord: (
    payload: Omit<StudentRecord, 'id' | 'updatedAt'>
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2UpdateStudentRecord: (
    id: string,
    patch: Partial<Omit<StudentRecord, 'id' | 'updatedAt'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteStudentRecord: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStudentAttendance: (studentId: string, attendance: AttendanceStatus) => Promise<void>;
  onAddTeacherNote?: (
    teacherId: string,
    text: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSaveStudentDocFeedback?: (
    docId: string,
    teacherId: string,
    comment: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onCreateActivityPost: (payload: {
    title: string;
    category: ActivityPostCategory;
    dateConducted: string;
    participants: string;
    location: string;
    description: string;
    imageFile?: File | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteActivityPost: (postId: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateHomePost: (payload: {
    title: string;
    content: string;
    category: HomePostCategory;
    pinned?: boolean;
    imageFile?: File | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteHomePost: (postId: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2FetchDatabase: () => Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }>;
  onAo2UpdateDbEnrollmentRow: (payload: {
    year: AcademicYear;
    gradeId: string;
    enrolledStudents: number;
    capacity: number;
    teachers: number;
    sections: number;
    facultyLead: string;
  }) => Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }>;
  onAo2DeleteDbRecord: (
    collection: DatabaseRecordCollection,
    id: string
  ) => Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }>;
  onAo2RestoreDatabase: (
    payload: Partial<SchoolSystemBootstrap>
  ) => Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }>;
  onResetSystemDefaults: () => Promise<void>;
  onOpenInventoryPage: (fromRole: 'ao2' | 'principal') => void;
  onTeacherCreateRequisition: (payload: {
    itemName: string;
    category: MaterialRequisitionCategory;
    quantity: number;
    unit: string;
    urgency: RequisitionUrgency;
    neededBy?: string;
    purpose: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onTeacherDeleteRequisition: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onAo2ReviewRequisition: (
    id: string,
    payload: { ao2Status?: Ao2RequisitionStatus; ao2Note?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onPrincipalReviewRequisition: (
    id: string,
    payload: { principalStatus?: PrincipalRequisitionStatus; principalNote?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onSubmitLeaveApplication: (
    actorRole: 'Teacher' | 'Principal' | 'AO-II',
    payload: {
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      numberOfDays: number;
      reason: string;
      contactDuringLeave?: string;
      coveringStaff?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onPrincipalDecideLeave: (
    id: string,
    payload: { principalStatus: 'Approved' | 'Disapproved'; principalNote?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2EditLeaveApplication: (
    id: string,
    payload: {
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      numberOfDays: number;
      reason: string;
      contactDuringLeave?: string;
      coveringStaff?: string;
      ao2EditNote?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2EndorseLeaveApplication: (
    id: string,
    endorsementStatus?: 'Endorsed' | 'Pending Endorsement'
  ) => Promise<{ ok: boolean; error?: string }>;
  onAo2DeleteLeaveApplication: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateCalendarActivity?: (
    role: 'ao2' | 'principal',
    payload: CalendarActivityMutationPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCalendarActivity?: (
    role: 'ao2' | 'principal',
    id: string,
    payload: CalendarActivityMutationPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCalendarActivity?: (
    role: 'ao2' | 'principal',
    id: string
  ) => Promise<{ ok: boolean; error?: string }>;
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
  principalDocuments = [],
  accountNotifications = [],
  admissionsSubmissions,
  inventoryItems,
  materialRequisitions,
  leaveApplications = [],
  staffRecords,
  studentRecords,
  activityPosts,
  homePosts,
  calendarActivities = [],
  teacherNotes = [],
  studentDocFeedback = [],
  auditLog,
  teacherAccounts,
  principalAccount,
  ao2Account,
  ao2Accounts = [],
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
  onAo2CreateTeacherAccount,
  onAo2UpdateTeacherAccount,
  onAo2DeleteTeacherAccount,
  onAo2UpdatePrincipalAccount,
  onAo2CreatePrincipalAccount,
  onAo2DeletePrincipalAccount,
  onAo2UpdateOwnAccount,
  onAo2CreateAdminAccount,
  onAo2SetPrimaryAdminAccount,
  onAo2DeleteAdminAccount,
  onSaveFrontendConfig,
  onSaveBackendConfig,
  onUpdateCapacity,
  onUploadTeacherDocument,
  onDeleteUploadedDocument,
  onPrincipalReviewDocument,
  onUploadPrincipalDocument,
  onAo2DeletePrincipalDocument,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onUpdateAdmissionStatus,
  onAo2AddStaffRecord,
  onAo2UpdateStaffRecord,
  onAo2DeleteStaffRecord,
  onAo2AddStudentRecord,
  onAo2UpdateStudentRecord,
  onAo2DeleteStudentRecord,
  onUpdateStudentAttendance,
  onAddTeacherNote,
  onSaveStudentDocFeedback,
  onCreateActivityPost,
  onDeleteActivityPost,
  onCreateHomePost,
  onDeleteHomePost,
  onAo2FetchDatabase,
  onAo2UpdateDbEnrollmentRow,
  onAo2DeleteDbRecord,
  onAo2RestoreDatabase,
  onResetSystemDefaults,
  onOpenInventoryPage,
  onTeacherCreateRequisition,
  onTeacherDeleteRequisition,
  onAo2ReviewRequisition,
  onPrincipalReviewRequisition,
  onSubmitLeaveApplication,
  onPrincipalDecideLeave,
  onAo2EditLeaveApplication,
  onAo2EndorseLeaveApplication,
  onAo2DeleteLeaveApplication,
  onCreateCalendarActivity,
  onUpdateCalendarActivity,
  onDeleteCalendarActivity,
}: PortalWorkspaceProps) {
  const [roleWorkspace, setRoleWorkspace] = useState<RoleWorkspace>(initialRole);
  const [selectedPrincipalIssuedDocId, setSelectedPrincipalIssuedDocId] = useState<string | null>(
    null
  );

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
    Record<
      string,
      {
        username: string;
        newPassword: string;
        fullName: string;
        title: string;
        department: string;
        assignedGradeId: string;
        assignedGradeLabel: string;
        room: string;
        email: string;
        employmentStatus: StaffMemberRecord['employmentStatus'];
      }
    >
  >({});
  const [editingAccountProfileId, setEditingAccountProfileId] = useState<string | null>(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);
  const [accountBusyId, setAccountBusyId] = useState<string | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addAccountMode, setAddAccountMode] = useState<'portal' | 'admin' | 'principal' | 'staff'>('portal');
  const [newAccSetPrimaryAdmin, setNewAccSetPrimaryAdmin] = useState(true);
  const [newAccFullName, setNewAccFullName] = useState('');
  const [newAccRole, setNewAccRole] = useState<StaffMemberRecord['role']>('Teacher');
  const [newAccTitle, setNewAccTitle] = useState('Classroom Adviser');
  const [newAccDepartment, setNewAccDepartment] = useState('Primary & Intermediate Division');
  const [newAccGradeId, setNewAccGradeId] = useState('g1');
  const [newAccGradeLabel, setNewAccGradeLabel] = useState('Grade 1 · Primary Division');
  const [newAccRoom, setNewAccRoom] = useState('Building 1 · Room 104');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccStatus, setNewAccStatus] =
    useState<StaffMemberRecord['employmentStatus']>('Regular / Permanent');
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [principalDraft, setPrincipalDraft] = useState({
    username: '',
    newPassword: '',
    fullName: '',
    title: 'School Principal',
  });
  const [confirmDeletePrincipal, setConfirmDeletePrincipal] = useState(false);
  const [ao2AdminDrafts, setAo2AdminDrafts] = useState<
    Record<
      string,
      {
        username: string;
        newPassword: string;
        fullName: string;
        title: string;
      }
    >
  >({});
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState<string | null>(null);
  const [ao2DocTeacherFilter, setAo2DocTeacherFilter] = useState<string>('ALL');
  const [ao2DocSearch, setAo2DocSearch] = useState('');
  const [selectedAo2DocId, setSelectedAo2DocId] = useState<string | null>(null);
  const [ao2DocViewMode, setAo2DocViewMode] = useState<'content' | 'file'>('content');
  const [ao2DocModalOpen, setAo2DocModalOpen] = useState(false);
  const [ao2DashDivision, setAo2DashDivision] = useState<
    'All' | 'Primary (K–3)' | 'Intermediate (4–6)'
  >('All');

  // AO-II Database Manager state
  const [dbOverview, setDbOverview] = useState<DatabaseOverview | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbCollection, setDbCollection] = useState<
    | 'enrollment'
    | 'staffRecords'
    | 'studentRecords'
    | 'inventoryItems'
    | 'materialRequisitions'
    | 'leaveApplications'
    | 'uploadedDocuments'
    | 'principalDocuments'
    | 'accountNotifications'
    | 'admissionsSubmissions'
    | 'homePosts'
    | 'activityPosts'
    | 'calendarActivities'
    | 'teacherNotes'
    | 'studentDocFeedback'
    | 'accounts'
    | 'auditLog'
    | 'json'
  >('enrollment');
  const [dbYearFilter, setDbYearFilter] = useState<AcademicYear>(backendConfig.activeAcademicYear);
  const [dbSearch, setDbSearch] = useState('');
  const [dbEditingGradeKey, setDbEditingGradeKey] = useState<string | null>(null);
  const [dbGradeDraft, setDbGradeDraft] = useState({
    enrolledStudents: '0',
    capacity: '0',
    teachers: '1',
    sections: '1',
    facultyLead: '',
  });
  const [dbConfirmDeleteKey, setDbConfirmDeleteKey] = useState<string | null>(null);
  const [dbJsonDraft, setDbJsonDraft] = useState('');
  const [dbCopied, setDbCopied] = useState(false);
  const [dbBusyKey, setDbBusyKey] = useState<string | null>(null);

  const loadAo2Database = async (syncJsonEditor = false) => {
    setDbLoading(true);
    setAo2ErrorMessage('');
    const result = await onAo2FetchDatabase();
    setDbLoading(false);
    if (!result.ok || !result.overview) {
      setAo2ErrorMessage(result.error || 'Could not load database store.');
      return;
    }
    setDbOverview(result.overview);
    if (syncJsonEditor || !dbJsonDraft.trim()) {
      setDbJsonDraft(JSON.stringify(result.overview.data, null, 2));
    }
  };

  useEffect(() => {
    if (ao2Session && ao2Tab === 'database') {
      void loadAo2Database(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ao2Session?.token, ao2Tab]);

  useEffect(() => {
    setFrontendDraft(frontendConfig);
  }, [frontendConfig]);

  useEffect(() => {
    setBackendDraft(backendConfig);
    setExtensionsText(backendConfig.allowedExtensions.join(', '));
  }, [backendConfig]);

  const principalStaffRecord = useMemo(
    () =>
      staffRecords.find((s) => s.role === 'Principal') ??
      staffRecords.find((s) => s.id === 'staff-principal') ??
      null,
    [staffRecords]
  );
  const ao2AdminAccountsList: Ao2AccountSummary[] = useMemo(() => {
    if (ao2Accounts.length > 0) {
      return ao2Accounts;
    }
    const adminStaff = staffRecords.filter(
      (s) => s.role === 'Administrative Officer' && Boolean(s.portalUsername)
    );
    if (adminStaff.length > 0) {
      return adminStaff.map((s, idx) => ({
        accountId: s.id,
        username: s.portalUsername ?? ao2Account?.username ?? 'r.gabrito',
        fullName: s.fullName,
        title: s.title,
        hasCustomPassword: ao2Account?.hasCustomPassword ?? false,
        updatedAt: s.updatedAt,
        isPrimary: idx === 0,
      }));
    }
    if (!ao2Account) return [];
    return [
      {
        accountId: 'staff-danlog-gabrito',
        username: ao2Account.username,
        fullName: ao2Account.username,
        title: 'Administrative Officer II (AO-II)',
        hasCustomPassword: ao2Account.hasCustomPassword,
        updatedAt: ao2Account.updatedAt,
        isPrimary: true,
      },
    ];
  }, [ao2Accounts, ao2Account, staffRecords]);
  const primaryAo2Account = useMemo(
    () => ao2AdminAccountsList.find((a) => a.isPrimary) ?? ao2AdminAccountsList[0],
    [ao2AdminAccountsList]
  );
  const ao2SignedInAccount = useMemo(() => {
    if (!ao2Session) return primaryAo2Account;
    return (
      ao2AdminAccountsList.find(
        (a) =>
          (ao2Session.accountId && a.accountId === ao2Session.accountId) ||
          a.username.toLowerCase() === ao2Session.username.toLowerCase()
      ) ?? primaryAo2Account
    );
  }, [ao2Session, ao2AdminAccountsList, primaryAo2Account]);
  const principalDisplayName = principalStaffRecord?.fullName ?? 'School Principal';
  const principalRoleTitle = principalStaffRecord?.title ?? 'School Principal';
  const ao2DisplayName =
    ao2Session?.fullName || ao2SignedInAccount?.fullName || 'AO-II Administrator';

  useEffect(() => {
    setAccountDrafts((prev) => {
      const next: typeof prev = {};
      for (const acc of teacherAccounts) {
        const staff = staffRecords.find((s) => s.id === acc.teacherId);
        const base = TEACHER_PORTAL_PROFILES.find((t) => t.id === acc.teacherId);
        next[acc.teacherId] = {
          username: acc.username,
          newPassword: prev[acc.teacherId]?.newPassword ?? '',
          fullName: staff?.fullName ?? base?.name ?? acc.username,
          title: staff?.title ?? base?.title ?? 'Classroom Adviser',
          department: staff?.department ?? base?.department ?? 'General Faculty',
          assignedGradeId: staff?.assignedGradeId ?? base?.assignedGradeId ?? 'g1',
          assignedGradeLabel:
            staff?.assignedGradeLabel ?? base?.assignedGradeLabel ?? 'Primary Division',
          room: staff?.room ?? base?.room ?? 'Main Building',
          email: staff?.email ?? base?.email ?? '',
          employmentStatus: staff?.employmentStatus ?? 'Regular / Permanent',
        };
      }
      return next;
    });
  }, [teacherAccounts, staffRecords]);

  useEffect(() => {
    setPrincipalDraft((prev) => ({
      username: principalAccount?.username ?? '',
      newPassword: prev.newPassword,
      fullName: principalStaffRecord?.fullName ?? '',
      title: principalStaffRecord?.title ?? 'School Principal',
    }));
  }, [principalAccount, principalStaffRecord]);

  useEffect(() => {
    setAo2AdminDrafts((prev) => {
      const next: typeof prev = {};
      for (const adm of ao2AdminAccountsList) {
        const staff = staffRecords.find((s) => s.id === adm.accountId);
        next[adm.accountId] = {
          username: adm.username,
          newPassword: prev[adm.accountId]?.newPassword ?? '',
          fullName: staff?.fullName ?? adm.fullName,
          title: staff?.title ?? adm.title,
        };
      }
      return next;
    });
  }, [ao2AdminAccountsList, staffRecords]);

  const mergedTeacherProfiles: TeacherProfile[] = useMemo(() => {
    if (teacherAccounts.length === 0 && staffRecords.length === 0) {
      return TEACHER_PORTAL_PROFILES;
    }
    const staffMap = new Map(staffRecords.map((s) => [s.id, s]));
    const baseMap = new Map(TEACHER_PORTAL_PROFILES.map((t) => [t.id, t]));
    return teacherAccounts.map((acc) => {
      const staff = staffMap.get(acc.teacherId);
      const base = baseMap.get(acc.teacherId);
      const gradeLabel =
        staff?.assignedGradeLabel ?? base?.assignedGradeLabel ?? 'Assigned Grade Class';
      const room = staff?.room ?? base?.room ?? 'Main Building';
      return {
        id: acc.teacherId,
        name: staff?.fullName ?? base?.name ?? acc.username,
        title: staff?.title ?? base?.title ?? 'Classroom Adviser',
        department: staff?.department ?? base?.department ?? 'General Faculty',
        assignedGradeId: staff?.assignedGradeId ?? base?.assignedGradeId ?? 'g1',
        assignedGradeLabel: gradeLabel,
        email: staff?.email ?? base?.email ?? `${acc.username}@danloges.edu.ph`,
        room,
        officeHours:
          staff?.officeHours ?? base?.officeHours ?? 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
        students: base?.students ?? [],
        assignments: base?.assignments ?? [],
        submittedDocuments: base?.submittedDocuments ?? [],
        schedule: base?.schedule ?? [
          {
            period: 'Block 1',
            time: '7:45 – 9:30 a.m.',
            course: gradeLabel,
            room,
            enrolled: 30,
          },
        ],
        initialNotes: base?.initialNotes ?? [],
      };
    });
  }, [teacherAccounts, staffRecords]);

  const activeTeacher: TeacherProfile | null = useMemo(
    () =>
      teacherSession
        ? mergedTeacherProfiles.find((t) => t.id === teacherSession.teacherId) ?? null
        : null,
    [teacherSession, mergedTeacherProfiles]
  );

  const currentStudents = useMemo(() => {
    if (!activeTeacher) return [];
    const dbMatches = studentRecords.filter(
      (s) =>
        s.adviserId === activeTeacher.id ||
        (activeTeacher.assignedGradeId && s.gradeId === activeTeacher.assignedGradeId)
    );
    if (dbMatches.length > 0) {
      return dbMatches.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        gradeLabel: s.gradeLabel,
        advisorGroup: s.section,
        attendance: s.attendance,
        currentAverage: s.currentAverage,
        missingWork: s.missingWork,
        isPersistedRecord: true,
      }));
    }
    return (rostersByTeacher[activeTeacher.id] ?? []).map((s) => ({
      ...s,
      isPersistedRecord: false,
    }));
  }, [activeTeacher, studentRecords, rostersByTeacher]);
  const currentStudentDocs = useMemo(() => {
    if (!activeTeacher) return [];
    const baseDocs = studentDocsByTeacher[activeTeacher.id] ?? [];
    return baseDocs.map((doc) => {
      const persisted = studentDocFeedback.find(
        (f) => f.docId === doc.id && f.teacherId === activeTeacher.id
      );
      return persisted ? { ...doc, teacherComment: persisted.comment } : doc;
    });
  }, [activeTeacher, studentDocsByTeacher, studentDocFeedback]);
  const currentTeacherUploadedDocs = useMemo(
    () =>
      activeTeacher ? uploadedDocuments.filter((d) => d.teacherId === activeTeacher.id) : [],
    [uploadedDocuments, activeTeacher]
  );
  const currentNotes = useMemo(() => {
    if (!activeTeacher) return [];
    const persisted = teacherNotes.filter((n) => n.teacherId === activeTeacher.id);
    if (persisted.length > 0) return persisted;
    return notesByTeacher[activeTeacher.id] ?? [];
  }, [activeTeacher, teacherNotes, notesByTeacher]);

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
        (
          mergedTeacherProfiles.find((t) => t.id === doc.teacherId)?.name ??
          staffRecords.find((s) => s.id === doc.teacherId)?.fullName ??
          ''
        ).toLowerCase();
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
    mergedTeacherProfiles,
    staffRecords,
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
    const activeYear = backendConfig.activeAcademicYear;
    const baseRows = enrollmentByYear[activeYear] ?? [];
    const activeYearStudents = studentRecords.filter(
      (st) =>
        st.academicYear === activeYear &&
        st.enrollmentStatus !== 'Transferred Out' &&
        st.enrollmentStatus !== 'Graduated'
    );

    const staffIdSet = new Set(staffRecords.map((s) => s.id));
    const teacherStaffRecords = staffRecords.filter((s) => s.role === 'Teacher');
    const orphanTeacherAccounts = teacherAccounts.filter(
      (acc) => !staffIdSet.has(acc.teacherId)
    );

    const activeRows = baseRows.map((row) => {
      const gradeStudents = activeYearStudents.filter((st) => st.gradeId === row.id);
      const gradeTeachers = teacherStaffRecords.filter((s) => s.assignedGradeId === row.id);
      const uniqueSections = new Set(
        gradeStudents
          .map((st) => st.section.trim())
          .filter((section) => section.length > 0)
      ).size;

      return {
        ...row,
        enrolledStudents: gradeStudents.length,
        teachers: gradeTeachers.length,
        sections: uniqueSections > 0 ? uniqueSections : row.sections,
        facultyLead: gradeTeachers[0]?.fullName ?? row.facultyLead,
      };
    });

    const baseRowIds = new Set(baseRows.map((r) => r.id));
    const unassignedStudents = activeYearStudents.filter(
      (st) => !baseRowIds.has(st.gradeId)
    ).length;
    const unassignedTeachers =
      teacherStaffRecords.filter((s) => !baseRowIds.has(s.assignedGradeId)).length +
      orphanTeacherAccounts.length;

    const totalStudents = activeYearStudents.length;
    const totalCapacity = activeRows.reduce((sum, r) => sum + r.capacity, 0);
    const totalTeachers = teacherStaffRecords.length + orphanTeacherAccounts.length;
    const totalSections = activeRows.reduce((sum, r) => sum + r.sections, 0);
    const ratio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '0.0';

    return {
      activeRows,
      totalStudents,
      totalAllStudentRecords: studentRecords.length,
      unassignedStudents,
      totalCapacity,
      totalTeachers,
      unassignedTeachers,
      totalSections,
      ratio,
    };
  }, [
    enrollmentByYear,
    backendConfig.activeAcademicYear,
    studentRecords,
    staffRecords,
    teacherAccounts,
  ]);

  const ao2FilteredEndorsedDocs = useMemo(() => {
    const q = ao2DocSearch.trim().toLowerCase();
    return ao2EndorsedDocs.filter((doc) => {
      const matchesTeacher =
        ao2DocTeacherFilter === 'ALL' || doc.teacherId === ao2DocTeacherFilter;
      const teacherName =
        (
          mergedTeacherProfiles.find((t) => t.id === doc.teacherId)?.name ??
          staffRecords.find((s) => s.id === doc.teacherId)?.fullName ??
          ''
        ).toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.targetCourse.toLowerCase().includes(q) ||
        (doc.documentContent ?? '').toLowerCase().includes(q) ||
        teacherName.includes(q);
      return matchesTeacher && matchesQuery;
    });
  }, [ao2EndorsedDocs, ao2DocTeacherFilter, ao2DocSearch, mergedTeacherProfiles, staffRecords]);

  const inspectedAo2Doc = useMemo(
    () =>
      ao2FilteredEndorsedDocs.find((d) => d.id === selectedAo2DocId) ??
      ao2FilteredEndorsedDocs[0] ??
      null,
    [ao2FilteredEndorsedDocs, selectedAo2DocId]
  );

  const handlePrintEndorsedDocument = (doc: UploadedCourseDocument) => {
    if (!ao2Session) return;
    const author = mergedTeacherProfiles.find((t) => t.id === doc.teacherId);
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
        <div class="sig-line"><strong>${escapeHtml(doc.endorsedBy ?? principalDisplayName)}</strong><br/>${escapeHtml(principalRoleTitle)} · Endorsed/Principal</div>
      </div>
      <div>
        <div class="sig-line"><strong>${escapeHtml(ao2DisplayName)}</strong><br/>Recorded &amp; Printed by @${escapeHtml(ao2Session.username)}</div>
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

  const handleSaveStudentDocFeedback = async (docId: string) => {
    if (!activeTeacher || !studentDocCommentDraft.trim()) return;
    const comment = studentDocCommentDraft.trim();
    setStudentDocsByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: (prev[activeTeacher.id] ?? []).map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              teacherComment: comment,
            }
          : doc
      ),
    }));
    setStudentDocCommentDraft('');
    if (onSaveStudentDocFeedback) {
      await onSaveStudentDocFeedback(docId, activeTeacher.id, comment);
    }
  };

  const handleAttendanceToggle = (
    studentId: string,
    status: AttendanceStatus,
    _isPersistedRecord?: boolean
  ) => {
    if (!activeTeacher) return;
    setRostersByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: (prev[activeTeacher.id] ?? []).map((s) =>
        s.id === studentId ? { ...s, attendance: status } : s
      ),
    }));
    void onUpdateStudentAttendance(studentId, status);
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

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeTeacher || newAdvisoryNote.trim().length < 3) return;
    const text = newAdvisoryNote.trim();
    setNewAdvisoryNote('');
    if (onAddTeacherNote) {
      const res = await onAddTeacherNote(activeTeacher.id, text);
      if (res.ok) return;
    }
    setNotesByTeacher((prev) => ({
      ...prev,
      [activeTeacher.id]: [
        { id: `note-${Date.now()}`, timestamp: 'Just now', text },
        ...(prev[activeTeacher.id] ?? []),
      ],
    }));
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
              <div className="max-w-lg mx-auto">
                {/* Username + Password Login Card */}
                <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E5E9] p-8 space-y-6">
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

                {/* Interactive Teacher KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#DCE6E0] divide-y sm:divide-y-0 sm:divide-x divide-[#DCE6E0]">
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherTab('submitted');
                      setDocStatusFilter('Pending Review');
                    }}
                    className={`text-left p-5 space-y-1 bg-[#F0FDF4]/85 hover:bg-[#DCFCE7]/70 transition-colors cursor-pointer ${
                      teacherTab === 'submitted' && docStatusFilter === 'Pending Review'
                        ? 'ring-2 ring-inset ring-[#15803D]/35'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#166534]">Student Docs Pending Review</div>
                    <div className="font-display text-2xl font-semibold text-[#15803D] tabular-nums">
                      {teacherKpis.pendingStudentDocs}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherTab('upload')}
                    className={`text-left p-5 space-y-1 bg-[#EFF6FF]/85 hover:bg-[#DBEAFE]/70 transition-colors cursor-pointer ${
                      teacherTab === 'upload' ? 'ring-2 ring-inset ring-[#1D4ED8]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#1E40AF]">My Uploaded Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums">
                      {teacherKpis.uploadedCount}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherTab('roster')}
                    className={`text-left p-5 space-y-1 bg-[#F0FDFA]/85 hover:bg-[#CCFBF1]/70 transition-colors cursor-pointer ${
                      teacherTab === 'roster' ? 'ring-2 ring-inset ring-[#0F766E]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#115E59]">Attendance Present Today</div>
                    <div className="font-display text-2xl font-semibold text-[#0F766E] tabular-nums">
                      {teacherKpis.presentCount} / {teacherKpis.studentCount}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherTab('requisitions')}
                    className={`text-left p-5 space-y-1 bg-[#FFFBEB]/85 hover:bg-[#FEF3C7]/70 transition-colors cursor-pointer ${
                      teacherTab === 'requisitions' ? 'ring-2 ring-inset ring-[#B45309]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#92400E]">Upload Policy Limit</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {backendConfig.teacherUploadsEnabled
                        ? `${backendConfig.maxUploadSizeMb} MB`
                        : 'Paused'}
                    </div>
                  </button>
                </div>

                {/* Teacher Account Notifications Bar */}
                <AccountNotificationsBar
                  accentColor={frontendConfig.accentColor}
                  currentAccountId={activeTeacher.id}
                  notifications={accountNotifications}
                  onMarkRead={async (id) => {
                    if (onMarkNotificationRead) await onMarkNotificationRead(id, 'teacher');
                  }}
                  onMarkAllRead={async () => {
                    if (onMarkAllNotificationsRead) await onMarkAllNotificationsRead('teacher');
                  }}
                  onOpenDocument={(docId) => {
                    setSelectedPrincipalIssuedDocId(docId);
                    setTeacherTab('principalDocs');
                  }}
                />

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
                      id: 'principalDocs' as TeacherTab,
                      label: `Principal Docs (${principalDocuments.length})`,
                    },
                    {
                      id: 'roster' as TeacherTab,
                      label: `Class Roster & Attendance (${currentStudents.length})`,
                    },
                    {
                      id: 'schedule' as TeacherTab,
                      label: 'Schedule & Notes',
                    },
                    {
                      id: 'requisitions' as TeacherTab,
                      label: `Material Requisition (${
                        materialRequisitions.filter((r) => r.teacherId === activeTeacher.id).length
                      })`,
                    },
                    {
                      id: 'leave' as TeacherTab,
                      label: `Leave Application (${
                        leaveApplications.filter((l) => l.applicantAccountId === activeTeacher.id).length
                      })`,
                    },
                    { id: 'posts' as TeacherTab, label: 'Website Posts' },
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

                              {inspectedStudentDoc.teacherComment ? (
                                <div className="bg-[#F8F9FA] rounded-lg border border-[#E2E5E9] p-3 text-xs text-[#525866] space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-[#111315]">
                                      Feedback Recorded:
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#047857]">
                                      <Lock className="w-3 h-3" />
                                      <span>Saved (AO-II only to alter)</span>
                                    </span>
                                  </div>
                                  <div>{inspectedStudentDoc.teacherComment}</div>
                                </div>
                              ) : (
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
                              )}
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

                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#525866] bg-[#F8FAFC] border border-[#E2E5E9] px-2.5 py-1 rounded-md shrink-0">
                                  <Lock className="w-3 h-3 text-[#047857]" />
                                  <span>Saved in DB</span>
                                </span>
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
                                            onClick={() =>
                                              handleAttendanceToggle(
                                                student.id,
                                                st,
                                                student.isPersistedRecord
                                              )
                                            }
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

                  {/* TEACHER TAB 5: MATERIAL REQUISITION & POSSESSED MATERIALS */}
                  {teacherTab === 'requisitions' && (
                    <TeacherMaterialRequisitionView
                      accentColor={frontendConfig.accentColor}
                      teacher={{
                        id: activeTeacher.id,
                        name: activeTeacher.name,
                        assignedGradeLabel: activeTeacher.assignedGradeLabel,
                        room: activeTeacher.room,
                      }}
                      inventoryItems={inventoryItems}
                      requisitions={materialRequisitions}
                      onCreateRequisition={onTeacherCreateRequisition}
                      onDeleteRequisition={onTeacherDeleteRequisition}
                    />
                  )}

                  {/* TEACHER TAB 5b: LEAVE APPLICATION FORM */}
                  {teacherTab === 'leave' && (
                    <LeaveApplicationWorkspace
                      mode="teacher"
                      accentColor={frontendConfig.accentColor}
                      actorAccountId={activeTeacher.id}
                      actorRole="Teacher"
                      actorName={activeTeacher.name}
                      actorDepartmentOrGrade={activeTeacher.assignedGradeLabel}
                      leaveApplications={leaveApplications}
                      onSubmitLeaveApplication={(payload) =>
                        onSubmitLeaveApplication('Teacher', payload)
                      }
                    />
                  )}

                  {/* TEACHER TAB 2b: DOCUMENTS UPLOADED BY PRINCIPAL */}
                  {teacherTab === 'principalDocs' && (
                    <PrincipalDocumentsManager
                      mode="teacher"
                      accentColor={frontendConfig.accentColor}
                      backendConfig={backendConfig}
                      principalDocuments={principalDocuments}
                      accountNotifications={accountNotifications}
                      authQueryParam={`teacherToken=${encodeURIComponent(teacherSession?.token ?? '')}`}
                      selectedDocId={selectedPrincipalIssuedDocId}
                      onSelectDocId={setSelectedPrincipalIssuedDocId}
                    />
                  )}

                  {/* TEACHER TAB 6: WEBSITE POSTS & STUDENT ACTIVITIES */}
                  {teacherTab === 'posts' && (
                    <PortalPostPublisher
                      accentColor={frontendConfig.accentColor}
                      actorName={activeTeacher.name}
                      actorRole="Teacher"
                      actorAccountId={activeTeacher.id}
                      homePosts={homePosts}
                      activityPosts={activityPosts}
                      onCreateHomePost={onCreateHomePost}
                      onDeleteHomePost={onDeleteHomePost}
                      onCreateActivityPost={onCreateActivityPost}
                      onDeleteActivityPost={onDeleteActivityPost}
                    />
                  )}

                  {/* TEACHER TAB 6: ACCOUNT & PASSWORD */}
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
                        placeholder={
                          principalAccount?.username
                            ? `e.g., ${principalAccount.username}`
                            : 'Enter Principal username'
                        }
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
                      disabled={isPrincipalSigningIn || !principalAccount}
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
                      {principalAccount
                        ? `${principalDisplayName} — ${principalRoleTitle}`
                        : 'No Principal Account Assigned'}
                    </h4>
                    <p className="text-xs text-[#525866]">
                      {principalAccount
                        ? 'Privileged oversight access across all teacher-submitted files, endorsements, and curriculum follow-ups.'
                        : 'The previous placeholder Principal account was removed. An AO-II Administrator can add a School Principal account from AO-II Admin Console → Staff & Portal Accounts.'}
                    </p>
                  </div>

                  {principalAccount ? (
                    <div className="p-4 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 text-xs font-mono">
                        <div className="text-[#111315]">
                          Username: <strong>{principalAccount.username}</strong>
                        </div>
                        <div className="text-[#525866]">
                          Password:{' '}
                          {!principalAccount.hasCustomPassword ? (
                            <strong className="text-[#111315]">{DEFAULT_PRINCIPAL_PASSWORD}</strong>
                          ) : (
                            <span className="italic">Custom password set</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrincipalUsernameInput(principalAccount.username);
                          if (!principalAccount.hasCustomPassword) {
                            setPrincipalPasswordInput(DEFAULT_PRINCIPAL_PASSWORD);
                          } else {
                            setPrincipalPasswordInput('');
                          }
                          setPrincipalLoginError('');
                        }}
                        style={{ color: frontendConfig.accentColor }}
                        className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer shrink-0 self-start sm:self-center"
                      >
                        {!principalAccount.hasCustomPassword ? 'Fill Credentials' : 'Fill Username'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[#E2E5E9] bg-[#F8F9FA] text-xs text-[#525866]">
                      Principal portal login is currently inactive until a Principal account is added by AO-II.
                    </div>
                  )}
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
                      {principalDisplayName} — {principalRoleTitle}
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

                {/* Interactive Principal Cross-Faculty KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#DCE4F0] divide-y sm:divide-y-0 sm:divide-x divide-[#DCE4F0]">
                  <button
                    type="button"
                    onClick={() => {
                      setPrincipalTab('documents');
                      setPrincipalStatusFilter('ALL');
                    }}
                    className={`text-left p-5 space-y-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors cursor-pointer ${
                      principalTab === 'documents' && principalStatusFilter === 'ALL'
                        ? 'ring-2 ring-inset ring-[#0F172A]/20'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#334155]">Total Teacher Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#0F172A] tabular-nums">
                      {uploadedDocuments.length}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrincipalTab('documents');
                      setPrincipalStatusFilter('Pending Review');
                    }}
                    className={`text-left p-5 space-y-1 bg-[#EFF6FF]/85 hover:bg-[#DBEAFE]/70 transition-colors cursor-pointer ${
                      principalTab === 'documents' && principalStatusFilter === 'Pending Review'
                        ? 'ring-2 ring-inset ring-[#1D4ED8]/35'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#1E40AF]">Pending Review</div>
                    <div className="font-display text-2xl font-semibold text-[#1D4ED8] tabular-nums">
                      {
                        uploadedDocuments.filter((d) => d.principalReviewStatus === 'Pending Review')
                          .length
                      }
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrincipalTab('documents');
                      setPrincipalStatusFilter('Approved');
                    }}
                    className={`text-left p-5 space-y-1 bg-[#ECFDF5]/85 hover:bg-[#DCFCE7]/70 transition-colors cursor-pointer ${
                      principalTab === 'documents' && principalStatusFilter === 'Approved'
                        ? 'ring-2 ring-inset ring-[#047857]/35'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#065F46]">Approved</div>
                    <div className="font-display text-2xl font-semibold text-[#047857] tabular-nums">
                      {ao2EndorsedDocs.length}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrincipalTab('documents');
                      setPrincipalStatusFilter('Needs Revision');
                    }}
                    className={`text-left p-5 space-y-1 bg-[#FFFBEB]/85 hover:bg-[#FEF3C7]/70 transition-colors cursor-pointer ${
                      principalTab === 'documents' && principalStatusFilter === 'Needs Revision'
                        ? 'ring-2 ring-inset ring-[#B45309]/35'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-[#92400E]">Needs Revision</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {
                        uploadedDocuments.filter((d) => d.principalReviewStatus === 'Needs Revision')
                          .length
                      }
                    </div>
                  </button>
                </div>

                {/* Principal Account Notifications Bar */}
                <AccountNotificationsBar
                  accentColor={frontendConfig.accentColor}
                  currentAccountId={principalStaffRecord?.id ?? 'staff-danlog-cadag'}
                  notifications={accountNotifications}
                  onMarkRead={async (id) => {
                    if (onMarkNotificationRead) await onMarkNotificationRead(id, 'principal');
                  }}
                  onMarkAllRead={async () => {
                    if (onMarkAllNotificationsRead) await onMarkAllNotificationsRead('principal');
                  }}
                  onOpenDocument={(docId) => {
                    setSelectedPrincipalIssuedDocId(docId);
                    setPrincipalTab('principalDocs');
                  }}
                />

                {/* Principal Navigation Tabs */}
                <div className="px-6 pt-4 border-b border-[#E2E5E9] bg-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        id: 'documents' as PrincipalTab,
                        label: `All Teacher Documents (${uploadedDocuments.length})`,
                      },
                      {
                        id: 'principalDocs' as PrincipalTab,
                        label: `Upload & Share Docs (${principalDocuments.length})`,
                      },
                      {
                        id: 'requisitions' as PrincipalTab,
                        label: `Material Requisitions (${
                          materialRequisitions.filter((r) => r.ao2Status === 'Endorsed').length
                        })`,
                      },
                      {
                        id: 'leave' as PrincipalTab,
                        label: `Leave Applications (${
                          leaveApplications.filter(
                            (l) =>
                              l.ao2EndorsementStatus === 'Endorsed' &&
                              l.principalStatus === 'Pending'
                          ).length
                        } Pending)`,
                      },
                      {
                        id: 'calendar' as PrincipalTab,
                        label: `Calendar of Activities (${calendarActivities.length})`,
                      },
                      { id: 'posts' as PrincipalTab, label: 'Website Posts' },
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
                    <button
                      type="button"
                      onClick={() => onOpenInventoryPage('principal')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-[#0B291E] hover:text-[#15803D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Inventory ({inventoryItems.length})</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {principalTab === 'principalDocs' ? (
                  <div className="p-6">
                    <PrincipalDocumentsManager
                      mode="principal"
                      accentColor={frontendConfig.accentColor}
                      backendConfig={backendConfig}
                      principalDocuments={principalDocuments}
                      accountNotifications={accountNotifications}
                      authQueryParam={`principalToken=${encodeURIComponent(principalSession.token)}`}
                      selectedDocId={selectedPrincipalIssuedDocId}
                      onSelectDocId={setSelectedPrincipalIssuedDocId}
                      onUploadPrincipalDocument={onUploadPrincipalDocument}
                    />
                  </div>
                ) : principalTab === 'requisitions' ? (
                  <div className="p-6">
                    <PrincipalMaterialRequisitionView
                      accentColor={frontendConfig.accentColor}
                      requisitions={materialRequisitions}
                      onReviewRequisition={onPrincipalReviewRequisition}
                    />
                  </div>
                ) : principalTab === 'leave' ? (
                  <div className="p-6">
                    <LeaveApplicationWorkspace
                      mode="principal"
                      accentColor={frontendConfig.accentColor}
                      actorAccountId={principalStaffRecord?.id ?? 'staff-principal'}
                      actorRole="Principal"
                      actorName={principalDisplayName}
                      actorDepartmentOrGrade={
                        principalStaffRecord?.department ?? 'Office of the School Principal'
                      }
                      leaveApplications={leaveApplications}
                      onSubmitLeaveApplication={(payload) =>
                        onSubmitLeaveApplication('Principal', payload)
                      }
                      onPrincipalDecideLeave={onPrincipalDecideLeave}
                    />
                  </div>
                ) : principalTab === 'calendar' ? (
                  <div className="p-6">
                    <CalendarActivityManager
                      accentColor={frontendConfig.accentColor}
                      actorRoleLabel="Principal"
                      activities={calendarActivities}
                      onCreateActivity={(payload) =>
                        onCreateCalendarActivity
                          ? onCreateCalendarActivity('principal', payload)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                      onUpdateActivity={(id, payload) =>
                        onUpdateCalendarActivity
                          ? onUpdateCalendarActivity('principal', id, payload)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                      onDeleteActivity={(id) =>
                        onDeleteCalendarActivity
                          ? onDeleteCalendarActivity('principal', id)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                    />
                  </div>
                ) : principalTab === 'posts' ? (
                  <div className="p-6">
                    <PortalPostPublisher
                      accentColor={frontendConfig.accentColor}
                      actorName={principalDisplayName}
                      actorRole="Principal"
                      actorAccountId={principalStaffRecord?.id ?? 'staff-principal'}
                      homePosts={homePosts}
                      activityPosts={activityPosts}
                      onCreateHomePost={onCreateHomePost}
                      onDeleteHomePost={onDeleteHomePost}
                      onCreateActivityPost={onCreateActivityPost}
                      onDeleteActivityPost={onDeleteActivityPost}
                    />
                  </div>
                ) : principalTab === 'security' ? (
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
                        {mergedTeacherProfiles.map((t) => (
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
                          const teacher = mergedTeacherProfiles.find(
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
                            const author = mergedTeacherProfiles.find(
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
                        Administrator Username
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
                        placeholder={`e.g., ${primaryAo2Account?.username ?? 'r.gabrito'}`}
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
                      {primaryAo2Account?.fullName ?? 'AO-II Administrator'}
                    </h4>
                    <p className="text-xs text-[#525866]">
                      {primaryAo2Account?.title ?? 'Administrative Officer II (AO-II)'} · Full
                      authority over public site front-end appearance, back-end limits, enrollment
                      capacities, and all portal accounts.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {ao2AdminAccountsList.map((adm) => {
                      const isPrimary =
                        adm.accountId === primaryAo2Account?.accountId || Boolean(adm.isPrimary);
                      return (
                        <div
                          key={adm.accountId}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isPrimary
                              ? 'border-[#BBF7D0] bg-[#F4FBF6]'
                              : 'border-[#E2E5E9] bg-[#F8F9FA]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[#111315]">
                                {adm.fullName}
                              </span>
                              {isPrimary && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#DCFCE7] text-[#166534] rounded-md">
                                  Primary Sign-In Administrator
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#525866]">{adm.title}</div>
                            <div className="space-y-0.5 text-xs font-mono pt-0.5">
                              <div className="text-[#111315]">
                                Username: <strong>{adm.username}</strong>
                              </div>
                              <div className="text-[#525866]">
                                Password:{' '}
                                {!adm.hasCustomPassword ? (
                                  <strong className="text-[#111315]">
                                    {DEFAULT_AO2_PASSWORD}
                                  </strong>
                                ) : (
                                  <span className="italic">Custom password set</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAo2UsernameInput(adm.username);
                              if (!adm.hasCustomPassword) {
                                setAo2PasswordInput(DEFAULT_AO2_PASSWORD);
                              } else {
                                setAo2PasswordInput('');
                              }
                              setAo2LoginError('');
                            }}
                            style={{ color: frontendConfig.accentColor }}
                            className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-lg cursor-pointer shrink-0 self-start sm:self-center whitespace-nowrap"
                          >
                            {!adm.hasCustomPassword ? 'Fill Credentials' : 'Fill Username'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#F6FAF7]/95 backdrop-blur-xs rounded-2xl border border-[#C7DBD0] overflow-hidden shadow-xs">
                <div className="bg-gradient-to-r from-[#0B2B20] via-[#113A2C] to-[#15394D] px-6 py-5 border-b border-[#1E4D3B] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#C8E4D6]">
                      <span className="font-semibold text-[#6EE7B7]">
                        {ao2DisplayName}
                      </span>{' '}
                      · {ao2SignedInAccount?.title ?? 'Administrative Officer II (AO-II)'} · Account:{' '}
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

                {/* Interactive AO-II Top KPI Summary Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#D2E2D9] divide-y sm:divide-y-0 sm:divide-x divide-[#D2E2D9]">
                  <button
                    type="button"
                    onClick={() => setAo2Tab('records')}
                    className={`text-left p-5 space-y-1 bg-gradient-to-br from-white to-[#ECFDF5] hover:to-[#DCFCE7] transition-colors cursor-pointer ${
                      ao2Tab === 'records' ? 'ring-2 ring-inset ring-[#15803D]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#166534]">
                      Number of Students ({backendConfig.activeAcademicYear})
                    </div>
                    <div className="font-display text-2xl font-semibold text-[#0B291E] tabular-nums">
                      {ao2SchoolTotals.totalStudents}
                    </div>
                    <div className="text-[11px] text-[#15803D] font-mono tabular-nums font-medium">
                      {ao2SchoolTotals.totalAllStudentRecords} DB records ·{' '}
                      {ao2SchoolTotals.totalCapacity} total seats
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAo2Tab('accounts')}
                    className={`text-left p-5 space-y-1 bg-gradient-to-br from-white to-[#EFF6FF] hover:to-[#DBEAFE] transition-colors cursor-pointer ${
                      ao2Tab === 'accounts' ? 'ring-2 ring-inset ring-[#1D4ED8]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#1E40AF]">Number of Teachers</div>
                    <div className="font-display text-2xl font-semibold text-[#172554] tabular-nums">
                      {ao2SchoolTotals.totalTeachers}
                    </div>
                    <div className="text-[11px] text-[#1D4ED8] font-mono tabular-nums font-medium">
                      {ao2SchoolTotals.ratio} : 1 ratio · {teacherAccounts.length} portal accounts
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAo2Tab('endorsed')}
                    className={`text-left p-5 space-y-1 bg-gradient-to-br from-white to-[#F0FDFA] hover:to-[#CCFBF1] transition-colors cursor-pointer ${
                      ao2Tab === 'endorsed' ? 'ring-2 ring-inset ring-[#0F766E]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#115E59]">Endorsed Documents</div>
                    <div className="font-display text-2xl font-semibold text-[#0F766E] tabular-nums">
                      {ao2EndorsedDocs.length}
                    </div>
                    <div className="text-[11px] text-[#0F766E] font-medium">
                      Endorsed/Principal ready to print
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAo2Tab('admissions')}
                    className={`text-left p-5 space-y-1 bg-gradient-to-br from-white to-[#FFFBEB] hover:to-[#FEF3C7] transition-colors cursor-pointer ${
                      ao2Tab === 'admissions' ? 'ring-2 ring-inset ring-[#B45309]/35' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#92400E]">Parents/Guardian Inquiries</div>
                    <div className="font-display text-2xl font-semibold text-[#B45309] tabular-nums">
                      {admissionsSubmissions.length}
                    </div>
                    <div className="text-[11px] text-[#B45309] font-medium">
                      {backendConfig.admissionsOpen ? 'Inquiry Form Open' : 'Inquiry Form Paused'}
                    </div>
                  </button>
                </div>

                {/* AO-II Account Notifications Bar */}
                <AccountNotificationsBar
                  accentColor={frontendConfig.accentColor}
                  currentAccountId={
                    ao2Session.accountId ?? primaryAo2Account?.accountId ?? 'staff-danlog-gabrito'
                  }
                  notifications={accountNotifications}
                  onMarkRead={async (id) => {
                    if (onMarkNotificationRead) await onMarkNotificationRead(id, 'ao2');
                  }}
                  onMarkAllRead={async () => {
                    if (onMarkAllNotificationsRead) await onMarkAllNotificationsRead('ao2');
                  }}
                  onOpenDocument={(docId) => {
                    setSelectedPrincipalIssuedDocId(docId);
                    setAo2Tab('principalDocs');
                  }}
                />

                {/* AO-II Navigation Tabs */}
                <div className="px-6 pt-4 border-b border-[#E2E5E9] bg-white flex flex-wrap gap-2">
                  {[
                    { id: 'dashboard' as Ao2Tab, label: 'AO-II Dashboard' },
                    {
                      id: 'records' as Ao2Tab,
                      label: `Staff & Students (${staffRecords.length + studentRecords.length})`,
                    },
                    {
                      id: 'requisitions' as Ao2Tab,
                      label: `Material Requisitions (${materialRequisitions.length})`,
                    },
                    {
                      id: 'leave' as Ao2Tab,
                      label: `Leave Applications (${leaveApplications.length})`,
                    },
                    {
                      id: 'calendar' as Ao2Tab,
                      label: `Calendar (${calendarActivities.length})`,
                    },
                    { id: 'posts' as Ao2Tab, label: 'Website Posts' },
                    {
                      id: 'endorsed' as Ao2Tab,
                      label: `Endorsed Docs (${ao2EndorsedDocs.length})`,
                    },
                    {
                      id: 'principalDocs' as Ao2Tab,
                      label: `Principal Docs (${principalDocuments.length})`,
                    },
                    { id: 'frontend' as Ao2Tab, label: 'Front-End Settings' },
                    { id: 'backend' as Ao2Tab, label: 'Back-End Policies' },
                    {
                      id: 'accounts' as Ao2Tab,
                      label: `Staff & Portal Accounts (${
                        teacherAccounts.length +
                        (principalAccount ? 1 : 0) +
                        ao2AdminAccountsList.length
                      })`,
                    },
                    {
                      id: 'admissions' as Ao2Tab,
                      label: `Parent Inquiries (${admissionsSubmissions.length})`,
                    },
                    { id: 'audit' as Ao2Tab, label: `System Audit Log (${auditLog.length})` },
                    { id: 'database' as Ao2Tab, label: 'Database' },
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
                  <button
                    type="button"
                    onClick={() => onOpenInventoryPage('ao2')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-[#0B291E] hover:text-[#15803D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Inventory ({inventoryItems.length})</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
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

                  {/* AO-II TAB: STAFF & STUDENTS RECORDS CRUD MANAGER */}
                  {ao2Tab === 'records' && (
                    <Ao2StaffStudentsManager
                      accentColor={frontendConfig.accentColor}
                      activeAcademicYear={backendConfig.activeAcademicYear}
                      staffRecords={staffRecords}
                      studentRecords={studentRecords}
                      onAddStaff={onAo2AddStaffRecord}
                      onUpdateStaff={onAo2UpdateStaffRecord}
                      onDeleteStaff={onAo2DeleteStaffRecord}
                      onAddStudent={onAo2AddStudentRecord}
                      onUpdateStudent={onAo2UpdateStudentRecord}
                      onDeleteStudent={onAo2DeleteStudentRecord}
                      onReportFeedback={(kind, message) => {
                        if (kind === 'success') {
                          setAo2ErrorMessage('');
                          setAo2SaveMessage(message);
                        } else {
                          setAo2SaveMessage('');
                          setAo2ErrorMessage(message);
                        }
                      }}
                    />
                  )}

                  {/* AO-II TAB: MATERIAL REQUISITIONS REVIEW */}
                  {ao2Tab === 'requisitions' && (
                    <Ao2MaterialRequisitionView
                      accentColor={frontendConfig.accentColor}
                      requisitions={materialRequisitions}
                      onReviewRequisition={onAo2ReviewRequisition}
                    />
                  )}

                  {/* AO-II TAB: LEAVE APPLICATIONS (ALL ACCOUNTS APPLY · AO-II EDITS ENTRIES) */}
                  {ao2Tab === 'leave' && (
                    <LeaveApplicationWorkspace
                      mode="ao2"
                      accentColor={frontendConfig.accentColor}
                      actorAccountId={
                        ao2Session.accountId ?? primaryAo2Account?.accountId ?? 'staff-danlog-gabrito'
                      }
                      actorRole="AO-II"
                      actorName={ao2DisplayName}
                      actorDepartmentOrGrade={
                        ao2SignedInAccount?.title ?? 'Administrative Officer II (AO-II)'
                      }
                      leaveApplications={leaveApplications}
                      onSubmitLeaveApplication={(payload) =>
                        onSubmitLeaveApplication('AO-II', payload)
                      }
                      onAo2EditLeaveApplication={onAo2EditLeaveApplication}
                      onAo2EndorseLeaveApplication={onAo2EndorseLeaveApplication}
                      onAo2DeleteLeaveApplication={onAo2DeleteLeaveApplication}
                    />
                  )}

                  {/* AO-II TAB: SCHOOL CALENDAR OF ACTIVITIES CRUD */}
                  {ao2Tab === 'calendar' && (
                    <CalendarActivityManager
                      accentColor={frontendConfig.accentColor}
                      actorRoleLabel="AO-II"
                      activities={calendarActivities}
                      onCreateActivity={(payload) =>
                        onCreateCalendarActivity
                          ? onCreateCalendarActivity('ao2', payload)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                      onUpdateActivity={(id, payload) =>
                        onUpdateCalendarActivity
                          ? onUpdateCalendarActivity('ao2', id, payload)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                      onDeleteActivity={(id) =>
                        onDeleteCalendarActivity
                          ? onDeleteCalendarActivity('ao2', id)
                          : Promise.resolve({
                              ok: false,
                              error: 'Calendar updates are not available.',
                            })
                      }
                    />
                  )}

                  {/* AO-II TAB: WEBSITE POSTS & STUDENT ACTIVITIES */}
                  {ao2Tab === 'posts' && (
                    <PortalPostPublisher
                      accentColor={frontendConfig.accentColor}
                      actorName={ao2DisplayName}
                      actorRole="AO-II"
                      actorAccountId={
                        ao2Session.accountId ?? primaryAo2Account?.accountId ?? 'staff-danlog-gabrito'
                      }
                      homePosts={homePosts}
                      activityPosts={activityPosts}
                      onCreateHomePost={onCreateHomePost}
                      onDeleteHomePost={onDeleteHomePost}
                      onCreateActivityPost={onCreateActivityPost}
                      onDeleteActivityPost={onDeleteActivityPost}
                    />
                  )}

                  {/* AO-II TAB: DOCUMENTS UPLOADED BY PRINCIPAL */}
                  {ao2Tab === 'principalDocs' && (
                    <PrincipalDocumentsManager
                      mode="ao2"
                      accentColor={frontendConfig.accentColor}
                      backendConfig={backendConfig}
                      principalDocuments={principalDocuments}
                      accountNotifications={accountNotifications}
                      authQueryParam={`ao2Token=${encodeURIComponent(ao2Session.token)}`}
                      selectedDocId={selectedPrincipalIssuedDocId}
                      onSelectDocId={setSelectedPrincipalIssuedDocId}
                      onDeletePrincipalDocument={onAo2DeletePrincipalDocument}
                    />
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
                                const author = mergedTeacherProfiles.find(
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

                        {/* Interactive Grade-Level Students & Teachers Breakdown */}
                        <div className="lg:col-span-6 bg-white rounded-xl border border-[#C7D9EE] overflow-hidden shadow-xs">
                          <div className="px-5 py-4 bg-gradient-to-r from-[#EFF6FF] to-[#F4F8FD] border-b border-[#D4E2F2] flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-display text-lg font-semibold text-[#111315]">
                                Students &amp; Teachers by Grade Level
                              </h4>
                              <p className="text-xs text-[#525866]">
                                Active School Year {backendConfig.activeAcademicYear} ·{' '}
                                {ao2SchoolTotals.totalStudents} Students ·{' '}
                                {ao2SchoolTotals.totalTeachers} Teachers (Live from database records)
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(['All', 'Primary (K–3)', 'Intermediate (4–6)'] as const).map(
                                (divOpt) => {
                                  const active = ao2DashDivision === divOpt;
                                  return (
                                    <button
                                      key={divOpt}
                                      type="button"
                                      onClick={() => setAo2DashDivision(divOpt)}
                                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                                        active
                                          ? 'bg-[#0F3D2E] text-white'
                                          : 'bg-white text-[#525866] border border-[#DCE0E6] hover:text-[#111315]'
                                      }`}
                                    >
                                      {divOpt === 'All'
                                        ? 'All'
                                        : divOpt === 'Primary (K–3)'
                                        ? 'K–3'
                                        : '4–6'}
                                    </button>
                                  );
                                }
                              )}
                              <button
                                type="button"
                                onClick={() => setAo2Tab('backend')}
                                style={{ color: frontendConfig.accentColor }}
                                className="text-xs font-semibold hover:underline underline-offset-4 cursor-pointer shrink-0 ml-1"
                              >
                                Full Controls
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-[#E2E5E9] bg-[#F8F9FA] text-[11px] font-semibold text-[#525866]">
                                  <th className="py-2.5 px-4">Grade</th>
                                  <th className="py-2.5 px-3 text-right">Students</th>
                                  <th className="py-2.5 px-3 text-right">Seat Capacity</th>
                                  <th className="py-2.5 px-3 text-right">Teachers</th>
                                  <th className="py-2.5 px-4">Faculty Lead</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {ao2SchoolTotals.activeRows
                                  .filter(
                                    (row) =>
                                      ao2DashDivision === 'All' || row.division === ao2DashDivision
                                  )
                                  .map((row) => (
                                    <tr key={row.id} className="hover:bg-[#F8F9FA]">
                                      <td className="py-2.5 px-4 font-semibold text-[#111315]">
                                        {row.gradeLabel}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#111315]">
                                        {row.enrolledStudents}
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void onUpdateCapacity(
                                                backendConfig.activeAcademicYear,
                                                row.id,
                                                Math.max(row.enrolledStudents, row.capacity - 1)
                                              )
                                            }
                                            aria-label={`Decrease seat capacity for ${row.gradeLabel}`}
                                            className="w-5 h-5 inline-flex items-center justify-center rounded border border-[#DCE0E6] bg-[#F8F9FA] text-[#525866] hover:bg-white hover:text-[#111315] cursor-pointer"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <span className="font-mono tabular-nums text-[#525866] w-7 text-center">
                                            {row.capacity}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void onUpdateCapacity(
                                                backendConfig.activeAcademicYear,
                                                row.id,
                                                row.capacity + 1
                                              )
                                            }
                                            aria-label={`Increase seat capacity for ${row.gradeLabel}`}
                                            className="w-5 h-5 inline-flex items-center justify-center rounded border border-[#DCE0E6] bg-[#F8F9FA] text-[#525866] hover:bg-white hover:text-[#111315] cursor-pointer"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#111315]">
                                        {row.teachers}
                                      </td>
                                      <td className="py-2.5 px-4 text-[#525866]">{row.facultyLead}</td>
                                    </tr>
                                  ))}
                                {ao2DashDivision === 'All' &&
                                  (ao2SchoolTotals.unassignedStudents > 0 ||
                                    ao2SchoolTotals.unassignedTeachers > 0) && (
                                    <tr className="bg-[#F8FAFC] text-[#525866]">
                                      <td className="py-2.5 px-4 font-medium text-[#111315]">
                                        School-Wide / Other Grade
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        {ao2SchoolTotals.unassignedStudents}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        —
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        {ao2SchoolTotals.unassignedTeachers}
                                      </td>
                                      <td className="py-2.5 px-4">School-Wide Assignment</td>
                                    </tr>
                                  )}
                              </tbody>
                              <tfoot>
                                {(() => {
                                  const visibleRows = ao2SchoolTotals.activeRows.filter(
                                    (row) =>
                                      ao2DashDivision === 'All' || row.division === ao2DashDivision
                                  );
                                  const footerStudents =
                                    ao2DashDivision === 'All'
                                      ? ao2SchoolTotals.totalStudents
                                      : visibleRows.reduce((s, r) => s + r.enrolledStudents, 0);
                                  const footerCapacity = visibleRows.reduce(
                                    (s, r) => s + r.capacity,
                                    0
                                  );
                                  const footerTeachers =
                                    ao2DashDivision === 'All'
                                      ? ao2SchoolTotals.totalTeachers
                                      : visibleRows.reduce((s, r) => s + r.teachers, 0);
                                  const footerSections = visibleRows.reduce(
                                    (s, r) => s + r.sections,
                                    0
                                  );
                                  return (
                                    <tr className="border-t border-[#DCE0E6] bg-[#F8F9FA] font-semibold text-[#111315]">
                                      <td className="py-2.5 px-4">
                                        {ao2DashDivision === 'All'
                                          ? 'School Total'
                                          : `${ao2DashDivision} Total`}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        {footerStudents}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525866]">
                                        {footerCapacity}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        {footerTeachers}
                                      </td>
                                      <td className="py-2.5 px-4 text-[11px] text-[#525866]">
                                        {footerSections} total sections
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </tfoot>
                            </table>
                          </div>
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
                            {mergedTeacherProfiles.map((t) => (
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
                            Once {principalDisplayName} approves a teacher submission in the
                            Principal&apos;s Office portal, it will appear here automatically as{' '}
                            <strong>Endorsed/Principal</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                            {ao2FilteredEndorsedDocs.map((doc) => {
                              const teacher = mergedTeacherProfiles.find(
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
                                const author = mergedTeacherProfiles.find(
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
                                            {author?.name ?? 'Faculty Member'}
                                          </span>{' '}
                                          · Certified by{' '}
                                          <span className="font-semibold text-[#111315]">
                                            {inspectedAo2Doc.endorsedBy ??
                                              `${principalDisplayName} (${principalRoleTitle})`}
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

                  {/* AO-II TAB 4: STAFF & PORTAL ACCOUNTS (ADD, UPDATE, DELETE) */}
                  {ao2Tab === 'accounts' && (
                    <div className="space-y-6">
                      {/* Teacher & Faculty Portal Accounts (Add, Edit Profile & Credentials, Delete) */}
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-display text-lg font-semibold text-[#111315]">
                              Teacher &amp; Staff Portal Accounts ({mergedTeacherProfiles.length})
                            </h4>
                            <p className="text-xs text-[#525866]">
                              Add new faculty portal logins, edit profile details &amp; credentials,
                              or delete accounts. All changes persist to the database and sync
                              across all pages immediately.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAo2SaveMessage('');
                              setAo2ErrorMessage('');
                              setAddAccountMode('portal');
                              setShowAddAccountModal(true);
                            }}
                            style={{ backgroundColor: frontendConfig.accentColor }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0 self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Staff &amp; Portal Account</span>
                          </button>
                        </div>

                        {mergedTeacherProfiles.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-[#DCE0E6] p-8 text-center text-xs text-[#525866]">
                            No teacher portal accounts found. Click{' '}
                            <strong>Add Staff &amp; Portal Account</strong> above to create one.
                          </div>
                        ) : (
                          <div className="divide-y divide-[#E2E5E9]">
                            {mergedTeacherProfiles.map((t) => {
                              const acc = teacherAccounts.find((a) => a.teacherId === t.id);
                              const draft = accountDrafts[t.id] ?? {
                                username: acc?.username ?? '',
                                newPassword: '',
                                fullName: t.name,
                                title: t.title,
                                department: t.department,
                                assignedGradeId: t.assignedGradeId,
                                assignedGradeLabel: t.assignedGradeLabel,
                                room: t.room,
                                email: t.email,
                                employmentStatus: 'Regular / Permanent' as const,
                              };
                              const isEditingProfile = editingAccountProfileId === t.id;
                              const isConfirmingDelete = confirmDeleteAccountId === t.id;
                              const isBusy = accountBusyId === t.id;

                              return (
                                <div key={t.id} className="py-5 space-y-4">
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                    <div className="lg:col-span-4 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-[#111315]">
                                          {t.name}
                                        </span>
                                        <span className="text-[11px] font-medium text-[#15803D]">
                                          {t.title}
                                        </span>
                                      </div>
                                      <div className="text-xs text-[#525866]">
                                        {t.assignedGradeLabel} · {t.room}
                                      </div>
                                      <div className="text-[11px] font-mono text-[#525866]">
                                        ID: {t.id} · Updated: {acc?.updatedAt ?? 'Default'}
                                      </div>
                                    </div>

                                    <div className="lg:col-span-2">
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

                                    <div className="lg:col-span-3 flex flex-wrap items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingAccountProfileId((prev) =>
                                            prev === t.id ? null : t.id
                                          )
                                        }
                                        className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap shrink-0 ${
                                          isEditingProfile
                                            ? 'border-[#0B291E] bg-[#ECFDF5] text-[#0B291E]'
                                            : 'border-[#DCE0E6] bg-white text-[#111315] hover:bg-[#F8F9FA]'
                                        }`}
                                      >
                                        <Pencil className="w-3 h-3" />
                                        <span>{isEditingProfile ? 'Hide Profile' : 'Edit Profile'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={async () => {
                                          setAo2SaveMessage('');
                                          setAo2ErrorMessage('');
                                          setAccountBusyId(t.id);
                                          const res = await onAo2UpdateTeacherAccount(
                                            t.id,
                                            draft.username,
                                            draft.newPassword || undefined,
                                            {
                                              fullName: draft.fullName,
                                              title: draft.title,
                                              department: draft.department,
                                              assignedGradeId: draft.assignedGradeId,
                                              assignedGradeLabel: draft.assignedGradeLabel,
                                              room: draft.room,
                                              email: draft.email,
                                              employmentStatus: draft.employmentStatus,
                                            }
                                          );
                                          setAccountBusyId(null);
                                          if (!res.ok) {
                                            setAo2ErrorMessage(
                                              res.error || 'Failed to update teacher account.'
                                            );
                                            return;
                                          }
                                          setAccountDrafts((prev) => ({
                                            ...prev,
                                            [t.id]: { ...draft, newPassword: '' },
                                          }));
                                          setEditingAccountProfileId(null);
                                          setAo2SaveMessage(
                                            `Saved database updates for ${draft.fullName} (@${draft.username}).`
                                          );
                                        }}
                                        style={{ backgroundColor: frontendConfig.accentColor }}
                                        className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                                      >
                                        Save
                                      </button>

                                      {isConfirmingDelete ? (
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={async () => {
                                              setAo2SaveMessage('');
                                              setAo2ErrorMessage('');
                                              setAccountBusyId(t.id);
                                              const res = await onAo2DeleteTeacherAccount(t.id);
                                              setAccountBusyId(null);
                                              setConfirmDeleteAccountId(null);
                                              if (!res.ok) {
                                                setAo2ErrorMessage(
                                                  res.error || 'Could not delete teacher account.'
                                                );
                                                return;
                                              }
                                              setAo2SaveMessage(
                                                `Deleted portal account and staff record for ${t.name}.`
                                              );
                                            }}
                                            className="px-2.5 py-2 text-xs font-semibold bg-[#B91C1C] text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteAccountId(null)}
                                            className="px-2 py-2 text-xs font-semibold border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteAccountId(t.id)}
                                          aria-label={`Delete ${t.name} account`}
                                          className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {isEditingProfile && (
                                    <div className="p-4 rounded-xl border border-[#CBDAD0] bg-[#F8FBF9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Full Name
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.fullName}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: { ...draft, fullName: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Position / Title
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.title}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: { ...draft, title: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Department
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.department}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: { ...draft, department: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Assigned Grade
                                        </label>
                                        <select
                                          value={draft.assignedGradeId}
                                          onChange={(e) => {
                                            const gradeId = e.target.value;
                                            const gradeLabels: Record<string, string> = {
                                              k: 'Kindergarten · Primary Division',
                                              g1: 'Grade 1 · Primary Division',
                                              g2: 'Grade 2 · Primary Division',
                                              g3: 'Grade 3 · Primary Division',
                                              g4: 'Grade 4 · Intermediate Division',
                                              g5: 'Grade 5 · Intermediate Division',
                                              g6: 'Grade 6 · Intermediate Division',
                                              all: 'School-Wide Faculty (K–6)',
                                            };
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: {
                                                ...draft,
                                                assignedGradeId: gradeId,
                                                assignedGradeLabel:
                                                  gradeLabels[gradeId] ?? draft.assignedGradeLabel,
                                              },
                                            }));
                                          }}
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        >
                                          <option value="k">Kindergarten</option>
                                          <option value="g1">Grade 1</option>
                                          <option value="g2">Grade 2</option>
                                          <option value="g3">Grade 3</option>
                                          <option value="g4">Grade 4</option>
                                          <option value="g5">Grade 5</option>
                                          <option value="g6">Grade 6</option>
                                          <option value="all">All Grades (K–6)</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Grade / Section Label
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.assignedGradeLabel}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: {
                                                ...draft,
                                                assignedGradeLabel: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Room / Station
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.room}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: { ...draft, room: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Email
                                        </label>
                                        <input
                                          type="email"
                                          value={draft.email}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: { ...draft, email: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                          Employment Status
                                        </label>
                                        <select
                                          value={draft.employmentStatus}
                                          onChange={(e) =>
                                            setAccountDrafts((prev) => ({
                                              ...prev,
                                              [t.id]: {
                                                ...draft,
                                                employmentStatus: e.target
                                                  .value as StaffMemberRecord['employmentStatus'],
                                              },
                                            }))
                                          }
                                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                        >
                                          <option value="Regular / Permanent">
                                            Regular / Permanent
                                          </option>
                                          <option value="Contractual">Contractual</option>
                                          <option value="Volunteer">Volunteer</option>
                                          <option value="On Leave">On Leave</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Principal & AO-II Administrator Accounts */}
                      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-display text-lg font-semibold text-[#111315]">
                              Principal &amp; AO-II Administrator Accounts (
                              {(principalAccount ? 1 : 0) + ao2AdminAccountsList.length})
                            </h4>
                            <p className="text-xs text-[#525866]">
                              Update display name, title, login username, and password, or set which
                              Administrator account appears in AO-II Admin Console Sign In.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            {!principalAccount && onAo2CreatePrincipalAccount && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAo2SaveMessage('');
                                  setAo2ErrorMessage('');
                                  setAddAccountMode('principal');
                                  setNewAccRole('Principal');
                                  setNewAccTitle('School Principal');
                                  setNewAccDepartment('Office of the School Principal');
                                  setNewAccGradeId('all');
                                  setNewAccGradeLabel('School-Wide Oversight (K–6)');
                                  setNewAccRoom('Administration Wing · Office 101');
                                  setShowAddAccountModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#CBD5E1] bg-white text-[#111315] hover:bg-[#F8FAFC] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Principal Account</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setAo2SaveMessage('');
                                setAo2ErrorMessage('');
                                setAddAccountMode('admin');
                                setNewAccRole('Administrative Officer');
                                setNewAccTitle('Administrative Officer II (AO-II)');
                                setNewAccDepartment('Records, Enrollment & Property Supply');
                                setNewAccGradeId('all');
                                setNewAccGradeLabel('School-Wide Administration');
                                setNewAccRoom('Administration Wing · Registrar Desk');
                                setNewAccSetPrimaryAdmin(true);
                                setShowAddAccountModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0B291E] text-white hover:bg-[#134231] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add AO-II Administrator</span>
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-[#E2E5E9]">
                          {/* Principal Credential Row (when configured) */}
                          {principalAccount && (
                            <div className="py-5 space-y-3">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                <div className="lg:col-span-3 space-y-1">
                                  <div className="text-sm font-semibold text-[#111315]">
                                    {principalDisplayName}
                                  </div>
                                  <div className="text-xs text-[#525866]">{principalRoleTitle}</div>
                                  <div className="text-[11px] font-mono text-[#525866]">
                                    Updated: {principalAccount.updatedAt}
                                  </div>
                                </div>

                                <div className="lg:col-span-3">
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Principal Full Name
                                  </label>
                                  <input
                                    type="text"
                                    value={principalDraft.fullName}
                                    onChange={(e) =>
                                      setPrincipalDraft((p) => ({ ...p, fullName: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div className="lg:col-span-2">
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

                                <div className="lg:col-span-2">
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Reset Password
                                  </label>
                                  <input
                                    type="password"
                                    value={principalDraft.newPassword}
                                    placeholder="Keep current"
                                    onChange={(e) =>
                                      setPrincipalDraft((p) => ({
                                        ...p,
                                        newPassword: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setAo2SaveMessage('');
                                      setAo2ErrorMessage('');
                                      const res = await onAo2UpdatePrincipalAccount(
                                        principalDraft.username,
                                        principalDraft.newPassword || undefined,
                                        {
                                          fullName: principalDraft.fullName,
                                          title: principalDraft.title,
                                        }
                                      );
                                      if (!res.ok) {
                                        setAo2ErrorMessage(
                                          res.error || 'Failed to update Principal credentials.'
                                        );
                                        return;
                                      }
                                      setPrincipalDraft((p) => ({ ...p, newPassword: '' }));
                                      setAo2SaveMessage(
                                        `Updated Principal account (${principalDraft.fullName} · @${principalDraft.username}).`
                                      );
                                    }}
                                    style={{ backgroundColor: frontendConfig.accentColor }}
                                    className="px-3 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    Save
                                  </button>

                                  {onAo2DeletePrincipalAccount &&
                                    (confirmDeletePrincipal ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            setAo2SaveMessage('');
                                            setAo2ErrorMessage('');
                                            const res = await onAo2DeletePrincipalAccount();
                                            setConfirmDeletePrincipal(false);
                                            if (!res.ok) {
                                              setAo2ErrorMessage(
                                                res.error || 'Could not delete Principal account.'
                                              );
                                              return;
                                            }
                                            setAo2SaveMessage(
                                              `Removed School Principal account (${principalDisplayName}).`
                                            );
                                          }}
                                          className="px-2 py-2 text-[11px] font-semibold bg-[#B91C1C] text-white rounded-lg cursor-pointer"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeletePrincipal(false)}
                                          className="px-2 py-2 text-[11px] border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeletePrincipal(true)}
                                        aria-label={`Delete ${principalDisplayName}`}
                                        className="p-2 text-xs font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* All AO-II Administrator Accounts */}
                          {ao2AdminAccountsList.map((adm) => {
                            const draft = ao2AdminDrafts[adm.accountId] ?? {
                              username: adm.username,
                              newPassword: '',
                              fullName: adm.fullName,
                              title: adm.title,
                            };
                            const isPrimary =
                              adm.accountId === primaryAo2Account?.accountId ||
                              Boolean(adm.isPrimary);
                            const isConfirmingDel = confirmDeleteAdminId === adm.accountId;

                            return (
                              <div key={adm.accountId} className="py-5 space-y-3">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                  <div className="lg:col-span-3 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-sm font-semibold text-[#111315]">
                                        {adm.fullName}
                                      </span>
                                      {isPrimary && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#DCFCE7] text-[#166534] rounded-md">
                                          Sign-In Primary
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#525866]">{adm.title}</div>
                                    <div className="text-[11px] font-mono text-[#525866]">
                                      ID: {adm.accountId} · Updated: {adm.updatedAt}
                                    </div>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <label className="block text-xs font-semibold text-[#111315] mb-1">
                                      Administrator Full Name
                                    </label>
                                    <input
                                      type="text"
                                      value={draft.fullName}
                                      onChange={(e) =>
                                        setAo2AdminDrafts((p) => ({
                                          ...p,
                                          [adm.accountId]: { ...draft, fullName: e.target.value },
                                        }))
                                      }
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                    />
                                  </div>

                                  <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-[#111315] mb-1">
                                      AO-II Username
                                    </label>
                                    <input
                                      type="text"
                                      value={draft.username}
                                      onChange={(e) =>
                                        setAo2AdminDrafts((p) => ({
                                          ...p,
                                          [adm.accountId]: { ...draft, username: e.target.value },
                                        }))
                                      }
                                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                    />
                                  </div>

                                  <div className="lg:col-span-2">
                                    <label className="block text-xs font-semibold text-[#111315] mb-1">
                                      Update Password
                                    </label>
                                    <input
                                      type="password"
                                      value={draft.newPassword}
                                      placeholder="Keep current"
                                      onChange={(e) =>
                                        setAo2AdminDrafts((p) => ({
                                          ...p,
                                          [adm.accountId]: {
                                            ...draft,
                                            newPassword: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                    />
                                  </div>

                                  <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-1.5">
                                    {!isPrimary && onAo2SetPrimaryAdminAccount && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          setAo2SaveMessage('');
                                          setAo2ErrorMessage('');
                                          const res = await onAo2SetPrimaryAdminAccount(
                                            adm.accountId
                                          );
                                          if (!res.ok) {
                                            setAo2ErrorMessage(
                                              res.error || 'Could not set primary administrator.'
                                            );
                                            return;
                                          }
                                          setAo2SaveMessage(
                                            `Set ${adm.fullName} (@${adm.username}) as Primary AO-II Console Sign-In Administrator.`
                                          );
                                        }}
                                        className="px-2.5 py-2 text-[11px] font-semibold border border-[#BBF7D0] bg-[#ECFDF5] text-[#0B291E] hover:bg-[#DCFCE7] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                                      >
                                        Use in Sign In
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setAo2SaveMessage('');
                                        setAo2ErrorMessage('');
                                        const res = await onAo2UpdateOwnAccount(
                                          draft.username,
                                          draft.newPassword || undefined,
                                          {
                                            accountId: adm.accountId,
                                            fullName: draft.fullName,
                                            title: draft.title,
                                          }
                                        );
                                        if (!res.ok) {
                                          setAo2ErrorMessage(
                                            res.error || 'Failed to update AO-II credentials.'
                                          );
                                          return;
                                        }
                                        setAo2AdminDrafts((p) => ({
                                          ...p,
                                          [adm.accountId]: { ...draft, newPassword: '' },
                                        }));
                                        setAo2SaveMessage(
                                          `Updated AO-II Administrator account (${draft.fullName} · @${draft.username}).`
                                        );
                                      }}
                                      style={{ backgroundColor: frontendConfig.accentColor }}
                                      className="px-3 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      Save
                                    </button>

                                    {ao2AdminAccountsList.length > 1 &&
                                      onAo2DeleteAdminAccount &&
                                      (isConfirmingDel ? (
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              setAo2SaveMessage('');
                                              setAo2ErrorMessage('');
                                              const res = await onAo2DeleteAdminAccount(
                                                adm.accountId
                                              );
                                              setConfirmDeleteAdminId(null);
                                              if (!res.ok) {
                                                setAo2ErrorMessage(
                                                  res.error ||
                                                    'Could not delete administrator account.'
                                                );
                                                return;
                                              }
                                              setAo2SaveMessage(
                                                `Deleted AO-II Administrator account (${adm.fullName}).`
                                              );
                                            }}
                                            className="px-2 py-2 text-[11px] font-semibold bg-[#B91C1C] text-white rounded-lg cursor-pointer"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteAdminId(null)}
                                            className="px-2 py-2 text-[11px] border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteAdminId(adm.accountId)}
                                          aria-label={`Delete ${adm.fullName}`}
                                          className="p-2 text-xs font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Staff & Portal Account Dialog Box Modal */}
                      {showAddAccountModal && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1426]/60 backdrop-blur-xs"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="add-account-modal-title"
                          onClick={(e) => {
                            if (e.target === e.currentTarget && !isCreatingAccount) {
                              setShowAddAccountModal(false);
                            }
                          }}
                        >
                          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#CBDAD0] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                            <div className="px-6 py-4 bg-[#0B291E] text-white flex items-center justify-between gap-4">
                              <div>
                                <div className="text-[11px] font-semibold text-[#A7F3D0]">
                                  AO-II Account &amp; Personnel Provisioning
                                </div>
                                <h3
                                  id="add-account-modal-title"
                                  className="font-display text-lg font-semibold"
                                >
                                  Add New Staff &amp; Portal Account
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAddAccountModal(false)}
                                disabled={isCreatingAccount}
                                aria-label="Close modal"
                                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setAo2SaveMessage('');
                                setAo2ErrorMessage('');
                                setIsCreatingAccount(true);

                                if (addAccountMode === 'portal') {
                                  const res = await onAo2CreateTeacherAccount({
                                    fullName: newAccFullName.trim(),
                                    title: newAccTitle.trim() || 'Classroom Adviser',
                                    department: newAccDepartment.trim() || 'General Faculty',
                                    assignedGradeId: newAccGradeId,
                                    assignedGradeLabel: newAccGradeLabel.trim(),
                                    room: newAccRoom.trim() || 'Main Building',
                                    email: newAccEmail.trim(),
                                    employmentStatus: newAccStatus,
                                    username: newAccUsername.trim(),
                                    newPassword: newAccPassword.trim(),
                                  });
                                  setIsCreatingAccount(false);
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Could not create teacher portal account.'
                                    );
                                    return;
                                  }
                                  setAo2SaveMessage(
                                    `Created Teacher Portal account for ${newAccFullName.trim()} (@${newAccUsername.trim()}).`
                                  );
                                } else if (addAccountMode === 'admin') {
                                  if (!onAo2CreateAdminAccount) {
                                    setIsCreatingAccount(false);
                                    return;
                                  }
                                  const res = await onAo2CreateAdminAccount({
                                    fullName: newAccFullName.trim(),
                                    title:
                                      newAccTitle.trim() || 'Administrative Officer II (AO-II)',
                                    department:
                                      newAccDepartment.trim() ||
                                      'Records, Enrollment & Property Supply',
                                    room: newAccRoom.trim() || 'Administration Building',
                                    email: newAccEmail.trim(),
                                    employmentStatus: newAccStatus,
                                    username: newAccUsername.trim(),
                                    newPassword: newAccPassword.trim(),
                                    setAsPrimary: newAccSetPrimaryAdmin,
                                  });
                                  setIsCreatingAccount(false);
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Could not create AO-II administrator account.'
                                    );
                                    return;
                                  }
                                  setAo2SaveMessage(
                                    `Created AO-II Administrator account for ${newAccFullName.trim()} (@${newAccUsername.trim()})${newAccSetPrimaryAdmin ? ' and set as Primary Sign-In Administrator' : ''}.`
                                  );
                                } else if (addAccountMode === 'principal') {
                                  if (!onAo2CreatePrincipalAccount) {
                                    setIsCreatingAccount(false);
                                    return;
                                  }
                                  const res = await onAo2CreatePrincipalAccount({
                                    fullName: newAccFullName.trim(),
                                    title: newAccTitle.trim() || 'School Principal',
                                    department:
                                      newAccDepartment.trim() || 'Office of the School Principal',
                                    room: newAccRoom.trim() || 'Administration Wing · Office 101',
                                    email: newAccEmail.trim(),
                                    employmentStatus: newAccStatus,
                                    username: newAccUsername.trim(),
                                    newPassword: newAccPassword.trim(),
                                  });
                                  setIsCreatingAccount(false);
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Could not create Principal account.'
                                    );
                                    return;
                                  }
                                  setAo2SaveMessage(
                                    `Created School Principal account for ${newAccFullName.trim()} (@${newAccUsername.trim()}).`
                                  );
                                } else {
                                  const res = await onAo2AddStaffRecord({
                                    fullName: newAccFullName.trim(),
                                    role: newAccRole,
                                    title: newAccTitle.trim() || newAccRole,
                                    department: newAccDepartment.trim() || 'General Faculty',
                                    assignedGradeId: newAccGradeId,
                                    assignedGradeLabel: newAccGradeLabel.trim(),
                                    email: newAccEmail.trim(),
                                    phone: '+63 (56) 555-0184',
                                    room: newAccRoom.trim() || 'Main Building',
                                    officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
                                    employmentStatus: newAccStatus,
                                    createPortalLogin: false,
                                  });
                                  setIsCreatingAccount(false);
                                  if (!res.ok) {
                                    setAo2ErrorMessage(
                                      res.error || 'Could not add staff member.'
                                    );
                                    return;
                                  }
                                  setAo2SaveMessage(
                                    `Added staff record "${newAccFullName.trim()}" (${newAccRole}) to database.`
                                  );
                                }

                                setNewAccFullName('');
                                setNewAccEmail('');
                                setNewAccUsername('');
                                setNewAccPassword('');
                                setShowAddAccountModal(false);
                              }}
                              className="p-6 space-y-4 overflow-y-auto"
                            >
                              <div className="flex flex-wrap items-center gap-2 p-1 rounded-lg bg-[#F8F9FA] border border-[#E2E5E9] w-fit">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddAccountMode('portal');
                                    setNewAccRole('Teacher');
                                    setNewAccTitle('Classroom Adviser');
                                  }}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                                    addAccountMode === 'portal'
                                      ? 'bg-[#0B291E] text-white'
                                      : 'text-[#525866] hover:text-[#111315]'
                                  }`}
                                >
                                  Teacher Portal Account
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddAccountMode('admin');
                                    setNewAccRole('Administrative Officer');
                                    setNewAccTitle('Administrative Officer II (AO-II)');
                                    setNewAccDepartment('Records, Enrollment & Property Supply');
                                    setNewAccRoom('Administration Wing · Registrar Desk');
                                  }}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                                    addAccountMode === 'admin'
                                      ? 'bg-[#0B291E] text-white'
                                      : 'text-[#525866] hover:text-[#111315]'
                                  }`}
                                >
                                  AO-II Administrator Account
                                </button>
                                {!principalAccount && onAo2CreatePrincipalAccount && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddAccountMode('principal');
                                      setNewAccRole('Principal');
                                      setNewAccTitle('School Principal');
                                      setNewAccDepartment('Office of the School Principal');
                                      setNewAccRoom('Administration Wing · Office 101');
                                    }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                                      addAccountMode === 'principal'
                                        ? 'bg-[#0B291E] text-white'
                                        : 'text-[#525866] hover:text-[#111315]'
                                    }`}
                                  >
                                    Principal Account
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setAddAccountMode('staff')}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                                    addAccountMode === 'staff'
                                      ? 'bg-[#0B291E] text-white'
                                      : 'text-[#525866] hover:text-[#111315]'
                                  }`}
                                >
                                  Staff Record Only (No Login)
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Full Name *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={newAccFullName}
                                    onChange={(e) => setNewAccFullName(e.target.value)}
                                    placeholder="e.g., Clarissa Dizon, LPT"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                {addAccountMode === 'staff' ? (
                                  <div>
                                    <label className="block text-xs font-semibold text-[#111315] mb-1">
                                      Staff Role *
                                    </label>
                                    <select
                                      value={newAccRole}
                                      onChange={(e) =>
                                        setNewAccRole(e.target.value as StaffMemberRecord['role'])
                                      }
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                    >
                                      <option value="Teacher">Teacher</option>
                                      <option value="Support Staff">Support Staff</option>
                                      <option value="Administrative Officer">
                                        Administrative Officer
                                      </option>
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-xs font-semibold text-[#111315] mb-1">
                                      Position / Title *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={newAccTitle}
                                      onChange={(e) => setNewAccTitle(e.target.value)}
                                      placeholder="e.g., Grade 1 Primary Adviser"
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Department / Subject Area
                                  </label>
                                  <input
                                    type="text"
                                    value={newAccDepartment}
                                    onChange={(e) => setNewAccDepartment(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                {addAccountMode !== 'admin' && addAccountMode !== 'principal' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-semibold text-[#111315] mb-1">
                                        Assigned Grade Level
                                      </label>
                                      <select
                                        value={newAccGradeId}
                                        onChange={(e) => {
                                          const gId = e.target.value;
                                          const labels: Record<string, string> = {
                                            k: 'Kindergarten · Primary Division',
                                            g1: 'Grade 1 · Primary Division',
                                            g2: 'Grade 2 · Primary Division',
                                            g3: 'Grade 3 · Primary Division',
                                            g4: 'Grade 4 · Intermediate Division',
                                            g5: 'Grade 5 · Intermediate Division',
                                            g6: 'Grade 6 · Intermediate Division',
                                            all: 'School-Wide Oversight (K–6)',
                                          };
                                          setNewAccGradeId(gId);
                                          setNewAccGradeLabel(labels[gId] ?? 'General Assignment');
                                        }}
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                      >
                                        <option value="k">Kindergarten</option>
                                        <option value="g1">Grade 1</option>
                                        <option value="g2">Grade 2</option>
                                        <option value="g3">Grade 3</option>
                                        <option value="g4">Grade 4</option>
                                        <option value="g5">Grade 5</option>
                                        <option value="g6">Grade 6</option>
                                        <option value="all">All Grades (K–6)</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-[#111315] mb-1">
                                        Grade &amp; Section Label
                                      </label>
                                      <input
                                        type="text"
                                        value={newAccGradeLabel}
                                        onChange={(e) => setNewAccGradeLabel(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                      />
                                    </div>
                                  </>
                                )}

                                <div>
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Classroom / Station
                                  </label>
                                  <input
                                    type="text"
                                    value={newAccRoom}
                                    onChange={(e) => setNewAccRoom(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    School Email
                                  </label>
                                  <input
                                    type="email"
                                    value={newAccEmail}
                                    onChange={(e) => setNewAccEmail(e.target.value)}
                                    placeholder="name@danloges.edu.ph"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-[#111315] mb-1">
                                    Employment Status
                                  </label>
                                  <select
                                    value={newAccStatus}
                                    onChange={(e) =>
                                      setNewAccStatus(
                                        e.target.value as StaffMemberRecord['employmentStatus']
                                      )
                                    }
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                                  >
                                    <option value="Regular / Permanent">Regular / Permanent</option>
                                    <option value="Contractual">Contractual</option>
                                    <option value="Volunteer">Volunteer</option>
                                    <option value="On Leave">On Leave</option>
                                  </select>
                                </div>
                              </div>

                              {(addAccountMode === 'portal' ||
                                addAccountMode === 'admin' ||
                                addAccountMode === 'principal') && (
                                <div className="p-4 rounded-xl bg-[#F4F8F6] border border-[#CBDAD0] space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-[#0B291E] mb-1">
                                        Portal Username *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={newAccUsername}
                                        onChange={(e) => setNewAccUsername(e.target.value)}
                                        placeholder={
                                          addAccountMode === 'admin'
                                            ? 'e.g., r.gabrito'
                                            : addAccountMode === 'principal'
                                            ? 'e.g., principal.delacruz'
                                            : 'e.g., c.dizon'
                                        }
                                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-[#0B291E] mb-1">
                                        Initial Password * (min 6 chars)
                                      </label>
                                      <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newAccPassword}
                                        onChange={(e) => setNewAccPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                                      />
                                    </div>
                                  </div>
                                  {addAccountMode === 'admin' && (
                                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B291E] cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={newAccSetPrimaryAdmin}
                                        onChange={(e) => setNewAccSetPrimaryAdmin(e.target.checked)}
                                      />
                                      <span>
                                        Use as Primary Administrator in AO-II Admin Console Sign In
                                      </span>
                                    </label>
                                  )}
                                </div>
                              )}

                              <div className="pt-3 border-t border-[#E2E5E9] flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isCreatingAccount}
                                  onClick={() => setShowAddAccountModal(false)}
                                  className="px-4 py-2 text-xs font-semibold border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={isCreatingAccount}
                                  style={{ backgroundColor: frontendConfig.accentColor }}
                                  className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                                >
                                  {isCreatingAccount
                                    ? 'Saving to Database...'
                                    : addAccountMode === 'admin'
                                    ? 'Create AO-II Administrator'
                                    : addAccountMode === 'portal'
                                    ? 'Create Portal Account'
                                    : 'Save Staff Record'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
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

                  {/* AO-II TAB 6: SCHOOL DATABASE MANAGER */}
                  {ao2Tab === 'database' && (
                    <div className="space-y-4">
                      {/* Connection & Store Metadata Bar */}
                      <div className="bg-gradient-to-r from-[#0B291E] via-[#0E3A2B] to-[#123344] text-white rounded-xl border border-[#1E4D3B] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#A7F3D0]">
                            <Database className="w-4 h-4" />
                            <span>AO-II Direct School Database Access</span>
                          </div>
                          <h4 className="font-display text-lg font-semibold text-white">
                            {dbOverview?.engine ?? 'Express JSON Persistent Store'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#D1E7DB]">
                            <span>
                              Store:{' '}
                              <code className="font-mono text-[#A7F3D0]">
                                {dbOverview?.storePath ?? '.data/school_state.json'}
                              </code>
                            </span>
                            <span className="font-mono tabular-nums">
                              Size: {formatFileSize(dbOverview?.fileSizeBytes ?? 0)}
                            </span>
                            <span>
                              Last Saved: {dbOverview?.lastModifiedAt ?? 'Synchronizing...'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={dbLoading}
                            onClick={() => void loadAo2Database(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                            <span>{dbLoading ? 'Refreshing...' : 'Refresh Store'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!ao2Session) return;
                              const res = await fetch('/api/admin/export', {
                                headers: {
                                  'x-admin-role': 'AO-II',
                                  'x-ao2-token': ao2Session.token,
                                },
                              });
                              if (!res.ok) {
                                setAo2ErrorMessage('Could not export database JSON.');
                                return;
                              }
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'danlog_elementary_backup.json';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                              setAo2SaveMessage('Exported danlog_elementary_backup.json from database.');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#052E16] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export JSON Backup</span>
                          </button>
                        </div>
                      </div>

                      {/* Collection Selector Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {[
                          {
                            id: 'enrollment' as const,
                            label: 'Enrollment Rows',
                            count:
                              dbOverview?.counts.enrollmentRows ??
                              (enrollmentByYear['2026-2027']?.length ?? 0),
                          },
                          {
                            id: 'staffRecords' as const,
                            label: 'Staff Records',
                            count: dbOverview?.counts.staffRecords ?? staffRecords.length,
                          },
                          {
                            id: 'studentRecords' as const,
                            label: 'Student Records',
                            count: dbOverview?.counts.studentRecords ?? studentRecords.length,
                          },
                          {
                            id: 'inventoryItems' as const,
                            label: 'Inventory',
                            count: dbOverview?.counts.inventoryItems ?? inventoryItems.length,
                          },
                          {
                            id: 'materialRequisitions' as const,
                            label: 'Requisitions',
                            count:
                              dbOverview?.counts.materialRequisitions ??
                              materialRequisitions.length,
                          },
                          {
                            id: 'leaveApplications' as const,
                            label: 'Leave Forms',
                            count:
                              dbOverview?.counts.leaveApplications ??
                              leaveApplications.length,
                          },
                          {
                            id: 'uploadedDocuments' as const,
                            label: 'Documents',
                            count: dbOverview?.counts.uploadedDocuments ?? uploadedDocuments.length,
                          },
                          {
                            id: 'principalDocuments' as const,
                            label: 'Principal Docs',
                            count:
                              dbOverview?.counts.principalDocuments ?? principalDocuments.length,
                          },
                          {
                            id: 'accountNotifications' as const,
                            label: 'Notifications',
                            count:
                              dbOverview?.counts.accountNotifications ??
                              accountNotifications.length,
                          },
                          {
                            id: 'admissionsSubmissions' as const,
                            label: 'Inquiries',
                            count:
                              dbOverview?.counts.admissionsSubmissions ?? admissionsSubmissions.length,
                          },
                          {
                            id: 'homePosts' as const,
                            label: 'Home Posts',
                            count: dbOverview?.counts.homePosts ?? homePosts.length,
                          },
                          {
                            id: 'activityPosts' as const,
                            label: 'Activity Posts',
                            count: dbOverview?.counts.activityPosts ?? activityPosts.length,
                          },
                          {
                            id: 'calendarActivities' as const,
                            label: 'Calendar',
                            count:
                              dbOverview?.counts.calendarActivities ?? calendarActivities.length,
                          },
                          {
                            id: 'teacherNotes' as const,
                            label: 'Teacher Notes',
                            count: dbOverview?.counts.teacherNotes ?? teacherNotes.length,
                          },
                          {
                            id: 'studentDocFeedback' as const,
                            label: 'Doc Feedback',
                            count:
                              dbOverview?.counts.studentDocFeedback ?? studentDocFeedback.length,
                          },
                          {
                            id: 'accounts' as const,
                            label: 'Accounts',
                            count: dbOverview?.counts.staffAccounts ?? teacherAccounts.length + 2,
                          },
                          {
                            id: 'auditLog' as const,
                            label: 'Audit Log',
                            count: dbOverview?.counts.auditLog ?? auditLog.length,
                          },
                          {
                            id: 'json' as const,
                            label: 'JSON / Restore',
                            count: null,
                          },
                        ].map((col) => {
                          const active = dbCollection === col.id;
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => {
                                setDbCollection(col.id);
                                setDbConfirmDeleteKey(null);
                                setDbEditingGradeKey(null);
                              }}
                              className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#ECFDF5] border-[#047857] shadow-xs'
                                  : 'bg-white border-[#E2E5E9] hover:border-[#A7F3D0]'
                              }`}
                            >
                              <div
                                className={`text-[11px] font-semibold truncate ${
                                  active ? 'text-[#047857]' : 'text-[#525866]'
                                }`}
                              >
                                {col.label}
                              </div>
                              <div className="font-display text-lg font-semibold text-[#111315] tabular-nums mt-0.5">
                                {col.count === null ? 'RAW' : col.count}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Filter Toolbar */}
                      {dbCollection !== 'json' && dbCollection !== 'accounts' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] p-3.5 flex flex-wrap items-center justify-between gap-3">
                          <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={dbSearch}
                              onChange={(e) => setDbSearch(e.target.value)}
                              placeholder="Filter database records by ID, title, name, or status..."
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315]"
                            />
                          </div>
                          {dbCollection === 'enrollment' && (
                            <div className="inline-flex rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] p-0.5">
                              {(['2026-2027'] as AcademicYear[]).map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => {
                                    setDbYearFilter(yr);
                                    setDbEditingGradeKey(null);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                                    dbYearFilter === yr
                                      ? 'bg-[#0B291E] text-white'
                                      : 'text-[#525866] hover:text-[#111315]'
                                  }`}
                                >
                                  SY {yr}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Collection 1: Enrollment Rows */}
                      {dbCollection === 'enrollment' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">ID / Grade</th>
                                  <th className="py-3 px-4 font-semibold">Division</th>
                                  <th className="py-3 px-4 font-semibold">Enrolled</th>
                                  <th className="py-3 px-4 font-semibold">Capacity</th>
                                  <th className="py-3 px-4 font-semibold">Teachers</th>
                                  <th className="py-3 px-4 font-semibold">Sections</th>
                                  <th className="py-3 px-4 font-semibold">Faculty Lead</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(
                                  (dbOverview?.data.enrollmentByYear ?? enrollmentByYear)[
                                    dbYearFilter
                                  ] ?? []
                                )
                                  .filter((row) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      row.gradeLabel.toLowerCase().includes(q) ||
                                      row.id.toLowerCase().includes(q) ||
                                      row.division.toLowerCase().includes(q) ||
                                      row.facultyLead.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((row) => {
                                    const rowKey = `${dbYearFilter}::${row.id}`;
                                    const isEditing = dbEditingGradeKey === rowKey;
                                    const isBusy = dbBusyKey === rowKey;
                                    return (
                                      <tr key={row.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4">
                                          <div className="font-semibold text-[#111315]">
                                            {row.gradeLabel}
                                          </div>
                                          <div className="font-mono text-[11px] text-[#525866]">
                                            {row.id}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">{row.division}</td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min={0}
                                              max={250}
                                              value={dbGradeDraft.enrolledStudents}
                                              onChange={(e) =>
                                                setDbGradeDraft((prev) => ({
                                                  ...prev,
                                                  enrolledStudents: e.target.value,
                                                }))
                                              }
                                              className="w-20 px-2 py-1 rounded border border-[#CBD5E1] bg-white text-xs"
                                            />
                                          ) : (
                                            row.enrolledStudents
                                          )}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min={10}
                                              max={200}
                                              value={dbGradeDraft.capacity}
                                              onChange={(e) =>
                                                setDbGradeDraft((prev) => ({
                                                  ...prev,
                                                  capacity: e.target.value,
                                                }))
                                              }
                                              className="w-20 px-2 py-1 rounded border border-[#CBD5E1] bg-white text-xs"
                                            />
                                          ) : (
                                            row.capacity
                                          )}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min={1}
                                              max={35}
                                              value={dbGradeDraft.teachers}
                                              onChange={(e) =>
                                                setDbGradeDraft((prev) => ({
                                                  ...prev,
                                                  teachers: e.target.value,
                                                }))
                                              }
                                              className="w-16 px-2 py-1 rounded border border-[#CBD5E1] bg-white text-xs"
                                            />
                                          ) : (
                                            row.teachers
                                          )}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min={1}
                                              max={20}
                                              value={dbGradeDraft.sections}
                                              onChange={(e) =>
                                                setDbGradeDraft((prev) => ({
                                                  ...prev,
                                                  sections: e.target.value,
                                                }))
                                              }
                                              className="w-16 px-2 py-1 rounded border border-[#CBD5E1] bg-white text-xs"
                                            />
                                          ) : (
                                            row.sections
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-[#111315]">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={dbGradeDraft.facultyLead}
                                              onChange={(e) =>
                                                setDbGradeDraft((prev) => ({
                                                  ...prev,
                                                  facultyLead: e.target.value,
                                                }))
                                              }
                                              className="w-40 px-2 py-1 rounded border border-[#CBD5E1] bg-white text-xs"
                                            />
                                          ) : (
                                            row.facultyLead
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {isEditing ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={async () => {
                                                  setDbBusyKey(rowKey);
                                                  setAo2ErrorMessage('');
                                                  setAo2SaveMessage('');
                                                  const res = await onAo2UpdateDbEnrollmentRow({
                                                    year: dbYearFilter,
                                                    gradeId: row.id,
                                                    enrolledStudents:
                                                      Number(dbGradeDraft.enrolledStudents) || 0,
                                                    capacity: Number(dbGradeDraft.capacity) || row.capacity,
                                                    teachers: Number(dbGradeDraft.teachers) || 1,
                                                    sections: Number(dbGradeDraft.sections) || 1,
                                                    facultyLead: dbGradeDraft.facultyLead,
                                                  });
                                                  setDbBusyKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not save enrollment row.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setDbEditingGradeKey(null);
                                                  setAo2SaveMessage(
                                                    `Updated database record ${row.gradeLabel} (SY ${dbYearFilter}).`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#047857] text-white hover:bg-[#065F46] cursor-pointer"
                                              >
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbEditingGradeKey(null)}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] hover:text-[#111315] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setDbEditingGradeKey(rowKey);
                                                setDbGradeDraft({
                                                  enrolledStudents: String(row.enrolledStudents),
                                                  capacity: String(row.capacity),
                                                  teachers: String(row.teachers),
                                                  sections: String(row.sections),
                                                  facultyLead: row.facultyLead,
                                                });
                                              }}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#111315] hover:bg-[#F1F5F9] cursor-pointer"
                                            >
                                              <Pencil className="w-3 h-3" />
                                              <span>Edit Row</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 2: School Inventory */}
                      {dbCollection === 'inventoryItems' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Item Name</th>
                                  <th className="py-3 px-4 font-semibold">Qty</th>
                                  <th className="py-3 px-4 font-semibold">Status</th>
                                  <th className="py-3 px-4 font-semibold">Issued To</th>
                                  <th className="py-3 px-4 font-semibold">Received / Issued</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.inventoryItems ?? inventoryItems)
                                  .filter((item) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      item.id.toLowerCase().includes(q) ||
                                      item.itemName.toLowerCase().includes(q) ||
                                      item.status.toLowerCase().includes(q) ||
                                      item.issuedToUser.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((item) => {
                                    const delKey = `inventoryItems::${item.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {item.id}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {item.itemName}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {item.quantity}
                                        </td>
                                        <td className="py-3 px-4">{item.status}</td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          {item.issuedToUser || '—'}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {item.dateReceived || '—'} / {item.dateIssued || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'inventoryItems',
                                                    item.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete record.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted inventory record ${item.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 2b: Material Requisitions */}
                      {dbCollection === 'materialRequisitions' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Teacher</th>
                                  <th className="py-3 px-4 font-semibold">Item / Material</th>
                                  <th className="py-3 px-4 font-semibold">Qty</th>
                                  <th className="py-3 px-4 font-semibold">AO-II Status</th>
                                  <th className="py-3 px-4 font-semibold">Principal Status</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.materialRequisitions ?? materialRequisitions)
                                  .filter((req) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      req.id.toLowerCase().includes(q) ||
                                      req.teacherName.toLowerCase().includes(q) ||
                                      req.itemName.toLowerCase().includes(q) ||
                                      req.ao2Status.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((req) => {
                                    const delKey = `materialRequisitions::${req.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={req.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {req.id}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-[#111315]">
                                          {req.teacherName}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {req.itemName}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {req.quantity} {req.unit}
                                        </td>
                                        <td className="py-3 px-4">{req.ao2Status}</td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          {req.principalStatus ?? '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'materialRequisitions',
                                                    req.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete record.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted material requisition ${req.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 2c: Leave Applications */}
                      {dbCollection === 'leaveApplications' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Applicant</th>
                                  <th className="py-3 px-4 font-semibold">Leave Type</th>
                                  <th className="py-3 px-4 font-semibold">Inclusive Dates</th>
                                  <th className="py-3 px-4 font-semibold">Days</th>
                                  <th className="py-3 px-4 font-semibold">AO-II Endorsement</th>
                                  <th className="py-3 px-4 font-semibold">Principal Decision</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.leaveApplications ?? leaveApplications)
                                  .filter((app) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      app.id.toLowerCase().includes(q) ||
                                      app.applicantName.toLowerCase().includes(q) ||
                                      app.leaveType.toLowerCase().includes(q) ||
                                      (app.ao2EndorsementStatus ?? '').toLowerCase().includes(q) ||
                                      app.principalStatus.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((app) => {
                                    const delKey = `leaveApplications::${app.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={app.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {app.id}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-[#111315]">
                                          {app.applicantName}{' '}
                                          <span className="text-[11px] text-[#525866]">
                                            ({app.applicantRole})
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {app.leaveType}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px]">
                                          {app.startDate} → {app.endDate}
                                        </td>
                                        <td className="py-3 px-4 font-mono tabular-nums">
                                          {app.numberOfDays}
                                        </td>
                                        <td className="py-3 px-4">
                                          {app.ao2EndorsementStatus ?? 'Pending Endorsement'}
                                        </td>
                                        <td className="py-3 px-4">{app.principalStatus}</td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'leaveApplications',
                                                    app.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete record.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted leave application ${app.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 3: Uploaded Documents */}
                      {dbCollection === 'uploadedDocuments' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Title &amp; Course</th>
                                  <th className="py-3 px-4 font-semibold">Teacher</th>
                                  <th className="py-3 px-4 font-semibold">File</th>
                                  <th className="py-3 px-4 font-semibold">Principal Status</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.uploadedDocuments ?? uploadedDocuments)
                                  .filter((doc) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      doc.id.toLowerCase().includes(q) ||
                                      doc.title.toLowerCase().includes(q) ||
                                      doc.fileName.toLowerCase().includes(q) ||
                                      doc.principalReviewStatus.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((doc) => {
                                    const delKey = `uploadedDocuments::${doc.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    const teacherName =
                                      mergedTeacherProfiles.find((t) => t.id === doc.teacherId)
                                        ?.name ??
                                      staffRecords.find((s) => s.id === doc.teacherId)?.fullName ??
                                      doc.teacherId;
                                    return (
                                      <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {doc.id}
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="font-semibold text-[#111315]">
                                            {doc.title}
                                          </div>
                                          <div className="text-[11px] text-[#525866]">
                                            {doc.category} · {doc.targetCourse}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">{teacherName}</td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {doc.fileName} ({doc.fileSizeLabel})
                                        </td>
                                        <td className="py-3 px-4">
                                          {doc.principalReviewStatus === 'Endorsed/Principal'
                                            ? 'Approved'
                                            : doc.principalReviewStatus}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'uploadedDocuments',
                                                    doc.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete document.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted document record ${doc.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 3b: Principal Uploaded Documents */}
                      {dbCollection === 'principalDocuments' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Title &amp; Audience</th>
                                  <th className="py-3 px-4 font-semibold">Uploaded By</th>
                                  <th className="py-3 px-4 font-semibold">File</th>
                                  <th className="py-3 px-4 font-semibold">Notified Accounts</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.principalDocuments ?? principalDocuments)
                                  .filter((doc) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      doc.id.toLowerCase().includes(q) ||
                                      doc.title.toLowerCase().includes(q) ||
                                      doc.category.toLowerCase().includes(q) ||
                                      doc.fileName.toLowerCase().includes(q) ||
                                      doc.uploadedByName.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((doc) => {
                                    const delKey = `principalDocuments::${doc.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {doc.id}
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="font-semibold text-[#111315]">
                                            {doc.title}
                                          </div>
                                          <div className="text-[11px] text-[#525866]">
                                            {doc.category} · {doc.targetAudience}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          <div>{doc.uploadedByName}</div>
                                          <div className="text-[11px] text-[#64748B]">
                                            @{doc.uploadedByUsername}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {doc.fileName} ({doc.fileSizeLabel})
                                        </td>
                                        <td className="py-3 px-4 text-[#525866] tabular-nums">
                                          {doc.notifiedAccountCount} accounts
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'principalDocuments',
                                                    doc.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error ||
                                                        'Could not delete principal document.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted principal document ${doc.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {(dbOverview?.data.principalDocuments ?? principalDocuments)
                                  .length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="py-8 px-4 text-center text-xs text-[#64748B]"
                                    >
                                      No Principal documents saved in the database yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 3c: Account Notifications */}
                      {dbCollection === 'accountNotifications' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Notification</th>
                                  <th className="py-3 px-4 font-semibold">Sender</th>
                                  <th className="py-3 px-4 font-semibold">Delivery &amp; Read</th>
                                  <th className="py-3 px-4 font-semibold">Created</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.accountNotifications ?? accountNotifications)
                                  .filter((item) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      item.id.toLowerCase().includes(q) ||
                                      item.title.toLowerCase().includes(q) ||
                                      item.message.toLowerCase().includes(q) ||
                                      item.documentTitle.toLowerCase().includes(q) ||
                                      item.senderName.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((item) => {
                                    const delKey = `accountNotifications::${item.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {item.id}
                                        </td>
                                        <td className="py-3 px-4 max-w-sm">
                                          <div className="font-semibold text-[#111315]">
                                            {item.title}
                                          </div>
                                          <div className="text-[11px] text-[#525866] line-clamp-2">
                                            {item.message}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          <div>{item.senderName}</div>
                                          <div className="text-[11px] text-[#64748B]">
                                            {item.senderRole} (@{item.senderUsername})
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-[#525866] tabular-nums">
                                          {item.readByAccountIds.length} / {item.recipientCount} read
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {item.createdAt}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'accountNotifications',
                                                    item.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error ||
                                                        'Could not delete notification record.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted notification ${item.id} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                {(dbOverview?.data.accountNotifications ?? accountNotifications)
                                  .length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="py-8 px-4 text-center text-xs text-[#64748B]"
                                    >
                                      No account notifications saved in the database yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 4: Parent Inquiries */}
                      {dbCollection === 'admissionsSubmissions' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Ref / ID</th>
                                  <th className="py-3 px-4 font-semibold">Parent / Guardian</th>
                                  <th className="py-3 px-4 font-semibold">Grade &amp; Year</th>
                                  <th className="py-3 px-4 font-semibold">Status</th>
                                  <th className="py-3 px-4 font-semibold">Submitted At</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.admissionsSubmissions ?? admissionsSubmissions)
                                  .filter((item) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      item.id.toLowerCase().includes(q) ||
                                      item.referenceCode.toLowerCase().includes(q) ||
                                      item.parentName.toLowerCase().includes(q) ||
                                      item.email.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((item) => {
                                    const delKey = `admissionsSubmissions::${item.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          <div>{item.referenceCode}</div>
                                          <div>{item.id}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="font-semibold text-[#111315]">
                                            {item.parentName}
                                          </div>
                                          <div className="text-[11px] text-[#525866]">
                                            {item.email}
                                          </div>
                                        </td>
                                        <td className="py-3 px-4">
                                          {item.gradeApplying} ({item.entryYear})
                                        </td>
                                        <td className="py-3 px-4">{item.status}</td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {item.submittedAt}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'admissionsSubmissions',
                                                    item.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete inquiry.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted inquiry ${item.referenceCode} from database.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 5: Staff Accounts Directory */}
                      {dbCollection === 'accounts' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h5 className="text-sm font-semibold text-[#111315]">
                                Registered Portal Credentials Table
                              </h5>
                              <p className="text-xs text-[#525866]">
                                Password hashes stay protected inside the server store. Use Staff
                                &amp; Portal Accounts to update usernames or reset passwords.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAo2Tab('accounts')}
                              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B291E] text-white hover:bg-[#134231] cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Manage Accounts
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-y border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-2.5 px-3 font-semibold">Role</th>
                                  <th className="py-2.5 px-3 font-semibold">Account Key</th>
                                  <th className="py-2.5 px-3 font-semibold">Username</th>
                                  <th className="py-2.5 px-3 font-semibold">Password Policy</th>
                                  <th className="py-2.5 px-3 font-semibold">Updated At</th>
                                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.teacherAccounts ?? teacherAccounts).map((acc) => {
                                  const delKey = `teacherAccounts::${acc.teacherId}`;
                                  const confirming = dbConfirmDeleteKey === delKey;
                                  return (
                                    <tr key={acc.teacherId}>
                                      <td className="py-2.5 px-3 font-semibold text-[#111315]">
                                        Teacher
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[#525866]">
                                        {acc.teacherId}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono">@{acc.username}</td>
                                      <td className="py-2.5 px-3">
                                        {acc.hasCustomPassword
                                          ? 'Custom Password Set'
                                          : 'Default Password'}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#525866]">
                                        {acc.updatedAt}
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        {confirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={dbBusyKey === delKey}
                                              onClick={async () => {
                                                setDbBusyKey(delKey);
                                                const res = await onAo2DeleteDbRecord(
                                                  'teacherAccounts',
                                                  acc.teacherId
                                                );
                                                setDbBusyKey(null);
                                                setDbConfirmDeleteKey(null);
                                                if (!res.ok) {
                                                  setAo2ErrorMessage(
                                                    res.error || 'Could not delete account.'
                                                  );
                                                  return;
                                                }
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                                setAo2SaveMessage(
                                                  `Deleted portal account @${acc.username} from database.`
                                                );
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(delKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {(dbOverview?.data.principalAccount ?? principalAccount) && (() => {
                                  const pAcc = (dbOverview?.data.principalAccount ?? principalAccount)!;
                                  const pDelKey = 'principalAccount::principal';
                                  const pConfirming = dbConfirmDeleteKey === pDelKey;
                                  return (
                                    <tr>
                                      <td className="py-2.5 px-3 font-semibold text-[#111315]">
                                        Principal
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[#525866]">
                                        {principalStaffRecord?.id ?? 'principal'}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono">
                                        @{pAcc.username}{' '}
                                        {principalStaffRecord && (
                                          <span className="font-sans text-[#525866]">
                                            ({principalStaffRecord.fullName})
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {pAcc.hasCustomPassword
                                          ? 'Custom Password Set'
                                          : 'Default Password'}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#525866]">
                                        {pAcc.updatedAt}
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        {pConfirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={dbBusyKey === pDelKey}
                                              onClick={async () => {
                                                setDbBusyKey(pDelKey);
                                                const res = await onAo2DeleteDbRecord(
                                                  'principalAccount',
                                                  'principal'
                                                );
                                                setDbBusyKey(null);
                                                setDbConfirmDeleteKey(null);
                                                if (!res.ok) {
                                                  setAo2ErrorMessage(
                                                    res.error || 'Could not delete Principal account.'
                                                  );
                                                  return;
                                                }
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                                setAo2SaveMessage(
                                                  `Deleted Principal account @${pAcc.username}.`
                                                );
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(pDelKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })()}
                                {(dbOverview?.data.ao2Accounts ?? ao2AdminAccountsList).map((adm, _, arr) => {
                                  const delKey = `ao2Accounts::${adm.accountId}`;
                                  const confirming = dbConfirmDeleteKey === delKey;
                                  const isLastAo2 = arr.length <= 1;
                                  return (
                                    <tr key={adm.accountId}>
                                      <td className="py-2.5 px-3 font-semibold text-[#047857]">
                                        AO-II (Admin)
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[#525866]">
                                        {adm.accountId}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono">
                                        @{adm.username}{' '}
                                        <span className="font-sans text-[#525866]">
                                          ({adm.fullName})
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {adm.hasCustomPassword
                                          ? 'Custom Password Set'
                                          : 'Default Password'}
                                        {adm.isPrimary ? ' · Sign-In Primary' : ''}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#525866]">
                                        {adm.updatedAt}
                                      </td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        {isLastAo2 ? (
                                          <span className="text-[11px] text-[#525866]">
                                            Active Primary Admin
                                          </span>
                                        ) : confirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={dbBusyKey === delKey}
                                              onClick={async () => {
                                                setDbBusyKey(delKey);
                                                const res = await onAo2DeleteDbRecord(
                                                  'ao2Accounts',
                                                  adm.accountId
                                                );
                                                setDbBusyKey(null);
                                                setDbConfirmDeleteKey(null);
                                                if (!res.ok) {
                                                  setAo2ErrorMessage(
                                                    res.error || 'Could not delete admin account.'
                                                  );
                                                  return;
                                                }
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                                setAo2SaveMessage(
                                                  `Deleted AO-II admin account @${adm.username}.`
                                                );
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(delKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6: Audit Log Records */}
                      {dbCollection === 'auditLog' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                                  <th className="py-3 px-4 font-semibold">Actor</th>
                                  <th className="py-3 px-4 font-semibold">Scope</th>
                                  <th className="py-3 px-4 font-semibold">Summary</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.auditLog ?? auditLog)
                                  .filter((entry) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      entry.id.toLowerCase().includes(q) ||
                                      entry.actor.toLowerCase().includes(q) ||
                                      entry.scope.toLowerCase().includes(q) ||
                                      entry.summary.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((entry) => {
                                    const delKey = `auditLog::${entry.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866] whitespace-nowrap">
                                          {entry.timestamp}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {entry.actor}
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">{entry.scope}</td>
                                        <td className="py-3 px-4 text-[#111315]">{entry.summary}</td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'auditLog',
                                                    entry.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete audit entry.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted audit entry ${entry.id}.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6b: Staff Records */}
                      {dbCollection === 'staffRecords' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Record ID</th>
                                  <th className="py-3 px-4 font-semibold">Full Name</th>
                                  <th className="py-3 px-4 font-semibold">Role &amp; Grade</th>
                                  <th className="py-3 px-4 font-semibold">Status</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.staffRecords ?? staffRecords)
                                  .filter((s) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      s.id.toLowerCase().includes(q) ||
                                      s.fullName.toLowerCase().includes(q) ||
                                      s.role.toLowerCase().includes(q) ||
                                      s.assignedGradeLabel.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((s) => {
                                    const delKey = `staffRecords::${s.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    const allStaff = dbOverview?.data.staffRecords ?? staffRecords;
                                    const ao2PortalCount = allStaff.filter(
                                      (x) =>
                                        x.role === 'Administrative Officer' &&
                                        Boolean(x.portalUsername)
                                    ).length;
                                    const isProtected =
                                      s.role === 'Administrative Officer' &&
                                      Boolean(s.portalUsername) &&
                                      ao2PortalCount <= 1;
                                    return (
                                      <tr key={s.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {s.id}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {s.fullName}
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          {s.role} · {s.assignedGradeLabel}
                                        </td>
                                        <td className="py-3 px-4">{s.employmentStatus}</td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {isProtected ? (
                                            <span className="text-[11px] text-[#525866]">
                                              Active Primary Admin
                                            </span>
                                          ) : confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'staffRecords',
                                                    s.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete staff record.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted staff record ${s.fullName}.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6c: Student Records */}
                      {dbCollection === 'studentRecords' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">LRN / ID</th>
                                  <th className="py-3 px-4 font-semibold">Student Name</th>
                                  <th className="py-3 px-4 font-semibold">Grade &amp; Section</th>
                                  <th className="py-3 px-4 font-semibold">Status</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.studentRecords ?? studentRecords)
                                  .filter((st) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      st.id.toLowerCase().includes(q) ||
                                      st.lrn.toLowerCase().includes(q) ||
                                      st.studentName.toLowerCase().includes(q) ||
                                      st.gradeLabel.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((st) => {
                                    const delKey = `studentRecords::${st.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={st.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          <div>{st.lrn}</div>
                                          <div>{st.id}</div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {st.studentName}
                                        </td>
                                        <td className="py-3 px-4 text-[#525866]">
                                          {st.gradeLabel} · {st.section} ({st.academicYear})
                                        </td>
                                        <td className="py-3 px-4">{st.enrollmentStatus}</td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                disabled={dbBusyKey === delKey}
                                                onClick={async () => {
                                                  setDbBusyKey(delKey);
                                                  const res = await onAo2DeleteDbRecord(
                                                    'studentRecords',
                                                    st.id
                                                  );
                                                  setDbBusyKey(null);
                                                  setDbConfirmDeleteKey(null);
                                                  if (!res.ok) {
                                                    setAo2ErrorMessage(
                                                      res.error || 'Could not delete student.'
                                                    );
                                                    return;
                                                  }
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                  setAo2SaveMessage(
                                                    `Deleted student record ${st.studentName}.`
                                                  );
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6d: Home Page Posts */}
                      {dbCollection === 'homePosts' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Post ID</th>
                                  <th className="py-3 px-4 font-semibold">Headline &amp; Category</th>
                                  <th className="py-3 px-4 font-semibold">Author</th>
                                  <th className="py-3 px-4 font-semibold">Created</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.homePosts ?? homePosts).map((hp) => {
                                  const delKey = `homePosts::${hp.id}`;
                                  const confirming = dbConfirmDeleteKey === delKey;
                                  return (
                                    <tr key={hp.id} className="hover:bg-[#F8FAFC]">
                                      <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                        {hp.id}
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-semibold text-[#111315]">{hp.title}</div>
                                        <div className="text-[11px] text-[#525866]">{hp.category}</div>
                                      </td>
                                      <td className="py-3 px-4 text-[#525866]">
                                        {hp.authorName} ({hp.authorRole})
                                      </td>
                                      <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                        {hp.createdAt}
                                      </td>
                                      <td className="py-3 px-4 text-right whitespace-nowrap">
                                        {confirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const res = await onAo2DeleteDbRecord(
                                                  'homePosts',
                                                  hp.id
                                                );
                                                setDbConfirmDeleteKey(null);
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(delKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6e: Activity Posts */}
                      {dbCollection === 'activityPosts' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Activity ID</th>
                                  <th className="py-3 px-4 font-semibold">Title &amp; Category</th>
                                  <th className="py-3 px-4 font-semibold">Posted By</th>
                                  <th className="py-3 px-4 font-semibold">Date Conducted</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.activityPosts ?? activityPosts).map((ap) => {
                                  const delKey = `activityPosts::${ap.id}`;
                                  const confirming = dbConfirmDeleteKey === delKey;
                                  return (
                                    <tr key={ap.id} className="hover:bg-[#F8FAFC]">
                                      <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                        {ap.id}
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-semibold text-[#111315]">{ap.title}</div>
                                        <div className="text-[11px] text-[#525866]">{ap.category}</div>
                                      </td>
                                      <td className="py-3 px-4 text-[#525866]">
                                        {ap.authorName} ({ap.authorRole})
                                      </td>
                                      <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                        {ap.dateConducted}
                                      </td>
                                      <td className="py-3 px-4 text-right whitespace-nowrap">
                                        {confirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const res = await onAo2DeleteDbRecord(
                                                  'activityPosts',
                                                  ap.id
                                                );
                                                setDbConfirmDeleteKey(null);
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(delKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6e2: School Calendar Activities */}
                      {dbCollection === 'calendarActivities' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Event ID</th>
                                  <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                                  <th className="py-3 px-4 font-semibold">Activity Title &amp; Category</th>
                                  <th className="py-3 px-4 font-semibold">Division &amp; Venue</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.calendarActivities ?? calendarActivities).map((ev) => {
                                  const delKey = `calendarActivities::${ev.id}`;
                                  const confirming = dbConfirmDeleteKey === delKey;
                                  return (
                                    <tr key={ev.id} className="hover:bg-[#F8FAFC]">
                                      <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                        {ev.id}
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-semibold text-[#111315]">
                                          {ev.monthShort} {ev.dayNumber} ({ev.dayOfWeek})
                                        </div>
                                        <div className="text-[11px] text-[#525866]">
                                          {ev.monthGroup} · {ev.timeRange}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="font-semibold text-[#111315]">{ev.title}</div>
                                        <div className="text-[11px] text-[#525866]">{ev.category}</div>
                                      </td>
                                      <td className="py-3 px-4 text-[#525866]">
                                        <div>{ev.divisionScope}</div>
                                        <div className="text-[11px]">{ev.venue}</div>
                                      </td>
                                      <td className="py-3 px-4 text-right whitespace-nowrap">
                                        {confirming ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const res = await onAo2DeleteDbRecord(
                                                  'calendarActivities',
                                                  ev.id
                                                );
                                                setDbConfirmDeleteKey(null);
                                                if (res.overview) {
                                                  setDbOverview(res.overview);
                                                  setDbJsonDraft(
                                                    JSON.stringify(res.overview.data, null, 2)
                                                  );
                                                }
                                              }}
                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(null)}
                                              className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDbConfirmDeleteKey(delKey)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6f: Teacher Advisory Notes */}
                      {dbCollection === 'teacherNotes' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Note ID</th>
                                  <th className="py-3 px-4 font-semibold">Author</th>
                                  <th className="py-3 px-4 font-semibold">Advisory Note</th>
                                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.teacherNotes ?? teacherNotes)
                                  .filter((n) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      n.id.toLowerCase().includes(q) ||
                                      n.authorName.toLowerCase().includes(q) ||
                                      n.text.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((n) => {
                                    const delKey = `teacherNotes::${n.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={n.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          {n.id}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {n.authorName}
                                        </td>
                                        <td className="py-3 px-4 text-[#525866] max-w-md">
                                          {n.text}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866] whitespace-nowrap">
                                          {n.timestamp}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const res = await onAo2DeleteDbRecord(
                                                    'teacherNotes',
                                                    n.id
                                                  );
                                                  setDbConfirmDeleteKey(null);
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 6g: Student Document Feedback */}
                      {dbCollection === 'studentDocFeedback' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                                <tr>
                                  <th className="py-3 px-4 font-semibold">Entry / Doc ID</th>
                                  <th className="py-3 px-4 font-semibold">Teacher</th>
                                  <th className="py-3 px-4 font-semibold">Feedback Comment</th>
                                  <th className="py-3 px-4 font-semibold">Updated</th>
                                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E5E9]">
                                {(dbOverview?.data.studentDocFeedback ?? studentDocFeedback)
                                  .filter((fb) => {
                                    const q = dbSearch.trim().toLowerCase();
                                    return (
                                      !q ||
                                      fb.id.toLowerCase().includes(q) ||
                                      fb.docId.toLowerCase().includes(q) ||
                                      fb.authorName.toLowerCase().includes(q) ||
                                      fb.comment.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((fb) => {
                                    const delKey = `studentDocFeedback::${fb.id}`;
                                    const confirming = dbConfirmDeleteKey === delKey;
                                    return (
                                      <tr key={fb.id} className="hover:bg-[#F8FAFC]">
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866]">
                                          <div>{fb.id}</div>
                                          <div>Doc: {fb.docId}</div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#111315]">
                                          {fb.authorName}
                                        </td>
                                        <td className="py-3 px-4 text-[#525866] max-w-md">
                                          {fb.comment}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-[#525866] whitespace-nowrap">
                                          {fb.updatedAt}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                          {confirming ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const res = await onAo2DeleteDbRecord(
                                                    'studentDocFeedback',
                                                    fb.id
                                                  );
                                                  setDbConfirmDeleteKey(null);
                                                  if (res.overview) {
                                                    setDbOverview(res.overview);
                                                    setDbJsonDraft(
                                                      JSON.stringify(res.overview.data, null, 2)
                                                    );
                                                  }
                                                }}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDbConfirmDeleteKey(null)}
                                                className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDbConfirmDeleteKey(delKey)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Collection 7: JSON Inspector & Restore */}
                      {dbCollection === 'json' && (
                        <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h5 className="text-sm font-semibold text-[#111315]">
                                Raw JSON Database Inspector &amp; Restore
                              </h5>
                              <p className="text-xs text-[#525866]">
                                Inspect live collections, load a previously exported backup file, or
                                apply JSON updates directly to `.data/school_state.json`. Staff
                                password hashes remain preserved.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard?.writeText(dbJsonDraft);
                                  setDbCopied(true);
                                  setTimeout(() => setDbCopied(false), 1800);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#DCE0E6] text-[#111315] hover:bg-[#F8FAFC] cursor-pointer"
                              >
                                {dbCopied ? (
                                  <Check className="w-3.5 h-3.5 text-[#047857]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{dbCopied ? 'Copied' : 'Copy JSON'}</span>
                              </button>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#DCE0E6] text-[#111315] hover:bg-[#F8FAFC] cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Load .json File</span>
                                <input
                                  type="file"
                                  accept=".json,application/json"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const text = await file.text();
                                    setDbJsonDraft(text);
                                    setAo2SaveMessage(`Loaded ${file.name} into JSON editor.`);
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (dbOverview) {
                                    setDbJsonDraft(JSON.stringify(dbOverview.data, null, 2));
                                    setAo2SaveMessage('Reset JSON editor to live database state.');
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#DCE0E6] text-[#525866] hover:text-[#111315] cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reload Live JSON</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={dbJsonDraft}
                            onChange={(e) => setDbJsonDraft(e.target.value)}
                            rows={16}
                            spellCheck={false}
                            aria-label="Database JSON editor"
                            className="w-full rounded-lg border border-[#DCE0E6] bg-[#0F172A] text-[#E2E8F0] font-mono text-xs p-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                          />

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[11px] text-[#525866]">
                              Accepted top-level keys: <code>frontendConfig</code>,{' '}
                              <code>backendConfig</code>, <code>enrollmentByYear</code>,{' '}
                              <code>inventoryItems</code>, <code>uploadedDocuments</code>,{' '}
                              <code>admissionsSubmissions</code>.
                            </span>
                            <button
                              type="button"
                              disabled={dbBusyKey === 'restore'}
                              onClick={async () => {
                                setAo2ErrorMessage('');
                                setAo2SaveMessage('');
                                let parsed: Partial<SchoolSystemBootstrap>;
                                try {
                                  parsed = JSON.parse(dbJsonDraft) as Partial<SchoolSystemBootstrap>;
                                } catch {
                                  setAo2ErrorMessage(
                                    'Invalid JSON syntax. Please check brackets, quotes, and commas.'
                                  );
                                  return;
                                }
                                setDbBusyKey('restore');
                                const res = await onAo2RestoreDatabase(parsed);
                                setDbBusyKey(null);
                                if (!res.ok) {
                                  setAo2ErrorMessage(res.error || 'Could not restore database JSON.');
                                  return;
                                }
                                if (res.overview) {
                                  setDbOverview(res.overview);
                                  setDbJsonDraft(JSON.stringify(res.overview.data, null, 2));
                                }
                                setAo2SaveMessage(
                                  'Database JSON restored and saved to .data/school_state.json.'
                                );
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#047857] hover:bg-[#065F46] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                            >
                              <Database className="w-3.5 h-3.5" />
                              <span>
                                {dbBusyKey === 'restore' ? 'Applying...' : 'Apply & Save to Database'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
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
