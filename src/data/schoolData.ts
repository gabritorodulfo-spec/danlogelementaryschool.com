export type SchoolDivision = 'Primary (K–3)' | 'Intermediate (4–6)';
export type DivisionFilter = 'All Grades' | SchoolDivision;
export type AcademicYear = '2026-2027';
export type FacilityCategory = 'All Spaces' | 'Sciences' | 'Humanities' | 'Arts & Design';

export interface GradeEnrollmentRow {
  id: string;
  gradeLabel: string;
  shortLabel: string;
  gradeOrder: number;
  division: SchoolDivision;
  enrolledStudents: number;
  capacity: number;
  teachers: number;
  sections: number;
  facultyLead: string;
  curriculumFocus: string;
}

export interface DepartmentFacultyCount {
  department: string;
  divisionScope: string;
  teachers: number;
  advancedDegreesPct: string;
}

export interface AcademicProgramItem {
  index: string;
  title: string;
  gradeRange: string;
  lead: string;
  description: string;
  deliverables: string;
  highlightMetric: string;
}

export interface CampusFacility {
  id: string;
  title: string;
  category: Exclude<FacilityCategory, 'All Spaces'>;
  building: string;
  gradesServed: string;
  capacityLabel: string;
  outcomeMetric: string;
  departmentChair: string;
  summary: string;
  architecturalAndAcademicNotes: string;
  specs: { label: string; value: string }[];
  image: string;
  imageAlt: string;
  featured?: boolean;
}

export interface SchoolTestimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  context: string;
}

export interface SchoolDispatch {
  id: string;
  date: string;
  category: string;
  readTime: string;
  title: string;
  excerpt: string;
  author: string;
  paragraphs: string[];
}

export const HERO_CAMPUS = {
  kicker: 'Schools Division of Sorsogon | Danlog Elementary School | District of Pillar II',
  headline:
    'Committed to serve with Excellence. Empowering every learner equipped with the 21st century skills.',
  lead: 'Since 1975, Danlog Elementary School has guided Kindergarten through Grade 6 pupils across Pilar II—combining structured foundational literacy, hands-on garden science, dedicated classroom teachers, and transparent grade-level enrollment.',
  image: '/assets/aistudio/image_608d5cb7_43662196.jpg',
  imageAlt: 'Danlog Elementary School classroom building with green doors, landscaped garden, and coconut palms in Pilar II',
  caption: 'Danlog Elementary School Campus & Garden · Pilar II',
};

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface TeacherStudentRecord {
  id: string;
  studentName: string;
  gradeLabel: string;
  advisorGroup: string;
  attendance: AttendanceStatus;
  currentAverage: number;
  missingWork: number;
}

export interface TeacherAssignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  submittedCount: number;
  totalStudents: number;
  reviewed: boolean;
  avgScore: number;
}

export interface TeacherScheduleBlock {
  period: string;
  time: string;
  course: string;
  room: string;
  enrolled: number;
}

export type DocumentReviewStatus = 'Pending Review' | 'Approved' | 'Revision Requested';

export interface TeacherSubmittedDocument {
  id: string;
  title: string;
  studentName: string;
  documentType: 'Lab Report' | 'Essay Draft' | 'Field Consent' | 'Portfolio' | 'Worksheet';
  fileName: string;
  fileSize: string;
  submittedAt: string;
  status: DocumentReviewStatus;
  summaryNote: string;
  teacherComment?: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  assignedGradeId: string;
  assignedGradeLabel: string;
  room: string;
  officeHours: string;
  students: TeacherStudentRecord[];
  assignments: TeacherAssignment[];
  submittedDocuments: TeacherSubmittedDocument[];
  schedule: TeacherScheduleBlock[];
  initialNotes: { id: string; timestamp: string; text: string }[];
}

