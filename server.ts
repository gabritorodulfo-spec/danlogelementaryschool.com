import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_ENROLLMENT_BY_YEAR,
  TEACHER_PORTAL_PROFILES,
  type AcademicYear,
  type AttendanceStatus,
  type GradeEnrollmentRow,
} from './src/data/schoolData.ts';
import type {
  ActivityPostCategory,
  ActivityPostItem,
  AdminAuditEntry,
  AdmissionsSubmission,
  Ao2AccountSummary,
  Ao2LeaveEndorsementStatus,
  Ao2RequisitionStatus,
  DatabaseOverview,
  DatabaseRecordCollection,
  HomeFeedPost,
  HomePostCategory,
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
  LeaveApplication,
  LeaveDecisionStatus,
  LeaveType,
  MaterialRequisition,
  MaterialRequisitionCategory,
  PrincipalRequisitionStatus,
  RequisitionUrgency,
  SchoolSystemBootstrap,
  SiteBackendConfig,
  SiteFrontendConfig,
  StaffAccountSummary,
  StaffEmploymentStatus,
  StaffMemberRecord,
  StaffRole,
  StudentDocFeedbackEntry,
  StudentEnrollmentStatus,
  StudentRecord,
  TeacherAccountSummary,
  TeacherAdvisoryNote,
  UploadedCourseDocument,
} from './src/types/schoolConfig.ts';

interface StaffCredentialRecord {
  username: string;
  salt: string;
  passwordHash: string;
  hasCustomPassword: boolean;
  updatedAt: string;
}

interface TeacherCredentialRecord extends StaffCredentialRecord {
  teacherId: string;
}

interface Ao2CredentialRecord extends StaffCredentialRecord {
  accountId: string;
}

interface SchoolServerStore
  extends Omit<
    SchoolSystemBootstrap,
    'teacherAccounts' | 'principalAccount' | 'ao2Account' | 'ao2Accounts'
  > {
  teacherCredentials: TeacherCredentialRecord[];
  principalCredential?: StaffCredentialRecord | null;
  ao2Credential?: StaffCredentialRecord | null;
  ao2Credentials: Ao2CredentialRecord[];
  primaryAo2AccountId?: string;
  deletedStaffIds?: string[];
  removedLegacyPlaceholders?: boolean;
  assignedCadagPrincipal?: boolean;
  leaveApplications: LeaveApplication[];
  teacherNotes: TeacherAdvisoryNote[];
  studentDocFeedback: StudentDocFeedbackEntry[];
}

function getAllAo2Credentials(store: SchoolServerStore): Ao2CredentialRecord[] {
  return [...(store.ao2Credentials ?? [])];
}

function getPrincipalStaffRecord(store: SchoolServerStore): StaffMemberRecord | undefined {
  return (
    store.staffRecords.find((s) => s.role === 'Principal') ??
    store.staffRecords.find((s) => s.id === 'staff-principal')
  );
}

function isPortalUsernameTaken(
  store: SchoolServerStore,
  username: string,
  excludeAccountId?: string
): boolean {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return false;
  const principalStaffId = getPrincipalStaffRecord(store)?.id ?? 'staff-principal';
  if (
    store.principalCredential &&
    excludeAccountId !== principalStaffId &&
    excludeAccountId !== 'staff-principal' &&
    store.principalCredential.username.toLowerCase() === normalized
  ) {
    return true;
  }
  if (
    (store.ao2Credentials ?? []).some(
      (c) => c.accountId !== excludeAccountId && c.username.toLowerCase() === normalized
    )
  ) {
    return true;
  }
  if (
    store.teacherCredentials.some(
      (c) => c.teacherId !== excludeAccountId && c.username.toLowerCase() === normalized
    )
  ) {
    return true;
  }
  return false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const STORE_PATH = path.resolve(DATA_DIR, 'school_state.json');
const BACKUP_STORE_PATH = path.resolve(DATA_DIR, 'school_state.backup.json');
const TMP_STORE_PATH = path.resolve(DATA_DIR, 'school_state.tmp.json');

function sanitizeFileName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getMimeTypeForFile(fileName: string, explicitMime?: string): string {
  if (explicitMime && explicitMime !== 'application/octet-stream') return explicitMime;
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? 'application/octet-stream';
}

function escapePdfString(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildSimplePdfBuffer(title: string, subtitle: string, bodyText: string): Buffer {
  const wrappedLines: string[] = [];
  const pushWrapped = (line: string, width = 82) => {
    if (!line.trim()) {
      wrappedLines.push('');
      return;
    }
    const words = line.split(/\s+/);
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > width) {
        if (current) wrappedLines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) wrappedLines.push(current);
  };

  pushWrapped('DANLOG ELEMENTARY SCHOOL - PILAR II, EST. 1975', 80);
  pushWrapped(title, 76);
  pushWrapped(subtitle, 82);
  pushWrapped('--------------------------------------------------------------------------', 82);
  for (const rawLine of bodyText.split('\n')) {
    pushWrapped(rawLine, 82);
  }

  const maxLines = wrappedLines.slice(0, 48);
  const contentCommands: string[] = ['BT', '/F1 11 Tf', '54 742 Td', '14 TL'];
  maxLines.forEach((line, idx) => {
    const safe = escapePdfString(line);
    if (idx === 0) {
      contentCommands.push(`(${safe}) Tj`);
    } else {
      contentCommands.push(`T* (${safe}) Tj`);
    }
  });
  contentCommands.push('ET');
  const streamData = contentCommands.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(streamData, 'utf8')} >>\nstream\n${streamData}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

const DEFAULT_DOCUMENT_CONTENT_MAP: Record<string, string> = {
  'up-1': `DANLOG ELEMENTARY SCHOOL — PARENT NOTICE & FIELD WALK GUIDE
Grade & Section: Kindergarten · Section Sampaguita
Adviser: Marisol Mendoza, M.Ed.
Activity Date: Friday, November 21, 2026 · 8:00 a.m. – 10:30 a.m.
Venue: Danlog School Eco-Garden & Barangay Nature Trail

1. PURPOSE OF ACTIVITY
Pupils will observe native garden plants, record leaf shapes in their sketchbooks, and practice counting seeds and blossoms as part of Science & Nature K.

2. REQUIRED PUPIL CHECKLIST
- Sun hat or cap and comfortable walking shoes
- Refillable water bottle (labeled with pupil name)
- Kindergarten leaf sketchbook and 2 sharpened pencils
- Light morning snack in a sealed lunchbox

3. SUPERVISION & SAFETY PROTOCOL
- Adult-to-pupil supervision ratio: 1 teacher or parent volunteer per 5 pupils.
- School first-aid kit and Emergency Contact binder carried by Adviser Mendoza.
- Signed Parental Consent slip must be returned on or before Thursday, November 20, 2026.`,

  'up-11': `SCIENCE FAIR LAB HANDOUT: WATERSHED FILTRATION PROTOCOL
Grade & Section: Grade 5 · Section Narra
Coordinator: Roberto Santos, M.A.Ed.
Laboratory Room: Science Room 204

I. LEARNING OBJECTIVE
Pupils will construct a multi-layer natural water filter and measure turbidity reduction and flow rate across three soil-sample trials.

II. GROUP MATERIALS (4 PUPILS PER BENCH)
- 1 clear 1.5L plastic bottle (cut top inverted as funnel)
- 150 g washed fine river sand
- 150 g coarse gravel and small pebbles
- 80 g crushed activated charcoal wrapped in clean cheesecloth
- 500 mL muddy test water sample + stopwatch + graduated cylinder

III. STEP-BY-STEP PROCEDURE
1. Layer materials inside the inverted funnel from bottom to top: cotton/cheesecloth -> activated charcoal -> fine sand -> coarse gravel.
2. Pour 150 mL of test water slowly onto the gravel layer and start the stopwatch immediately.
3. Record total filtration time (seconds) and rate water clarity (Scale 1–5) in the Group Data Log.
4. Safety Note: Filtered water is for visual turbidity testing only — do NOT drink test samples. Wash hands with soap after lab cleanup.`,

  'up-21': `GRADE 6 LOCAL HERITAGE ESSAY — EVALUATION RUBRIC
Grade & Section: Grade 6 · Section Molave
Department Chair: Lorna Evangelista, M.A.T.
Total Score: 100 Points (Aligned with English 6 & Araling Panlipunan 6)

CRITERION 1: HISTORICAL ACCURACY & COMMUNITY VOICE (30 pts)
- Exemplary (27–30 pts): Incorporates verified Barangay Danlog / Pilar II oral history interview details with accurate dates and named community elders.
- Proficient (22–26 pts): Includes clear local facts with minor chronological gaps.

CRITERION 2: NARRATIVE ORGANIZATION & COHESION (25 pts)
- Introduction clearly frames the family or barangay memory; body paragraphs flow logically with transitions; conclusion reflects on civic heritage.

CRITERION 3: VOCABULARY & SENTENCE CRAFT (25 pts)
- Vivid sensory descriptions, varied sentence structures, and respectful tone.

CRITERION 4: MECHANICS, CITATIONS & INTERVIEW LOG (20 pts)
- Correct spelling, punctuation, neat handwriting/formatting, and attached 5-question interview sheet signed by the interviewee.`,
};

function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function buildDefaultTeacherCredentials(): TeacherCredentialRecord[] {
  const defaults = [
    { teacherId: 't-sato', username: 'm.mendoza', initialPass: 'Sampaguita#1975' },
    { teacherId: 't-chen', username: 'r.santos', initialPass: 'NarraLab#2026' },
    { teacherId: 't-brooks', username: 'l.evangelista', initialPass: 'MolaveRead#2026' },
  ];
  return defaults.map((entry) => {
    const { salt, hash } = hashPassword(entry.initialPass);
    return {
      teacherId: entry.teacherId,
      username: entry.username,
      salt,
      passwordHash: hash,
      hasCustomPassword: false,
      updatedAt: 'Nov 15, 2026 · 8:00 a.m.',
    };
  });
}

function buildDefaultStaffCredential(username: string, initialPass: string): StaffCredentialRecord {
  const { salt, hash } = hashPassword(initialPass);
  return {
    username,
    salt,
    passwordHash: hash,
    hasCustomPassword: false,
    updatedAt: 'Nov 15, 2026 · 8:00 a.m.',
  };
}

const VALID_INVENTORY_CATEGORIES: InventoryCategory[] = [
  'Equipment',
  'School Supplies',
  'Books',
  'Buildings',
  'Others',
];

const VALID_INVENTORY_STATUSES: InventoryStatus[] = [
  'Available',
  'Issued',
  'Low Stock',
  'For Repair',
  'Condemned',
];

function inferInventoryCategory(itemName: string): InventoryCategory {
  const lower = itemName.toLowerCase();
  if (
    /building|wing|pavilion|classroom|roof|gate|fence|court|canteen|restroom|hall/.test(lower)
  ) {
    return 'Buildings';
  }
  if (/book|storybook|anthology|textbook|workbook|module|dictionary|atlas|reader/.test(lower)) {
    return 'Books';
  }
  if (/paper|chalk|marker|pen|pencil|notebook|folder|envelope|cartolina|crayon|bond|ink/.test(lower)) {
    return 'School Supplies';
  }
  if (
    /microscope|projector|fan|computer|laptop|printer|speaker|chair|desk|table|cabinet|whiteboard|tv|monitor/.test(
      lower
    )
  ) {
    return 'Equipment';
  }
  return 'Others';
}

function buildDefaultInventoryItems(): InventoryItem[] {
  return [
    {
      id: 'inv-101',
      itemName: 'Compound Science Microscope (Monocular LED)',
      category: 'Equipment',
      quantity: 12,
      unit: 'units',
      status: 'Issued',
      location: 'Science Wing · Room 204',
      dateReceived: '2026-08-14',
      issuedToUser: 'Roberto Santos, M.A.Ed. · Grade 5 Narra',
      dateIssued: '2026-08-20',
      conditionNotes: 'Optics calibrated for Grade 4–6 lab sessions.',
    },
    {
      id: 'inv-102',
      itemName: 'DepEd Kindergarten Storybook & Literacy Kit',
      category: 'Books',
      quantity: 38,
      unit: 'sets',
      status: 'Issued',
      location: 'Building 1 · Room 102',
      dateReceived: '2026-09-02',
      issuedToUser: 'Marisol Mendoza, M.Ed. · Kindergarten Sampaguita',
      dateIssued: '2026-09-05',
      conditionNotes: 'Complete big-book & phonetic card sets.',
    },
    {
      id: 'inv-103',
      itemName: 'Epson EB-X06 XGA Multimedia Projector',
      category: 'Equipment',
      quantity: 3,
      unit: 'units',
      status: 'Available',
      location: 'AO-II Supply Room',
      dateReceived: '2026-09-18',
      issuedToUser: 'AO-II Supply Room',
      dateIssued: '—',
      conditionNotes: 'Ready for faculty reservation and assemblies.',
    },
    {
      id: 'inv-104',
      itemName: 'A4 Bond Paper (80gsm, 5-Ream Box)',
      category: 'School Supplies',
      quantity: 6,
      unit: 'boxes',
      status: 'Low Stock',
      location: 'Faculty Workroom & Registrar',
      dateReceived: '2026-10-10',
      issuedToUser: 'Faculty Workroom & Registrar',
      dateIssued: '2026-11-04',
      conditionNotes: 'Reorder threshold reached; request Q4 replenishment.',
    },
    {
      id: 'inv-105',
      itemName: 'Wall-Mounted Classroom Electric Fan (16-inch)',
      category: 'Equipment',
      quantity: 2,
      unit: 'units',
      status: 'For Repair',
      location: 'Grade 4 Building · Maintenance Bay',
      dateReceived: '2025-06-22',
      issuedToUser: 'Grade 4 Building · Maintenance Bay',
      dateIssued: '2025-07-01',
      conditionNotes: 'Oscillation motor servicing scheduled.',
    },
    {
      id: 'inv-106',
      itemName: 'Grade 6 Heritage Reading Anthology (Hardbound Set)',
      category: 'Books',
      quantity: 45,
      unit: 'copies',
      status: 'Issued',
      location: 'Heritage Wing · Room 301',
      dateReceived: '2026-08-25',
      issuedToUser: 'Lourdes Evangelista, M.A. · Grade 6 Molave',
      dateIssued: '2026-09-01',
      conditionNotes: 'Issued per pupil for SY 2026–2027.',
    },
    {
      id: 'inv-107',
      itemName: 'Whiteboard Markers & Dustless Chalk Pack',
      category: 'School Supplies',
      quantity: 24,
      unit: 'packs',
      status: 'Available',
      location: 'AO-II Supply Room',
      dateReceived: '2026-10-28',
      issuedToUser: 'AO-II Supply Room',
      dateIssued: '—',
      conditionNotes: 'Assorted black, blue, and red dry-erase sets.',
    },
    {
      id: 'inv-108',
      itemName: 'MATATAG Grade 1–3 Mathematics Workbooks',
      category: 'Books',
      quantity: 90,
      unit: 'copies',
      status: 'Available',
      location: 'Timber Reading Commons',
      dateReceived: '2026-10-15',
      issuedToUser: 'Library & Reading Commons',
      dateIssued: '2026-10-18',
      conditionNotes: 'Reserve stock stored on shelving bays B1–B3.',
    },
    {
      id: 'inv-109',
      itemName: 'Gabaldon Heritage Academic Building (Rooms 101–104)',
      category: 'Buildings',
      quantity: 4,
      unit: 'classrooms',
      status: 'Issued',
      location: 'North Campus Quad',
      dateReceived: '1975-06-15',
      issuedToUser: 'Primary Division (Kindergarten – Grade 2)',
      dateIssued: '2026-06-01',
      conditionNotes: 'Structural inspection passed; fresh exterior paint applied.',
    },
    {
      id: 'inv-110',
      itemName: '2-Storey Science & Reading Commons Wing',
      category: 'Buildings',
      quantity: 6,
      unit: 'rooms',
      status: 'Issued',
      location: 'East Academic Wing',
      dateReceived: '2019-04-10',
      issuedToUser: 'Intermediate Division (Grades 3 – 6)',
      dateIssued: '2026-06-01',
      conditionNotes: 'Houses Science Room 204, DCP ICT Lab, and Library.',
    },
    {
      id: 'inv-111',
      itemName: 'Covered Campus Courtyard & Stage Pavilion',
      category: 'Buildings',
      quantity: 1,
      unit: 'facility',
      status: 'Available',
      location: 'Central Campus Grounds',
      dateReceived: '2022-09-01',
      issuedToUser: 'School Events & Athletics Coordinator',
      dateIssued: '2026-06-01',
      conditionNotes: 'Roofing gutters cleared prior to rainy season.',
    },
    {
      id: 'inv-112',
      itemName: 'School Disaster & Emergency Go-Bag Kit',
      category: 'Others',
      quantity: 10,
      unit: 'kits',
      status: 'Available',
      location: 'Clinic & DRRM Corner',
      dateReceived: '2026-09-12',
      issuedToUser: 'Campus DRRM & Health Desk',
      dateIssued: '2026-09-15',
      conditionNotes: 'Includes flashlights, whistles, and trauma dressings.',
    },
    {
      id: 'inv-113',
      itemName: 'Gulayan sa Paaralan Gardening Tool Bundle',
      category: 'Others',
      quantity: 14,
      unit: 'sets',
      status: 'Issued',
      location: 'Botanical Learning Garden',
      dateReceived: '2026-08-30',
      issuedToUser: 'EPP & Campus Gardening Club',
      dateIssued: '2026-09-08',
      conditionNotes: 'Trowels, watering cans, and seedling trays active.',
    },
    {
      id: 'inv-114',
      itemName: 'Portable Bluetooth Classroom Speaker & Mic',
      category: 'Equipment',
      quantity: 1,
      unit: 'unit',
      status: 'Issued',
      location: 'Building 1 · Room 102',
      dateReceived: '2026-08-18',
      issuedToUser: 'Marisol Mendoza, M.Ed. · Kindergarten Sampaguita',
      dateIssued: '2026-08-25',
      conditionNotes: 'Used for morning phonics and rhythm circles.',
    },
    {
      id: 'inv-115',
      itemName: 'Washable Crayons, Bond Paper & Manila Chart Pack',
      category: 'School Supplies',
      quantity: 8,
      unit: 'sets',
      status: 'Issued',
      location: 'Building 1 · Room 102',
      dateReceived: '2026-09-10',
      issuedToUser: 'Marisol Mendoza, M.Ed. · Kindergarten Sampaguita',
      dateIssued: '2026-09-12',
      conditionNotes: 'Assigned for Q2 Kindergarten literacy stations.',
    },
    {
      id: 'inv-116',
      itemName: 'Classroom First-Aid & Sensory Manipulation Bin',
      category: 'Others',
      quantity: 2,
      unit: 'kits',
      status: 'Issued',
      location: 'Building 1 · Room 102',
      dateReceived: '2026-09-14',
      issuedToUser: 'Marisol Mendoza, M.Ed. · Kindergarten Sampaguita',
      dateIssued: '2026-09-15',
      conditionNotes: 'Sanitized weekly; stored on adviser cabinet.',
    },
    {
      id: 'inv-117',
      itemName: 'A4 Bond Paper, Dry-Erase Markers & Lab Logbooks',
      category: 'School Supplies',
      quantity: 5,
      unit: 'packs',
      status: 'Issued',
      location: 'Science Wing · Room 204',
      dateReceived: '2026-09-20',
      issuedToUser: 'Roberto Santos, M.A.Ed. · Grade 5 Narra',
      dateIssued: '2026-09-22',
      conditionNotes: 'Office and science lab worksheet consumables.',
    },
    {
      id: 'inv-118',
      itemName: 'Digital pH Meter & Lab Safety Goggles Set',
      category: 'Others',
      quantity: 10,
      unit: 'sets',
      status: 'Issued',
      location: 'Science Wing · Room 204',
      dateReceived: '2026-09-05',
      issuedToUser: 'Roberto Santos, M.A.Ed. · Grade 5 Narra',
      dateIssued: '2026-09-07',
      conditionNotes: 'Assigned to Grade 5 watershed & soil testing benches.',
    },
    {
      id: 'inv-119',
      itemName: 'HDMI Document Visualizer & Wireless Presenter',
      category: 'Equipment',
      quantity: 1,
      unit: 'unit',
      status: 'Issued',
      location: 'Heritage Wing · Room 301',
      dateReceived: '2026-08-22',
      issuedToUser: 'Lourdes Evangelista, M.A. · Grade 6 Molave',
      dateIssued: '2026-08-28',
      conditionNotes: 'Connected to Grade 6 Molave classroom display.',
    },
    {
      id: 'inv-120',
      itemName: 'A4 Ream Bond Paper, Red Ink Pens & Record Book',
      category: 'School Supplies',
      quantity: 6,
      unit: 'packs',
      status: 'Issued',
      location: 'Heritage Wing · Room 301',
      dateReceived: '2026-09-19',
      issuedToUser: 'Lourdes Evangelista, M.A. · Grade 6 Molave',
      dateIssued: '2026-09-21',
      conditionNotes: 'Used for Grade 6 essay rubrics and oral history forms.',
    },
    {
      id: 'inv-121',
      itemName: 'Archival Portfolio Sleeves & Storage Box Set',
      category: 'Others',
      quantity: 4,
      unit: 'boxes',
      status: 'Issued',
      location: 'Heritage Wing · Room 301',
      dateReceived: '2026-09-24',
      issuedToUser: 'Lourdes Evangelista, M.A. · Grade 6 Molave',
      dateIssued: '2026-09-25',
      conditionNotes: 'Holds Grade 6 pupil Barangay Danlog oral history essays.',
    },
  ];
}

function buildDefaultMaterialRequisitions(): MaterialRequisition[] {
  return [
    {
      id: 'req-101',
      teacherId: 't-chen',
      teacherName: 'Roberto Santos, M.A.Ed.',
      teacherGradeSection: 'Grade 5 · Section Narra',
      itemName: 'Refillable Whiteboard Markers & Graph Flipchart Pads',
      category: 'School Supplies',
      quantity: 4,
      unit: 'sets',
      urgency: 'Priority',
      neededBy: '2026-11-28',
      purpose: 'Needed for Grade 5 Science Fair watershed group presentations and daily math drills.',
      submittedAt: 'Nov 14, 2026 · 1:20 p.m.',
      ao2Status: 'Pending Review',
    },
    {
      id: 'req-102',
      teacherId: 't-sato',
      teacherName: 'Marisol Mendoza, M.Ed.',
      teacherGradeSection: 'Kindergarten · Section Sampaguita',
      itemName: 'Heavy-Duty Lamination Machine & Thermal Pouches',
      category: 'Equipment',
      quantity: 1,
      unit: 'unit',
      urgency: 'Priority',
      neededBy: '2026-12-02',
      purpose: 'For preserving Kindergarten alphabet flashcards and reusable outdoor eco-garden trail tags.',
      submittedAt: 'Nov 13, 2026 · 10:05 a.m.',
      ao2Status: 'Endorsed',
      ao2Note: 'Verified Kindergarten does not have a dedicated laminator; endorsed for Principal capital equipment approval.',
      ao2ReviewedAt: 'Nov 14, 2026 · 9:15 a.m.',
      ao2ReviewedBy: 'RODULFO C. GABRITO JR. (r.gabrito)',
      principalStatus: 'Pending Principal',
    },
    {
      id: 'req-103',
      teacherId: 't-brooks',
      teacherName: 'Lourdes Evangelista, M.A.',
      teacherGradeSection: 'Grade 6 · Section Molave',
      itemName: 'Expanded Manila Folders & Portfolio Fasteners',
      category: 'Other',
      quantity: 5,
      unit: 'packs',
      urgency: 'Routine',
      neededBy: '2026-11-25',
      purpose: 'Binding pupil Barangay Danlog oral history interview sheets and Grade 6 writing portfolios.',
      submittedAt: 'Nov 11, 2026 · 3:40 p.m.',
      ao2Status: 'Approved',
      ao2Note: 'Stock available in AO-II Supply Room; ready for pickup during afternoon break.',
      ao2ReviewedAt: 'Nov 12, 2026 · 11:10 a.m.',
      ao2ReviewedBy: 'RODULFO C. GABRITO JR. (r.gabrito)',
    },
  ];
}

function buildDefaultLeaveApplications(): LeaveApplication[] {
  return [
    {
      id: 'leave-101',
      applicantAccountId: 't-sato',
      applicantRole: 'Teacher',
      applicantName: 'Marisol Mendoza, M.Ed.',
      applicantUsername: 'm.mendoza',
      applicantDepartmentOrGrade: 'Kindergarten · Section Sampaguita',
      leaveType: 'Special Privilege Leave',
      startDate: '2026-11-26',
      endDate: '2026-11-27',
      numberOfDays: 2,
      reason: 'Attending immediate family milestone event in Legazpi City; lesson packets prepared for substitute adviser.',
      contactDuringLeave: '+63 917 555 0142',
      coveringStaff: 'GLENDA LLAVANES LOGIA',
      submittedAt: 'Nov 16, 2026 · 9:15 a.m.',
      ao2EndorsementStatus: 'Pending Endorsement',
      principalStatus: 'Pending',
    },
    {
      id: 'leave-102',
      applicantAccountId: 't-chen',
      applicantRole: 'Teacher',
      applicantName: 'Roberto Santos, M.A.Ed.',
      applicantUsername: 'r.santos',
      applicantDepartmentOrGrade: 'Grade 5 · Section Narra',
      leaveType: 'Study / Official Business Leave',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      numberOfDays: 1,
      reason: 'District of Pilar II Elementary Science Coaches Briefing & Laboratory Safety Orientation.',
      contactDuringLeave: '+63 917 555 0168',
      coveringStaff: 'Lourdes Evangelista, M.A.',
      submittedAt: 'Nov 14, 2026 · 2:30 p.m.',
      ao2EndorsementStatus: 'Endorsed',
      ao2EndorsedAt: 'Nov 14, 2026 · 4:10 p.m.',
      ao2EndorsedBy: 'RODULFO C. GABRITO JR. (r.gabrito)',
      principalStatus: 'Approved',
      principalNote: 'Approved as official district science coordination.',
      principalReviewedAt: 'Nov 15, 2026 · 8:45 a.m.',
      principalReviewedBy: 'Ely M. Cadag (e.cadag)',
    },
  ];
}

function buildDefaultStaffRecords(
  teacherCredentials: TeacherCredentialRecord[]
): StaffMemberRecord[] {
  const nowLabel = 'Nov 15, 2026 · 8:00 a.m.';
  const teacherRecords: StaffMemberRecord[] = TEACHER_PORTAL_PROFILES.map((t) => {
    const cred = teacherCredentials.find((c) => c.teacherId === t.id);
    return {
      id: t.id,
      fullName: t.name,
      role: 'Teacher',
      title: t.title,
      department: t.department,
      assignedGradeId: t.assignedGradeId,
      assignedGradeLabel: t.assignedGradeLabel,
      email: t.email,
      phone: '+63 (56) 555-0184',
      room: t.room,
      officeHours: t.officeHours,
      employmentStatus: 'Regular / Permanent',
      portalUsername: cred?.username ?? t.email.split('@')[0],
      updatedAt: nowLabel,
    };
  });

  const additionalAdvisers: StaffMemberRecord[] = [
    {
      id: 'staff-g1',
      fullName: 'Clarissa Dizon, LPT',
      role: 'Teacher',
      title: 'Grade 1 Primary Adviser',
      department: 'Primary Literacy & Mother Tongue',
      assignedGradeId: 'g1',
      assignedGradeLabel: 'Grade 1 · Primary Division',
      email: 'c.dizon@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Room 104',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      updatedAt: nowLabel,
    },
    {
      id: 'staff-g2',
      fullName: 'Rafael Navarro, LPT',
      role: 'Teacher',
      title: 'Grade 2 Primary Adviser',
      department: 'Reading Fluency & Numeracy',
      assignedGradeId: 'g2',
      assignedGradeLabel: 'Grade 2 · Primary Division',
      email: 'r.navarro@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Room 106',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      updatedAt: nowLabel,
    },
    {
      id: 'staff-g3',
      fullName: 'Teresa Villanueva, M.A.',
      role: 'Teacher',
      title: 'Grade 3 Primary Adviser',
      department: 'Primary Science & Heritage',
      assignedGradeId: 'g3',
      assignedGradeLabel: 'Grade 3 · Primary Division',
      email: 't.villanueva@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Room 108',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      updatedAt: nowLabel,
    },
    {
      id: 'staff-g4',
      fullName: 'Arnel Bautista, LPT',
      role: 'Teacher',
      title: 'Grade 4 Intermediate Adviser',
      department: 'Earth Science & EPP Garden Craft',
      assignedGradeId: 'g4',
      assignedGradeLabel: 'Grade 4 · Intermediate Division',
      email: 'a.bautista@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 2 · Room 202',
      officeHours: 'Mon–Fri · 3:15 p.m. – 4:15 p.m.',
      employmentStatus: 'Regular / Permanent',
      updatedAt: nowLabel,
    },
  ];

  return [...teacherRecords, ...additionalAdvisers];
}

interface RetainedStaffSeedEntry {
  record: Omit<StaffMemberRecord, 'updatedAt'>;
  initialPassword: string;
}

const DANLOG_RETAINED_STAFF_SEED: RetainedStaffSeedEntry[] = [
  {
    record: {
      id: 'staff-danlog-logia',
      fullName: 'GLENDA LLAVANES LOGIA',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g1',
      assignedGradeLabel: 'Grade 1 · Primary Division',
      email: 'glenda.logia@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'g.logia',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-lleva',
      fullName: 'RUBYLYN NACION LLEVA',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g2',
      assignedGradeLabel: 'Grade 2 · Primary Division',
      email: 'rubylyn.lleva@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'r.lleva',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-majin',
      fullName: 'ROXAN MACABUHAY MAJIN',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g3',
      assignedGradeLabel: 'Grade 3 · Primary Division',
      email: 'roxan.majin@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'r.majin',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-fuentes',
      fullName: 'MARILYN VELASCO FUENTES',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g4',
      assignedGradeLabel: 'Grade 4 · Intermediate Division',
      email: 'marilyn.fuentes@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 2 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'm.fuentes',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-delatorre',
      fullName: 'SALVE RUBIS DE LA TORRE',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g5',
      assignedGradeLabel: 'Grade 5 · Intermediate Division',
      email: 'salve.delatorre@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 2 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 's.delatorre',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-mesias',
      fullName: 'CHARITO LOTERTE MESIAS',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g6',
      assignedGradeLabel: 'Grade 6 · Intermediate Division',
      email: 'charito.mesias@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 2 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'c.mesias',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-lecetivo',
      fullName: 'JOAN RANERA LECETIVO',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'k',
      assignedGradeLabel: 'Kindergarten · Primary Division',
      email: 'joan.lecetivo@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'j.lecetivo',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-dazo',
      fullName: 'KATHERINE LACSA DAZO',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g1',
      assignedGradeLabel: 'Grade 1 · Primary Division',
      email: 'katherine.dazo@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'k.dazo',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-macasinag',
      fullName: 'RACQUEL LOSITO MACASINAG',
      role: 'Teacher',
      title: 'Classroom Teacher',
      department: 'Primary & Intermediate Faculty',
      assignedGradeId: 'g2',
      assignedGradeLabel: 'Grade 2 · Primary Division',
      email: 'racquel.macasinag@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Building 1 · Classroom',
      officeHours: 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'r.macasinag',
    },
    initialPassword: 'DanlogFaculty#2026',
  },
  {
    record: {
      id: 'staff-danlog-gabrito',
      fullName: 'RODULFO C. GABRITO JR.',
      role: 'Administrative Officer',
      title: 'Administrative Officer II (AO-II)',
      department: 'Records, Enrollment & Property Supply',
      assignedGradeId: 'all',
      assignedGradeLabel: 'School-Wide Administration',
      email: 'gabritorodulfo@gmail.com',
      phone: '+63 (56) 555-0184',
      room: 'Administration Wing · Registrar Desk',
      officeHours: 'Mon–Fri · 7:30 a.m. – 5:00 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'r.gabrito',
    },
    initialPassword: 'DanlogAO2#1975',
  },
  {
    record: {
      id: 'staff-danlog-cadag',
      fullName: 'Ely M. Cadag',
      role: 'Principal',
      title: 'School Principal',
      department: 'Office of the School Principal',
      assignedGradeId: 'all',
      assignedGradeLabel: 'School-Wide Oversight (K–6)',
      email: 'ely.cadag@danloges.edu.ph',
      phone: '+63 (56) 555-0184',
      room: 'Administration Wing · Office 101',
      officeHours: 'Mon–Fri · 8:00 a.m. – 4:30 p.m.',
      employmentStatus: 'Regular / Permanent',
      portalUsername: 'e.cadag',
    },
    initialPassword: 'Ely_Principal',
  },
];

function recordAo2StaffDeletion(store: SchoolServerStore, id: string): void {
  if (!Array.isArray(store.deletedStaffIds)) {
    store.deletedStaffIds = [];
  }
  if (!store.deletedStaffIds.includes(id)) {
    store.deletedStaffIds.push(id);
  }
}

function ensureRetainedStaffInStore(store: SchoolServerStore): boolean {
  if (!Array.isArray(store.deletedStaffIds)) {
    store.deletedStaffIds = [];
  }
  if (!Array.isArray(store.ao2Credentials)) {
    store.ao2Credentials = [];
  }
  const deletedSet = new Set(store.deletedStaffIds);
  const nowLabel = 'Nov 18, 2026 · 8:00 a.m.';
  let changed = false;
  let newlyAddedGabrito = false;

  for (const seed of DANLOG_RETAINED_STAFF_SEED) {
    if (deletedSet.has(seed.record.id)) continue;

    const normalizedSeedName = seed.record.fullName.trim().toLowerCase();
    const existingStaff = store.staffRecords.find(
      (s) => s.id === seed.record.id || s.fullName.trim().toLowerCase() === normalizedSeedName
    );
    const targetId = existingStaff?.id ?? seed.record.id;
    const targetUsername =
      existingStaff?.portalUsername?.trim().toLowerCase() || seed.record.portalUsername || '';

    if (!existingStaff) {
      store.staffRecords.push({
        ...seed.record,
        updatedAt: nowLabel,
      });
      changed = true;
      if (seed.record.id === 'staff-danlog-gabrito') {
        newlyAddedGabrito = true;
      }
    }

    if (seed.record.role === 'Principal') {
      const beforeLen = store.teacherCredentials.length;
      store.teacherCredentials = store.teacherCredentials.filter(
        (c) =>
          c.teacherId !== targetId &&
          (!targetUsername || c.username.toLowerCase() !== targetUsername)
      );
      if (store.teacherCredentials.length !== beforeLen) {
        changed = true;
      }
      if (!store.principalCredential && targetUsername) {
        const { salt, hash } = hashPassword(seed.initialPassword);
        store.principalCredential = {
          username: targetUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: true,
          updatedAt: nowLabel,
        };
        changed = true;
      }
    } else if (seed.record.role === 'Administrative Officer') {
      const hasAo2Cred = store.ao2Credentials.some((c) => c.accountId === targetId);
      if (!hasAo2Cred && targetUsername) {
        const { salt, hash } = hashPassword(seed.initialPassword);
        store.ao2Credentials.push({
          accountId: targetId,
          username: targetUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: false,
          updatedAt: nowLabel,
        });
        changed = true;
      }
    } else if (seed.record.role === 'Teacher' && targetUsername) {
      const hasTeacherCred = store.teacherCredentials.some((c) => c.teacherId === targetId);
      if (!hasTeacherCred) {
        const { salt, hash } = hashPassword(seed.initialPassword);
        store.teacherCredentials.push({
          teacherId: targetId,
          username: targetUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: false,
          updatedAt: nowLabel,
        });
        changed = true;
      }
    }
  }

  const allAo2Ids = new Set(store.ao2Credentials.map((c) => c.accountId));
  if (
    (newlyAddedGabrito || !store.primaryAo2AccountId || !allAo2Ids.has(store.primaryAo2AccountId)) &&
    allAo2Ids.size > 0
  ) {
    store.primaryAo2AccountId = allAo2Ids.has('staff-danlog-gabrito')
      ? 'staff-danlog-gabrito'
      : store.ao2Credentials[0].accountId;
    changed = true;
  }

  return changed;
}

function buildDefaultStudentRecords(): StudentRecord[] {
  const nowLabel = 'Nov 15, 2026 · 8:00 a.m.';
  const records: StudentRecord[] = [];
  let seq = 1;

  for (const teacher of TEACHER_PORTAL_PROFILES) {
    const gradeId = teacher.assignedGradeId;
    for (const s of teacher.students) {
      records.push({
        id: s.id,
        lrn: `11420826${String(seq).padStart(4, '0')}`,
        studentName: s.studentName,
        gradeId,
        gradeLabel: s.gradeLabel,
        section: s.advisorGroup,
        adviserId: teacher.id,
        adviserName: teacher.name,
        academicYear: '2026-2027',
        enrollmentStatus: 'Enrolled',
        attendance: s.attendance,
        currentAverage: s.currentAverage,
        missingWork: s.missingWork,
        guardianName: `${s.studentName.split(' ').slice(-1)[0]} Family`,
        guardianContact: '+63 917 555 0100',
        updatedAt: nowLabel,
      });
      seq += 1;
    }
  }

  return records;
}

function buildDefaultHomePosts(): HomeFeedPost[] {
  return [
    {
      id: 'hpost-101',
      title: 'Welcome to SY 2026–2027 Reading & Eco-Garden Programs',
      content:
        'Parents and guardians across Barangay Danlog and Pilar II are welcome to follow classroom dispatches, activity photos, and school-wide notices posted directly by our Teachers, Principal, and AO-II Office.',
      category: 'Announcement',
      authorRole: 'AO-II',
      authorName: 'RODULFO C. GABRITO JR.',
      authorUsername: 'r.gabrito',
      authorAccountId: 'staff-danlog-gabrito',
      createdAt: 'Nov 15, 2026 · 8:30 a.m.',
      pinned: true,
    },
    {
      id: 'hpost-102',
      title: 'Grade 5 Narra Watershed Science Fair Preparations',
      content:
        'Our Grade 5 Science pupils completed water clarity trials in Science Room 204 this week ahead of the Pilar II District Science Quiz & Fair. Thank you to families who contributed clean gravel and sand filter materials!',
      category: 'Classroom Story',
      authorRole: 'Teacher',
      authorName: 'Roberto Santos, M.A.Ed.',
      authorUsername: 'r.santos',
      authorAccountId: 't-chen',
      createdAt: 'Nov 14, 2026 · 4:15 p.m.',
      imageUrl: '/src/assets/images/activity_science_fair_1794813121743.jpg',
      imageAlt: 'Grade 5 pupils demonstrating watershed models',
    },
  ];
}

function buildDefaultTeacherNotes(): TeacherAdvisoryNote[] {
  const notes: TeacherAdvisoryNote[] = [];
  for (const profile of TEACHER_PORTAL_PROFILES) {
    for (const n of profile.initialNotes) {
      notes.push({
        id: `${profile.id}-${n.id}`,
        teacherId: profile.id,
        authorName: profile.name,
        text: n.text,
        timestamp: n.timestamp,
      });
    }
  }
  return notes;
}

function toBootstrapPayload(store: SchoolServerStore): SchoolSystemBootstrap {
  const teacherAccounts: TeacherAccountSummary[] = store.teacherCredentials.map((cred) => ({
    teacherId: cred.teacherId,
    username: cred.username,
    hasCustomPassword: cred.hasCustomPassword,
    updatedAt: cred.updatedAt,
  }));
  const principalAccount: StaffAccountSummary | null = store.principalCredential
    ? {
        username: store.principalCredential.username,
        hasCustomPassword: store.principalCredential.hasCustomPassword,
        updatedAt: store.principalCredential.updatedAt,
      }
    : null;
  const allAo2Creds = getAllAo2Credentials(store);
  const validPrimaryId = allAo2Creds.some((c) => c.accountId === store.primaryAo2AccountId)
    ? (store.primaryAo2AccountId as string)
    : allAo2Creds[0]?.accountId ?? 'staff-danlog-gabrito';

  const ao2Accounts: Ao2AccountSummary[] = allAo2Creds
    .map((cred) => {
      const staff = store.staffRecords.find((s) => s.id === cred.accountId);
      return {
        accountId: cred.accountId,
        username: cred.username,
        fullName: staff?.fullName ?? cred.username,
        title: staff?.title ?? 'Administrative Officer II (AO-II)',
        hasCustomPassword: cred.hasCustomPassword,
        updatedAt: cred.updatedAt,
        isPrimary: cred.accountId === validPrimaryId,
      };
    })
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));

  const primaryAo2Summary = ao2Accounts.find((a) => a.accountId === validPrimaryId) ?? ao2Accounts[0];
  const ao2Account: StaffAccountSummary = {
    username: primaryAo2Summary?.username ?? store.ao2Credential?.username ?? 'r.gabrito',
    hasCustomPassword:
      primaryAo2Summary?.hasCustomPassword ?? store.ao2Credential?.hasCustomPassword ?? false,
    updatedAt: primaryAo2Summary?.updatedAt ?? store.ao2Credential?.updatedAt ?? 'Default',
  };
  return {
    frontendConfig: store.frontendConfig,
    backendConfig: store.backendConfig,
    enrollmentByYear: store.enrollmentByYear,
    uploadedDocuments: store.uploadedDocuments,
    admissionsSubmissions: store.admissionsSubmissions,
    inventoryItems: store.inventoryItems,
    materialRequisitions: store.materialRequisitions,
    leaveApplications: store.leaveApplications ?? [],
    staffRecords: store.staffRecords,
    studentRecords: store.studentRecords,
    activityPosts: store.activityPosts,
    homePosts: store.homePosts,
    teacherNotes: store.teacherNotes ?? [],
    studentDocFeedback: store.studentDocFeedback ?? [],
    auditLog: store.auditLog,
    teacherAccounts,
    principalAccount,
    ao2Account,
    ao2Accounts,
  };
}

