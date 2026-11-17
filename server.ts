import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ENROLLMENT_BY_YEAR, type AcademicYear, type GradeEnrollmentRow } from './src/data/schoolData.ts';
import type {
  AdminAuditEntry,
  AdmissionsSubmission,
  DatabaseOverview,
  DatabaseRecordCollection,
  InventoryItem,
  InventoryStatus,
  SchoolSystemBootstrap,
  SiteBackendConfig,
  SiteFrontendConfig,
  StaffAccountSummary,
  TeacherAccountSummary,
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

interface SchoolServerStore
  extends Omit<SchoolSystemBootstrap, 'teacherAccounts' | 'principalAccount' | 'ao2Account'> {
  teacherCredentials: TeacherCredentialRecord[];
  principalCredential: StaffCredentialRecord;
  ao2Credential: StaffCredentialRecord;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const STORE_PATH = path.resolve(DATA_DIR, 'school_state.json');

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

const VALID_INVENTORY_STATUSES: InventoryStatus[] = [
  'Available',
  'Issued',
  'Low Stock',
  'For Repair',
  'Condemned',
];

function buildDefaultInventoryItems(): InventoryItem[] {
  return [
    {
      id: 'inv-101',
      itemName: 'Compound Science Microscope (Monocular LED)',
      quantity: 12,
      status: 'Issued',
      dateReceived: '2026-08-14',
      issuedToUser: 'Mr. David Chen · Science Room 204',
      dateIssued: '2026-08-20',
    },
    {
      id: 'inv-102',
      itemName: 'DepEd Kindergarten Storybook & Literacy Kit',
      quantity: 38,
      status: 'Issued',
      dateReceived: '2026-09-02',
      issuedToUser: 'Ms. Mariel Sato · Kindergarten Sampaguita',
      dateIssued: '2026-09-05',
    },
    {
      id: 'inv-103',
      itemName: 'Epson EB-X06 XGA Multimedia Projector',
      quantity: 3,
      status: 'Available',
      dateReceived: '2026-09-18',
      issuedToUser: 'AO-II Supply Room',
      dateIssued: '—',
    },
    {
      id: 'inv-104',
      itemName: 'A4 Bond Paper (80gsm, 5-Ream Box)',
      quantity: 6,
      status: 'Low Stock',
      dateReceived: '2026-10-10',
      issuedToUser: 'Faculty Workroom & Registrar',
      dateIssued: '2026-11-04',
    },
    {
      id: 'inv-105',
      itemName: 'Wall-Mounted Classroom Electric Fan (16-inch)',
      quantity: 2,
      status: 'For Repair',
      dateReceived: '2025-06-22',
      issuedToUser: 'Grade 4 Building · Maintenance Bay',
      dateIssued: '2025-07-01',
    },
    {
      id: 'inv-106',
      itemName: 'Grade 6 Heritage Reading Anthology (Hardbound Set)',
      quantity: 45,
      status: 'Issued',
      dateReceived: '2026-08-25',
      issuedToUser: 'Mrs. Claire Brooks · Grade 6 Molave',
      dateIssued: '2026-09-01',
    },
  ];
}

function toBootstrapPayload(store: SchoolServerStore): SchoolSystemBootstrap {
  const teacherAccounts: TeacherAccountSummary[] = store.teacherCredentials.map((cred) => ({
    teacherId: cred.teacherId,
    username: cred.username,
    hasCustomPassword: cred.hasCustomPassword,
    updatedAt: cred.updatedAt,
  }));
  const principalAccount: StaffAccountSummary = {
    username: store.principalCredential.username,
    hasCustomPassword: store.principalCredential.hasCustomPassword,
    updatedAt: store.principalCredential.updatedAt,
  };
  const ao2Account: StaffAccountSummary = {
    username: store.ao2Credential.username,
    hasCustomPassword: store.ao2Credential.hasCustomPassword,
    updatedAt: store.ao2Credential.updatedAt,
  };
  return {
    frontendConfig: store.frontendConfig,
    backendConfig: store.backendConfig,
    enrollmentByYear: store.enrollmentByYear,
    uploadedDocuments: store.uploadedDocuments,
    admissionsSubmissions: store.admissionsSubmissions,
    inventoryItems: store.inventoryItems,
    auditLog: store.auditLog,
    teacherAccounts,
    principalAccount,
    ao2Account,
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
      endorsedBy: 'Dr. Elena Vance (School Principal)',
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
      endorsedBy: 'Dr. Elena Vance (School Principal)',
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
      actor: 'AO-II (Administrative Officer II)',
      scope: 'System',
      summary: 'Initialized Danlog Elementary School (Pilar II) SY 2026–2027 enrollment and document policies.',
      timestamp: 'Nov 15, 2026 · 8:00 a.m.',
    },
  ];

  return {
    frontendConfig: defaultFrontend,
    backendConfig: defaultBackend,
    enrollmentByYear: structuredClone(INITIAL_ENROLLMENT_BY_YEAR),
    uploadedDocuments: defaultUploadedDocs,
    admissionsSubmissions: defaultAdmissions,
    inventoryItems: buildDefaultInventoryItems(),
    auditLog: defaultAudit,
    teacherCredentials: buildDefaultTeacherCredentials(),
    principalCredential: buildDefaultStaffCredential('principal.vance', 'DanlogPrincipal#1975'),
    ao2Credential: buildDefaultStaffCredential('ao2.admin', 'DanlogAO2#1975'),
  };
}

function loadStore(): SchoolServerStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SchoolServerStore>;
      if (parsed.frontendConfig?.schoolName === 'Danlog Elementary School') {
        let dirty = false;
        if (
          parsed.frontendConfig.heroImage ===
          '/src/assets/images/hero_colorful_education_1794812726997.jpg'
        ) {
          parsed.frontendConfig.heroImage = '/assets/aistudio/image_608d5cb7_43662196.jpg';
          dirty = true;
        }
        if (!Array.isArray(parsed.teacherCredentials) || parsed.teacherCredentials.length === 0) {
          parsed.teacherCredentials = buildDefaultTeacherCredentials();
          dirty = true;
        }
        if (!parsed.principalCredential?.username || !parsed.principalCredential?.passwordHash) {
          parsed.principalCredential = buildDefaultStaffCredential(
            'principal.vance',
            'DanlogPrincipal#1975'
          );
          dirty = true;
        }
        if (!parsed.ao2Credential?.username || !parsed.ao2Credential?.passwordHash) {
          parsed.ao2Credential = buildDefaultStaffCredential('ao2.admin', 'DanlogAO2#1975');
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
                ? doc.endorsedBy ?? 'Dr. Elena Vance (School Principal)'
                : undefined,
              endorsedAt: shouldBeEndorsed ? doc.endorsedAt ?? doc.uploadedAt : undefined,
            };
          });
        }
        if (!Array.isArray(parsed.inventoryItems)) {
          parsed.inventoryItems = buildDefaultInventoryItems();
          dirty = true;
        }
        const normalized = parsed as SchoolServerStore;
        if (dirty) {
          saveStore(normalized);
        }
        return normalized;
      }
    }
  } catch {
    // Fallback to clean defaults if store cannot be read
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
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Ignore disk write issues in read-only environments; keep in-memory state
  }
}

