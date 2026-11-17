import type { AcademicYear, GradeEnrollmentRow } from '../data/schoolData';

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

export type InventoryStatus =
  | 'Available'
  | 'Issued'
  | 'Low Stock'
  | 'For Repair'
  | 'Condemned';

export interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  status: InventoryStatus;
  dateReceived: string;
  issuedToUser: string;
  dateIssued: string;
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
    | 'Database';
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

export interface SchoolSystemBootstrap {
  frontendConfig: SiteFrontendConfig;
  backendConfig: SiteBackendConfig;
  enrollmentByYear: Record<AcademicYear, GradeEnrollmentRow[]>;
  uploadedDocuments: UploadedCourseDocument[];
  admissionsSubmissions: AdmissionsSubmission[];
  inventoryItems: InventoryItem[];
  auditLog: AdminAuditEntry[];
  teacherAccounts: TeacherAccountSummary[];
  principalAccount: StaffAccountSummary;
  ao2Account: StaffAccountSummary;
}

export type DatabaseRecordCollection =
  | 'inventoryItems'
  | 'uploadedDocuments'
  | 'admissionsSubmissions'
  | 'auditLog';

export interface DatabaseOverview {
  engine: string;
  storePath: string;
  fileSizeBytes: number;
  lastModifiedAt: string;
  counts: {
    enrollmentRows: number;
    inventoryItems: number;
    uploadedDocuments: number;
    admissionsSubmissions: number;
    staffAccounts: number;
    auditLog: number;
  };
  data: SchoolSystemBootstrap;
}