function buildDefaultState(): SchoolServerStore {
  const defaultFrontend: SiteFrontendConfig = {
    schoolName: 'Danlog Elementary School',
    taglineLocation: 'Danlog Elementary School · District of Pilar II · Established 1975',
    heroHeadline: 'Nurturing curious young learners through reading, discovery, and community.',
    heroLead:
      'Since 1975, Danlog Elementary School has guided Kindergarten through Grade 6 pupils across Pilar II—combining structured foundational literacy, hands-on garden science, dedicated classroom teachers, and transparent grade-level enrollment.',
    heroImage: '/assets/aistudio/image_608d5cb7_43662196.jpg',
    accentColor: '#15803D',
    announcementEnabled: true,
    announcementText:
      'Danlog Elementary School Parents’ Day & Science Fair: Saturday, December 5 · 9:00 a.m. – 11:30 a.m.',
    campusAddress: 'Barangay Danlog, District of Pilar II, Sorsogon',
    admissionsPhone: '+63 (56) 555-0184',
    admissionsEmail: 'office@danloges.edu.ph',
    visibleSections: {
      academics: true,
      dashboard: true,
      campus: true,
      admissions: true,
    },
  };

  const defaultBackend: SiteBackendConfig = {
    activeAcademicYear: '2026-2027',
    admissionsOpen: true,
    teacherUploadsEnabled: true,
    maxUploadSizeMb: 100,
    allowedExtensions: ['.pdf', '.docx', '.csv', '.xlsx', '.png', '.jpg'],
    maintenanceMode: false,
    maintenanceMessage:
      'Danlog Elementary School public systems are undergoing scheduled registrar updates. Teacher, Principal, and AO-II portals remain active.',
  };

  const defaultUploadedDocs: UploadedCourseDocument[] = [
    {
      id: 'up-1',
      teacherId: 't-sato',
      title: 'Eco-Garden Walk & Parental Consent Guide',
      category: 'Parent Notice',
      targetCourse: 'Kindergarten · Section Sampaguita',
      fileName: 'sampaguita_garden_field_guide.pdf',
      fileSizeBytes: 1240000,
      fileSizeLabel: '1.2 MB',
      uploadedAt: 'Nov 12 · 3:10 p.m.',
      notes: 'Checklist for sun hats, water bottles, and sketchbooks for morning garden walk.',
      documentContent: DEFAULT_DOCUMENT_CONTENT_MAP['up-1'],
      mimeType: 'application/pdf',
      hasStoredFile: true,
      principalReviewStatus: 'Approved',
      principalNote: 'Approved for family distribution; clear safety instructions.',
      endorsedToAo2: true,
      ao2EndorsementStatus: 'Endorsed/Principal',
      endorsedAt: 'Nov 13 · 9:15 a.m.',
      endorsedBy: 'Office of the School Principal',
    },
    {
      id: 'up-11',
      teacherId: 't-chen',
      title: 'Science Fair Watershed Filtration Protocol',
      category: 'Lab Handout',
      targetCourse: 'Grade 5 · Section Narra',
      fileName: 'watershed_filtration_lab4.pdf',
      fileSizeBytes: 860000,
      fileSizeLabel: '840 KB',
      uploadedAt: 'Nov 13 · 4:25 p.m.',
      notes: 'Safety procedures and gravel-sand-charcoal filter steps for Science Room 204.',
      documentContent: DEFAULT_DOCUMENT_CONTENT_MAP['up-11'],
      mimeType: 'application/pdf',
      hasStoredFile: true,
      principalReviewStatus: 'Pending Review',
      endorsedToAo2: false,
    },
    {
      id: 'up-21',
      teacherId: 't-brooks',
      title: 'Pilar II Local Heritage Essay Rubric',
      category: 'Assessment Rubric',
      targetCourse: 'Grade 6 · Section Molave',
      fileName: 'grade6_heritage_essay_rubric.pdf',
      fileSizeBytes: 640000,
      fileSizeLabel: '625 KB',
      uploadedAt: 'Nov 10 · 1:50 p.m.',
      notes: 'Oral history interview prompts and 4-criteria writing evaluation matrix.',
      documentContent: DEFAULT_DOCUMENT_CONTENT_MAP['up-21'],
      mimeType: 'application/pdf',
      hasStoredFile: true,
      principalReviewStatus: 'Endorsed/Principal',
      principalNote: 'Aligned with Grade 6 English and Araling Panlipunan standards.',
      endorsedToAo2: true,
      ao2EndorsementStatus: 'Endorsed/Principal',
      endorsedAt: 'Nov 11 · 10:30 a.m.',
      endorsedBy: 'Office of the School Principal',
    },
  ];

  const defaultAdmissions: AdmissionsSubmission[] = [
    {
      id: 'adm-101',
      referenceCode: 'DES-4182',
      parentName: 'Maricris & Joel Bautista',
      email: 'bautista.family@example.org',
      gradeApplying: 'Grade 5 (Intermediate)',
      entryYear: 'SY 2027–2028',
      notes: 'Interested in transferring from neighboring barangay and joining Science Club.',
      submittedAt: 'Nov 14, 2026 · 10:15 a.m.',
      status: 'Tour Scheduled',
    },
    {
      id: 'adm-102',
      referenceCode: 'DES-4195',
      parentName: 'Marco & Liza Villanueva',
      email: 'villanueva.l@example.org',
      gradeApplying: 'Kindergarten (Primary)',
      entryYear: 'SY 2027–2028',
      notes: 'Pre-registration inquiry for incoming 5-year-old Kindergarten pupil.',
      submittedAt: 'Nov 15, 2026 · 2:40 p.m.',
      status: 'New Inquiry',
    },
  ];

  const defaultAudit: AdminAuditEntry[] = [
    {
      id: 'aud-1',
      actor: 'RODULFO C. GABRITO JR. (AO-II)',
      scope: 'System',
      summary: 'Initialized Danlog Elementary School (Pilar II) SY 2026–2027 enrollment and document policies.',
      timestamp: 'Nov 15, 2026 · 8:00 a.m.',
    },
  ];

  const teacherCredentials = buildDefaultTeacherCredentials();

  const store: SchoolServerStore = {
    frontendConfig: defaultFrontend,
    backendConfig: defaultBackend,
    enrollmentByYear: structuredClone(INITIAL_ENROLLMENT_BY_YEAR),
    uploadedDocuments: defaultUploadedDocs,
    admissionsSubmissions: defaultAdmissions,
    inventoryItems: buildDefaultInventoryItems(),
    materialRequisitions: buildDefaultMaterialRequisitions(),
    leaveApplications: buildDefaultLeaveApplications(),
    staffRecords: buildDefaultStaffRecords(teacherCredentials),
    studentRecords: buildDefaultStudentRecords(),
    activityPosts: [],
    homePosts: buildDefaultHomePosts(),
    teacherNotes: buildDefaultTeacherNotes(),
    studentDocFeedback: [],
    auditLog: defaultAudit,
    teacherCredentials,
    principalCredential: null,
    ao2Credential: null,
    ao2Credentials: [],
    primaryAo2AccountId: 'staff-danlog-gabrito',
    deletedStaffIds: [],
    removedLegacyPlaceholders: true,
    assignedCadagPrincipal: true,
  };
  ensureRetainedStaffInStore(store);
  return store;
}