function appendAudit(
  state: SchoolServerStore,
  scope: AdminAuditEntry['scope'],
  summary: string
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
    actor: 'AO-II (Administrative Officer II)',
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
  const ao2Sessions = new Map<string, string>();

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
    if (
      cred.username.toLowerCase() !== normalizedUser ||
      !verifyPassword(rawPassword, cred.salt, cred.passwordHash)
    ) {
      res.status(401).json({
        error: 'Invalid Principal username or password. Verify Dr. Elena Vance’s credentials.',
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
    if (!verifyPassword(currentPassword ?? '', cred.salt, cred.passwordHash)) {
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

    const cred = store.ao2Credential;
    if (
      cred.username.toLowerCase() !== normalizedUser ||
      !verifyPassword(rawPassword, cred.salt, cred.passwordHash)
    ) {
      res.status(401).json({
        error: 'Invalid AO-II administrator username or password.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    ao2Sessions.set(token, cred.username);
    res.json({ username: cred.username, token });
  });

  app.post('/api/ao2/logout', (req, res) => {
    const token = req.header('x-ao2-token');
    if (token) ao2Sessions.delete(token);
    res.json({ ok: true });
  });

  app.patch('/api/admin/principal-account', requireAoII, (req, res) => {
    const { username, newPassword } = req.body as { username?: string; newPassword?: string };
    const target = store.principalCredential;
    const trimmedUser = (username ?? '').trim().toLowerCase();
    if (trimmedUser) {
      if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
        res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
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
    target.updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    appendAudit(
      store,
      'Account Auth',
      `Updated Principal account credentials (${target.username}${trimmedPass ? ', password reset' : ''}).`
    );
    saveStore(store);
    res.json({
      principalAccount: toBootstrapPayload(store).principalAccount,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/ao2-account', requireAoII, (req, res) => {
    const { username, newPassword } = req.body as { username?: string; newPassword?: string };
    const target = store.ao2Credential;
    const trimmedUser = (username ?? '').trim().toLowerCase();
    if (trimmedUser) {
      if (trimmedUser.length < 3 || /\s/.test(trimmedUser)) {
        res.status(400).json({ error: 'Username must be at least 3 characters with no spaces.' });
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
    target.updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    appendAudit(
      store,
      'Account Auth',
      `Updated AO-II Administrator account credentials (${target.username}${trimmedPass ? ', password updated' : ''}).`
    );
    saveStore(store);
    res.json({
      ao2Account: toBootstrapPayload(store).ao2Account,
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

  app.patch('/api/admin/teacher-accounts/:teacherId', requireAoII, (req, res) => {
    const { teacherId } = req.params;
    const { username, newPassword } = req.body as {
      username?: string;
      newPassword?: string;
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
      const duplicate = store.teacherCredentials.find(
        (c) => c.teacherId !== teacherId && c.username.toLowerCase() === trimmedUser
      );
      if (duplicate) {
        res.status(409).json({
          error: `Username "${trimmedUser}" is already assigned to another teacher.`,
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

    target.updatedAt = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    appendAudit(
      store,
      'Faculty Auth',
      `Updated credentials for teacher account ${target.username}${trimmedPass ? ' (password reset)' : ''}.`
    );
    saveStore(store);

    res.json({
      teacherAccounts: toBootstrapPayload(store).teacherAccounts,
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
            endorsedBy: isEndorsed ? 'Dr. Elena Vance (School Principal)' : undefined,
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

  app.delete('/api/teacher-documents/:docId', (req, res) => {
    const token = req.header('x-teacher-token') ?? '';
    const sessionTeacherId = teacherSessions.get(token);
    const { docId } = req.params;
    const targetDoc = store.uploadedDocuments.find((d) => d.id === docId);
    if (!sessionTeacherId || (targetDoc && targetDoc.teacherId !== sessionTeacherId)) {
      res.status(401).json({
        error: 'Authentication required to delete your uploaded document.',
      });
      return;
    }
    if (targetDoc) {
      const storedPath = path.join(
        UPLOADS_DIR,
        `${targetDoc.id}_${sanitizeFileName(targetDoc.fileName)}`
      );
      fs.rmSync(storedPath, { force: true });
    }
    store.uploadedDocuments = store.uploadedDocuments.filter((d) => d.id !== docId);
    saveStore(store);
    res.json({ uploadedDocuments: store.uploadedDocuments });
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

  app.post('/api/admin/inventory', requireAoII, (req, res) => {
    const body = (req.body ?? {}) as Partial<InventoryItem>;
    const itemName = String(body.itemName ?? '').trim();
    const quantity = Number(body.quantity);
    const status = body.status as InventoryStatus;
    const dateReceived = String(body.dateReceived ?? '').trim();
    const issuedToUser = String(body.issuedToUser ?? '').trim() || 'Supply Room / Unassigned';
    const dateIssued = String(body.dateIssued ?? '').trim() || '—';

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
      quantity: Math.round(quantity),
      status,
      dateReceived,
      issuedToUser,
      dateIssued,
    };

    store.inventoryItems.unshift(entry);
    appendAudit(
      store,
      'Inventory',
      `Added inventory item "${entry.itemName}" (Qty: ${entry.quantity}, Status: ${entry.status}).`
    );
    saveStore(store);
    res.status(201).json({
      item: entry,
      inventoryItems: store.inventoryItems,
      auditLog: store.auditLog,
    });
  });

  app.patch('/api/admin/inventory/:id', requireAoII, (req, res) => {
    const { id } = req.params;
    const existing = store.inventoryItems.find((item) => item.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Inventory item not found.' });
      return;
    }

    const body = (req.body ?? {}) as Partial<InventoryItem>;
    const itemName =
      body.itemName !== undefined ? String(body.itemName).trim() : existing.itemName;
    const quantity =
      body.quantity !== undefined ? Number(body.quantity) : existing.quantity;
    const status = (body.status ?? existing.status) as InventoryStatus;
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
      quantity: Math.round(quantity),
      status,
      dateReceived,
      issuedToUser,
      dateIssued,
    };

    store.inventoryItems = store.inventoryItems.map((item) =>
      item.id === id ? updated : item
    );
    appendAudit(
      store,
      'Inventory',
      `Updated inventory item "${updated.itemName}" (Qty: ${updated.quantity}, Status: ${updated.status}, User: ${updated.issuedToUser}).`
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
    appendAudit(store, 'Inventory', `Removed inventory item "${existing.itemName}" (${id}).`);
    saveStore(store);
    res.json({
      inventoryItems: store.inventoryItems,
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
        uploadedDocuments: bootstrap.uploadedDocuments.length,
        admissionsSubmissions: bootstrap.admissionsSubmissions.length,
        staffAccounts: bootstrap.teacherAccounts.length + 2,
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

    if (Array.isArray(incoming.uploadedDocuments)) {
      store.uploadedDocuments = incoming.uploadedDocuments;
      updatedSections.push('uploadedDocuments');
    }

    if (Array.isArray(incoming.admissionsSubmissions)) {
      store.admissionsSubmissions = incoming.admissionsSubmissions;
      updatedSections.push('admissionsSubmissions');
    }

    if (updatedSections.length === 0) {
      res.status(400).json({
        error:
          'No recognized database collections found (expected enrollmentByYear, inventoryItems, uploadedDocuments, admissionsSubmissions, frontendConfig, or backendConfig).',
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