export const TEACHER_PORTAL_PROFILES: TeacherProfile[] = [
  {
    id: 't-sato',
    name: 'Marisol Mendoza, M.Ed.',
    email: 'm.mendoza@danloges.edu.ph',
    title: 'Kindergarten Master Teacher I',
    department: 'Primary Literacy & Early Numeracy',
    assignedGradeId: 'k',
    assignedGradeLabel: 'Kindergarten · Section Sampaguita',
    room: 'Building 1 · Room 102',
    officeHours: 'Mon & Wed · 3:15 p.m. – 4:15 p.m.',
    students: [
      { id: 's-1', studentName: 'Maya Alvarez', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Present', currentAverage: 96, missingWork: 0 },
      { id: 's-2', studentName: 'Liam Bautista', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Present', currentAverage: 94, missingWork: 0 },
      { id: 's-3', studentName: 'Nora Villanueva', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Late', currentAverage: 92, missingWork: 1 },
      { id: 's-4', studentName: 'Owen Navarro', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Present', currentAverage: 95, missingWork: 0 },
      { id: 's-5', studentName: 'Zara Ocampo', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Present', currentAverage: 98, missingWork: 0 },
      { id: 's-6', studentName: 'Theo Reyes', gradeLabel: 'Kindergarten', advisorGroup: 'Sampaguita', attendance: 'Absent', currentAverage: 91, missingWork: 1 },
    ],
    assignments: [
      { id: 'a-1', title: 'School Eco-Garden Leaf Sketchbook', course: 'Science & Nature K', dueDate: 'Nov 14', submittedCount: 28, totalStudents: 30, reviewed: false, avgScore: 94 },
      { id: 'a-2', title: 'Number Bonds to 10 Counting Check', course: 'Mathematics K', dueDate: 'Nov 12', submittedCount: 30, totalStudents: 30, reviewed: true, avgScore: 95 },
      { id: 'a-3', title: 'Phonics & Early Reading Journal', course: 'Mother Tongue & Reading', dueDate: 'Nov 18', submittedCount: 26, totalStudents: 30, reviewed: false, avgScore: 92 },
    ],
    submittedDocuments: [
      {
        id: 'doc-1',
        title: 'Eco-Garden Walk Parental Consent & Health Form',
        studentName: 'Liam Bautista',
        documentType: 'Field Consent',
        fileName: 'bautista_garden_consent_2026.pdf',
        fileSize: '420 KB',
        submittedAt: 'Today · 8:14 a.m.',
        status: 'Pending Review',
        summaryNote: 'Signed parent authorization for the Nov 21 Pilar II Nature Trail morning walk.',
      },
      {
        id: 'doc-2',
        title: 'Leaf & Flower Observation Portfolio',
        studentName: 'Maya Alvarez',
        documentType: 'Portfolio',
        fileName: 'alvarez_leaf_sketchbook.pdf',
        fileSize: '3.1 MB',
        submittedAt: 'Yesterday · 4:05 p.m.',
        status: 'Approved',
        summaryNote: '6-page crayon and pencil leaf rubbing folio with labeled parts of a plant.',
        teacherComment: 'Clear leaf tracings and accurate spelling.',
      },
      {
        id: 'doc-3',
        title: 'Number Bonds Practice Sheet — Week 9',
        studentName: 'Nora Villanueva',
        documentType: 'Worksheet',
        fileName: 'villanueva_math_bonds_w9.pdf',
        fileSize: '890 KB',
        submittedAt: 'Nov 13 · 5:22 p.m.',
        status: 'Revision Requested',
        summaryNote: 'Completed pages 1–2; page 3 missing counter drawings for pairs summing to 9.',
        teacherComment: 'Please finish items 7–9 on page 3 before Friday.',
      },
    ],
    schedule: [
      { period: 'Morning Circle', time: '07:45 – 08:15', course: 'Flag Ceremony & Morning Reading', room: 'Room 102', enrolled: 30 },
      { period: 'Block I', time: '08:15 – 09:15', course: 'Early Numeracy & Number Bonds', room: 'Room 102', enrolled: 30 },
      { period: 'Garden Lab', time: '09:30 – 10:20', course: 'Botanical Discovery Courtyard', room: 'Eco-Garden', enrolled: 30 },
      { period: 'Afternoon Block', time: '13:00 – 14:00', course: 'Guided Reading & Storytelling', room: 'Room 102', enrolled: 30 },
    ],
    initialNotes: [
      { id: 'n-1', timestamp: 'Today · 7:35 a.m.', text: 'Remind parents to pack water bottles for tomorrow’s garden planting session.' },
      { id: 'n-2', timestamp: 'Nov 13 · 3:40 p.m.', text: 'PTA card-giving conference scheduled next Friday afternoon.' },
    ],
  },
  {
    id: 't-chen',
    name: 'Roberto Santos, M.A.Ed.',
    email: 'r.santos@danloges.edu.ph',
    title: 'Grade 4–6 Science Coordinator',
    department: 'Intermediate Science & Mathematics',
    assignedGradeId: 'g5',
    assignedGradeLabel: 'Grade 5 · Section Narra',
    room: 'Science Room 204',
    officeHours: 'Tue & Thu · 3:30 p.m. – 4:30 p.m.',
    students: [
      { id: 's-11', studentName: 'Elena Ramos', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Present', currentAverage: 97, missingWork: 0 },
      { id: 's-12', studentName: 'Caleb Mendoza', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Present', currentAverage: 89, missingWork: 1 },
      { id: 's-13', studentName: 'Aanya Cruz', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Present', currentAverage: 95, missingWork: 0 },
      { id: 's-14', studentName: 'Julian Mercado', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Absent', currentAverage: 86, missingWork: 2 },
      { id: 's-15', studentName: 'Mei-Hua Lim', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Present', currentAverage: 94, missingWork: 0 },
      { id: 's-16', studentName: 'Lucas Castillo', gradeLabel: 'Grade 5', advisorGroup: 'Narra', attendance: 'Late', currentAverage: 90, missingWork: 0 },
    ],
    assignments: [
      { id: 'a-11', title: 'Watershed Filtration Model Report', course: 'Grade 5 Science', dueDate: 'Nov 15', submittedCount: 34, totalStudents: 36, reviewed: false, avgScore: 91 },
      { id: 'a-12', title: 'Solar Energy Experiment Logbook', course: 'Grade 6 Science', dueDate: 'Nov 11', submittedCount: 35, totalStudents: 35, reviewed: true, avgScore: 93 },
    ],
    submittedDocuments: [
      {
        id: 'doc-11',
        title: 'Watershed Filtration & Clean Water Lab Report',
        studentName: 'Elena Ramos',
        documentType: 'Lab Report',
        fileName: 'ramos_watershed_lab4.pdf',
        fileSize: '2.4 MB',
        submittedAt: 'Today · 8:42 a.m.',
        status: 'Pending Review',
        summaryNote: 'Gravel-sand-charcoal filter flow rate log and clarity comparison photos.',
      },
      {
        id: 'doc-12',
        title: 'Fractions & Decimals Problem Set Dataset',
        studentName: 'Aanya Cruz',
        documentType: 'Worksheet',
        fileName: 'cruz_fractions_unit4.pdf',
        fileSize: '340 KB',
        submittedAt: 'Yesterday · 2:18 p.m.',
        status: 'Approved',
        summaryNote: 'Complete step-by-step solutions for multi-step word problems.',
        teacherComment: 'Clean bar-model diagrams on all ten problems.',
      },
      {
        id: 'doc-13',
        title: 'Simple Machines Poster — Draft Outline',
        studentName: 'Caleb Mendoza',
        documentType: 'Lab Report',
        fileName: 'mendoza_machines_draft.docx',
        fileSize: '640 KB',
        submittedAt: 'Nov 14 · 4:50 p.m.',
        status: 'Revision Requested',
        summaryNote: 'Missing mechanical advantage labels for inclined plane and pulley examples.',
        teacherComment: 'Add force-direction arrows to your pulley diagram before resubmitting.',
      },
    ],
    schedule: [
      { period: 'Homeroom', time: '07:45 – 08:15', course: 'Grade 5 Narra Morning Advisory', room: 'Room 204', enrolled: 36 },
      { period: 'Period 1', time: '08:15 – 09:15', course: 'Grade 5 Science & Discovery', room: 'Room 204', enrolled: 36 },
      { period: 'Period 3', time: '10:30 – 11:30', course: 'Grade 6 Environmental Science', room: 'Science Lab', enrolled: 35 },
      { period: 'Period 5', time: '13:30 – 14:30', course: 'Science Club & Fair Prep', room: 'Science Lab', enrolled: 28 },
    ],
    initialNotes: [
      { id: 'n-11', timestamp: 'Today · 7:30 a.m.', text: 'Set up microscope stations and water sample trays prior to Period 3.' },
    ],
  },
  {
    id: 't-brooks',
    name: 'Lourdes Evangelista, M.A.',
    email: 'l.evangelista@danloges.edu.ph',
    title: 'Grade 6 Master Teacher & English Chair',
    department: 'English, Filipino & Araling Panlipunan',
    assignedGradeId: 'g6',
    assignedGradeLabel: 'Grade 6 · Section Molave',
    room: 'Building 2 · Room 208',
    officeHours: 'Daily · 12:00 p.m. – 1:00 p.m.',
    students: [
      { id: 's-21', studentName: 'Sophia Del Rosario', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Present', currentAverage: 96, missingWork: 0 },
      { id: 's-22', studentName: 'Marcus Aquino', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Present', currentAverage: 91, missingWork: 0 },
      { id: 's-23', studentName: 'Hana Soriano', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Present', currentAverage: 98, missingWork: 0 },
      { id: 's-24', studentName: 'Devon Morales', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Late', currentAverage: 88, missingWork: 1 },
      { id: 's-25', studentName: 'Clara Pangilinan', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Present', currentAverage: 93, missingWork: 0 },
      { id: 's-26', studentName: 'Ethan Tolentino', gradeLabel: 'Grade 6', advisorGroup: 'Molave', attendance: 'Present', currentAverage: 92, missingWork: 0 },
    ],
    assignments: [
      { id: 'a-21', title: 'Pilar II Local Heritage Essay Draft', course: 'English & Writing 6', dueDate: 'Nov 15', submittedCount: 34, totalStudents: 35, reviewed: false, avgScore: 93 },
      { id: 'a-22', title: 'Reading Comprehension Folio', course: 'Filipino 6', dueDate: 'Nov 08', submittedCount: 35, totalStudents: 35, reviewed: true, avgScore: 92 },
    ],
    submittedDocuments: [
      {
        id: 'doc-21',
        title: 'Pilar II Community History Essay (Draft II)',
        studentName: 'Sophia Del Rosario',
        documentType: 'Essay Draft',
        fileName: 'delrosario_pilar_history.pdf',
        fileSize: '1.1 MB',
        submittedAt: 'Today · 9:04 a.m.',
        status: 'Pending Review',
        summaryNote: '650-word narrative based on oral interviews with Danlog barangay elders.',
      },
      {
        id: 'doc-22',
        title: 'Filipino Short Story Analysis',
        studentName: 'Hana Soriano',
        documentType: 'Essay Draft',
        fileName: 'soriano_reading_analysis.pdf',
        fileSize: '780 KB',
        submittedAt: 'Nov 12 · 3:15 p.m.',
        status: 'Approved',
        summaryNote: 'Final copy incorporating reading-corner peer feedback.',
        teacherComment: 'Strong descriptive vocabulary and clear paragraph transitions.',
      },
      {
        id: 'doc-23',
        title: 'Civic Heritage Timeline Notes',
        studentName: 'Devon Morales',
        documentType: 'Worksheet',
        fileName: 'morales_timeline_notes.docx',
        fileSize: '510 KB',
        submittedAt: 'Yesterday · 6:30 p.m.',
        status: 'Revision Requested',
        summaryNote: 'Timeline events complete from 1975–2000; missing 2001–2026 school milestones.',
        teacherComment: 'Add three recent school library and eco-garden milestones to finish.',
      },
    ],
    schedule: [
      { period: 'Homeroom', time: '07:45 – 08:15', course: 'Grade 6 Molave Advisory', room: 'Room 208', enrolled: 35 },
      { period: 'Period 2', time: '09:15 – 10:15', course: 'Grade 6 English Grammar & Composition', room: 'Room 208', enrolled: 35 },
      { period: 'Period 4', time: '11:30 – 12:30', course: 'Araling Panlipunan 6', room: 'Room 208', enrolled: 35 },
      { period: 'Period 6', time: '14:00 – 15:00', course: 'Campus Journalism & Reading Club', room: 'Library', enrolled: 24 },
    ],
    initialNotes: [
      { id: 'n-21', timestamp: 'Today · 8:00 a.m.', text: 'Meet Grade 6 school paper writers in the reading room at 2:00 p.m.' },
    ],
  },
];

export const INITIAL_ENROLLMENT_BY_YEAR: Record<AcademicYear, GradeEnrollmentRow[]> = {
  '2026-2027': [
    {
      id: 'k',
      gradeLabel: 'Kindergarten',
      shortLabel: 'K',
      gradeOrder: 0,
      division: 'Primary (K–3)',
      enrolledStudents: 58,
      capacity: 64,
      teachers: 3,
      sections: 2,
      facultyLead: 'Marisol Mendoza, M.Ed.',
      curriculumFocus: 'Early Literacy, Number Bonds & Eco-Garden Discovery',
    },
    {
      id: 'g1',
      gradeLabel: 'Grade 1',
      shortLabel: 'Gr 1',
      gradeOrder: 1,
      division: 'Primary (K–3)',
      enrolledStudents: 64,
      capacity: 70,
      teachers: 3,
      sections: 2,
      facultyLead: 'Clarissa Dizon, LPT',
      curriculumFocus: 'Structured Phonics, Addition/Subtraction & Mother Tongue',
    },
    {
      id: 'g2',
      gradeLabel: 'Grade 2',
      shortLabel: 'Gr 2',
      gradeOrder: 2,
      division: 'Primary (K–3)',
      enrolledStudents: 68,
      capacity: 72,
      teachers: 3,
      sections: 2,
      facultyLead: 'Rafael Navarro, LPT',
      curriculumFocus: 'Reading Fluency, Multiplication & Community Helpers',
    },
    {
      id: 'g3',
      gradeLabel: 'Grade 3',
      shortLabel: 'Gr 3',
      gradeOrder: 3,
      division: 'Primary (K–3)',
      enrolledStudents: 71,
      capacity: 76,
      teachers: 3,
      sections: 2,
      facultyLead: 'Teresa Villanueva, M.A.',
      curriculumFocus: 'Introductory Science Labs, Fractions & Pilar II History',
    },
    {
      id: 'g4',
      gradeLabel: 'Grade 4',
      shortLabel: 'Gr 4',
      gradeOrder: 4,
      division: 'Intermediate (4–6)',
      enrolledStudents: 74,
      capacity: 80,
      teachers: 4,
      sections: 2,
      facultyLead: 'Arnel Bautista, LPT',
      curriculumFocus: 'Earth Science, EPP Garden Craft & Paragraph Composition',
    },
    {
      id: 'g5',
      gradeLabel: 'Grade 5',
      shortLabel: 'Gr 5',
      gradeOrder: 5,
      division: 'Intermediate (4–6)',
      enrolledStudents: 72,
      capacity: 78,
      teachers: 4,
      sections: 2,
      facultyLead: 'Roberto Santos, M.A.Ed.',
      curriculumFocus: 'Watershed Science Fair, Decimals & Philippine History',
    },
    {
      id: 'g6',
      gradeLabel: 'Grade 6',
      shortLabel: 'Gr 6',
      gradeOrder: 6,
      division: 'Intermediate (4–6)',
      enrolledStudents: 70,
      capacity: 76,
      teachers: 4,
      sections: 2,
      facultyLead: 'Lourdes Evangelista, M.A.',
      curriculumFocus: 'Junior High Readiness, Research Writing & MAPEH Showcase',
    },
  ],
};

export const FACULTY_BY_DEPARTMENT: Record<AcademicYear, DepartmentFacultyCount[]> = {
  '2026-2027': [
    { department: 'Kindergarten & Primary Homeroom', divisionScope: 'Grades K–3', teachers: 9, advancedDegreesPct: '67%' },
    { department: 'English, Filipino & Reading', divisionScope: 'Grades K–6', teachers: 5, advancedDegreesPct: '80%' },
    { department: 'Mathematics & Science', divisionScope: 'Grades 3–6', teachers: 5, advancedDegreesPct: '80%' },
    { department: 'EPP, MAPEH & Values Education', divisionScope: 'Grades 1–6', teachers: 5, advancedDegreesPct: '60%' },
  ],
};

export const ACADEMIC_PROGRAMS: AcademicProgramItem[] = [
  {
    index: '01.',
    title: 'Kindergarten & Early Literacy',
    gradeRange: 'Kindergarten · 58 Enrolled · 3 Teachers',
    lead: 'Joyful phonics ateliers, counting manipulatives, and daily eco-garden discovery walks.',
    description:
      'Small morning sections build confident reading readiness, bilingual vocabulary, and cooperative play from day one.',
    deliverables: 'Phonics Atelier · Number Bonds · Eco-Garden · Story Circle',
    highlightMetric: '19 : 1 Cohort Ratio',
  },
  {
    index: '02.',
    title: 'Primary Grades (Grades 1–3)',
    gradeRange: 'Grades 1–3 · 203 Enrolled · 9 Teachers',
    lead: 'Structured reading fluency, foundational arithmetic, and local Pilar II community studies.',
    description:
      'Primary teachers guide pupils through guided reading circles, mental math strategies, and introductory nature science.',
    deliverables: 'Reading Remediation · Core Math · Mother Tongue · Arts & Music',
    highlightMetric: '98% Reading Fluency Benchmark',
  },
  {
    index: '03.',
    title: 'Intermediate Scholars (Grades 4–6)',
    gradeRange: 'Grades 4–6 · 216 Enrolled · 12 Teachers',
    lead: 'Departmentalized science labs, research essays, EPP gardening, and Grade 6 graduation capstones.',
    description:
      'Intermediate learners conduct wet-lab experiments, compete in district science fairs, and prepare for Junior High Honors.',
    deliverables: 'Wet-Lab Science · Essay Writing · EPP / TLE · Civic Debate',
    highlightMetric: '100% Grade 6 Promotion Rate',
  },
  {
    index: '04.',
    title: 'Co-Curricular Clubs & Sports',
    gradeRange: 'All Grades (K–6) · Afternoon Enrichment',
    lead: 'Choir, school journalism, robotics tinkering, and inter-school track & field.',
    description:
      'Every Friday afternoon highlights student talents across music recitals, campus gardening, and friendly house athletics.',
    deliverables: 'Campus Choir · Science Club · Young Writers · Athletics',
    highlightMetric: '100% Pupil Participation',
  },
];

export const CAMPUS_FACILITIES: CampusFacility[] = [
  {
    id: 'main-quad-commons',
    title: 'Danlog Central Courtyard & Academic Halls',
    category: 'Humanities',
    building: 'Main Heritage Building (Est. 1975)',
    gradesServed: 'Kindergarten – Grade 6',
    capacityLabel: '516 Total Pupil Capacity',
    outcomeMetric: 'Pilar II District Model Eco-Campus · Clean & Green Awardee',
    departmentChair: 'Office of the School Principal',
    summary:
      'Sunlit brick-and-timber classroom wings frame a shaded central quad where morning flag assemblies, reading fairs, and recess games bring all seven grade levels together.',
    architecturalAndAcademicNotes:
      'Recently renovated classrooms pair wide cross-ventilated windows with dedicated reading corners, interactive whiteboards, and sheltered walkways connecting Primary and Intermediate wings.',
    specs: [
      { label: 'Classrooms', value: '14 Homeroom & Lab Rooms' },
      { label: 'Average Section Size', value: '34 Pupils' },
      { label: 'Year Established', value: '1975' },
      { label: 'District', value: 'Pilar II' },
    ],
    image: '/src/assets/images/school_campus_quad_1794812653685.jpg',
    imageAlt: 'Danlog Elementary School central quad with sunlit brick and timber buildings',
    featured: true,
  },
  {
    id: 'hollis-library',
    title: 'Danlog Reading Commons & Heritage Library',
    category: 'Humanities',
    building: 'North Reading Pavilion',
    gradesServed: 'Kindergarten – Grade 6',
    capacityLabel: '8,400 Print & Storybook Volumes',
    outcomeMetric: 'Open 7:30 a.m. – 4:30 p.m. · Daily Guided Reading Hour',
    departmentChair: 'Lourdes Evangelista, M.A.',
    summary:
      'A bright timber-ceiling library stocked with bilingual storybooks, science encyclopedias, and long oak tables for class reading circles and journalism club meetings.',
    architecturalAndAcademicNotes:
      'Every K–6 section visits the library twice weekly for read-aloud workshops, book checkouts, and Grade 5–6 research skills mentoring.',
    specs: [
      { label: 'Book Holdings', value: '8,400 Volumes' },
      { label: 'Reading Tables', value: '64 Seats' },
      { label: 'Reading Programs', value: 'K–6 Drop Everything & Read' },
      { label: 'Librarian Support', value: 'Full-Time Coordinator' },
    ],
    image: '/src/assets/images/school_library_study_1794812654182.jpg',
    imageAlt: 'Sunlit elementary school library with wooden bookshelves and pupils reading at tables',
  },
  {
    id: 'cascade-science-labs',
    title: 'Intermediate Science & Discovery Lab',
    category: 'Sciences',
    building: 'Room 204 Science Wing',
    gradesServed: 'Grades 3 – 6',
    capacityLabel: '36 Lab Stations · Microscopes & Kits',
    outcomeMetric: 'District Science Fair Champions · Hands-On Weekly Labs',
    departmentChair: 'Roberto Santos, M.A.Ed.',
    summary:
      'Dedicated elementary science laboratory equipped with student microscopes, water filtration rigs, solar energy kits, and botanical specimen tables.',
    architecturalAndAcademicNotes:
      'Grades 3 through 6 conduct weekly hands-on experiments covering plant biology, weather instruments, water purification, and simple machines.',
    specs: [
      { label: 'Lab Benches', value: '9 Group Tables' },
      { label: 'Microscopes', value: '18 Optical Units' },
      { label: 'Science Faculty', value: '5 Educators' },
      { label: 'Annual Showcase', value: 'School Science Fair' },
    ],
    image: '/src/assets/images/school_science_lab_1794812654843.jpg',
    imageAlt: 'Students collaborating with microscopes and science glassware alongside their teacher',
  },
  {
    id: 'northfield-maker-studio',
    title: 'Arts, EPP Woodcraft & Robotics Room',
    category: 'Arts & Design',
    building: 'EPP & Arts Annex',
    gradesServed: 'Grades 1 – 6',
    capacityLabel: '40 Workstations · Clay & Woodcraft',
    outcomeMetric: 'Annual MAPEH & EPP Craft Exhibition',
    departmentChair: 'Marisol Mendoza, M.Ed.',
    summary:
      'Bright studio tables for elementary woodworking, clay pottery, poster art, and beginner robotics assembly.',
    architecturalAndAcademicNotes:
      'Pupils build simple wooden birdhouses, painted eco-garden signs, and beginner robotics models during EPP and afternoon clubs.',
    specs: [
      { label: 'Studio Workbenches', value: '10 Maple Tables' },
      { label: 'Programs', value: 'EPP, Visual Arts & Robotics' },
      { label: 'Annual Exhibits', value: '2 School-Wide Shows' },
      { label: 'Safety Supervision', value: '2 Faculty per Session' },
    ],
    image: '/src/assets/images/school_arts_robotics_1794812655420.jpg',
    imageAlt: 'Pupils crafting wood models and robotics kits in a sunlit elementary studio',
  },
];

export const PARENT_TESTIMONIALS: SchoolTestimonial[] = [
  {
    id: 'parent-chen',
    quote:
      'Danlog Elementary School has been a second home for both of our children. The teachers track every pupil’s reading progress closely, and the outdoor eco-garden keeps them excited to arrive early every morning.',
    author: 'Maricris & Joel Bautista',
    role: 'Parents of Liam (Kindergarten) & Sofia (Grade 5)',
    context: 'Pilar II Community Families',
  },
  {
    id: 'alumnus-patel',
    quote:
      'Winning our first district science fair in Grade 6 at Danlog Elementary gave me the confidence to pursue STEM honors in high school. My teachers always made time to review our lab notebooks.',
    author: 'Rohan Dela Cruz',
    role: 'Danlog Class of 2022 Alumnus',
    context: 'Regional Science Scholar',
  },
];

export const SCHOOL_DISPATCHES: SchoolDispatch[] = [
  {
    id: 'fall-open-house',
    date: 'December 5, 2026',
    category: 'School Event',
    readTime: '9:00 a.m. – 11:30 a.m.',
    title: 'Danlog Elementary School Parents’ Day & Science Fair Showcase',
    excerpt:
      'Families across Pilar II are invited to tour Kindergarten–Grade 6 classrooms, visit the Eco-Garden, and view pupil science projects.',
    author: 'Office of the Principal',
    paragraphs: [
      'Program opens at 9:00 a.m. at the Danlog Central Courtyard with a welcome address from the Office of the School Principal and choral performance by Grades 4–6.',
      'Classrooms and the Science Room remain open until 11:30 a.m. for parents to meet homeroom advisers and inspect student portfolios.',
    ],
  },
  {
    id: 'watershed-symposium',
    date: 'November 19, 2026',
    category: 'Academic News',
    readTime: '3 min read',
    title: 'Grade 5 & 6 Pupils Earn Top Distinction in Pilar II Science Quiz & Fair',
    excerpt:
      'Our Intermediate Science team presented clean-water filtration and solar model exhibits praised by district supervisors.',
    author: 'Roberto Santos, Science Coordinator',
    paragraphs: [
      'Guided by Science Room teachers, Grade 5 Narra and Grade 6 Molave teams spent six weeks testing locally sourced gravel-and-charcoal water filters.',
      'Their exhibition notebook and live clarity demonstration won Best Community Application at the Pilar II District Academic Festival.',
    ],
  },
  {
    id: 'tuition-aid-report',
    date: 'October 28, 2026',
    category: 'Enrollment Notice',
    readTime: '2 min read',
    title: 'Early Registration Schedule for SY 2027–2028 Kindergarten & Transferees',
    excerpt:
      'Parents of incoming Kindergarteners and Grades 1–6 transferees may now reserve morning campus visits through the Danlog Admissions form.',
    author: 'AO-II Administrative Office',
    paragraphs: [
      'Early enrollment mapping helps Danlog Elementary School prepare classroom sections, learning kits, and teacher assignments well before June.',
      'Required PSA birth certificates and previous report cards may be brought during scheduled morning office hours.',
    ],
  },
];

export type ActivityCategory = 'All Activities' | 'STEM & Labs' | 'Arts & Music' | 'Athletics & Field';

export interface ActivityPhotoItem {
  id: string;
  title: string;
  category: Exclude<ActivityCategory, 'All Activities'>;
  dateConducted: string;
  participants: string;
  location: string;
  description: string;
  image: string;
  imageAlt: string;
}

export const ACTIVITIES_GALLERY: ActivityPhotoItem[] = [
  {
    id: 'act-science-fair',
    title: 'Danlog Elementary Renewable Energy & Watershed Fair',
    category: 'STEM & Labs',
    dateConducted: 'November 8, 2026',
    participants: 'Grades 4–6 · 142 Pupil Presenters',
    location: 'Main Academic Hall',
    description:
      'Intermediate pupils demonstrated working solar-microgrid and clean-water filtration models to parents, teachers, and Pilar II visitors.',
    image: '/src/assets/images/activity_science_fair_1794813121743.jpg',
    imageAlt: 'Elementary pupils presenting renewable energy and watershed science fair models to teachers and parents',
  },
  {
    id: 'act-chamber-concert',
    title: 'Autumn School Choir & Youth Ensemble Recital',
    category: 'Arts & Music',
    dateConducted: 'October 24, 2026',
    participants: 'Grades 3–6 · 64 Pupil Musicians',
    location: 'Danlog Multi-Purpose Stage',
    description:
      'School choir and young string ensemble performed Filipino folk arrangements and classical pieces during Arts Month.',
    image: '/src/assets/images/activity_arts_music_1794813121589.jpg',
    imageAlt: 'School choir and young musicians performing on stage',
  },
  {
    id: 'act-field-day',
    title: 'All-School Intramurals & Relay Field Day',
    category: 'Athletics & Field',
    dateConducted: 'October 10, 2026',
    participants: 'Grades K–6 · 4 School Houses',
    location: 'Danlog Grounds & Oval',
    description:
      'Kindergarten through Grade 6 teams cheered on classmates in relay sprints, sack races, and team games.',
    image: '/src/assets/images/activity_sports_field_day_1794813122195.jpg',
    imageAlt: 'Students running a relay race on a green field while classmates cheer with colorful flags',
  },
  {
    id: 'act-botanical-garden',
    title: 'Gulayan sa Paaralan & Botanical Discovery Day',
    category: 'Athletics & Field',
    dateConducted: 'September 29, 2026',
    participants: 'Grades K–3 · Primary Homerooms',
    location: 'Danlog Eco-Garden Courtyard',
    description:
      'Primary pupils planted native flowering beds, labeled botanical specimens, and organized the outdoor courtyard bookshelves.',
    image: '/src/assets/images/hero_colorful_education_1794812726997.jpg',
    imageAlt: 'Primary students and teacher planting and examining flowers in the school eco-garden courtyard',
  },
  {
    id: 'act-wet-lab',
    title: 'Grade 5 & 6 Water Quality & Microscopy Lab',
    category: 'STEM & Labs',
    dateConducted: 'November 4, 2026',
    participants: 'Grade 5 Narra & Grade 6 Molave',
    location: 'Science Room 204',
    description:
      'Pupils inspected water samples under optical microscopes and recorded filtration clarity readings with their science teacher.',
    image: '/src/assets/images/school_science_lab_1794812654843.jpg',
    imageAlt: 'Pupils using optical microscopes alongside their science teacher in a bright classroom',
  },
  {
    id: 'act-robotics-timber',
    title: 'EPP Woodcraft & Beginner Robotics Workshop',
    category: 'STEM & Labs',
    dateConducted: 'October 17, 2026',
    participants: 'Grades 4–6 · Afternoon Maker Club',
    location: 'EPP & Arts Annex',
    description:
      'Pupils constructed wooden bridge trusses and assembled wheeled sensor rovers during Friday afternoon enrichment.',
    image: '/src/assets/images/school_arts_robotics_1794812655420.jpg',
    imageAlt: 'Pupils assembling wooden bridge frames and robotics kits at studio workbenches',
  },
];

export type CalendarMonthFilter = 'All Months' | string;

export interface CalendarActivityItem {
  id: string;
  eventDate?: string;
  monthGroup: string;
  monthShort: string;
  dayNumber: string;
  dayOfWeek: string;
  title: string;
  divisionScope: 'All-School (K–6)' | 'Primary (K–3)' | 'Intermediate (4–6)';
  category: 'Academic' | 'Arts & Culture' | 'Athletics' | 'Community & PTA';
  timeRange: string;
  venue: string;
  details: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const SCHOOL_CALENDAR_EVENTS: CalendarActivityItem[] = [
  {
    id: 'cal-1',
    eventDate: '2026-11-19',
    monthGroup: 'November 2026',
    monthShort: 'NOV',
    dayNumber: '19',
    dayOfWeek: 'Thu',
    title: 'Pilar II District Science Quiz & Fair Awards',
    divisionScope: 'Intermediate (4–6)',
    category: 'Academic',
    timeRange: '1:30 p.m. – 4:00 p.m.',
    venue: 'Science Room 204 & Covered Court',
    details: 'Grade 5 and Grade 6 finalists present watershed filtration models to district evaluators.',
  },
  {
    id: 'cal-2',
    eventDate: '2026-11-21',
    monthGroup: 'November 2026',
    monthShort: 'NOV',
    dayNumber: '21',
    dayOfWeek: 'Sat',
    title: 'Kindergarten & Primary Eco-Garden Family Walk',
    divisionScope: 'Primary (K–3)',
    category: 'Community & PTA',
    timeRange: '8:30 a.m. – 11:00 a.m.',
    venue: 'Danlog Eco-Garden Courtyard',
    details: 'Morning botanical walk and outdoor storybook reading with Kindergarten and Grade 1–3 advisers.',
  },
  {
    id: 'cal-3',
    eventDate: '2026-12-05',
    monthGroup: 'December 2026',
    monthShort: 'DEC',
    dayNumber: '05',
    dayOfWeek: 'Sat',
    title: 'Danlog Parents’ Day & Open House Showcase',
    divisionScope: 'All-School (K–6)',
    category: 'Community & PTA',
    timeRange: '9:00 a.m. – 11:30 a.m.',
    venue: 'Danlog Central Courtyard & Library',
    details: 'Campus tour, classroom portfolio viewing, and Principal address.',
  },
  {
    id: 'cal-4',
    eventDate: '2026-12-11',
    monthGroup: 'December 2026',
    monthShort: 'DEC',
    dayNumber: '11',
    dayOfWeek: 'Fri',
    title: 'Christmas Choral Program & Lantern Parade',
    divisionScope: 'All-School (K–6)',
    category: 'Arts & Culture',
    timeRange: '4:30 p.m. – 6:30 p.m.',
    venue: 'Danlog Multi-Purpose Stage',
    details: 'Grades K–6 choir performances and handmade paper-lantern showcase.',
  },
  {
    id: 'cal-5',
    eventDate: '2026-12-17',
    monthGroup: 'December 2026',
    monthShort: 'DEC',
    dayNumber: '17',
    dayOfWeek: 'Thu',
    title: 'Grade 6 Reading & Debate Culminating Day',
    divisionScope: 'Intermediate (4–6)',
    category: 'Academic',
    timeRange: '1:00 p.m. – 3:00 p.m.',
    venue: 'Danlog Reading Commons',
    details: 'Sixth-grade sections present local Pilar II heritage essays and oral recitations.',
  },
  {
    id: 'cal-6',
    eventDate: '2027-01-14',
    monthGroup: 'January 2027',
    monthShort: 'JAN',
    dayNumber: '14',
    dayOfWeek: 'Thu',
    title: 'Third-Quarter Reading & Math Assessment Check-In',
    divisionScope: 'All-School (K–6)',
    category: 'Academic',
    timeRange: '8:00 a.m. – 12:00 p.m.',
    venue: 'Grades K–6 Classrooms',
    details: 'Mid-year reading fluency and numeracy progress benchmarks across all sections.',
  },
  {
    id: 'cal-7',
    eventDate: '2027-01-23',
    monthGroup: 'January 2027',
    monthShort: 'JAN',
    dayNumber: '23',
    dayOfWeek: 'Sat',
    title: 'Pilar II Elementary Track & Volleyball Meet',
    divisionScope: 'Intermediate (4–6)',
    category: 'Athletics',
    timeRange: '8:00 a.m. – 3:30 p.m.',
    venue: 'Danlog Grounds & Oval',
    details: 'Friendly inter-school athletics meet hosted on Danlog Elementary grounds.',
  },
  {
    id: 'cal-8',
    eventDate: '2027-02-06',
    monthGroup: 'February 2027',
    monthShort: 'FEB',
    dayNumber: '06',
    dayOfWeek: 'Sat',
    title: 'Early Registration Day for Incoming Kindergarten (SY 2027–2028)',
    divisionScope: 'Primary (K–3)',
    category: 'Community & PTA',
    timeRange: '8:00 a.m. – 2:00 p.m.',
    venue: 'AO-II & Registrar Desk',
    details: 'Submission of early registration forms for incoming Kindergarten and Grade 1–6 transferees.',
  },
  {
    id: 'cal-9',
    eventDate: '2027-02-18',
    monthGroup: 'February 2027',
    monthShort: 'FEB',
    dayNumber: '18',
    dayOfWeek: 'Thu',
    title: 'EPP Woodcraft, Gardening & Arts Exhibit',
    divisionScope: 'All-School (K–6)',
    category: 'Arts & Culture',
    timeRange: '1:00 p.m. – 4:00 p.m.',
    venue: 'EPP & Arts Annex',
    details: 'Student showcase of woodcraft, pottery, eco-garden harvests, and poster artwork.',
  },
];