function tryReadStoreFile(filePath: string): Partial<SchoolServerStore> | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw) as Partial<SchoolServerStore>;
    if (parsed?.frontendConfig?.schoolName === 'Danlog Elementary School') {
      return parsed;
    }
  } catch {
    // Ignore parse/read error and allow backup fallback
  }
  return null;
}

function loadStore(): SchoolServerStore {
  const primary = tryReadStoreFile(STORE_PATH);
  const recovered = primary ?? tryReadStoreFile(BACKUP_STORE_PATH);
  if (recovered) {
    try {
      const parsed = recovered;
      if (parsed.frontendConfig?.schoolName === 'Danlog Elementary School') {
        let dirty = !primary;
        if (
          parsed.frontendConfig.heroImage ===
          '/src/assets/images/hero_colorful_education_1794812726997.jpg'
        ) {
          parsed.frontendConfig.heroImage = '/assets/aistudio/image_608d5cb7_43662196.jpg';
          dirty = true;
        }
        if (!Array.isArray(parsed.teacherCredentials)) {
          parsed.teacherCredentials = buildDefaultTeacherCredentials();
          dirty = true;
        }
        if (!Array.isArray(parsed.ao2Credentials)) {
          parsed.ao2Credentials = [];
          dirty = true;
        }
        if (!parsed.primaryAo2AccountId || parsed.primaryAo2AccountId === 'staff-ao2') {
          parsed.primaryAo2AccountId = 'staff-danlog-gabrito';
          dirty = true;
        }
        if (parsed.backendConfig && parsed.backendConfig.maxUploadSizeMb === 10) {
          parsed.backendConfig.maxUploadSizeMb = 100;
          dirty = true;
        }
        if (Array.isArray(parsed.uploadedDocuments)) {
          parsed.uploadedDocuments = parsed.uploadedDocuments.map((doc) => {
            const rawStatus = doc.principalReviewStatus as string;
            let nextStatus = doc.principalReviewStatus;
            if (rawStatus === 'Endorsed') {
              nextStatus = 'Approved';
              dirty = true;
            } else if (rawStatus === 'Needs Follow-up') {
              nextStatus = 'Needs Revision';
              dirty = true;
            }
            const defaultBody = DEFAULT_DOCUMENT_CONTENT_MAP[doc.id];
            if (defaultBody && !doc.documentContent) {
              dirty = true;
            }
            const shouldBeEndorsed =
              nextStatus === 'Approved' || nextStatus === 'Endorsed/Principal';
            if (shouldBeEndorsed && (!doc.endorsedToAo2 || !doc.ao2EndorsementStatus)) {
              dirty = true;
            }
            return {
              ...doc,
              principalReviewStatus: nextStatus,
              documentContent: doc.documentContent ?? defaultBody,
              mimeType: doc.mimeType ?? getMimeTypeForFile(doc.fileName),
              hasStoredFile: doc.hasStoredFile ?? Boolean(defaultBody),
              endorsedToAo2: shouldBeEndorsed ? true : Boolean(doc.endorsedToAo2),
              ao2EndorsementStatus: shouldBeEndorsed ? 'Endorsed/Principal' : undefined,
              endorsedBy: shouldBeEndorsed
                ? doc.endorsedBy ?? 'Office of the School Principal'
                : undefined,
              endorsedAt: shouldBeEndorsed ? doc.endorsedAt ?? doc.uploadedAt : undefined,
            };
          });
        }
        if (!Array.isArray(parsed.inventoryItems)) {
          parsed.inventoryItems = buildDefaultInventoryItems();
          dirty = true;
        } else {
          const legacyCustodyRemap: Record<string, { old: string; next: string }> = {
            'inv-101': {
              old: 'Mr. David Chen · Science Room 204',
              next: 'Roberto Santos, M.A.Ed. · Grade 5 Narra',
            },
            'inv-102': {
              old: 'Ms. Mariel Sato · Kindergarten Sampaguita',
              next: 'Marisol Mendoza, M.Ed. · Kindergarten Sampaguita',
            },
            'inv-106': {
              old: 'Mrs. Claire Brooks · Grade 6 Molave',
              next: 'Lourdes Evangelista, M.A. · Grade 6 Molave',
            },
          };
          const normalizedInventory: InventoryItem[] = parsed.inventoryItems.map((item) => {
            const nextCategory = VALID_INVENTORY_CATEGORIES.includes(
              item.category as InventoryCategory
            )
              ? item.category
              : inferInventoryCategory(item.itemName ?? '');
            const remap = legacyCustodyRemap[item.id];
            const nextIssuedTo =
              remap && item.issuedToUser === remap.old ? remap.next : item.issuedToUser;
            if (item.category !== nextCategory || nextIssuedTo !== item.issuedToUser) {
              dirty = true;
            }
            return {
              ...item,
              category: nextCategory,
              issuedToUser: nextIssuedTo,
              unit: item.unit ?? 'units',
              location: item.location ?? 'Campus Property Room',
            };
          });
          const existingIds = new Set(normalizedInventory.map((i) => i.id));
          for (const defItem of buildDefaultInventoryItems()) {
            const isSeedExpansion =
              defItem.id === 'inv-109' ||
              defItem.id === 'inv-110' ||
              defItem.id === 'inv-111' ||
              defItem.id === 'inv-112' ||
              defItem.id === 'inv-113' ||
              Number(defItem.id.replace('inv-', '')) >= 114;
            if (isSeedExpansion && !existingIds.has(defItem.id)) {
              normalizedInventory.push(defItem);
              dirty = true;
            }
          }
          parsed.inventoryItems = normalizedInventory;
        }
        if (!Array.isArray(parsed.materialRequisitions)) {
          parsed.materialRequisitions = buildDefaultMaterialRequisitions();
          dirty = true;
        }
        if (!Array.isArray(parsed.leaveApplications)) {
          parsed.leaveApplications = buildDefaultLeaveApplications();
          dirty = true;
        } else {
          parsed.leaveApplications = parsed.leaveApplications.map((app) => {
            if (app.ao2EndorsementStatus === 'Endorsed' || app.ao2EndorsementStatus === 'Pending Endorsement') {
              return app;
            }
            dirty = true;
            const inferredStatus: Ao2LeaveEndorsementStatus =
              app.principalStatus === 'Approved' || app.principalStatus === 'Disapproved'
                ? 'Endorsed'
                : 'Pending Endorsement';
            return {
              ...app,
              ao2EndorsementStatus: inferredStatus,
            };
          });
        }
        if (!Array.isArray(parsed.staffRecords)) {
          parsed.staffRecords = buildDefaultStaffRecords(parsed.teacherCredentials);
          dirty = true;
        }
        if (!Array.isArray(parsed.studentRecords)) {
          parsed.studentRecords = buildDefaultStudentRecords();
          dirty = true;
        }
        if (!Array.isArray(parsed.activityPosts)) {
          parsed.activityPosts = [];
          dirty = true;
        }
        if (!Array.isArray(parsed.homePosts)) {
          parsed.homePosts = buildDefaultHomePosts();
          dirty = true;
        }
        if (!Array.isArray(parsed.teacherNotes)) {
          parsed.teacherNotes = buildDefaultTeacherNotes();
          dirty = true;
        }
        if (!Array.isArray(parsed.studentDocFeedback)) {
          parsed.studentDocFeedback = [];
          dirty = true;
        }
        if (!parsed.removedLegacyPlaceholders) {
          const hadLegacyStaff = parsed.staffRecords.some(
            (s) =>
              s.id === 'staff-principal' ||
              s.id === 'staff-ao2' ||
              s.fullName.trim().toLowerCase() === 'dr. elena vance' ||
              s.fullName.trim().toLowerCase() === 'administrative officer ii'
          );
          if (hadLegacyStaff) {
            parsed.staffRecords = parsed.staffRecords.filter(
              (s) =>
                s.id !== 'staff-principal' &&
                s.id !== 'staff-ao2' &&
                s.fullName.trim().toLowerCase() !== 'dr. elena vance' &&
                s.fullName.trim().toLowerCase() !== 'administrative officer ii'
            );
          }
          parsed.ao2Credentials = (parsed.ao2Credentials ?? []).filter(
            (c) => c.accountId !== 'staff-ao2' && c.username.toLowerCase() !== 'ao2.admin'
          );
          parsed.ao2Credential = null;
          if (
            parsed.principalCredential &&
            (parsed.principalCredential.username.toLowerCase() === 'principal.vance' ||
              hadLegacyStaff)
          ) {
            parsed.principalCredential = null;
          }
          parsed.uploadedDocuments = (parsed.uploadedDocuments ?? []).map((doc) =>
            doc.endorsedBy?.includes('Dr. Elena Vance')
              ? { ...doc, endorsedBy: 'Office of the School Principal' }
              : doc
          );
          parsed.materialRequisitions = (parsed.materialRequisitions ?? []).map((reqItem) => ({
            ...reqItem,
            ao2ReviewedBy: reqItem.ao2ReviewedBy?.includes('ao2.admin')
              ? 'RODULFO C. GABRITO JR. (r.gabrito)'
              : reqItem.ao2ReviewedBy,
            principalReviewedBy: reqItem.principalReviewedBy?.includes('Dr. Elena Vance')
              ? 'Office of the School Principal'
              : reqItem.principalReviewedBy,
          }));
          parsed.homePosts = (parsed.homePosts ?? []).map((post) =>
            post.authorAccountId === 'staff-principal' || post.authorName === 'Dr. Elena Vance'
              ? {
                  ...post,
                  authorRole: 'AO-II',
                  authorName: 'RODULFO C. GABRITO JR.',
                  authorUsername: 'r.gabrito',
                  authorAccountId: 'staff-danlog-gabrito',
                }
              : post
          );
          if (parsed.primaryAo2AccountId === 'staff-ao2') {
            parsed.primaryAo2AccountId = 'staff-danlog-gabrito';
          }
          parsed.removedLegacyPlaceholders = true;
          dirty = true;
        }
        if (!parsed.assignedCadagPrincipal) {
          const nowLabel = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
          if (Array.isArray(parsed.deletedStaffIds)) {
            parsed.deletedStaffIds = parsed.deletedStaffIds.filter(
              (id) => id !== 'staff-danlog-cadag'
            );
          }
          parsed.teacherCredentials = (parsed.teacherCredentials ?? []).filter(
            (c) =>
              c.teacherId !== 'staff-danlog-cadag' && c.username.toLowerCase() !== 'e.cadag'
          );
          const existingCadagIdx = (parsed.staffRecords ?? []).findIndex(
            (s) =>
              s.id === 'staff-danlog-cadag' ||
              s.fullName.trim().toLowerCase() === 'elymacasinag cadag jr' ||
              s.fullName.trim().toLowerCase() === 'ely m. cadag'
          );
          const existingCadag =
            existingCadagIdx >= 0 ? parsed.staffRecords?.[existingCadagIdx] : undefined;
          const updatedPrincipalRecord: StaffMemberRecord = {
            id: existingCadag?.id ?? 'staff-danlog-cadag',
            fullName: 'Ely M. Cadag',
            role: 'Principal',
            title: 'School Principal',
            department: 'Office of the School Principal',
            assignedGradeId: 'all',
            assignedGradeLabel: 'School-Wide Oversight (K–6)',
            email: existingCadag?.email || 'ely.cadag@danloges.edu.ph',
            phone: existingCadag?.phone || '+63 (56) 555-0184',
            room: 'Administration Wing · Office 101',
            officeHours: 'Mon–Fri · 8:00 a.m. – 4:30 p.m.',
            employmentStatus: existingCadag?.employmentStatus || 'Regular / Permanent',
            portalUsername: 'e.cadag',
            updatedAt: nowLabel,
          };
          if (existingCadagIdx >= 0 && Array.isArray(parsed.staffRecords)) {
            parsed.staffRecords[existingCadagIdx] = updatedPrincipalRecord;
          } else {
            parsed.staffRecords = [updatedPrincipalRecord, ...(parsed.staffRecords ?? [])];
          }
          const { salt, hash } = hashPassword('Ely_Principal');
          parsed.principalCredential = {
            username: 'e.cadag',
            salt,
            passwordHash: hash,
            hasCustomPassword: true,
            updatedAt: nowLabel,
          };
          parsed.assignedCadagPrincipal = true;
          dirty = true;
        }
        const normalized = parsed as SchoolServerStore;
        if (ensureRetainedStaffInStore(normalized)) {
          dirty = true;
        }
        if (dirty) {
          saveStore(normalized);
        }
        return normalized;
      }
    } catch {
      // Fallback only if both primary and backup stores cannot be read
    }
  }
  const initial = buildDefaultState();
  saveStore(initial);
  return initial;
}

function saveStore(state: SchoolServerStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = JSON.stringify(state, null, 2);
    fs.writeFileSync(TMP_STORE_PATH, serialized, 'utf-8');
    fs.renameSync(TMP_STORE_PATH, STORE_PATH);
    fs.writeFileSync(BACKUP_STORE_PATH, serialized, 'utf-8');
  } catch {
    // Ignore disk write issues in read-only environments; keep in-memory state
  }
}

