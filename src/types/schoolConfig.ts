import type {
  AcademicYear,
  AttendanceStatus,
  CalendarActivityItem,
  GradeEnrollmentRow,
} from '../data/schoolData';

export interface SiteFrontendConfig {
  schoolName: string;
  taglineLocation: string;
  heroHeadline: string;
  heroLead: string;
  heroImage: string;
  accentColor: '#15803D' | '#1E3A8A' | '#0F766E' | '#9A3412' | '#4338CA';
  announcementEnabled: boolean;
  announcementText: string;
  campusAddress: string;
  admissionsPhone: string;
  admissionsEmail: string;
  visibleSections: {
    academics: boolean;
    dashboard: boolean;
    campus: boolean;
    admissions: boolean;
  };
}

export interface SiteBackendConfig {
  activeAcademicYear: AcademicYear;
  admissionsOpen: boolean;
  teacherUploadsEnabled: boolean;
  maxUploadSizeMb: number;
  allowedExtensions: string[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export type PrincipalDocumentStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Needs Revision'
  | 'Endorsed/Principal';

export interface UploadedCourseDocument {
  id: string;
  teacherId: string;
  title: string;
  category: 'Syllabus' | 'Lab Handout' | 'Study Guide' | 'Parent Notice' | 'Assessment Rubric';
  targetCourse: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  uploadedAt: string;
  notes: string;
  documentContent?: string;
  mimeType?: string;
  hasStoredFile?: boolean;
  principalReviewStatus: PrincipalDocumentStatus;
  principalNote?: string;
  endorsedToAo2?: boolean;
  ao2EndorsementStatus?: 'Endorsed/Principal';
  endorsedAt?: string;
  endorsedBy?: string;
}

export type PrincipalDocumentCategory =
  | 'School Memorandum'
  | 'Division Circular'
  | 'Faculty Directive'
  | 'Policy & Guidelines'
  | 'Event Notice'
  | 'Official Form'
  | 'General';

export interface PrincipalDocument {
  id: string;
  uploadedByAccountId: string;
  uploadedByName: string;
  uploadedByUsername: string;
  title: string;
  category: PrincipalDocumentCategory;
  targetAudience: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  uploadedAt: string;
  notes: string;
  documentContent?: string;
  mimeType?: string;
  hasStoredFile?: boolean;
  notifiedAccountCount: number;
}

export interface AccountNotification {
  id: string;
  type: 'principal_document';
  title: string;
  message: string;
  documentId: string;
  documentTitle: string;
  documentCategory: PrincipalDocumentCategory;
  fileName: string;
  senderRole: 'Principal';
  senderName: string;
  senderUsername: string;
  recipientAccountIds: string[];
  recipientCount: number;
  readByAccountIds: string[];
  createdAt: string;
}

export interface AdmissionsSubmission {
  id: string;
  referenceCode: string;
  parentName: string;
  email: string;
  gradeApplying: string;
  entryYear: string;
  notes: string;
  submittedAt: string;
  status: 'New Inquiry' | 'Tour Scheduled' | 'Reviewed';
}

export type InventoryCategory =
  | 'Equipment'
  | 'School Supplies'
  | 'Books'
  | 'Buildings'
  | 'Others';

export type InventoryStatus =
  | 'Available'
  | 'Issued'
  | 'Low Stock'
  | 'For Repair'
  | 'Condemned';

export interface InventoryItem {
  id: string;
  itemName: string;
  category: InventoryCategory;
  quantity: number;
  unit?: string;
  status: InventoryStatus;
  location?: string;
  dateReceived: string;
  issuedToUser: string;
  dateIssued: string;
  conditionNotes?: string;
}

export type StaffRole = 'Teacher' | 'Principal' | 'Administrative Officer' | 'Support Staff';
export type StaffEmploymentStatus =
  | 'Regular / Permanent'
  | 'Contractual'
  | 'Volunteer'
  | 'On Leave';

export interface StaffMemberRecord {
  id: string;
  fullName: string;
  role: StaffRole;
  title: string;
  department: string;
  assignedGradeId: string;
  assignedGradeLabel: string;
  email: string;
  phone: string;
  room: string;
  officeHours: string;
  employmentStatus: StaffEmploymentStatus;
  portalUsername?: string;
  updatedAt: string;
}

export type StudentEnrollmentStatus =
  | 'Enrolled'
  | 'Transferred In'
  | 'Transferred Out'
  | 'Graduated';

export interface StudentRecord {
  id: string;
  lrn: string;
  studentName: string;
  gradeId: string;
  gradeLabel: string;
  section: string;
  adviserId: string;
  adviserName: string;
  academicYear: AcademicYear;
  enrollmentStatus: StudentEnrollmentStatus;
  attendance: AttendanceStatus;
  currentAverage: number;
  missingWork: number;
  guardianName: string;
  guardianContact: string;
  updatedAt: string;
}

export type ActivityPostCategory = 'STEM & Labs' | 'Arts & Music' | 'Athletics & Field';

export interface ActivityPostItem {
  id: string;
  title: string;
  category: ActivityPostCategory;
  dateConducted: string;
  participants: string;
  location: string;
  description: string;
  image: string;
  imageAlt: string;
  authorRole: 'Teacher' | 'Principal' | 'AO-II';
  authorName: string;
  authorAccountId: string;
  createdAt: string;
}

export type HomePostCategory =
  | 'Announcement'
  | 'Campus Update'
  | 'Classroom Story'
  | 'Photo Post'
  | 'Achievement'
  | 'General';

export interface HomeFeedPost {
  id: string;
  title: string;
  content: string;
  category: HomePostCategory;
  authorRole: 'Teacher' | 'Principal' | 'AO-II';
  authorName: string;
  authorUsername: string;
  authorAccountId: string;
  createdAt: string;
  imageUrl?: string;
  imageAlt?: string;
  pinned?: boolean;
}

export type MaterialRequisitionCategory = 'School Supplies' | 'Equipment' | 'Other';
export type RequisitionUrgency = 'Routine' | 'Priority' | 'Urgent';
export type Ao2RequisitionStatus = 'Pending Review' | 'Approved' | 'Declined' | 'Endorsed';
export type PrincipalRequisitionStatus = 'Pending Principal' | 'Approved' | 'Disapproved';

export interface MaterialRequisition {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherGradeSection: string;
  itemName: string;
  category: MaterialRequisitionCategory;
  quantity: number;
  unit: string;
  urgency: RequisitionUrgency;
  neededBy?: string;
  purpose: string;
  submittedAt: string;
  ao2Status: Ao2RequisitionStatus;
  ao2Note?: string;
  ao2ReviewedAt?: string;
  ao2ReviewedBy?: string;
  principalStatus?: PrincipalRequisitionStatus;
  principalNote?: string;
  principalReviewedAt?: string;
  principalReviewedBy?: string;
}

export type LeaveType =
  | 'Vacation Leave'
  | 'Sick Leave'
  | 'Wellness Leave'
  | 'Special Privilege Leave'
  | 'Maternity / Paternity Leave'
  | 'Emergency / Calamity Leave'
  | 'Study / Official Business Leave'
  | 'Other';

export type LeaveDecisionStatus = 'Pending' | 'Approved' | 'Disapproved';
export type Ao2LeaveEndorsementStatus = 'Pending Endorsement' | 'Endorsed';

export interface LeaveApplication {
  id: string;
  applicantAccountId: string;
  applicantRole: 'Teacher' | 'Principal' | 'AO-II';
  applicantName: string;
  applicantUsername: string;
  applicantDepartmentOrGrade: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  contactDuringLeave?: string;
  coveringStaff?: string;
  submittedAt: string;
  ao2EndorsementStatus?: Ao2LeaveEndorsementStatus;
  ao2EndorsedAt?: string;
  ao2EndorsedBy?: string;
  principalStatus: LeaveDecisionStatus;
  principalNote?: string;
  principalReviewedAt?: string;
  principalReviewedBy?: string;
  ao2EditNote?: string;
  lastEditedByAo2At?: string;
  lastEditedByAo2Name?: string;
}

export interface TeacherAdvisoryNote {
  id: string;
  teacherId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface StudentDocFeedbackEntry {
  id: string;
  docId: string;
  teacherId: string;
  authorName: string;
  comment: string;
  updatedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  scope:
    | 'Front-End'
    | 'Back-End'
    | 'Enrollment'
    | 'System'
    | 'Faculty Auth'
    | 'Account Auth'
    | 'Endorsement'
    | 'Inventory'
    | 'Requisition'
    | 'Leave'
    | 'Database'
    | 'Staff'
    | 'Students'
    | 'Community Posts';
  summary: string;
  timestamp: string;
}

export interface StaffAccountSummary {
  username: string;
  hasCustomPassword: boolean;
  updatedAt: string;
}

export interface TeacherAccountSummary extends StaffAccountSummary {
  teacherId: string;
}

export interface Ao2AccountSummary extends StaffAccountSummary {
  accountId: string;
  fullName: string;
  title: string;
  isPrimary?: boolean;
}

export interface SchoolSystemBootstrap {
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
  teacherNotes?: TeacherAdvisoryNote[];
  studentDocFeedback?: StudentDocFeedbackEntry[];
  calendarActivities?: CalendarActivityItem[];
  auditLog: AdminAuditEntry[];
  teacherAccounts: TeacherAccountSummary[];
  principalAccount: StaffAccountSummary | null;
  ao2Account: StaffAccountSummary;
  ao2Accounts?: Ao2AccountSummary[];
}

export type DatabaseRecordCollection =
  | 'inventoryItems'
  | 'materialRequisitions'
  | 'leaveApplications'
  | 'uploadedDocuments'
  | 'principalDocuments'
  | 'accountNotifications'
  | 'admissionsSubmissions'
  | 'staffRecords'
  | 'teacherAccounts'
  | 'principalAccount'
  | 'ao2Accounts'
  | 'studentRecords'
  | 'activityPosts'
  | 'homePosts'
  | 'calendarActivities'
  | 'teacherNotes'
  | 'studentDocFeedback'
  | 'auditLog';

export interface DatabaseOverview {
  engine: string;
  storePath: string;
  fileSizeBytes: number;
  lastModifiedAt: string;
  counts: {
    enrollmentRows: number;
    inventoryItems: number;
    materialRequisitions: number;
    leaveApplications?: number;
    uploadedDocuments: number;
    principalDocuments?: number;
    accountNotifications?: number;
    admissionsSubmissions: number;
    staffRecords: number;
    studentRecords: number;
    activityPosts: number;
    homePosts: number;
    calendarActivities?: number;
    teacherNotes?: number;
    studentDocFeedback?: number;
    staffAccounts: number;
    auditLog: number;
  };
  data: SchoolSystemBootstrap;
}