function appendAudit(
  state: SchoolServerStore,
  scope: AdminAuditEntry['scope'],
  summary: string,
  actor = 'AO-II (Administrative Officer II)'
): void {
  const now = new Date();
  const formatted = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  state.auditLog.unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actor,
    scope,
    summary,
    timestamp: formatted,
  });
  state.auditLog = state.auditLog.slice(0, 40);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  let store = loadStore();
  const teacherSessions = new Map<string, string>();
  const principalSessions = new Map<string, string>();
  const ao2Sessions = new Map<string, { accountId: string; username: string }>();

  function requireAoII(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const roleHeader = req.header('x-admin-role');
    const token = req.header('x-ao2-token') ?? '';
    if (roleHeader !== 'AO-II' || !ao2Sessions.has(token)) {
      res.status(401).json({
        error:
          'Authentication required: Sign in with your AO-II administrator username and password.',
      });
      return;
    }
    next();
  }

  interface AuthenticatedStaffActor {
    role: 'Teacher' | 'Principal' | 'AO-II';
    accountId: string;
    username: string;
    displayName: string;
  }

  function resolveAnyStaffActor(req: express.Request): AuthenticatedStaffActor | null {
    const ao2Token = req.header('x-ao2-token') ?? '';
    const ao2SessionInfo = ao2Sessions.get(ao2Token);
    if (ao2Token && ao2SessionInfo) {
      const staff = store.staffRecords.find((s) => s.id === ao2SessionInfo.accountId);
      return {
        role: 'AO-II',
        accountId: ao2SessionInfo.accountId,
        username: ao2SessionInfo.username,
        displayName: staff?.fullName ?? 'Administrative Officer II',
      };
    }

    const principalToken = req.header('x-principal-token') ?? '';
    if (principalToken && principalSessions.has(principalToken)) {
      const username =
        principalSessions.get(principalToken) ?? store.principalCredential?.username ?? 'principal';
      const staff = getPrincipalStaffRecord(store);
      return {
        role: 'Principal',
        accountId: staff?.id ?? 'staff-principal',
        username,
        displayName: staff?.fullName ?? 'School Principal',
      };
    }

    const teacherToken = req.header('x-teacher-token') ?? '';
    const teacherId = teacherSessions.get(teacherToken);
    if (teacherToken && teacherId) {
      const cred = store.teacherCredentials.find((c) => c.teacherId === teacherId);
      const staff = store.staffRecords.find((s) => s.id === teacherId);
      const fallback = TEACHER_PORTAL_PROFILES.find((t) => t.id === teacherId);
      return {
        role: 'Teacher',
        accountId: teacherId,
        username: cred?.username ?? teacherId,
        displayName: staff?.fullName ?? fallback?.name ?? 'Faculty Member',
      };
    }

    return null;
  }

  app.get('/api/bootstrap', (_req, res) => {
    res.json(toBootstrapPayload(store));
  });

  app.post('/api/principal/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const normalizedUser = (username ?? '').trim().toLowerCase();
    const rawPassword = password ?? '';

    if (!normalizedUser || !rawPassword) {
      res.status(400).json({ error: 'Enter both the Principal username and password.' });
      return;
    }

    const cred = store.principalCredential;
    if (!cred) {
      res.status(401).json({
        error:
          'No School Principal account is currently configured. Ask an AO-II Administrator to add one in Staff & Portal Accounts.',
      });
      return;
    }

    const principalName = getPrincipalStaffRecord(store)?.fullName ?? 'School Principal';
    if (
      cred.username.toLowerCase() !== normalizedUser ||
      !verifyPassword(rawPassword, cred.salt, cred.passwordHash)
    ) {
      res.status(401).json({
        error: `Invalid Principal username or password. Verify ${principalName}’s credentials.`,
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    principalSessions.set(token, cred.username);
    res.json({ username: cred.username, token });
  });

  app.post('/api/principal/logout', (req, res) => {
    const token = req.header('x-principal-token');
    if (token) principalSessions.delete(token);
    res.json({ ok: true });
  });

  app.post('/api/principal/change-password', (req, res) => {
    const token = req.header('x-principal-token') ?? '';
    if (!principalSessions.has(token)) {
      res.status(401).json({ error: 'Sign in as Principal to update your password.' });
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    const cred = store.principalCredential;
    if (!cred || !verifyPassword(currentPassword ?? '', cred.salt, cred.passwordHash)) {
      res.status(401).json({ error: 'Current Principal password is incorrect.' });
      return;
    }
    const nextPass = (newPassword ?? '').trim();
    if (nextPass.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const { salt, hash } = hashPassword(nextPass);
    cred.salt = salt;
    cred.passwordHash = hash;
    cred.hasCustomPassword = true;
    cred.updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    saveStore(store);
    res.json({
      ok: true,
      principalAccount: toBootstrapPayload(store).principalAccount,
    });
  });

  app.post('/api/ao2/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const normalizedUser = (username ?? '').trim().toLowerCase();
    const rawPassword = password ?? '';

    if (!normalizedUser || !rawPassword) {
      res.status(400).json({ error: 'Enter both your AO-II administrator username and password.' });
      return;
    }

    const cred = getAllAo2Credentials(store).find(
      (c) => c.username.toLowerCase() === normalizedUser
    );
    if (!cred || !verifyPassword(rawPassword, cred.salt, cred.passwordHash)) {
      res.status(401).json({
        error: 'Invalid AO-II administrator username or password.',
      });
      return;
    }

    const staff = store.staffRecords.find((s) => s.id === cred.accountId);
    const token = crypto.randomBytes(24).toString('hex');
    ao2Sessions.set(token, { accountId: cred.accountId, username: cred.username });
    res.json({
      accountId: cred.accountId,
      username: cred.username,
      fullName: staff?.fullName ?? 'Administrative Officer II',
      token,
    });
  });

  app.post('/api/ao2/logout', (req, res) => {
    const token = req.header('x-ao2-token');
    if (token) ao2Sessions.delete(token);
    res.json({ ok: true });
  });

  app.post('/api/admin/principal-account', requireAoII, (req, res) => {
    if (store.principalCredential) {
      res.status(409).json({
        error: 'A School Principal account already exists. Update or delete it first.',
      });
      return;
    }
    const body = (req.body ?? {}) as {
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
      employmentStatus?: StaffEmploymentStatus;
      username?: string;
      newPassword?: string;
    };
    const fullName = String(body.fullName ?? '').trim();
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Principal full name must be at least 2 characters.' });
      return;
    }
    const trimmedUser = String(body.username ?? '').trim().toLowerCase();
    if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
      res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
      return;
    }
    if (isPortalUsernameTaken(store, trimmedUser)) {
      res.status(409).json({
        error: `Username "${trimmedUser}" is already assigned to another portal account.`,
      });
      return;
    }
    const rawPass = String(body.newPassword ?? '').trim();
    if (rawPass.length < 6) {
      res.status(400).json({ error: 'Initial password must be at least 6 characters.' });
      return;
    }
    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const { salt, hash } = hashPassword(rawPass);
    store.principalCredential = {
      username: trimmedUser,
      salt,
      passwordHash: hash,
      hasCustomPassword: true,
      updatedAt: nowLabel,
    };

    const existingPrincipal = getPrincipalStaffRecord(store);
    const id = existingPrincipal?.id ?? `staff-principal-${Date.now()}`;
    const staffRecord: StaffMemberRecord = {
      id,
      fullName,
      role: 'Principal',
      title: String(body.title ?? '').trim() || 'School Principal',
      department: String(body.department ?? '').trim() || 'Office of the School Principal',
      assignedGradeId: 'all',
      assignedGradeLabel: 'School-Wide Oversight (K–6)',
      email:
        String(body.email ?? '').trim() ||
        `${trimmedUser.replace(/[^a-z0-9._-]+/g, '')}@danloges.edu.ph`,
      phone: String(body.phone ?? '').trim() || '+63 (56) 555-0184',
      room: String(body.room ?? '').trim() || 'Administration Wing · Office 101',
      officeHours: String(body.officeHours ?? '').trim() || 'Mon–Fri · 8:00 a.m. – 4:30 p.m.',
      employmentStatus: body.employmentStatus ?? 'Regular / Permanent',
      portalUsername: trimmedUser,
      updatedAt: nowLabel,
    };
    if (existingPrincipal) {
      store.staffRecords = store.staffRecords.map((s) =>
        s.id === existingPrincipal.id ? staffRecord : s
      );
    } else {
      store.staffRecords.unshift(staffRecord);
    }

    appendAudit(
      store,
      'Account Auth',
      `Created School Principal portal account for "${staffRecord.fullName}" (@${trimmedUser}).`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.status(201).json({
      record: staffRecord,
      principalAccount: bootstrapPayload.principalAccount,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/principal-account', requireAoII, (_req, res) => {
    const existingPrincipal = getPrincipalStaffRecord(store);
    if (!store.principalCredential && !existingPrincipal) {
      res.status(404).json({ error: 'No School Principal account is currently configured.' });
      return;
    }
    store.principalCredential = null;
    if (existingPrincipal) {
      store.staffRecords = store.staffRecords.filter((s) => s.id !== existingPrincipal.id);
      recordAo2StaffDeletion(store, existingPrincipal.id);
    }
    principalSessions.clear();

    appendAudit(
      store,
      'Account Auth',
      `Removed School Principal account${existingPrincipal ? ` "${existingPrincipal.fullName}"` : ''}.`
    );
    saveStore(store);

    res.json({
      principalAccount: null,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/principal-account', requireAoII, (req, res) => {
    const {
      username,
      newPassword,
      fullName,
      title,
      department,
      email,
      phone,
      room,
      officeHours,
    } = req.body as {
      username?: string;
      newPassword?: string;
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
    };
    const target = store.principalCredential;
    if (!target) {
      res.status(404).json({
        error: 'No School Principal account is configured yet. Create a Principal account first.',
      });
      return;
    }
    const existingPrincipal = getPrincipalStaffRecord(store);
    const excludeId = existingPrincipal?.id ?? 'staff-principal';
    const trimmedUser = (username ?? '').trim().toLowerCase();
    if (trimmedUser) {
      if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
        res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
        return;
      }
      const collision = isPortalUsernameTaken(store, trimmedUser, excludeId);
      if (collision) {
        res.status(409).json({
          error: `Username "${trimmedUser}" is already assigned to another account.`,
        });
        return;
      }
      target.username = trimmedUser;
      for (const [tok] of principalSessions.entries()) {
        principalSessions.set(tok, trimmedUser);
      }
    }
    const trimmedPass = (newPassword ?? '').trim();
    if (trimmedPass) {
      if (trimmedPass.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const { salt, hash } = hashPassword(trimmedPass);
      target.salt = salt;
      target.passwordHash = hash;
      target.hasCustomPassword = true;
    }
    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    target.updatedAt = nowLabel;

    store.staffRecords = store.staffRecords.map((s) =>
      s.id === excludeId || s.role === 'Principal'
        ? {
            ...s,
            fullName:
              fullName !== undefined && fullName.trim().length >= 2
                ? fullName.trim()
                : s.fullName,
            title: title !== undefined && title.trim() ? title.trim() : s.title,
            department:
              department !== undefined && department.trim() ? department.trim() : s.department,
            email: email !== undefined && email.trim() ? email.trim() : s.email,
            phone: phone !== undefined && phone.trim() ? phone.trim() : s.phone,
            room: room !== undefined && room.trim() ? room.trim() : s.room,
            officeHours:
              officeHours !== undefined && officeHours.trim() ? officeHours.trim() : s.officeHours,
            portalUsername: target.username,
            updatedAt: nowLabel,
          }
        : s
    );

    appendAudit(
      store,
      'Account Auth',
      `Updated Principal account credentials and profile (${target.username}${trimmedPass ? ', password reset' : ''}).`
    );
    saveStore(store);
    res.json({
      principalAccount: toBootstrapPayload(store).principalAccount,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/ao2-account', requireAoII, (req, res) => {
    const {
      accountId,
      username,
      newPassword,
      fullName,
      title,
      department,
      email,
      phone,
      room,
      officeHours,
    } = req.body as {
      accountId?: string;
      username?: string;
      newPassword?: string;
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
    };
    const token = req.header('x-ao2-token') ?? '';
    const sessionInfo = ao2Sessions.get(token);
    const targetAccountId =
      accountId || sessionInfo?.accountId || store.primaryAo2AccountId || store.ao2Credentials[0]?.accountId;

    const target = store.ao2Credentials.find((c) => c.accountId === targetAccountId);

    if (!target || !targetAccountId) {
      res.status(404).json({ error: 'AO-II administrator account not found.' });
      return;
    }

    const trimmedUser = (username ?? '').trim().toLowerCase();
    if (trimmedUser) {
      if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
        res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
        return;
      }
      if (isPortalUsernameTaken(store, trimmedUser, targetAccountId)) {
        res.status(409).json({
          error: `Username "${trimmedUser}" is already assigned to another account.`,
        });
        return;
      }
      target.username = trimmedUser;
      for (const [tok, sess] of ao2Sessions.entries()) {
        if (sess.accountId === targetAccountId) {
          ao2Sessions.set(tok, { accountId: targetAccountId, username: trimmedUser });
        }
      }
    }
    const trimmedPass = (newPassword ?? '').trim();
    if (trimmedPass) {
      if (trimmedPass.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const { salt, hash } = hashPassword(trimmedPass);
      target.salt = salt;
      target.passwordHash = hash;
      target.hasCustomPassword = true;
    }
    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    target.updatedAt = nowLabel;

    store.staffRecords = store.staffRecords.map((s) =>
      s.id === targetAccountId
        ? {
            ...s,
            fullName:
              fullName !== undefined && fullName.trim().length >= 2
                ? fullName.trim()
                : s.fullName,
            title: title !== undefined && title.trim() ? title.trim() : s.title,
            department:
              department !== undefined && department.trim() ? department.trim() : s.department,
            email: email !== undefined && email.trim() ? email.trim() : s.email,
            phone: phone !== undefined && phone.trim() ? phone.trim() : s.phone,
            room: room !== undefined && room.trim() ? room.trim() : s.room,
            officeHours:
              officeHours !== undefined && officeHours.trim() ? officeHours.trim() : s.officeHours,
            portalUsername: target.username,
            updatedAt: nowLabel,
          }
        : s
    );

    appendAudit(
      store,
      'Account Auth',
      `Updated AO-II Administrator account credentials and profile (${target.username}${trimmedPass ? ', password updated' : ''}).`
    );
    saveStore(store);
    const bootstrapPayload = toBootstrapPayload(store);
    res.json({
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.post('/api/admin/ao2-accounts', requireAoII, (req, res) => {
    const body = (req.body ?? {}) as {
      fullName?: string;
      title?: string;
      department?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
      employmentStatus?: StaffEmploymentStatus;
      username?: string;
      newPassword?: string;
      setAsPrimary?: boolean;
    };

    const fullName = String(body.fullName ?? '').trim();
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Administrator full name must be at least 2 characters.' });
      return;
    }

    const trimmedUser = String(body.username ?? '').trim().toLowerCase();
    if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
      res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
      return;
    }

    if (isPortalUsernameTaken(store, trimmedUser)) {
      res.status(409).json({
        error: `Username "${trimmedUser}" is already assigned to another portal account.`,
      });
      return;
    }

    const rawPass = String(body.newPassword ?? '').trim();
    if (rawPass.length < 6) {
      res.status(400).json({ error: 'Initial password must be at least 6 characters.' });
      return;
    }

    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const id = `staff-ao2-${Date.now()}`;
    const { salt, hash } = hashPassword(rawPass);
    store.ao2Credentials.push({
      accountId: id,
      username: trimmedUser,
      salt,
      passwordHash: hash,
      hasCustomPassword: true,
      updatedAt: nowLabel,
    });

    const employmentStatus: StaffEmploymentStatus =
      body.employmentStatus === 'Regular / Permanent' ||
      body.employmentStatus === 'Contractual' ||
      body.employmentStatus === 'Volunteer' ||
      body.employmentStatus === 'On Leave'
        ? body.employmentStatus
        : 'Regular / Permanent';

    const staffRecord: StaffMemberRecord = {
      id,
      fullName,
      role: 'Administrative Officer',
      title: String(body.title ?? '').trim() || 'Administrative Officer II (AO-II)',
      department:
        String(body.department ?? '').trim() || 'Records, Enrollment & Property Supply',
      assignedGradeId: 'all',
      assignedGradeLabel: 'School-Wide Administration',
      email:
        String(body.email ?? '').trim() ||
        `${trimmedUser.replace(/[^a-z0-9._-]+/g, '')}@danloges.edu.ph`,
      phone: String(body.phone ?? '').trim() || '+63 (56) 555-0184',
      room: String(body.room ?? '').trim() || 'Administration Building',
      officeHours: String(body.officeHours ?? '').trim() || 'Mon–Fri · 7:30 a.m. – 5:00 p.m.',
      employmentStatus,
      portalUsername: trimmedUser,
      updatedAt: nowLabel,
    };

    store.staffRecords.unshift(staffRecord);
    if (body.setAsPrimary !== false) {
      store.primaryAo2AccountId = id;
    }

    appendAudit(
      store,
      'Account Auth',
      `Created AO-II Administrator portal account for "${staffRecord.fullName}" (@${trimmedUser})${body.setAsPrimary !== false ? ' and set as primary Sign-In Administrator' : ''}.`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.status(201).json({
      record: staffRecord,
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.post('/api/admin/ao2-accounts/:accountId/set-primary', requireAoII, (req, res) => {
    const { accountId } = req.params;
    const exists = getAllAo2Credentials(store).some((c) => c.accountId === accountId);
    if (!exists) {
      res.status(404).json({ error: 'AO-II Administrator account not found.' });
      return;
    }
    store.primaryAo2AccountId = accountId;
    const staff = store.staffRecords.find((s) => s.id === accountId);
    appendAudit(
      store,
      'Account Auth',
      `Set "${staff?.fullName ?? accountId}" as the primary AO-II Admin Console Sign-In Administrator.`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.json({
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/ao2-accounts/:accountId', requireAoII, (req, res) => {
    const { accountId } = req.params;
    const existingCred = store.ao2Credentials.find((c) => c.accountId === accountId);
    const existingStaff = store.staffRecords.find((s) => s.id === accountId);
    if (!existingCred && !existingStaff) {
      res.status(404).json({ error: 'AO-II Administrator account not found.' });
      return;
    }
    if (existingCred && store.ao2Credentials.length <= 1) {
      res.status(400).json({
        error:
          'At least one AO-II Administrator account must remain active. Add a new Administrator account before deleting this one.',
      });
      return;
    }

    store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== accountId);
    store.staffRecords = store.staffRecords.filter((s) => s.id !== accountId);
    recordAo2StaffDeletion(store, accountId);
    for (const [tok, sess] of ao2Sessions.entries()) {
      if (sess.accountId === accountId) ao2Sessions.delete(tok);
    }
    if (store.primaryAo2AccountId === accountId) {
      store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
    }

    appendAudit(
      store,
      'Account Auth',
      `Deleted AO-II Administrator account "${existingStaff?.fullName ?? accountId}".`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.json({
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.post('/api/teacher/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const normalizedUser = (username ?? '').trim().toLowerCase();
    const rawPassword = password ?? '';

    if (!normalizedUser || !rawPassword) {
      res.status(400).json({ error: 'Enter both your teacher username and password.' });
      return;
    }

    const cred = store.teacherCredentials.find(
      (c) => c.username.toLowerCase() === normalizedUser
    );
    if (!cred || !verifyPassword(rawPassword, cred.salt, cred.passwordHash)) {
      res.status(401).json({
        error: 'Invalid teacher username or password. Please verify your assigned faculty credentials.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    teacherSessions.set(token, cred.teacherId);
    res.json({
      teacherId: cred.teacherId,
      username: cred.username,
      token,
    });
  });

  app.post('/api/teacher/logout', (req, res) => {
    const token = req.header('x-teacher-token');
    if (token) {
      teacherSessions.delete(token);
    }
    res.json({ ok: true });
  });

  app.post('/api/teacher/change-password', (req, res) => {
    const token = req.header('x-teacher-token') ?? '';
    const sessionTeacherId = teacherSessions.get(token);
    if (!sessionTeacherId) {
      res.status(401).json({ error: 'Sign in with your teacher account to change your password.' });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    const cred = store.teacherCredentials.find((c) => c.teacherId === sessionTeacherId);
    if (!cred || !verifyPassword(currentPassword ?? '', cred.salt, cred.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const nextPass = (newPassword ?? '').trim();
    if (nextPass.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const { salt, hash } = hashPassword(nextPass);
    cred.salt = salt;
    cred.passwordHash = hash;
    cred.hasCustomPassword = true;
    cred.updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    saveStore(store);

    res.json({
      ok: true,
      teacherAccounts: toBootstrapPayload(store).teacherAccounts,
    });
  });

  app.post('/api/admin/teacher-accounts', requireAoII, (req, res) => {
    const body = (req.body ?? {}) as {
      fullName?: string;
      title?: string;
      department?: string;
      assignedGradeId?: string;
      assignedGradeLabel?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
      employmentStatus?: StaffEmploymentStatus;
      username?: string;
      newPassword?: string;
    };

    const fullName = String(body.fullName ?? '').trim();
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Teacher full name must be at least 2 characters.' });
      return;
    }

    const trimmedUser = String(body.username ?? '').trim().toLowerCase();
    if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
      res.status(400).json({
        error: 'Username must be at least 3 characters with no spaces.',
      });
      return;
    }

    if (isPortalUsernameTaken(store, trimmedUser)) {
      res.status(409).json({
        error: `Username "${trimmedUser}" is already assigned to another portal account.`,
      });
      return;
    }

    const rawPass = String(body.newPassword ?? '').trim();
    if (rawPass.length < 6) {
      res.status(400).json({ error: 'Initial password must be at least 6 characters.' });
      return;
    }

    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const id = `staff-${Date.now()}`;
    const { salt, hash } = hashPassword(rawPass);
    store.teacherCredentials.push({
      teacherId: id,
      username: trimmedUser,
      salt,
      passwordHash: hash,
      hasCustomPassword: true,
      updatedAt: nowLabel,
    });

    const assignedGradeId = String(body.assignedGradeId ?? 'g1').trim() || 'g1';
    const assignedGradeLabel =
      String(body.assignedGradeLabel ?? '').trim() || 'Primary / Intermediate Division';
    const employmentStatus: StaffEmploymentStatus =
      body.employmentStatus === 'Regular / Permanent' ||
      body.employmentStatus === 'Contractual' ||
      body.employmentStatus === 'Volunteer' ||
      body.employmentStatus === 'On Leave'
        ? body.employmentStatus
        : 'Regular / Permanent';

    const staffRecord: StaffMemberRecord = {
      id,
      fullName,
      role: 'Teacher',
      title: String(body.title ?? '').trim() || 'Classroom Adviser',
      department: String(body.department ?? '').trim() || 'General Faculty',
      assignedGradeId,
      assignedGradeLabel,
      email:
        String(body.email ?? '').trim() ||
        `${trimmedUser.replace(/[^a-z0-9._-]+/g, '')}@danloges.edu.ph`,
      phone: String(body.phone ?? '').trim() || '+63 (56) 555-0184',
      room: String(body.room ?? '').trim() || 'Main Building',
      officeHours: String(body.officeHours ?? '').trim() || 'Mon–Fri · 3:00 p.m. – 4:00 p.m.',
      employmentStatus,
      portalUsername: trimmedUser,
      updatedAt: nowLabel,
    };
    store.staffRecords.unshift(staffRecord);

    appendAudit(
      store,
      'Faculty Auth',
      `Created teacher & portal account "${staffRecord.fullName}" (@${trimmedUser}, ${staffRecord.assignedGradeLabel}).`
    );
    saveStore(store);

    res.status(201).json({
      record: staffRecord,
      teacherAccounts: toBootstrapPayload(store).teacherAccounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/teacher-accounts/:teacherId', requireAoII, (req, res) => {
    const { teacherId } = req.params;
    const {
      username,
      newPassword,
      fullName,
      title,
      department,
      assignedGradeId,
      assignedGradeLabel,
      email,
      phone,
      room,
      officeHours,
      employmentStatus,
    } = req.body as {
      username?: string;
      newPassword?: string;
      fullName?: string;
      title?: string;
      department?: string;
      assignedGradeId?: string;
      assignedGradeLabel?: string;
      email?: string;
      phone?: string;
      room?: string;
      officeHours?: string;
      employmentStatus?: StaffEmploymentStatus;
    };

    const target = store.teacherCredentials.find((c) => c.teacherId === teacherId);
    if (!target) {
      res.status(404).json({ error: 'Teacher account not found.' });
      return;
    }

    const trimmedUser = (username ?? '').trim().toLowerCase();
    if (trimmedUser) {
      if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
        res.status(400).json({
          error: 'Username must be at least 3 characters with no spaces.',
        });
        return;
      }
      if (isPortalUsernameTaken(store, trimmedUser, teacherId)) {
        res.status(409).json({
          error: `Username "${trimmedUser}" is already assigned to another account.`,
        });
        return;
      }
      target.username = trimmedUser;
    }

    const trimmedPass = (newPassword ?? '').trim();
    if (trimmedPass) {
      if (trimmedPass.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }
      const { salt, hash } = hashPassword(trimmedPass);
      target.salt = salt;
      target.passwordHash = hash;
      target.hasCustomPassword = true;
    }

    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    target.updatedAt = nowLabel;

    let updatedStaffName: string | null = null;
    let updatedGradeLabel: string | null = null;
    const existingStaff = store.staffRecords.find((s) => s.id === teacherId);
    if (existingStaff) {
      const nextFullName =
        fullName !== undefined && fullName.trim().length >= 2
          ? fullName.trim()
          : existingStaff.fullName;
      const nextGradeLabel =
        assignedGradeLabel !== undefined && assignedGradeLabel.trim()
          ? assignedGradeLabel.trim()
          : existingStaff.assignedGradeLabel;
      const updatedRecord: StaffMemberRecord = {
        ...existingStaff,
        fullName: nextFullName,
        title: title !== undefined && title.trim() ? title.trim() : existingStaff.title,
        department:
          department !== undefined && department.trim()
            ? department.trim()
            : existingStaff.department,
        assignedGradeId:
          assignedGradeId !== undefined && assignedGradeId.trim()
            ? assignedGradeId.trim()
            : existingStaff.assignedGradeId,
        assignedGradeLabel: nextGradeLabel,
        email: email !== undefined && email.trim() ? email.trim() : existingStaff.email,
        phone: phone !== undefined && phone.trim() ? phone.trim() : existingStaff.phone,
        room: room !== undefined && room.trim() ? room.trim() : existingStaff.room,
        officeHours:
          officeHours !== undefined && officeHours.trim()
            ? officeHours.trim()
            : existingStaff.officeHours,
        employmentStatus: employmentStatus ?? existingStaff.employmentStatus,
        portalUsername: target.username,
        updatedAt: nowLabel,
      };
      store.staffRecords = store.staffRecords.map((s) =>
        s.id === teacherId ? updatedRecord : s
      );
      updatedStaffName = updatedRecord.fullName;
      updatedGradeLabel = updatedRecord.assignedGradeLabel;
    }

    if (updatedStaffName) {
      store.studentRecords = store.studentRecords.map((st) =>
        st.adviserId === teacherId ? { ...st, adviserName: updatedStaffName! } : st
      );
      store.materialRequisitions = store.materialRequisitions.map((reqItem) =>
        reqItem.teacherId === teacherId
          ? {
              ...reqItem,
              teacherName: updatedStaffName!,
              teacherGradeSection: updatedGradeLabel ?? reqItem.teacherGradeSection,
            }
          : reqItem
      );
    }

    appendAudit(
      store,
      'Faculty Auth',
      `Updated account ${updatedStaffName ? `"${updatedStaffName}" ` : ''}(@${target.username})${trimmedPass ? ' (password reset)' : ''}.`
    );
    saveStore(store);

    res.json({
      teacherAccounts: toBootstrapPayload(store).teacherAccounts,
      staffRecords: store.staffRecords,
      studentRecords: store.studentRecords,
      materialRequisitions: store.materialRequisitions,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/teacher-accounts/:teacherId', requireAoII, (req, res) => {
    const { teacherId } = req.params;
    const keepStaff = req.query.keepStaff === '1';
    const targetCred = store.teacherCredentials.find((c) => c.teacherId === teacherId);
    const targetStaff = store.staffRecords.find((s) => s.id === teacherId);

    if (!targetCred && !targetStaff) {
      res.status(404).json({ error: 'Teacher portal account not found.' });
      return;
    }

    store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== teacherId);
    for (const [token, tid] of teacherSessions.entries()) {
      if (tid === teacherId) teacherSessions.delete(token);
    }

    if (keepStaff) {
      store.staffRecords = store.staffRecords.map((s) =>
        s.id === teacherId ? { ...s, portalUsername: undefined } : s
      );
    } else {
      store.staffRecords = store.staffRecords.filter((s) => s.id !== teacherId);
      recordAo2StaffDeletion(store, teacherId);
    }

    appendAudit(
      store,
      'Faculty Auth',
      `Deleted portal account "${targetStaff?.fullName ?? targetCred?.username ?? teacherId}" (@${targetCred?.username ?? teacherId}).`
    );
    saveStore(store);

    res.json({
      teacherAccounts: toBootstrapPayload(store).teacherAccounts,
      staffRecords: store.staffRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/frontend-settings', requireAoII, (req, res) => {
    const incoming = req.body as Partial<SiteFrontendConfig>;
    store.frontendConfig = {
      ...store.frontendConfig,
      ...incoming,
      visibleSections: {
        ...store.frontendConfig.visibleSections,
        ...(incoming.visibleSections ?? {}),
      },
    };
    appendAudit(store, 'Front-End', 'Updated front-end branding, hero display, or section visibility.');
    saveStore(store);
    res.json({ frontendConfig: store.frontendConfig, auditLog: store.auditLog });
  });

  app.patch('/api/admin/backend-settings', requireAoII, (req, res) => {
    const incoming = req.body as Partial<SiteBackendConfig>;
    const sanitizedMaxMb =
      incoming.maxUploadSizeMb !== undefined
        ? Math.max(1, Math.min(250, Math.round(Number(incoming.maxUploadSizeMb) || 100)))
        : store.backendConfig.maxUploadSizeMb;
    store.backendConfig = {
      ...store.backendConfig,
      ...incoming,
      maxUploadSizeMb: sanitizedMaxMb,
    };
    appendAudit(
      store,
      'Back-End',
      `Updated back-end policies (Year: ${store.backendConfig.activeAcademicYear}, Upload Limit: ${store.backendConfig.maxUploadSizeMb} MB, Admissions: ${store.backendConfig.admissionsOpen ? 'Open' : 'Closed'}).`
    );
    saveStore(store);
    res.json({ backendConfig: store.backendConfig, auditLog: store.auditLog });
  });

  app.patch('/api/enrollment', requireAoII, (req, res) => {
    const { year, gradeId, field, value } = req.body as {
      year: AcademicYear;
      gradeId: string;
      field: 'enrolledStudents' | 'teachers' | 'capacity';
      value: number;
    };

    if (field !== 'enrolledStudents' && field !== 'teachers' && field !== 'capacity') {
      res.status(400).json({ error: 'Invalid enrollment field.' });
      return;
    }

    const rows = store.enrollmentByYear[year];
    if (!rows) {
      res.status(400).json({ error: 'Invalid academic year.' });
      return;
    }

    store.enrollmentByYear[year] = rows.map((row: GradeEnrollmentRow) => {
      if (row.id !== gradeId) return row;
      const numeric = Math.max(0, Math.round(Number(value) || 0));
      if (field === 'teachers') return { ...row, teachers: Math.max(1, Math.min(30, numeric)) };
      if (field === 'capacity') return { ...row, capacity: Math.max(10, Math.min(150, numeric)) };
      return { ...row, enrolledStudents: Math.min(row.capacity + 15, numeric) };
    });

    appendAudit(store, 'Enrollment', `Adjusted ${field} for ${gradeId.toUpperCase()} (${year}).`);
    saveStore(store);
    res.json({ enrollmentByYear: store.enrollmentByYear, auditLog: store.auditLog });
  });

  app.post('/api/teacher-documents/upload', (req, res) => {
    const token = req.header('x-teacher-token') ?? '';
    const sessionTeacherId = teacherSessions.get(token);

    if (!store.backendConfig.teacherUploadsEnabled) {
      res.status(403).json({
        error: 'Document uploads are currently disabled by the AO-II administrator.',
      });
      return;
    }

    const {
      teacherId,
      title,
      category,
      targetCourse,
      fileName,
      fileSizeBytes,
      notes,
      documentContent,
      mimeType,
    } = req.body as {
      teacherId: string;
      title: string;
      category: UploadedCourseDocument['category'];
      targetCourse: string;
      fileName: string;
      fileSizeBytes: number;
      notes: string;
      documentContent?: string;
      mimeType?: string;
    };

    if (!sessionTeacherId || sessionTeacherId !== teacherId) {
      res.status(401).json({
        error: 'Authentication required: Sign in with your teacher username and password to upload.',
      });
      return;
    }

    if (!fileName || !title || title.trim().length < 3) {
      res.status(400).json({ error: 'Document title and file are required.' });
      return;
    }

    const ext = path.extname(fileName).toLowerCase();
    if (
      store.backendConfig.allowedExtensions.length > 0 &&
      !store.backendConfig.allowedExtensions.includes(ext)
    ) {
      res.status(400).json({
        error: `File type ${ext || 'unknown'} is blocked by AO-II policy. Allowed: ${store.backendConfig.allowedExtensions.join(', ')}`,
      });
      return;
    }

    const maxBytes = store.backendConfig.maxUploadSizeMb * 1024 * 1024;
    if (fileSizeBytes > maxBytes) {
      res.status(400).json({
        error: `File exceeds AO-II maximum limit of ${store.backendConfig.maxUploadSizeMb} MB.`,
      });
      return;
    }

    const sizeLabel =
      fileSizeBytes < 1024
        ? `${fileSizeBytes} B`
        : fileSizeBytes < 1024 * 1024
        ? `${Math.round(fileSizeBytes / 1024)} KB`
        : `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    const doc: UploadedCourseDocument = {
      id: `up-${Date.now()}`,
      teacherId,
      title: title.trim(),
      category,
      targetCourse: targetCourse.trim(),
      fileName,
      fileSizeBytes,
      fileSizeLabel: sizeLabel,
      uploadedAt: 'Just now',
      notes: notes.trim() || 'Published via Teacher Portal.',
      documentContent: documentContent?.trim().slice(0, 100000) || undefined,
      mimeType: getMimeTypeForFile(fileName, mimeType),
      hasStoredFile: false,
      principalReviewStatus: 'Pending Review',
    };

    store.uploadedDocuments.unshift(doc);
    saveStore(store);
    res.status(201).json({ document: doc, uploadedDocuments: store.uploadedDocuments });
  });

  app.put('/api/teacher-documents/:docId/file', (req, res) => {
    const token = req.header('x-teacher-token') ?? '';
    const sessionTeacherId = teacherSessions.get(token);
    const { docId } = req.params;
    const doc = store.uploadedDocuments.find((d) => d.id === docId);

    if (!doc) {
      res.status(404).json({ error: 'Document record not found.' });
      return;
    }
    if (!sessionTeacherId || sessionTeacherId !== doc.teacherId) {
      res.status(401).json({ error: 'Authentication required to attach file content.' });
      return;
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const safeName = sanitizeFileName(doc.fileName);
    const filePath = path.join(UPLOADS_DIR, `${doc.id}_${safeName}`);
    const maxBytes = store.backendConfig.maxUploadSizeMb * 1024 * 1024;
    let receivedBytes = 0;
    let aborted = false;

    const writeStream = fs.createWriteStream(filePath);
    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        aborted = true;
        writeStream.destroy();
        fs.rmSync(filePath, { force: true });
        if (!res.headersSent) {
          res.status(413).json({
            error: `File exceeds AO-II maximum limit of ${store.backendConfig.maxUploadSizeMb} MB.`,
          });
        }
        req.destroy();
      }
    });

    req.pipe(writeStream);
    writeStream.on('finish', () => {
      if (aborted) return;
      const incomingMime = getMimeTypeForFile(doc.fileName, req.header('content-type'));
      let extractedText = doc.documentContent;
      if (!extractedText && (incomingMime.startsWith('text/') || doc.fileName.endsWith('.csv'))) {
        try {
          extractedText = fs.readFileSync(filePath, 'utf-8').slice(0, 60000);
        } catch {
          // Ignore binary/decode edge cases
        }
      }
      store.uploadedDocuments = store.uploadedDocuments.map((item) =>
        item.id === docId
          ? {
              ...item,
              hasStoredFile: true,
              mimeType: incomingMime,
              documentContent: extractedText,
            }
          : item
      );
      saveStore(store);
      res.json({ uploadedDocuments: store.uploadedDocuments });
    });
    writeStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Could not write uploaded file to server disk.' });
      }
    });
  });

  app.get('/api/documents/:docId/file', (req, res) => {
    const { docId } = req.params;
    const doc = store.uploadedDocuments.find((d) => d.id === docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const principalToken =
      req.header('x-principal-token') ?? String(req.query.principalToken ?? '');
    const teacherToken =
      req.header('x-teacher-token') ?? String(req.query.teacherToken ?? '');
    const ao2Token = req.header('x-ao2-token') ?? String(req.query.ao2Token ?? '');
    const teacherId = teacherSessions.get(teacherToken);

    const isEndorsedForAo2 = Boolean(
      doc.endorsedToAo2 ||
        doc.ao2EndorsementStatus === 'Endorsed/Principal' ||
        doc.principalReviewStatus === 'Approved' ||
        doc.principalReviewStatus === 'Endorsed/Principal'
    );

    const isAuthorizedPrincipal = Boolean(principalToken && principalSessions.has(principalToken));
    const isAuthorizedTeacher = Boolean(teacherId && teacherId === doc.teacherId);
    const isAuthorizedAo2 = Boolean(ao2Token && ao2Sessions.has(ao2Token) && isEndorsedForAo2);

    if (!isAuthorizedPrincipal && !isAuthorizedTeacher && !isAuthorizedAo2) {
      res.status(401).json({
        error:
          'Authentication required: Sign in as the School Principal, document author, or AO-II (for endorsed documents).',
      });
      return;
    }

    const downloadMode = req.query.download === '1';
    const disposition = downloadMode ? 'attachment' : 'inline';
    const safeName = sanitizeFileName(doc.fileName);
    const storedPath = path.join(UPLOADS_DIR, `${doc.id}_${safeName}`);

    if (fs.existsSync(storedPath)) {
      res.setHeader('Content-Type', getMimeTypeForFile(doc.fileName, doc.mimeType));
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
      fs.createReadStream(storedPath).pipe(res);
      return;
    }

    // Fallback: generate clean PDF or text preview for pre-seeded / text-submitted documents
    const bodyText =
      doc.documentContent ||
      `${doc.notes}\n\nSubmitted File: ${doc.fileName} (${doc.fileSizeLabel})\nCategory: ${doc.category}\nCourse / Grade: ${doc.targetCourse}`;

    if (path.extname(doc.fileName).toLowerCase() === '.pdf') {
      const pdfBuf = buildSimplePdfBuffer(
        doc.title,
        `${doc.category} | ${doc.targetCourse} | Uploaded: ${doc.uploadedAt}`,
        bodyText
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
      res.send(pdfBuf);
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    res.send(bodyText);
  });

  app.patch('/api/principal/documents/:docId', (req, res) => {
    const token = req.header('x-principal-token') ?? '';
    if (req.header('x-principal-role') !== 'PRINCIPAL' || !principalSessions.has(token)) {
      res.status(401).json({
        error: 'Authentication required: Sign in with the Principal username and password.',
      });
      return;
    }

    const { docId } = req.params;
    const { principalReviewStatus, principalNote } = req.body as {
      principalReviewStatus: UploadedCourseDocument['principalReviewStatus'];
      principalNote?: string;
    };

    const allowedStatuses: UploadedCourseDocument['principalReviewStatus'][] = [
      'Pending Review',
      'Approved',
      'Needs Revision',
      'Endorsed/Principal',
    ];
    if (!allowedStatuses.includes(principalReviewStatus)) {
      res.status(400).json({ error: 'Invalid Principal review status.' });
      return;
    }

    const target = store.uploadedDocuments.find((d) => d.id === docId);
    if (!target) {
      res.status(404).json({ error: 'Submitted document not found.' });
      return;
    }

    const isEndorsed =
      principalReviewStatus === 'Approved' || principalReviewStatus === 'Endorsed/Principal';
    const endorsedTimestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const principalDisplayName =
      getPrincipalStaffRecord(store)?.fullName ?? 'School Principal';
    store.uploadedDocuments = store.uploadedDocuments.map((doc) =>
      doc.id === docId
        ? {
            ...doc,
            principalReviewStatus,
            principalNote:
              principalNote !== undefined
                ? principalNote.trim() || undefined
                : doc.principalNote,
            endorsedToAo2: isEndorsed,
            ao2EndorsementStatus: isEndorsed ? 'Endorsed/Principal' : undefined,
            endorsedAt: isEndorsed ? endorsedTimestamp : undefined,
            endorsedBy: isEndorsed ? `${principalDisplayName} (School Principal)` : undefined,
          }
        : doc
    );
    appendAudit(
      store,
      isEndorsed ? 'Endorsement' : 'System',
      isEndorsed
        ? `Principal marked "${target.title}" (${docId}) as ${principalReviewStatus} and automatically added to AO-II Dashboard as Endorsed/Principal.`
        : `Principal marked "${target.title}" (${docId}) as ${principalReviewStatus}.`
    );
    saveStore(store);
    res.json({ uploadedDocuments: store.uploadedDocuments, auditLog: store.auditLog });
  });

  app.delete('/api/teacher-documents/:docId', requireAoII, (req, res) => {
    const { docId } = req.params;
    const targetDoc = store.uploadedDocuments.find((d) => d.id === docId);
    if (!targetDoc) {
      res.status(404).json({ error: 'Uploaded document not found.' });
      return;
    }
    const storedPath = path.join(
      UPLOADS_DIR,
      `${targetDoc.id}_${sanitizeFileName(targetDoc.fileName)}`
    );
    fs.rmSync(storedPath, { force: true });
    store.uploadedDocuments = store.uploadedDocuments.filter((d) => d.id !== docId);
    appendAudit(
      store,
      'Database',
      `AO-II removed uploaded document "${targetDoc.title}" (${docId}).`
    );
    saveStore(store);
    res.json({ uploadedDocuments: store.uploadedDocuments, auditLog: store.auditLog });
  });

  app.post('/api/admissions', (req, res) => {
    if (!store.backendConfig.admissionsOpen) {
      res.status(403).json({
        error: 'Admissions tour requests are currently paused by the AO-II administrator.',
      });
      return;
    }

    const { parentName, email, gradeApplying, entryYear, notes } = req.body as {
      parentName: string;
      email: string;
      gradeApplying: string;
      entryYear: string;
      notes: string;
    };

    const refCode = `AB-${Math.floor(1000 + Math.random() * 9000)}`;
    const entry: AdmissionsSubmission = {
      id: `adm-${Date.now()}`,
      referenceCode: refCode,
      parentName,
      email,
      gradeApplying,
      entryYear,
      notes,
      submittedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      status: 'New Inquiry',
    };

    store.admissionsSubmissions.unshift(entry);
    saveStore(store);
    res.status(201).json({ submission: entry, admissionsSubmissions: store.admissionsSubmissions });
  });

  app.patch('/api/admin/admissions/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: AdmissionsSubmission['status'] };
    store.admissionsSubmissions = store.admissionsSubmissions.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    appendAudit(store, 'Back-End', `Marked admissions inquiry ${id} as ${status}.`);
    saveStore(store);
    res.json({ admissionsSubmissions: store.admissionsSubmissions, auditLog: store.auditLog });
  });

  function resolveInventoryManagerActor(
    req: express.Request
  ): { role: 'AO-II' | 'Principal'; label: string } | null {
    const ao2Token = req.header('x-ao2-token') ?? '';
    if (ao2Token && ao2Sessions.has(ao2Token)) {
      return { role: 'AO-II', label: 'AO-II (Administrative Officer II)' };
    }
    const principalToken = req.header('x-principal-token') ?? '';
    if (principalToken && principalSessions.has(principalToken)) {
      return { role: 'Principal', label: 'Principal (School Head)' };
    }
    return null;
  }

  app.post('/api/admin/inventory', (req, res) => {
    const manager = resolveInventoryManagerActor(req);
    if (!manager) {
      res.status(401).json({
        error: 'Sign in with an AO-II or Principal account to add inventory items.',
      });
      return;
    }

    const body = (req.body ?? {}) as Partial<InventoryItem>;
    const itemName = String(body.itemName ?? '').trim();
    const rawCategory = body.category as InventoryCategory | undefined;
    const category: InventoryCategory = VALID_INVENTORY_CATEGORIES.includes(
      rawCategory as InventoryCategory
    )
      ? (rawCategory as InventoryCategory)
      : inferInventoryCategory(itemName);
    const quantity = Number(body.quantity);
    const unit = String(body.unit ?? '').trim() || 'units';
    const status = body.status as InventoryStatus;
    const location = String(body.location ?? '').trim() || 'AO-II Supply Room';
    const dateReceived = String(body.dateReceived ?? '').trim();
    const issuedToUser = String(body.issuedToUser ?? '').trim() || 'Supply Room / Unassigned';
    const dateIssued = String(body.dateIssued ?? '').trim() || '—';
    const conditionNotes = String(body.conditionNotes ?? '').trim() || undefined;

    if (itemName.length < 2) {
      res.status(400).json({ error: 'Name of item must be at least 2 characters.' });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      res.status(400).json({ error: 'Quantity must be 0 or greater.' });
      return;
    }
    if (!VALID_INVENTORY_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Select a valid inventory status.' });
      return;
    }
    if (!dateReceived) {
      res.status(400).json({ error: 'Date received is required.' });
      return;
    }

    const entry: InventoryItem = {
      id: `inv-${Date.now()}`,
      itemName,
      category,
      quantity: Math.round(quantity),
      unit,
      status,
      location,
      dateReceived,
      issuedToUser,
      dateIssued,
      conditionNotes,
    };

    store.inventoryItems.unshift(entry);
    appendAudit(
      store,
      'Inventory',
      `Added [${entry.category}] item "${entry.itemName}" (Qty: ${entry.quantity} ${entry.unit}, Status: ${entry.status}).`,
      manager.label
    );
    saveStore(store);
    res.status(201).json({
      item: entry,
      inventoryItems: store.inventoryItems,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/inventory/:id', (req, res) => {
    const manager = resolveInventoryManagerActor(req);
    if (!manager) {
      res.status(401).json({
        error: 'Sign in with an AO-II or Principal account to update inventory items.',
      });
      return;
    }

    const { id } = req.params;
    const existing = store.inventoryItems.find((item) => item.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<InventoryItem>;
    const itemName =
      body.itemName !== undefined ? String(body.itemName).trim() : existing.itemName;
    const category: InventoryCategory =
      body.category !== undefined &&
      VALID_INVENTORY_CATEGORIES.includes(body.category as InventoryCategory)
        ? (body.category as InventoryCategory)
        : existing.category ?? inferInventoryCategory(itemName);
    const quantity =
      body.quantity !== undefined ? Number(body.quantity) : existing.quantity;
    const unit =
      body.unit !== undefined ? String(body.unit).trim() || 'units' : existing.unit ?? 'units';
    const status = (body.status ?? existing.status) as InventoryStatus;
    const location =
      body.location !== undefined
        ? String(body.location).trim() || 'Campus Property Room'
        : existing.location ?? 'Campus Property Room';
    const dateReceived =
      body.dateReceived !== undefined ? String(body.dateReceived).trim() : existing.dateReceived;
    const issuedToUser =
      body.issuedToUser !== undefined
        ? String(body.issuedToUser).trim() || 'Supply Room / Unassigned'
        : existing.issuedToUser;
    const dateIssued =
      body.dateIssued !== undefined
        ? String(body.dateIssued).trim() || '—'
        : existing.dateIssued;
    const conditionNotes =
      body.conditionNotes !== undefined
        ? String(body.conditionNotes).trim() || undefined
        : existing.conditionNotes;

    if (itemName.length < 2) {
      res.status(400).json({ error: 'Name of item must be at least 2 characters.' });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      res.status(400).json({ error: 'Quantity must be 0 or greater.' });
      return;
    }
    if (!VALID_INVENTORY_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Select a valid inventory status.' });
      return;
    }
    if (!dateReceived) {
      res.status(400).json({ error: 'Date received is required.' });
      return;
    }

    const updated: InventoryItem = {
      ...existing,
      itemName,
      category,
      quantity: Math.round(quantity),
      unit,
      status,
      location,
      dateReceived,
      issuedToUser,
      dateIssued,
      conditionNotes,
    };

    store.inventoryItems = store.inventoryItems.map((item) =>
      item.id === id ? updated : item
    );
    appendAudit(
      store,
      'Inventory',
      `Updated [${updated.category}] item "${updated.itemName}" (Qty: ${updated.quantity} ${updated.unit}, Status: ${updated.status}).`,
      manager.label
    );
    saveStore(store);
    res.json({
      item: updated,
      inventoryItems: store.inventoryItems,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/inventory/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.inventoryItems.find((item) => item.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    store.inventoryItems = store.inventoryItems.filter((item) => item.id !== id);
    appendAudit(
      store,
      'Inventory',
      `AO-II removed [${existing.category}] inventory item "${existing.itemName}" (${id}).`
    );
    saveStore(store);
    res.json({
      inventoryItems: store.inventoryItems,
      auditLog: store.auditLog,
    });
  });

  // =========================================================================
  // MATERIAL REQUISITION WORKFLOW (TEACHER -> AO-II -> PRINCIPAL)
  // =========================================================================

  const VALID_REQ_CATEGORIES: MaterialRequisitionCategory[] = [
    'School Supplies',
    'Equipment',
    'Other',
  ];
  const VALID_REQ_URGENCIES: RequisitionUrgency[] = ['Routine', 'Priority', 'Urgent'];
  const VALID_AO2_REQ_STATUSES: Ao2RequisitionStatus[] = [
    'Pending Review',
    'Approved',
    'Declined',
    'Endorsed',
  ];
  const VALID_PRINCIPAL_REQ_STATUSES: PrincipalRequisitionStatus[] = [
    'Pending Principal',
    'Approved',
    'Disapproved',
  ];

  app.post('/api/teacher/requisitions', (req, res) => {
    const teacherToken = req.header('x-teacher-token') ?? '';
    const teacherId = teacherSessions.get(teacherToken);
    if (!teacherToken || !teacherId) {
      res.status(401).json({
        error: 'Sign in with a Teacher account to submit a material requisition.',
      });
      return;
    }

    const body = (req.body ?? {}) as Partial<MaterialRequisition>;
    const itemName = String(body.itemName ?? '').trim();
    const category = body.category as MaterialRequisitionCategory;
    const quantity = Number(body.quantity);
    const unit = String(body.unit ?? '').trim() || 'pcs';
    const urgency: RequisitionUrgency = VALID_REQ_URGENCIES.includes(
      body.urgency as RequisitionUrgency
    )
      ? (body.urgency as RequisitionUrgency)
      : 'Routine';
    const neededBy = String(body.neededBy ?? '').trim() || undefined;
    const purpose = String(body.purpose ?? '').trim();

    if (itemName.length < 2) {
      res.status(400).json({ error: 'Item or material name must be at least 2 characters.' });
      return;
    }
    if (!VALID_REQ_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'Select a valid requisition category (School Supplies, Equipment, or Other).',
      });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      res.status(400).json({ error: 'Requested quantity must be at least 1.' });
      return;
    }
    if (purpose.length < 4) {
      res.status(400).json({ error: 'Provide a brief classroom purpose or justification.' });
      return;
    }

    const staffMatch = store.staffRecords.find((s) => s.id === teacherId);
    const staticMatch = TEACHER_PORTAL_PROFILES.find((t) => t.id === teacherId);
    const teacherName = staffMatch?.fullName ?? staticMatch?.name ?? 'Faculty Member';
    const teacherGradeSection =
      staffMatch?.assignedGradeLabel ?? staticMatch?.assignedGradeLabel ?? 'Faculty Class';

    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const entry: MaterialRequisition = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      teacherId,
      teacherName,
      teacherGradeSection,
      itemName,
      category,
      quantity: Math.round(quantity),
      unit,
      urgency,
      neededBy,
      purpose,
      submittedAt: nowFormatted,
      ao2Status: 'Pending Review',
    };

    store.materialRequisitions.unshift(entry);
    appendAudit(
      store,
      'Requisition',
      `${teacherName} submitted a [${entry.category}] requisition for "${entry.itemName}" (${entry.quantity} ${entry.unit}).`,
      `${teacherName} (Teacher)`
    );
    saveStore(store);

    res.status(201).json({
      requisition: entry,
      materialRequisitions: store.materialRequisitions,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/teacher/requisitions/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.materialRequisitions.find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Material requisition not found.' });
      return;
    }

    store.materialRequisitions = store.materialRequisitions.filter((r) => r.id !== id);
    appendAudit(
      store,
      'Requisition',
      `AO-II removed material requisition "${existing.itemName}" (${id}).`
    );
    saveStore(store);

    res.json({
      materialRequisitions: store.materialRequisitions,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/requisitions/:id/ao2-review', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.materialRequisitions.find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Material requisition not found.' });
      return;
    }

    const body = (req.body ?? {}) as {
      ao2Status?: Ao2RequisitionStatus;
      ao2Note?: string;
    };

    const nextStatus: Ao2RequisitionStatus =
      body.ao2Status !== undefined ? body.ao2Status : existing.ao2Status;

    if (!VALID_AO2_REQ_STATUSES.includes(nextStatus)) {
      res.status(400).json({
        error: 'AO-II status must be Pending Review, Approved, Declined, or Endorsed.',
      });
      return;
    }

    const nextNote =
      body.ao2Note !== undefined ? body.ao2Note.trim() || undefined : existing.ao2Note;

    const token = req.header('x-ao2-token') ?? '';
    const ao2SessionInfo = ao2Sessions.get(token);
    const ao2Username =
      ao2SessionInfo?.username ?? store.ao2Credentials[0]?.username ?? 'ao2';
    const ao2Staff = ao2SessionInfo
      ? store.staffRecords.find((s) => s.id === ao2SessionInfo.accountId)
      : undefined;
    const ao2DisplayName = ao2Staff?.fullName ?? 'AO-II Administrator';
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    let nextPrincipalStatus = existing.principalStatus;
    if (nextStatus === 'Endorsed') {
      nextPrincipalStatus = existing.principalStatus ?? 'Pending Principal';
    } else if (nextPrincipalStatus === 'Pending Principal') {
      nextPrincipalStatus = undefined;
    }

    const updated: MaterialRequisition = {
      ...existing,
      ao2Status: nextStatus,
      ao2Note: nextNote,
      ao2ReviewedAt: nowFormatted,
      ao2ReviewedBy: `${ao2DisplayName} (${ao2Username})`,
      principalStatus: nextPrincipalStatus,
    };

    store.materialRequisitions = store.materialRequisitions.map((r) => (r.id === id ? updated : r));
    appendAudit(
      store,
      'Requisition',
      `AO-II marked "${updated.itemName}" (${updated.teacherName}) as ${updated.ao2Status}${updated.ao2Note ? ' with notes' : ''}.`,
      `AO-II (${ao2Username})`
    );
    saveStore(store);

    res.json({
      requisition: updated,
      materialRequisitions: store.materialRequisitions,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/principal/requisitions/:id/review', (req, res) => {
    const token = req.header('x-principal-token') ?? '';
    if (!token || !principalSessions.has(token)) {
      res.status(401).json({
        error: 'Authentication required: Sign in with your Principal account to review endorsed requests.',
      });
      return;
    }

    const { id } = req.params;
    const existing = store.materialRequisitions.find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Material requisition not found.' });
      return;
    }

    if (existing.ao2Status !== 'Endorsed') {
      res.status(400).json({
        error: 'Only material requisitions endorsed by AO-II can be reviewed by the Principal.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      principalStatus?: PrincipalRequisitionStatus;
      principalNote?: string;
    };

    const nextPrincipalStatus: PrincipalRequisitionStatus =
      body.principalStatus !== undefined
        ? body.principalStatus
        : existing.principalStatus ?? 'Pending Principal';

    if (!VALID_PRINCIPAL_REQ_STATUSES.includes(nextPrincipalStatus)) {
      res.status(400).json({
        error: 'Principal status must be Approved, Disapproved, or Pending Principal.',
      });
      return;
    }

    const nextNote =
      body.principalNote !== undefined
        ? body.principalNote.trim() || undefined
        : existing.principalNote;

    const principalUsername =
      principalSessions.get(token) ?? store.principalCredential?.username ?? 'principal';
    const principalDisplayName =
      getPrincipalStaffRecord(store)?.fullName ?? 'School Principal';
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const updated: MaterialRequisition = {
      ...existing,
      principalStatus: nextPrincipalStatus,
      principalNote: nextNote,
      principalReviewedAt: nowFormatted,
      principalReviewedBy: `${principalDisplayName} (${principalUsername})`,
    };

    store.materialRequisitions = store.materialRequisitions.map((r) => (r.id === id ? updated : r));
    appendAudit(
      store,
      'Requisition',
      `Principal marked AO-II-endorsed requisition "${updated.itemName}" (${updated.teacherName}) as ${updated.principalStatus}${updated.principalNote ? ' with notes' : ''}.`,
      `${principalDisplayName} (Principal)`
    );
    saveStore(store);

    res.json({
      requisition: updated,
      materialRequisitions: store.materialRequisitions,
      auditLog: store.auditLog,
    });
  });

  // =========================================================================
  // STAFF LEAVE APPLICATIONS (ALL ACCOUNTS APPLY · PRINCIPAL DECIDES · AO-II EDITS)
  // =========================================================================

  const VALID_LEAVE_TYPES: LeaveType[] = [
    'Vacation Leave',
    'Sick Leave',
    'Wellness Leave',
    'Special Privilege Leave',
    'Maternity / Paternity Leave',
    'Emergency / Calamity Leave',
    'Study / Official Business Leave',
    'Other',
  ];

  app.post('/api/leave-applications', (req, res) => {
    const actor = resolveAnyStaffActor(req);
    if (!actor) {
      res.status(401).json({
        error: 'Sign in with a Teacher, Principal, or AO-II account to submit a leave application.',
      });
      return;
    }

    const body = (req.body ?? {}) as Partial<LeaveApplication>;
    const leaveType = VALID_LEAVE_TYPES.includes(body.leaveType as LeaveType)
      ? (body.leaveType as LeaveType)
      : 'Vacation Leave';
    const startDate = String(body.startDate ?? '').trim();
    const endDate = String(body.endDate ?? '').trim();
    const numberOfDays = Number(body.numberOfDays);
    const reason = String(body.reason ?? '').trim();
    const contactDuringLeave = String(body.contactDuringLeave ?? '').trim() || undefined;
    const coveringStaff = String(body.coveringStaff ?? '').trim() || undefined;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Select both start date and end date for the leave.' });
      return;
    }
    if (endDate < startDate) {
      res.status(400).json({ error: 'End date cannot be earlier than start date.' });
      return;
    }
    if (!Number.isFinite(numberOfDays) || numberOfDays < 0.5) {
      res.status(400).json({ error: 'Number of leave days must be at least 0.5.' });
      return;
    }
    if (reason.length < 4) {
      res.status(400).json({ error: 'Provide a brief reason for your leave application.' });
      return;
    }

    const staffMatch = store.staffRecords.find((s) => s.id === actor.accountId);
    const teacherProfile = TEACHER_PORTAL_PROFILES.find((t) => t.id === actor.accountId);
    const applicantDepartmentOrGrade =
      staffMatch?.assignedGradeLabel ||
      staffMatch?.department ||
      teacherProfile?.assignedGradeLabel ||
      (actor.role === 'Principal'
        ? 'Office of the School Principal'
        : actor.role === 'AO-II'
          ? 'Administrative & Finance Office'
          : 'Danlog Elementary Faculty');

    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const application: LeaveApplication = {
      id: `leave-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicantAccountId: actor.accountId,
      applicantRole: actor.role,
      applicantName: actor.displayName,
      applicantUsername: actor.username,
      applicantDepartmentOrGrade,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      contactDuringLeave,
      coveringStaff,
      submittedAt: nowFormatted,
      ao2EndorsementStatus: 'Pending Endorsement',
      principalStatus: 'Pending',
    };

    if (!Array.isArray(store.leaveApplications)) {
      store.leaveApplications = [];
    }
    store.leaveApplications.unshift(application);
    appendAudit(
      store,
      'Leave',
      `${actor.displayName} (${actor.role}) submitted a ${leaveType} application (${startDate} to ${endDate}, ${numberOfDays} day/s) for AO-II endorsement.`,
      `${actor.displayName} (${actor.role})`
    );
    saveStore(store);

    res.status(201).json({
      application,
      leaveApplications: store.leaveApplications,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/leave-applications/:id/endorse', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = (store.leaveApplications ?? []).find((a) => a.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }

    const body = (req.body ?? {}) as {
      ao2EndorsementStatus?: Ao2LeaveEndorsementStatus;
      ao2EditNote?: string;
    };
    const nextEndorsement: Ao2LeaveEndorsementStatus =
      body.ao2EndorsementStatus === 'Pending Endorsement' ? 'Pending Endorsement' : 'Endorsed';

    if (
      nextEndorsement === 'Pending Endorsement' &&
      (existing.principalStatus === 'Approved' || existing.principalStatus === 'Disapproved')
    ) {
      res.status(400).json({
        error: 'Cannot withdraw endorsement after the School Principal has already decided on this leave application.',
      });
      return;
    }

    const ao2Token = req.header('x-ao2-token') ?? '';
    const ao2Info = ao2Sessions.get(ao2Token);
    const ao2Staff = store.staffRecords.find((s) => s.id === ao2Info?.accountId);
    const ao2DisplayName = ao2Staff?.fullName ?? 'AO-II Administrator';
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const updated: LeaveApplication = {
      ...existing,
      ao2EndorsementStatus: nextEndorsement,
      ao2EndorsedAt: nextEndorsement === 'Endorsed' ? nowFormatted : undefined,
      ao2EndorsedBy:
        nextEndorsement === 'Endorsed'
          ? `${ao2DisplayName} (${ao2Info?.username ?? 'ao2'})`
          : undefined,
      ao2EditNote:
        body.ao2EditNote !== undefined
          ? String(body.ao2EditNote).trim() || undefined
          : existing.ao2EditNote,
    };

    store.leaveApplications = store.leaveApplications.map((a) => (a.id === id ? updated : a));
    appendAudit(
      store,
      'Leave',
      nextEndorsement === 'Endorsed'
        ? `AO-II endorsed ${updated.applicantName}'s ${updated.leaveType} (${updated.startDate} to ${updated.endDate}) to the School Principal.`
        : `AO-II returned ${updated.applicantName}'s ${updated.leaveType} to Pending Endorsement.`,
      `${ao2DisplayName} (AO-II)`
    );
    saveStore(store);

    res.json({
      application: updated,
      leaveApplications: store.leaveApplications,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/principal/leave-applications/:id/decision', (req, res) => {
    const token = req.header('x-principal-token') ?? '';
    if (!principalSessions.has(token)) {
      res.status(401).json({
        error: 'Authentication required: Only the School Principal can approve or disapprove leave applications.',
      });
      return;
    }

    const { id } = req.params;
    const existing = (store.leaveApplications ?? []).find((a) => a.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }

    if (existing.ao2EndorsementStatus !== 'Endorsed') {
      res.status(400).json({
        error: 'This leave application must be endorsed by AO-II before the School Principal can review or decide on it.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      principalStatus?: LeaveDecisionStatus;
      principalNote?: string;
    };
    const nextStatus = body.principalStatus;
    if (nextStatus !== 'Approved' && nextStatus !== 'Disapproved') {
      res.status(400).json({ error: 'Principal decision must be Approved or Disapproved.' });
      return;
    }

    const principalUsername =
      principalSessions.get(token) ?? store.principalCredential?.username ?? 'principal';
    const principalDisplayName = getPrincipalStaffRecord(store)?.fullName ?? 'School Principal';
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const updated: LeaveApplication = {
      ...existing,
      principalStatus: nextStatus,
      principalNote:
        body.principalNote !== undefined
          ? String(body.principalNote).trim() || undefined
          : existing.principalNote,
      principalReviewedAt: nowFormatted,
      principalReviewedBy: `${principalDisplayName} (${principalUsername})`,
    };

    store.leaveApplications = store.leaveApplications.map((a) => (a.id === id ? updated : a));
    appendAudit(
      store,
      'Leave',
      `Principal ${principalDisplayName} marked ${updated.applicantName}'s ${updated.leaveType} (${updated.startDate} to ${updated.endDate}) as ${updated.principalStatus}.`,
      `${principalDisplayName} (Principal)`
    );
    saveStore(store);

    res.json({
      application: updated,
      leaveApplications: store.leaveApplications,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/leave-applications/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = (store.leaveApplications ?? []).find((a) => a.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<LeaveApplication>;
    const leaveType =
      body.leaveType && VALID_LEAVE_TYPES.includes(body.leaveType)
        ? body.leaveType
        : existing.leaveType;
    const startDate =
      body.startDate !== undefined ? String(body.startDate).trim() : existing.startDate;
    const endDate = body.endDate !== undefined ? String(body.endDate).trim() : existing.endDate;
    const numberOfDays =
      body.numberOfDays !== undefined ? Number(body.numberOfDays) : existing.numberOfDays;
    const reason = body.reason !== undefined ? String(body.reason).trim() : existing.reason;

    if (!startDate || !endDate || endDate < startDate) {
      res.status(400).json({ error: 'Provide valid inclusive start and end dates.' });
      return;
    }
    if (!Number.isFinite(numberOfDays) || numberOfDays < 0.5) {
      res.status(400).json({ error: 'Number of leave days must be at least 0.5.' });
      return;
    }
    if (reason.length < 4) {
      res.status(400).json({ error: 'Reason must be at least 4 characters.' });
      return;
    }

    const ao2Token = req.header('x-ao2-token') ?? '';
    const ao2Info = ao2Sessions.get(ao2Token);
    const ao2Staff = store.staffRecords.find((s) => s.id === ao2Info?.accountId);
    const ao2DisplayName = ao2Staff?.fullName ?? 'AO-II Administrator';
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const updated: LeaveApplication = {
      ...existing,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      contactDuringLeave:
        body.contactDuringLeave !== undefined
          ? String(body.contactDuringLeave).trim() || undefined
          : existing.contactDuringLeave,
      coveringStaff:
        body.coveringStaff !== undefined
          ? String(body.coveringStaff).trim() || undefined
          : existing.coveringStaff,
      ao2EditNote:
        body.ao2EditNote !== undefined
          ? String(body.ao2EditNote).trim() || undefined
          : existing.ao2EditNote,
      lastEditedByAo2At: nowFormatted,
      lastEditedByAo2Name: `${ao2DisplayName} (${ao2Info?.username ?? 'ao2'})`,
    };

    store.leaveApplications = store.leaveApplications.map((a) => (a.id === id ? updated : a));
    appendAudit(
      store,
      'Leave',
      `AO-II edited leave application entry for ${updated.applicantName} (${updated.leaveType}, ${updated.startDate} to ${updated.endDate}).`,
      `${ao2DisplayName} (AO-II)`
    );
    saveStore(store);

    res.json({
      application: updated,
      leaveApplications: store.leaveApplications,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/leave-applications/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = (store.leaveApplications ?? []).find((a) => a.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }
    store.leaveApplications = store.leaveApplications.filter((a) => a.id !== id);
    appendAudit(
      store,
      'Leave',
      `AO-II removed leave application ${id} (${existing.applicantName} · ${existing.leaveType}).`
    );
    saveStore(store);
    res.json({
      leaveApplications: store.leaveApplications,
      auditLog: store.auditLog,
    });
  });

  // =========================================================================
  // STUDENT LIFE & ACTIVITIES CONDUCTED + HOME PAGE POSTS (ALL ACCOUNTS)
  // =========================================================================

  const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

  app.post('/api/activities', (req, res) => {
    const actor = resolveAnyStaffActor(req);
    if (!actor) {
      res.status(401).json({
        error: 'Sign in with a Teacher, Principal, or AO-II account to post an activity.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      title?: string;
      category?: ActivityPostCategory;
      dateConducted?: string;
      participants?: string;
      location?: string;
      description?: string;
      imageUrl?: string;
    };

    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const category: ActivityPostCategory =
      body.category === 'STEM & Labs' ||
      body.category === 'Arts & Music' ||
      body.category === 'Athletics & Field'
        ? body.category
        : 'STEM & Labs';

    if (title.length < 3 || description.length < 5) {
      res.status(400).json({
        error: 'Provide a clear activity title and description.',
      });
      return;
    }

    const post: ActivityPostItem = {
      id: `act-${Date.now()}`,
      title,
      category,
      dateConducted:
        String(body.dateConducted ?? '').trim() ||
        new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      participants: String(body.participants ?? '').trim() || 'Danlog Elementary Pupils',
      location: String(body.location ?? '').trim() || 'Danlog Elementary Campus',
      description,
      image:
        String(body.imageUrl ?? '').trim() ||
        '/src/assets/images/hero_colorful_education_1794812726997.jpg',
      imageAlt: `${title} — Danlog Elementary School activity`,
      authorRole: actor.role,
      authorName: actor.displayName,
      authorAccountId: actor.accountId,
      createdAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    store.activityPosts.unshift(post);
    appendAudit(
      store,
      'Community Posts',
      `${actor.displayName} (${actor.role}) posted activity "${post.title}" to Student Life & Activities.`
    );
    saveStore(store);
    res.status(201).json({
      post,
      activityPosts: store.activityPosts,
      auditLog: store.auditLog,
    });
  });

  app.put('/api/activities/:postId/image', (req, res) => {
    const actor = resolveAnyStaffActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Authentication required to upload an activity image.' });
      return;
    }

    const { postId } = req.params;
    const target = store.activityPosts.find((p) => p.id === postId);
    if (!target) {
      res.status(404).json({ error: 'Activity post not found.' });
      return;
    }

    const rawFileName = decodeURIComponent(req.header('x-file-name') ?? 'activity_photo.jpg');
    const ext = path.extname(rawFileName).toLowerCase() || '.jpg';
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      res.status(400).json({ error: 'Only PNG, JPG, JPEG, WEBP, or GIF images are supported.' });
      return;
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const safeName = sanitizeFileName(rawFileName);
    const filePath = path.join(UPLOADS_DIR, `act_${postId}_${safeName}`);
    const maxBytes = 25 * 1024 * 1024;
    let receivedBytes = 0;
    let aborted = false;

    const writeStream = fs.createWriteStream(filePath);
    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        aborted = true;
        writeStream.destroy();
        fs.rmSync(filePath, { force: true });
        if (!res.headersSent) {
          res.status(413).json({ error: 'Image exceeds 25 MB limit.' });
        }
        req.destroy();
      }
    });

    req.pipe(writeStream);
    writeStream.on('finish', () => {
      if (aborted) return;
      const publicUrl = `/api/activities/${encodeURIComponent(postId)}/image?v=${Date.now()}`;
      store.activityPosts = store.activityPosts.map((p) =>
        p.id === postId ? { ...p, image: publicUrl } : p
      );
      saveStore(store);
      const updated = store.activityPosts.find((p) => p.id === postId);
      res.json({ post: updated, activityPosts: store.activityPosts });
    });
    writeStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to save activity image.' });
      }
    });
  });

  app.get('/api/activities/:postId/image', (req, res) => {
    const { postId } = req.params;
    if (!fs.existsSync(UPLOADS_DIR)) {
      res.status(404).end();
      return;
    }
    const prefix = `act_${postId}_`;
    const match = fs.readdirSync(UPLOADS_DIR).find((f) => f.startsWith(prefix));
    if (!match) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, match);
    res.setHeader('Content-Type', getMimeTypeForFile(match));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(fullPath).pipe(res);
  });

  app.delete('/api/activities/:postId', requireAoII, (req, res) => {
    const { postId } = req.params;
    const target = store.activityPosts.find((p) => p.id === postId);
    if (!target) {
      res.status(404).json({ error: 'Activity post not found.' });
      return;
    }
    if (fs.existsSync(UPLOADS_DIR)) {
      const prefix = `act_${postId}_`;
      for (const file of fs.readdirSync(UPLOADS_DIR)) {
        if (file.startsWith(prefix)) {
          fs.rmSync(path.join(UPLOADS_DIR, file), { force: true });
        }
      }
    }
    store.activityPosts = store.activityPosts.filter((p) => p.id !== postId);
    appendAudit(
      store,
      'Community Posts',
      `AO-II removed activity post "${target.title}".`
    );
    saveStore(store);
    res.json({ activityPosts: store.activityPosts, auditLog: store.auditLog });
  });

  app.post('/api/home-posts', (req, res) => {
    const actor = resolveAnyStaffActor(req);
    if (!actor) {
      res.status(401).json({
        error: 'Sign in with a Teacher, Principal, or AO-II account to post on the home page.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      title?: string;
      content?: string;
      category?: HomePostCategory;
      pinned?: boolean;
    };

    const content = String(body.content ?? '').trim();
    const rawTitle = String(body.title ?? '').trim();
    const title = rawTitle || (content.length > 56 ? `${content.slice(0, 56)}…` : content);
    const validCategories: HomePostCategory[] = [
      'Announcement',
      'Campus Update',
      'Classroom Story',
      'Photo Post',
      'Achievement',
      'General',
    ];
    const category: HomePostCategory = validCategories.includes(body.category as HomePostCategory)
      ? (body.category as HomePostCategory)
      : 'General';

    if (!content && !rawTitle) {
      res.status(400).json({ error: 'Write a post title or message before publishing.' });
      return;
    }

    const post: HomeFeedPost = {
      id: `hpost-${Date.now()}`,
      title,
      content: content || title,
      category,
      authorRole: actor.role,
      authorName: actor.displayName,
      authorUsername: actor.username,
      authorAccountId: actor.accountId,
      createdAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      pinned: actor.role === 'AO-II' || actor.role === 'Principal' ? Boolean(body.pinned) : false,
    };

    store.homePosts.unshift(post);
    appendAudit(
      store,
      'Community Posts',
      `${actor.displayName} (${actor.role}) published home page post "${post.title}".`
    );
    saveStore(store);
    res.status(201).json({ post, homePosts: store.homePosts, auditLog: store.auditLog });
  });

  app.put('/api/home-posts/:postId/image', (req, res) => {
    const actor = resolveAnyStaffActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Authentication required to upload a post image.' });
      return;
    }

    const { postId } = req.params;
    const target = store.homePosts.find((p) => p.id === postId);
    if (!target) {
      res.status(404).json({ error: 'Home post not found.' });
      return;
    }

    const rawFileName = decodeURIComponent(req.header('x-file-name') ?? 'post_photo.jpg');
    const ext = path.extname(rawFileName).toLowerCase() || '.jpg';
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      res.status(400).json({ error: 'Only PNG, JPG, JPEG, WEBP, or GIF images are supported.' });
      return;
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const safeName = sanitizeFileName(rawFileName);
    const filePath = path.join(UPLOADS_DIR, `home_${postId}_${safeName}`);
    const maxBytes = 25 * 1024 * 1024;
    let receivedBytes = 0;
    let aborted = false;

    const writeStream = fs.createWriteStream(filePath);
    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        aborted = true;
        writeStream.destroy();
        fs.rmSync(filePath, { force: true });
        if (!res.headersSent) {
          res.status(413).json({ error: 'Image exceeds 25 MB limit.' });
        }
        req.destroy();
      }
    });

    req.pipe(writeStream);
    writeStream.on('finish', () => {
      if (aborted) return;
      const publicUrl = `/api/home-posts/${encodeURIComponent(postId)}/image?v=${Date.now()}`;
      store.homePosts = store.homePosts.map((p) =>
        p.id === postId
          ? { ...p, imageUrl: publicUrl, imageAlt: `${p.title} — uploaded campus photo` }
          : p
      );
      saveStore(store);
      const updated = store.homePosts.find((p) => p.id === postId);
      res.json({ post: updated, homePosts: store.homePosts });
    });
    writeStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to save home post image.' });
      }
    });
  });

  app.get('/api/home-posts/:postId/image', (req, res) => {
    const { postId } = req.params;
    if (!fs.existsSync(UPLOADS_DIR)) {
      res.status(404).end();
      return;
    }
    const prefix = `home_${postId}_`;
    const match = fs.readdirSync(UPLOADS_DIR).find((f) => f.startsWith(prefix));
    if (!match) {
      res.status(404).json({ error: 'Post image not found.' });
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, match);
    res.setHeader('Content-Type', getMimeTypeForFile(match));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(fullPath).pipe(res);
  });

  app.delete('/api/home-posts/:postId', requireAoII, (req, res) => {
    const { postId } = req.params;
    const target = store.homePosts.find((p) => p.id === postId);
    if (!target) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (fs.existsSync(UPLOADS_DIR)) {
      const prefix = `home_${postId}_`;
      for (const file of fs.readdirSync(UPLOADS_DIR)) {
        if (file.startsWith(prefix)) {
          fs.rmSync(path.join(UPLOADS_DIR, file), { force: true });
        }
      }
    }
    store.homePosts = store.homePosts.filter((p) => p.id !== postId);
    appendAudit(
      store,
      'Community Posts',
      `AO-II deleted home page post "${target.title}".`
    );
    saveStore(store);
    res.json({ homePosts: store.homePosts, auditLog: store.auditLog });
  });

  // =========================================================================
  // AO-II STAFF & STUDENT RECORDS MANAGEMENT (ADD, EDIT, UPDATE, DELETE)
  // =========================================================================

  app.post('/api/admin/staff', requireAoII, (req, res) => {
    const body = (req.body ?? {}) as Partial<StaffMemberRecord> & {
      initialPassword?: string;
      createPortalLogin?: boolean;
    };
    const fullName = String(body.fullName ?? '').trim();
    const role: StaffRole =
      body.role === 'Teacher' ||
      body.role === 'Principal' ||
      body.role === 'Administrative Officer' ||
      body.role === 'Support Staff'
        ? body.role
        : 'Teacher';
    const title = String(body.title ?? '').trim() || `${role}`;
    const department = String(body.department ?? '').trim() || 'General Faculty';
    const assignedGradeId = String(body.assignedGradeId ?? '').trim() || 'all';
    const assignedGradeLabel = String(body.assignedGradeLabel ?? '').trim() || 'All Grades';
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim() || '+63 (56) 555-0184';
    const room = String(body.room ?? '').trim() || 'Main Building';
    const officeHours = String(body.officeHours ?? '').trim() || 'Mon–Fri · 3:00 p.m. – 4:00 p.m.';
    const employmentStatus: StaffEmploymentStatus =
      body.employmentStatus === 'Regular / Permanent' ||
      body.employmentStatus === 'Contractual' ||
      body.employmentStatus === 'Volunteer' ||
      body.employmentStatus === 'On Leave'
        ? body.employmentStatus
        : 'Regular / Permanent';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Staff full name must be at least 2 characters.' });
      return;
    }

    const id = `staff-${Date.now()}`;
    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    let portalUsername: string | undefined = String(body.portalUsername ?? '')
      .trim()
      .toLowerCase();

    if (
      (role === 'Teacher' || role === 'Administrative Officer' || role === 'Principal') &&
      body.createPortalLogin &&
      portalUsername
    ) {
      if (portalUsername.length < 3 || /\s/.test(portalUsername)) {
        res.status(400).json({
          error: 'Portal username must be at least 3 characters with no spaces.',
        });
        return;
      }
      if (isPortalUsernameTaken(store, portalUsername)) {
        res.status(409).json({
          error: `Portal username "${portalUsername}" is already in use.`,
        });
        return;
      }
      if (role === 'Principal' && store.principalCredential) {
        res.status(409).json({
          error: 'A School Principal portal account already exists. Update or delete it first.',
        });
        return;
      }
      const initialPassword =
        String(body.initialPassword ?? '').trim() ||
        (role === 'Administrative Officer'
          ? 'DanlogAO2#1975'
          : role === 'Principal'
          ? 'DanlogPrincipal#1975'
          : 'DanlogFaculty#2026');
      if (initialPassword.length < 6) {
        res.status(400).json({ error: 'Initial portal password must be at least 6 characters.' });
        return;
      }
      const { salt, hash } = hashPassword(initialPassword);
      if (role === 'Administrative Officer') {
        store.ao2Credentials.push({
          accountId: id,
          username: portalUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: true,
          updatedAt: nowLabel,
        });
      } else if (role === 'Principal') {
        store.principalCredential = {
          username: portalUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: true,
          updatedAt: nowLabel,
        };
      } else {
        store.teacherCredentials.push({
          teacherId: id,
          username: portalUsername,
          salt,
          passwordHash: hash,
          hasCustomPassword: true,
          updatedAt: nowLabel,
        });
      }
    } else if (!portalUsername) {
      portalUsername = undefined;
    }

    const record: StaffMemberRecord = {
      id,
      fullName,
      role,
      title,
      department,
      assignedGradeId,
      assignedGradeLabel,
      email: email || `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@danloges.edu.ph`,
      phone,
      room,
      officeHours,
      employmentStatus,
      portalUsername,
      updatedAt: nowLabel,
    };

    store.staffRecords.unshift(record);
    appendAudit(
      store,
      'Staff',
      `Added staff record "${record.fullName}" (${record.role} · ${record.assignedGradeLabel}).`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.status(201).json({
      record,
      staffRecords: store.staffRecords,
      teacherAccounts: bootstrapPayload.teacherAccounts,
      principalAccount: bootstrapPayload.principalAccount,
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/staff/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.staffRecords.find((s) => s.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Staff record not found.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<StaffMemberRecord> & { newPassword?: string };
    const fullName =
      body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName;
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Staff full name must be at least 2 characters.' });
      return;
    }

    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const nextRole = body.role ?? existing.role;
    const rawUsernameProvided = body.portalUsername !== undefined;
    const nextUsername = rawUsernameProvided
      ? String(body.portalUsername).trim().toLowerCase() || undefined
      : existing.portalUsername;

    if (nextUsername && (nextUsername.length < 3 || /\s/.test(nextUsername))) {
      res.status(400).json({
        error: 'Portal username must be at least 3 characters with no spaces.',
      });
      return;
    }

    const trimmedNewPass = (body.newPassword ?? '').trim();
    if (trimmedNewPass && trimmedNewPass.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (nextRole === 'Principal') {
      store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
      store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
      if (nextUsername) {
        if (isPortalUsernameTaken(store, nextUsername, id)) {
          res.status(409).json({ error: `Username "${nextUsername}" is already assigned.` });
          return;
        }
        if (store.principalCredential) {
          store.principalCredential.username = nextUsername;
          if (trimmedNewPass) {
            const { salt, hash } = hashPassword(trimmedNewPass);
            store.principalCredential.salt = salt;
            store.principalCredential.passwordHash = hash;
            store.principalCredential.hasCustomPassword = true;
          }
          store.principalCredential.updatedAt = nowLabel;
          for (const [tok] of principalSessions.entries()) {
            principalSessions.set(tok, nextUsername);
          }
        } else {
          const initialPass = trimmedNewPass || 'DanlogPrincipal#1975';
          const { salt, hash } = hashPassword(initialPass);
          store.principalCredential = {
            username: nextUsername,
            salt,
            passwordHash: hash,
            hasCustomPassword: Boolean(trimmedNewPass),
            updatedAt: nowLabel,
          };
        }
      } else if (rawUsernameProvided && store.principalCredential) {
        store.principalCredential = null;
        principalSessions.clear();
      }
    } else if (nextRole === 'Administrative Officer') {
      const linkedAo2 = store.ao2Credentials.find((c) => c.accountId === id);
      store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
      if (existing.role === 'Principal') {
        store.principalCredential = null;
        principalSessions.clear();
      }
      if (nextUsername) {
        if (isPortalUsernameTaken(store, nextUsername, id)) {
          res.status(409).json({ error: `Username "${nextUsername}" is already assigned.` });
          return;
        }
        if (linkedAo2) {
          linkedAo2.username = nextUsername;
          if (trimmedNewPass) {
            const { salt, hash } = hashPassword(trimmedNewPass);
            linkedAo2.salt = salt;
            linkedAo2.passwordHash = hash;
            linkedAo2.hasCustomPassword = true;
          }
          linkedAo2.updatedAt = nowLabel;
          for (const [tok, sess] of ao2Sessions.entries()) {
            if (sess.accountId === id) {
              ao2Sessions.set(tok, { accountId: id, username: nextUsername });
            }
          }
        } else {
          const initialPass = trimmedNewPass || 'DanlogAO2#1975';
          const { salt, hash } = hashPassword(initialPass);
          store.ao2Credentials.push({
            accountId: id,
            username: nextUsername,
            salt,
            passwordHash: hash,
            hasCustomPassword: Boolean(trimmedNewPass),
            updatedAt: nowLabel,
          });
        }
      } else if (rawUsernameProvided && linkedAo2) {
        if (store.ao2Credentials.length <= 1) {
          res.status(400).json({
            error: 'At least one AO-II Administrator portal account must remain active.',
          });
          return;
        }
        store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
        for (const [tok, sess] of ao2Sessions.entries()) {
          if (sess.accountId === id) ao2Sessions.delete(tok);
        }
        if (store.primaryAo2AccountId === id) {
          store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
        }
      }
    } else if (nextRole === 'Teacher') {
      const linkedCred = store.teacherCredentials.find((c) => c.teacherId === id);
      if (existing.role === 'Principal') {
        store.principalCredential = null;
        principalSessions.clear();
      }
      if (store.ao2Credentials.some((c) => c.accountId === id) && store.ao2Credentials.length <= 1) {
        res.status(400).json({
          error: 'At least one AO-II Administrator portal account must remain active.',
        });
        return;
      }
      store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
      if (store.primaryAo2AccountId === id) {
        store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
      }
      if (nextUsername) {
        if (isPortalUsernameTaken(store, nextUsername, id)) {
          res.status(409).json({ error: `Username "${nextUsername}" is already assigned.` });
          return;
        }
        if (linkedCred) {
          linkedCred.username = nextUsername;
          if (trimmedNewPass) {
            const { salt, hash } = hashPassword(trimmedNewPass);
            linkedCred.salt = salt;
            linkedCred.passwordHash = hash;
            linkedCred.hasCustomPassword = true;
          }
          linkedCred.updatedAt = nowLabel;
        } else {
          const initialPass = trimmedNewPass || 'DanlogFaculty#2026';
          const { salt, hash } = hashPassword(initialPass);
          store.teacherCredentials.push({
            teacherId: id,
            username: nextUsername,
            salt,
            passwordHash: hash,
            hasCustomPassword: true,
            updatedAt: nowLabel,
          });
        }
      } else if (rawUsernameProvided && linkedCred) {
        store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
        for (const [token, tid] of teacherSessions.entries()) {
          if (tid === id) teacherSessions.delete(token);
        }
      }
    }

    const updated: StaffMemberRecord = {
      ...existing,
      fullName,
      role: nextRole,
      title: body.title !== undefined ? String(body.title).trim() || existing.title : existing.title,
      department:
        body.department !== undefined
          ? String(body.department).trim() || existing.department
          : existing.department,
      assignedGradeId:
        body.assignedGradeId !== undefined ? String(body.assignedGradeId) : existing.assignedGradeId,
      assignedGradeLabel:
        body.assignedGradeLabel !== undefined
          ? String(body.assignedGradeLabel).trim() || existing.assignedGradeLabel
          : existing.assignedGradeLabel,
      email: body.email !== undefined ? String(body.email).trim() || existing.email : existing.email,
      phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
      room: body.room !== undefined ? String(body.room).trim() : existing.room,
      officeHours:
        body.officeHours !== undefined ? String(body.officeHours).trim() : existing.officeHours,
      employmentStatus: body.employmentStatus ?? existing.employmentStatus,
      portalUsername: nextUsername,
      updatedAt: nowLabel,
    };

    store.staffRecords = store.staffRecords.map((s) => (s.id === id ? updated : s));
    store.studentRecords = store.studentRecords.map((st) =>
      st.adviserId === id ? { ...st, adviserName: updated.fullName } : st
    );
    store.materialRequisitions = store.materialRequisitions.map((reqItem) =>
      reqItem.teacherId === id
        ? {
            ...reqItem,
            teacherName: updated.fullName,
            teacherGradeSection: updated.assignedGradeLabel,
          }
        : reqItem
    );

    appendAudit(
      store,
      'Staff',
      `Updated staff record "${updated.fullName}" (${updated.role} · ${updated.employmentStatus}).`
    );
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.json({
      record: updated,
      staffRecords: store.staffRecords,
      studentRecords: store.studentRecords,
      materialRequisitions: store.materialRequisitions,
      teacherAccounts: bootstrapPayload.teacherAccounts,
      principalAccount: bootstrapPayload.principalAccount,
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/staff/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.staffRecords.find((s) => s.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Staff record not found.' });
      return;
    }
    const isLinkedAo2 = store.ao2Credentials.some((c) => c.accountId === id);
    if (isLinkedAo2 && store.ao2Credentials.length <= 1) {
      res.status(400).json({
        error:
          'At least one AO-II Administrator account must remain active. Add another AO-II Administrator before deleting this record.',
      });
      return;
    }

    store.staffRecords = store.staffRecords.filter((s) => s.id !== id);
    store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
    store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
    if (existing.role === 'Principal' || id === 'staff-principal') {
      store.principalCredential = null;
      principalSessions.clear();
    }
    recordAo2StaffDeletion(store, id);
    for (const [token, tid] of teacherSessions.entries()) {
      if (tid === id) teacherSessions.delete(token);
    }
    for (const [tok, sess] of ao2Sessions.entries()) {
      if (sess.accountId === id) ao2Sessions.delete(tok);
    }
    if (store.primaryAo2AccountId === id) {
      store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
    }

    appendAudit(store, 'Staff', `Deleted staff record "${existing.fullName}" (${id}).`);
    saveStore(store);

    const bootstrapPayload = toBootstrapPayload(store);
    res.json({
      staffRecords: store.staffRecords,
      teacherAccounts: bootstrapPayload.teacherAccounts,
      principalAccount: bootstrapPayload.principalAccount,
      ao2Account: bootstrapPayload.ao2Account,
      ao2Accounts: bootstrapPayload.ao2Accounts,
      auditLog: store.auditLog,
    });
  });

  app.post('/api/admin/students', requireAoII, (req, res) => {
    const body = (req.body ?? {}) as Partial<StudentRecord>;
    const studentName = String(body.studentName ?? '').trim();
    if (studentName.length < 2) {
      res.status(400).json({ error: 'Student full name must be at least 2 characters.' });
      return;
    }

    const gradeId = String(body.gradeId ?? 'k').trim() || 'k';
    const gradeMap: Record<string, string> = {
      k: 'Kindergarten',
      g1: 'Grade 1',
      g2: 'Grade 2',
      g3: 'Grade 3',
      g4: 'Grade 4',
      g5: 'Grade 5',
      g6: 'Grade 6',
    };
    const gradeLabel = String(body.gradeLabel ?? '').trim() || gradeMap[gradeId] || 'Kindergarten';
    const academicYear: AcademicYear =
      body.academicYear === '2025-2026' ? '2025-2026' : '2026-2027';
    const enrollmentStatus: StudentEnrollmentStatus =
      body.enrollmentStatus === 'Enrolled' ||
      body.enrollmentStatus === 'Transferred In' ||
      body.enrollmentStatus === 'Transferred Out' ||
      body.enrollmentStatus === 'Graduated'
        ? body.enrollmentStatus
        : 'Enrolled';
    const attendance: AttendanceStatus =
      body.attendance === 'Present' || body.attendance === 'Late' || body.attendance === 'Absent'
        ? body.attendance
        : 'Present';
    const currentAverage = Math.max(60, Math.min(100, Math.round(Number(body.currentAverage) || 90)));
    const missingWork = Math.max(0, Math.min(50, Math.round(Number(body.missingWork) || 0)));

    const adviserMatch = store.staffRecords.find(
      (s) => s.id === body.adviserId || (s.role === 'Teacher' && s.assignedGradeId === gradeId)
    );

    const record: StudentRecord = {
      id: `stu-${Date.now()}`,
      lrn:
        String(body.lrn ?? '').trim() ||
        `11420826${String(Math.floor(1000 + Math.random() * 9000))}`,
      studentName,
      gradeId,
      gradeLabel,
      section: String(body.section ?? '').trim() || 'Section A',
      adviserId: adviserMatch?.id ?? String(body.adviserId ?? ''),
      adviserName:
        String(body.adviserName ?? '').trim() || adviserMatch?.fullName || 'Assigned Adviser',
      academicYear,
      enrollmentStatus,
      attendance,
      currentAverage,
      missingWork,
      guardianName: String(body.guardianName ?? '').trim() || 'Parent / Guardian',
      guardianContact: String(body.guardianContact ?? '').trim() || '+63 917 555 0100',
      updatedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    store.studentRecords.unshift(record);
    appendAudit(
      store,
      'Students',
      `Added student record "${record.studentName}" (LRN: ${record.lrn}, ${record.gradeLabel} · ${record.section}).`
    );
    saveStore(store);

    res.status(201).json({
      record,
      studentRecords: store.studentRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/students/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.studentRecords.find((s) => s.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<StudentRecord>;
    const studentName =
      body.studentName !== undefined ? String(body.studentName).trim() : existing.studentName;
    if (studentName.length < 2) {
      res.status(400).json({ error: 'Student full name must be at least 2 characters.' });
      return;
    }

    const gradeId = body.gradeId !== undefined ? String(body.gradeId) : existing.gradeId;
    const gradeMap: Record<string, string> = {
      k: 'Kindergarten',
      g1: 'Grade 1',
      g2: 'Grade 2',
      g3: 'Grade 3',
      g4: 'Grade 4',
      g5: 'Grade 5',
      g6: 'Grade 6',
    };
    const gradeLabel =
      body.gradeLabel !== undefined
        ? String(body.gradeLabel).trim() || gradeMap[gradeId] || existing.gradeLabel
        : gradeMap[gradeId] || existing.gradeLabel;

    const updated: StudentRecord = {
      ...existing,
      lrn: body.lrn !== undefined ? String(body.lrn).trim() || existing.lrn : existing.lrn,
      studentName,
      gradeId,
      gradeLabel,
      section:
        body.section !== undefined ? String(body.section).trim() || existing.section : existing.section,
      adviserId: body.adviserId !== undefined ? String(body.adviserId) : existing.adviserId,
      adviserName:
        body.adviserName !== undefined
          ? String(body.adviserName).trim() || existing.adviserName
          : existing.adviserName,
      academicYear: body.academicYear === '2025-2026' ? '2025-2026' : body.academicYear === '2026-2027' ? '2026-2027' : existing.academicYear,
      enrollmentStatus: body.enrollmentStatus ?? existing.enrollmentStatus,
      attendance: body.attendance ?? existing.attendance,
      currentAverage:
        body.currentAverage !== undefined
          ? Math.max(60, Math.min(100, Math.round(Number(body.currentAverage) || existing.currentAverage)))
          : existing.currentAverage,
      missingWork:
        body.missingWork !== undefined
          ? Math.max(0, Math.min(50, Math.round(Number(body.missingWork) || 0)))
          : existing.missingWork,
      guardianName:
        body.guardianName !== undefined
          ? String(body.guardianName).trim() || existing.guardianName
          : existing.guardianName,
      guardianContact:
        body.guardianContact !== undefined
          ? String(body.guardianContact).trim() || existing.guardianContact
          : existing.guardianContact,
      updatedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    store.studentRecords = store.studentRecords.map((s) => (s.id === id ? updated : s));
    appendAudit(
      store,
      'Students',
      `Updated student record "${updated.studentName}" (${updated.gradeLabel} · ${updated.section}, ${updated.enrollmentStatus}).`
    );
    saveStore(store);

    res.json({
      record: updated,
      studentRecords: store.studentRecords,
      auditLog: store.auditLog,
    });
  });

  app.delete('/api/admin/students/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.studentRecords.find((s) => s.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    store.studentRecords = store.studentRecords.filter((s) => s.id !== id);
    appendAudit(
      store,
      'Students',
      `Deleted student record "${existing.studentName}" (LRN: ${existing.lrn}).`
    );
    saveStore(store);

    res.json({
      studentRecords: store.studentRecords,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/teacher/students/:id/attendance', (req, res) => {
    const teacherToken = req.header('x-teacher-token') ?? '';
    const ao2Token = req.header('x-ao2-token') ?? '';
    const sessionTeacherId = teacherSessions.get(teacherToken);
    const isAllowed = Boolean(sessionTeacherId || ao2Sessions.has(ao2Token));
    if (!isAllowed) {
      res.status(401).json({ error: 'Sign in as Teacher or AO-II to record attendance.' });
      return;
    }
    const { id } = req.params;
    const { attendance } = req.body as { attendance?: AttendanceStatus };
    if (attendance !== 'Present' && attendance !== 'Late' && attendance !== 'Absent') {
      res.status(400).json({ error: 'Invalid attendance status.' });
      return;
    }
    const nowLabel = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const existing = store.studentRecords.find((s) => s.id === id);
    if (!existing) {
      let staticTeacherMatch: (typeof TEACHER_PORTAL_PROFILES)[number] | undefined;
      let staticStudentMatch:
        | (typeof TEACHER_PORTAL_PROFILES)[number]['students'][number]
        | undefined;
      for (const profile of TEACHER_PORTAL_PROFILES) {
        const found = profile.students.find((s) => s.id === id);
        if (found) {
          staticTeacherMatch = profile;
          staticStudentMatch = found;
          break;
        }
      }
      if (!staticStudentMatch || !staticTeacherMatch) {
        res.status(404).json({ error: 'Student record not found.' });
        return;
      }
      store.studentRecords.push({
        id: staticStudentMatch.id,
        lrn: `11420826${String(store.studentRecords.length + 1).padStart(4, '0')}`,
        studentName: staticStudentMatch.studentName,
        gradeId: staticTeacherMatch.assignedGradeId,
        gradeLabel: staticStudentMatch.gradeLabel,
        section: staticStudentMatch.advisorGroup,
        adviserId: staticTeacherMatch.id,
        adviserName: staticTeacherMatch.name,
        academicYear: store.backendConfig.activeAcademicYear,
        enrollmentStatus: 'Enrolled',
        attendance,
        currentAverage: staticStudentMatch.currentAverage,
        missingWork: staticStudentMatch.missingWork,
        guardianName: `${staticStudentMatch.studentName.split(' ').slice(-1)[0]} Family`,
        guardianContact: '+63 917 555 0100',
        updatedAt: nowLabel,
      });
    } else {
      store.studentRecords = store.studentRecords.map((s) =>
        s.id === id ? { ...s, attendance, updatedAt: nowLabel } : s
      );
    }
    saveStore(store);
    res.json({ studentRecords: store.studentRecords });
  });

  app.post('/api/teacher/notes', (req, res) => {
    const teacherToken = req.header('x-teacher-token') ?? '';
    const ao2Token = req.header('x-ao2-token') ?? '';
    const sessionTeacherId = teacherSessions.get(teacherToken);
    const isAo2 = req.header('x-admin-role') === 'AO-II' && ao2Sessions.has(ao2Token);
    if (!sessionTeacherId && !isAo2) {
      res.status(401).json({ error: 'Sign in with a Teacher or AO-II account to save advisory notes.' });
      return;
    }
    const { teacherId: requestedTeacherId, text } = req.body as {
      teacherId?: string;
      text?: string;
    };
    const cleanText = String(text ?? '').trim();
    if (cleanText.length < 3) {
      res.status(400).json({ error: 'Advisory note must be at least 3 characters.' });
      return;
    }
    const targetTeacherId = isAo2
      ? String(requestedTeacherId ?? '').trim() || sessionTeacherId || 'staff-danlog-gabrito'
      : (sessionTeacherId as string);
    const staffMatch = store.staffRecords.find((s) => s.id === targetTeacherId);
    const staticMatch = TEACHER_PORTAL_PROFILES.find((t) => t.id === targetTeacherId);
    const authorName = staffMatch?.fullName ?? staticMatch?.name ?? 'Faculty Member';
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const note: TeacherAdvisoryNote = {
      id: `tnote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      teacherId: targetTeacherId,
      authorName,
      text: cleanText,
      timestamp,
    };
    if (!Array.isArray(store.teacherNotes)) {
      store.teacherNotes = [];
    }
    store.teacherNotes.unshift(note);
    appendAudit(
      store,
      'Students',
      `${authorName} recorded classroom advisory note (${note.id}).`,
      `${authorName} (Teacher)`
    );
    saveStore(store);
    res.status(201).json({
      note,
      teacherNotes: store.teacherNotes,
      auditLog: store.auditLog,
    });
  });

  app.post('/api/teacher/student-doc-feedback', (req, res) => {
    const teacherToken = req.header('x-teacher-token') ?? '';
    const ao2Token = req.header('x-ao2-token') ?? '';
    const sessionTeacherId = teacherSessions.get(teacherToken);
    const isAo2 = req.header('x-admin-role') === 'AO-II' && ao2Sessions.has(ao2Token);
    if (!sessionTeacherId && !isAo2) {
      res.status(401).json({
        error: 'Sign in with a Teacher or AO-II account to save student document feedback.',
      });
      return;
    }
    const { docId, comment, teacherId: requestedTeacherId } = req.body as {
      docId?: string;
      comment?: string;
      teacherId?: string;
    };
    const cleanDocId = String(docId ?? '').trim();
    const cleanComment = String(comment ?? '').trim();
    if (!cleanDocId || cleanComment.length < 2) {
      res.status(400).json({ error: 'Provide a valid document ID and feedback note.' });
      return;
    }
    const targetTeacherId = isAo2
      ? String(requestedTeacherId ?? '').trim() || sessionTeacherId || 'staff-danlog-gabrito'
      : (sessionTeacherId as string);
    const staffMatch = store.staffRecords.find((s) => s.id === targetTeacherId);
    const staticMatch = TEACHER_PORTAL_PROFILES.find((t) => t.id === targetTeacherId);
    const authorName = staffMatch?.fullName ?? staticMatch?.name ?? 'Faculty Member';
    const updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    if (!Array.isArray(store.studentDocFeedback)) {
      store.studentDocFeedback = [];
    }
    const existingIdx = store.studentDocFeedback.findIndex(
      (f) => f.docId === cleanDocId && f.teacherId === targetTeacherId
    );
    let savedEntry: StudentDocFeedbackEntry;
    if (existingIdx >= 0) {
      savedEntry = {
        ...store.studentDocFeedback[existingIdx],
        authorName,
        comment: cleanComment,
        updatedAt,
      };
      store.studentDocFeedback[existingIdx] = savedEntry;
    } else {
      savedEntry = {
        id: `sfb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        docId: cleanDocId,
        teacherId: targetTeacherId,
        authorName,
        comment: cleanComment,
        updatedAt,
      };
      store.studentDocFeedback.unshift(savedEntry);
    }

    appendAudit(
      store,
      'Students',
      `${authorName} saved feedback on student submission ${cleanDocId}.`,
      `${authorName} (Teacher)`
    );
    saveStore(store);
    res.status(201).json({
      feedback: savedEntry,
      studentDocFeedback: store.studentDocFeedback,
      auditLog: store.auditLog,
    });
  });

  function buildDatabaseOverview(): DatabaseOverview {
    if (!fs.existsSync(STORE_PATH)) {
      saveStore(store);
    }
    let fileSizeBytes = 0;
    let lastModifiedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    try {
      const stat = fs.statSync(STORE_PATH);
      fileSizeBytes = stat.size;
      lastModifiedAt = stat.mtime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      fileSizeBytes = Buffer.byteLength(JSON.stringify(store), 'utf-8');
    }

    const bootstrap = toBootstrapPayload(store);
    const enrollmentRows =
      (bootstrap.enrollmentByYear['2026-2027']?.length ?? 0) +
      (bootstrap.enrollmentByYear['2025-2026']?.length ?? 0);

    return {
      engine: 'Express JSON Persistent Store',
      storePath: '.data/school_state.json',
      fileSizeBytes,
      lastModifiedAt,
      counts: {
        enrollmentRows,
        inventoryItems: bootstrap.inventoryItems.length,
        materialRequisitions: bootstrap.materialRequisitions.length,
        leaveApplications: bootstrap.leaveApplications?.length ?? 0,
        uploadedDocuments: bootstrap.uploadedDocuments.length,
        admissionsSubmissions: bootstrap.admissionsSubmissions.length,
        staffRecords: bootstrap.staffRecords.length,
        studentRecords: bootstrap.studentRecords.length,
        activityPosts: bootstrap.activityPosts.length,
        homePosts: bootstrap.homePosts.length,
        teacherNotes: bootstrap.teacherNotes?.length ?? 0,
        studentDocFeedback: bootstrap.studentDocFeedback?.length ?? 0,
        staffAccounts:
          bootstrap.teacherAccounts.length +
          (bootstrap.principalAccount ? 1 : 0) +
          (bootstrap.ao2Accounts?.length ?? 0),
        auditLog: bootstrap.auditLog.length,
      },
      data: bootstrap,
    };
  }

  app.get('/api/admin/database', requireAoII, (_req, res) => {
    res.json(buildDatabaseOverview());
  });

  app.patch('/api/admin/database/enrollment-row', requireAoII, (req, res) => {
    const { year, gradeId, enrolledStudents, capacity, teachers, sections, facultyLead } =
      req.body as {
        year: AcademicYear;
        gradeId: string;
        enrolledStudents?: number;
        capacity?: number;
        teachers?: number;
        sections?: number;
        facultyLead?: string;
      };

    const rows = store.enrollmentByYear[year];
    if (!rows) {
      res.status(400).json({ error: 'Invalid academic year.' });
      return;
    }

    const exists = rows.some((row) => row.id === gradeId);
    if (!exists) {
      res.status(404).json({ error: 'Grade row not found.' });
      return;
    }

    store.enrollmentByYear[year] = rows.map((row: GradeEnrollmentRow) => {
      if (row.id !== gradeId) return row;
      const nextCap =
        capacity !== undefined
          ? Math.max(10, Math.min(200, Math.round(Number(capacity) || row.capacity)))
          : row.capacity;
      const nextEnrolled =
        enrolledStudents !== undefined
          ? Math.max(0, Math.min(nextCap + 25, Math.round(Number(enrolledStudents) || 0)))
          : row.enrolledStudents;
      const nextTeachers =
        teachers !== undefined
          ? Math.max(1, Math.min(35, Math.round(Number(teachers) || 1)))
          : row.teachers;
      const nextSections =
        sections !== undefined
          ? Math.max(1, Math.min(20, Math.round(Number(sections) || 1)))
          : row.sections;
      const nextLead =
        facultyLead !== undefined && facultyLead.trim().length > 1
          ? facultyLead.trim()
          : row.facultyLead;

      return {
        ...row,
        capacity: nextCap,
        enrolledStudents: nextEnrolled,
        teachers: nextTeachers,
        sections: nextSections,
        facultyLead: nextLead,
      };
    });

    appendAudit(
      store,
      'Database',
      `Edited database enrollment row ${gradeId.toUpperCase()} (${year}) directly.`
    );
    saveStore(store);
    res.json(buildDatabaseOverview());
  });

  app.delete('/api/admin/database/records/:collection/:id', requireAoII, (req, res) => {
    const collection = req.params.collection as DatabaseRecordCollection;
    const { id } = req.params;

    if (collection === 'inventoryItems') {
      const target = store.inventoryItems.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Inventory record not found.' });
        return;
      }
      store.inventoryItems = store.inventoryItems.filter((item) => item.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted inventory record "${target.itemName}" (${id}) from database.`
      );
    } else if (collection === 'materialRequisitions') {
      const target = store.materialRequisitions.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Material requisition not found.' });
        return;
      }
      store.materialRequisitions = store.materialRequisitions.filter((item) => item.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted material requisition "${target.itemName}" (${id}) from database.`
      );
    } else if (collection === 'leaveApplications') {
      const target = (store.leaveApplications ?? []).find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Leave application not found.' });
        return;
      }
      store.leaveApplications = store.leaveApplications.filter((item) => item.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted leave application "${target.applicantName} · ${target.leaveType}" (${id}) from database.`
      );
    } else if (collection === 'uploadedDocuments') {
      const target = store.uploadedDocuments.find((doc) => doc.id === id);
      if (!target) {
        res.status(404).json({ error: 'Document record not found.' });
        return;
      }
      const storedPath = path.join(
        UPLOADS_DIR,
        `${target.id}_${sanitizeFileName(target.fileName)}`
      );
      fs.rmSync(storedPath, { force: true });
      store.uploadedDocuments = store.uploadedDocuments.filter((doc) => doc.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted uploaded document "${target.title}" (${id}) from database.`
      );
    } else if (collection === 'admissionsSubmissions') {
      const target = store.admissionsSubmissions.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Parent inquiry record not found.' });
        return;
      }
      store.admissionsSubmissions = store.admissionsSubmissions.filter((item) => item.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted parent inquiry "${target.parentName}" (${target.referenceCode}) from database.`
      );
    } else if (collection === 'staffRecords') {
      const target = store.staffRecords.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Staff record not found.' });
        return;
      }
      const isLinkedAo2 = store.ao2Credentials.some((c) => c.accountId === id);
      if (isLinkedAo2 && store.ao2Credentials.length <= 1) {
        res.status(400).json({
          error:
            'At least one AO-II Administrator account must remain active. Add another AO-II Administrator first.',
        });
        return;
      }
      store.staffRecords = store.staffRecords.filter((item) => item.id !== id);
      store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
      store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
      if (target.role === 'Principal' || id === 'staff-principal') {
        store.principalCredential = null;
        principalSessions.clear();
      }
      recordAo2StaffDeletion(store, id);
      for (const [token, tid] of teacherSessions.entries()) {
        if (tid === id) teacherSessions.delete(token);
      }
      for (const [tok, sess] of ao2Sessions.entries()) {
        if (sess.accountId === id) ao2Sessions.delete(tok);
      }
      if (store.primaryAo2AccountId === id) {
        store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
      }
      appendAudit(store, 'Database', `Deleted staff record "${target.fullName}" (${id}) from database.`);
    } else if (collection === 'teacherAccounts') {
      const targetCred = store.teacherCredentials.find((c) => c.teacherId === id);
      if (!targetCred) {
        res.status(404).json({ error: 'Teacher portal account not found.' });
        return;
      }
      store.teacherCredentials = store.teacherCredentials.filter((c) => c.teacherId !== id);
      store.staffRecords = store.staffRecords.filter((s) => s.id !== id);
      recordAo2StaffDeletion(store, id);
      for (const [token, tid] of teacherSessions.entries()) {
        if (tid === id) teacherSessions.delete(token);
      }
      appendAudit(
        store,
        'Database',
        `Deleted teacher portal account @${targetCred.username} (${id}) from database.`
      );
    } else if (collection === 'principalAccount') {
      const existingPrincipal = getPrincipalStaffRecord(store);
      if (!store.principalCredential && !existingPrincipal) {
        res.status(404).json({ error: 'School Principal account not found.' });
        return;
      }
      const deletedUser = store.principalCredential?.username ?? existingPrincipal?.portalUsername ?? 'principal';
      store.principalCredential = null;
      if (existingPrincipal) {
        store.staffRecords = store.staffRecords.filter((s) => s.id !== existingPrincipal.id);
        recordAo2StaffDeletion(store, existingPrincipal.id);
      }
      principalSessions.clear();
      appendAudit(
        store,
        'Database',
        `Deleted School Principal account @${deletedUser} from database.`
      );
    } else if (collection === 'ao2Accounts') {
      const targetCred = store.ao2Credentials.find((c) => c.accountId === id);
      if (!targetCred) {
        res.status(404).json({ error: 'AO-II administrator account not found.' });
        return;
      }
      if (store.ao2Credentials.length <= 1) {
        res.status(400).json({
          error: 'At least one AO-II Administrator account must remain active.',
        });
        return;
      }
      store.ao2Credentials = store.ao2Credentials.filter((c) => c.accountId !== id);
      store.staffRecords = store.staffRecords.filter((s) => s.id !== id);
      recordAo2StaffDeletion(store, id);
      for (const [tok, sess] of ao2Sessions.entries()) {
        if (sess.accountId === id) ao2Sessions.delete(tok);
      }
      if (store.primaryAo2AccountId === id) {
        store.primaryAo2AccountId = store.ao2Credentials[0]?.accountId;
      }
      appendAudit(
        store,
        'Database',
        `Deleted AO-II administrator account @${targetCred.username} (${id}) from database.`
      );
    } else if (collection === 'studentRecords') {
      const target = store.studentRecords.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Student record not found.' });
        return;
      }
      store.studentRecords = store.studentRecords.filter((item) => item.id !== id);
      appendAudit(
        store,
        'Database',
        `Deleted student record "${target.studentName}" (${target.lrn}) from database.`
      );
    } else if (collection === 'activityPosts') {
      const target = store.activityPosts.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Activity post not found.' });
        return;
      }
      store.activityPosts = store.activityPosts.filter((item) => item.id !== id);
      appendAudit(store, 'Database', `Deleted activity post "${target.title}" (${id}) from database.`);
    } else if (collection === 'homePosts') {
      const target = store.homePosts.find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Home post not found.' });
        return;
      }
      store.homePosts = store.homePosts.filter((item) => item.id !== id);
      appendAudit(store, 'Database', `Deleted home page post "${target.title}" (${id}) from database.`);
    } else if (collection === 'teacherNotes') {
      const target = (store.teacherNotes ?? []).find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Teacher advisory note not found.' });
        return;
      }
      store.teacherNotes = (store.teacherNotes ?? []).filter((item) => item.id !== id);
      appendAudit(store, 'Database', `Deleted teacher advisory note (${id}) from database.`);
    } else if (collection === 'studentDocFeedback') {
      const target = (store.studentDocFeedback ?? []).find((item) => item.id === id);
      if (!target) {
        res.status(404).json({ error: 'Student document feedback entry not found.' });
        return;
      }
      store.studentDocFeedback = (store.studentDocFeedback ?? []).filter((item) => item.id !== id);
      appendAudit(store, 'Database', `Deleted student document feedback entry (${id}) from database.`);
    } else if (collection === 'auditLog') {
      const target = store.auditLog.find((entry) => entry.id === id);
      if (!target) {
        res.status(404).json({ error: 'Audit entry not found.' });
        return;
      }
      store.auditLog = store.auditLog.filter((entry) => entry.id !== id);
    } else {
      res.status(400).json({ error: 'Unsupported database collection.' });
      return;
    }

    saveStore(store);
    res.json(buildDatabaseOverview());
  });

  app.post('/api/admin/database/restore', requireAoII, (req, res) => {
    const incoming = (req.body ?? {}) as Partial<SchoolSystemBootstrap>;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Provide a valid JSON database backup object.' });
      return;
    }

    const updatedSections: string[] = [];

    if (incoming.frontendConfig && typeof incoming.frontendConfig === 'object') {
      store.frontendConfig = {
        ...store.frontendConfig,
        ...incoming.frontendConfig,
        visibleSections: {
          ...store.frontendConfig.visibleSections,
          ...(incoming.frontendConfig.visibleSections ?? {}),
        },
      };
      updatedSections.push('frontendConfig');
    }

    if (incoming.backendConfig && typeof incoming.backendConfig === 'object') {
      store.backendConfig = {
        ...store.backendConfig,
        ...incoming.backendConfig,
      };
      updatedSections.push('backendConfig');
    }

    if (
      incoming.enrollmentByYear &&
      Array.isArray(incoming.enrollmentByYear['2026-2027']) &&
      Array.isArray(incoming.enrollmentByYear['2025-2026'])
    ) {
      store.enrollmentByYear = incoming.enrollmentByYear;
      updatedSections.push('enrollmentByYear');
    }

    if (Array.isArray(incoming.inventoryItems)) {
      store.inventoryItems = incoming.inventoryItems;
      updatedSections.push('inventoryItems');
    }

    if (Array.isArray(incoming.materialRequisitions)) {
      store.materialRequisitions = incoming.materialRequisitions;
      updatedSections.push('materialRequisitions');
    }

    if (Array.isArray(incoming.leaveApplications)) {
      store.leaveApplications = incoming.leaveApplications;
      updatedSections.push('leaveApplications');
    }

    if (Array.isArray(incoming.uploadedDocuments)) {
      store.uploadedDocuments = incoming.uploadedDocuments;
      updatedSections.push('uploadedDocuments');
    }

    if (Array.isArray(incoming.admissionsSubmissions)) {
      store.admissionsSubmissions = incoming.admissionsSubmissions;
      updatedSections.push('admissionsSubmissions');
    }

    if (Array.isArray(incoming.staffRecords)) {
      store.staffRecords = incoming.staffRecords;
      const incomingTeacherIds = new Set(
        incoming.staffRecords
          .filter((s) => s.role === 'Teacher' && Boolean(s.portalUsername))
          .map((s) => s.id)
      );
      const incomingAo2Ids = new Set(
        incoming.staffRecords
          .filter((s) => s.role === 'Administrative Officer' && Boolean(s.portalUsername))
          .map((s) => s.id)
      );
      store.teacherCredentials = store.teacherCredentials.filter((c) =>
        incomingTeacherIds.has(c.teacherId)
      );
      store.ao2Credentials = store.ao2Credentials.filter((c) =>
        incomingAo2Ids.has(c.accountId)
      );
      for (const staff of incoming.staffRecords) {
        if (staff.role === 'Teacher' && staff.portalUsername) {
          const existingCred = store.teacherCredentials.find((c) => c.teacherId === staff.id);
          if (existingCred) {
            existingCred.username = staff.portalUsername.toLowerCase();
          } else {
            const { salt, hash } = hashPassword('DanlogFaculty#2026');
            store.teacherCredentials.push({
              teacherId: staff.id,
              username: staff.portalUsername.toLowerCase(),
              salt,
              passwordHash: hash,
              hasCustomPassword: false,
              updatedAt: staff.updatedAt,
            });
          }
        } else if (staff.role === 'Administrative Officer' && staff.portalUsername) {
          const existingAo2 = store.ao2Credentials.find((c) => c.accountId === staff.id);
          if (existingAo2) {
            existingAo2.username = staff.portalUsername.toLowerCase();
          } else {
            const { salt, hash } = hashPassword('DanlogAO2#1975');
            store.ao2Credentials.push({
              accountId: staff.id,
              username: staff.portalUsername.toLowerCase(),
              salt,
              passwordHash: hash,
              hasCustomPassword: false,
              updatedAt: staff.updatedAt,
            });
          }
        }
      }
      const restoredIds = new Set(incoming.staffRecords.map((s) => s.id));
      store.deletedStaffIds = DANLOG_RETAINED_STAFF_SEED.map((s) => s.record.id).filter(
        (id) => !restoredIds.has(id)
      );
      for (const [token, tid] of teacherSessions.entries()) {
        if (!incomingTeacherIds.has(tid)) teacherSessions.delete(token);
      }
      for (const [tok, sess] of ao2Sessions.entries()) {
        if (!incomingAo2Ids.has(sess.accountId)) {
          ao2Sessions.delete(tok);
        }
      }
      updatedSections.push('staffRecords');
    }

    if (Array.isArray(incoming.studentRecords)) {
      store.studentRecords = incoming.studentRecords;
      updatedSections.push('studentRecords');
    }

    if (Array.isArray(incoming.activityPosts)) {
      store.activityPosts = incoming.activityPosts;
      updatedSections.push('activityPosts');
    }

    if (Array.isArray(incoming.homePosts)) {
      store.homePosts = incoming.homePosts;
      updatedSections.push('homePosts');
    }

    if (Array.isArray(incoming.teacherNotes)) {
      store.teacherNotes = incoming.teacherNotes;
      updatedSections.push('teacherNotes');
    }

    if (Array.isArray(incoming.studentDocFeedback)) {
      store.studentDocFeedback = incoming.studentDocFeedback;
      updatedSections.push('studentDocFeedback');
    }

    if (updatedSections.length === 0) {
      res.status(400).json({
        error:
          'No recognized database collections found (expected enrollmentByYear, inventoryItems, uploadedDocuments, admissionsSubmissions, staffRecords, studentRecords, activityPosts, homePosts, frontendConfig, or backendConfig).',
      });
      return;
    }

    appendAudit(
      store,
      'Database',
      `Imported/restored database collections: ${updatedSections.join(', ')}.`
    );
    saveStore(store);
    res.json(buildDatabaseOverview());
  });

  app.get('/api/admin/export', requireAoII, (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="danlog_elementary_backup.json"');
    res.send(JSON.stringify(toBootstrapPayload(store), null, 2));
  });

  app.post('/api/admin/reset', requireAoII, (_req, res) => {
    store = buildDefaultState();
    teacherSessions.clear();
    principalSessions.clear();
    ao2Sessions.clear();
    appendAudit(store, 'System', 'Restored front-end and back-end configurations to defaults.');
    saveStore(store);
    res.json(toBootstrapPayload(store));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Danlog Elementary School server running at http://localhost:${port}`);
  });
}

startServer();
