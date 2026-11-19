import { FormEvent, useMemo, useState } from 'react';
import {
  Check,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AcademicYear, AttendanceStatus } from '../data/schoolData';
import {
  StaffEmploymentStatus,
  StaffMemberRecord,
  StaffRole,
  StudentEnrollmentStatus,
  StudentRecord,
} from '../types/schoolConfig';

interface Ao2StaffStudentsManagerProps {
  accentColor: string;
  activeAcademicYear: AcademicYear;
  staffRecords: StaffMemberRecord[];
  studentRecords: StudentRecord[];
  onAddStaff: (
    payload: Omit<StaffMemberRecord, 'id' | 'updatedAt'> & {
      createPortalLogin?: boolean;
      initialPassword?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStaff: (
    id: string,
    patch: Partial<Omit<StaffMemberRecord, 'id' | 'updatedAt'>> & { newPassword?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteStaff: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onAddStudent: (
    payload: Omit<StudentRecord, 'id' | 'updatedAt'>
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStudent: (
    id: string,
    patch: Partial<Omit<StudentRecord, 'id' | 'updatedAt'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteStudent: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onReportFeedback: (kind: 'success' | 'error', message: string) => void;
}

const GRADE_OPTIONS = [
  { id: 'k', label: 'Kindergarten' },
  { id: 'g1', label: 'Grade 1' },
  { id: 'g2', label: 'Grade 2' },
  { id: 'g3', label: 'Grade 3' },
  { id: 'g4', label: 'Grade 4' },
  { id: 'g5', label: 'Grade 5' },
  { id: 'g6', label: 'Grade 6' },
  { id: 'all', label: 'All Grades (K–6)' },
];

export function Ao2StaffStudentsManager({
  accentColor,
  activeAcademicYear,
  staffRecords,
  studentRecords,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onReportFeedback,
}: Ao2StaffStudentsManagerProps) {
  const [subTab, setSubTab] = useState<'staff' | 'students'>('staff');

  // --- STAFF FILTER & FORM STATE ---
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Teacher');
  const [newStaffTitle, setNewStaffTitle] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState('Primary Division');
  const [newStaffGradeId, setNewStaffGradeId] = useState('g1');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRoom, setNewStaffRoom] = useState('');
  const [newStaffOfficeHours, setNewStaffOfficeHours] = useState('Mon–Fri · 3:00 p.m. – 4:00 p.m.');
  const [newStaffStatus, setNewStaffStatus] = useState<StaffEmploymentStatus>('Regular / Permanent');
  const [createPortalLogin, setCreatePortalLogin] = useState(true);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffDraft, setEditStaffDraft] = useState<
    Omit<StaffMemberRecord, 'id' | 'updatedAt'> & { newPassword: string }
  >({
    fullName: '',
    role: 'Teacher',
    title: '',
    department: '',
    assignedGradeId: 'all',
    assignedGradeLabel: 'All Grades',
    email: '',
    phone: '',
    room: '',
    officeHours: '',
    employmentStatus: 'Regular / Permanent',
    portalUsername: '',
    newPassword: '',
  });
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);

  // --- STUDENT FILTER & FORM STATE ---
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | StudentEnrollmentStatus>(
    'ALL'
  );
  const [studentYearFilter, setStudentYearFilter] = useState<'ALL' | AcademicYear>(
    activeAcademicYear
  );
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStuLrn, setNewStuLrn] = useState('');
  const [newStuName, setNewStuName] = useState('');
  const [newStuGradeId, setNewStuGradeId] = useState('g1');
  const [newStuSection, setNewStuSection] = useState('Gumamela');
  const [newStuAdviserId, setNewStuAdviserId] = useState('');
  const [newStuYear, setNewStuYear] = useState<AcademicYear>(activeAcademicYear);
  const [newStuStatus, setNewStuStatus] = useState<StudentEnrollmentStatus>('Enrolled');
  const [newStuAttendance, setNewStuAttendance] = useState<AttendanceStatus>('Present');
  const [newStuAverage, setNewStuAverage] = useState('90');
  const [newStuMissing, setNewStuMissing] = useState('0');
  const [newStuGuardian, setNewStuGuardian] = useState('');
  const [newStuContact, setNewStuContact] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentDraft, setEditStudentDraft] = useState<
    Omit<StudentRecord, 'id' | 'updatedAt'>
  >({
    lrn: '',
    studentName: '',
    gradeId: 'k',
    gradeLabel: 'Kindergarten',
    section: '',
    adviserId: '',
    adviserName: '',
    academicYear: activeAcademicYear,
    enrollmentStatus: 'Enrolled',
    attendance: 'Present',
    currentAverage: 90,
    missingWork: 0,
    guardianName: '',
    guardianContact: '',
  });
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  const teacherOptions = useMemo(
    () => staffRecords.filter((s) => s.role === 'Teacher'),
    [staffRecords]
  );

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staffRecords.filter((s) => {
      const matchesRole = staffRoleFilter === 'ALL' || s.role === staffRoleFilter;
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.assignedGradeLabel.toLowerCase().includes(q) ||
        (s.portalUsername ?? '').toLowerCase().includes(q);
      return matchesRole && matchesQ;
    });
  }, [staffRecords, staffRoleFilter, staffSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return studentRecords.filter((st) => {
      const matchesYear = studentYearFilter === 'ALL' || st.academicYear === studentYearFilter;
      const matchesGrade = studentGradeFilter === 'ALL' || st.gradeId === studentGradeFilter;
      const matchesStatus =
        studentStatusFilter === 'ALL' || st.enrollmentStatus === studentStatusFilter;
      const matchesQ =
        !q ||
        st.studentName.toLowerCase().includes(q) ||
        st.lrn.toLowerCase().includes(q) ||
        st.section.toLowerCase().includes(q) ||
        st.adviserName.toLowerCase().includes(q) ||
        st.guardianName.toLowerCase().includes(q);
      return matchesYear && matchesGrade && matchesStatus && matchesQ;
    });
  }, [studentRecords, studentYearFilter, studentGradeFilter, studentStatusFilter, studentSearch]);

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    const gradeLabel =
      GRADE_OPTIONS.find((g) => g.id === newStaffGradeId)?.label ?? 'General Assignment';
    setIsSavingStaff(true);
    const res = await onAddStaff({
      fullName: newStaffFullName.trim(),
      role: newStaffRole,
      title: newStaffTitle.trim() || `${newStaffRole}`,
      department: newStaffDepartment.trim() || 'General Faculty',
      assignedGradeId: newStaffGradeId,
      assignedGradeLabel: gradeLabel,
      email: newStaffEmail.trim(),
      phone: newStaffPhone.trim(),
      room: newStaffRoom.trim() || 'Main Building',
      officeHours: newStaffOfficeHours.trim(),
      employmentStatus: newStaffStatus,
      portalUsername: newStaffUsername.trim() || undefined,
      createPortalLogin:
        (newStaffRole === 'Teacher' || newStaffRole === 'Administrative Officer') &&
        createPortalLogin &&
        Boolean(newStaffUsername.trim()),
      initialPassword: newStaffPassword.trim() || undefined,
    });
    setIsSavingStaff(false);
    if (!res.ok) {
      onReportFeedback('error', res.error || 'Could not add staff record.');
      return;
    }
    setNewStaffFullName('');
    setNewStaffTitle('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffRoom('');
    setNewStaffUsername('');
    setNewStaffPassword('');
    setShowAddStaff(false);
    onReportFeedback('success', 'Added new staff record to the school database.');
  };

  const handleStartEditStaff = (staff: StaffMemberRecord) => {
    setEditingStaffId(staff.id);
    setConfirmDeleteStaffId(null);
    setEditStaffDraft({
      fullName: staff.fullName,
      role: staff.role,
      title: staff.title,
      department: staff.department,
      assignedGradeId: staff.assignedGradeId,
      assignedGradeLabel: staff.assignedGradeLabel,
      email: staff.email,
      phone: staff.phone,
      room: staff.room,
      officeHours: staff.officeHours,
      employmentStatus: staff.employmentStatus,
      portalUsername: staff.portalUsername ?? '',
      newPassword: '',
    });
  };

  const handleSaveStaffEdit = async (id: string) => {
    setIsSavingStaff(true);
    const res = await onUpdateStaff(id, {
      ...editStaffDraft,
      portalUsername: editStaffDraft.portalUsername?.trim() || undefined,
      newPassword: editStaffDraft.newPassword.trim() || undefined,
    });
    setIsSavingStaff(false);
    if (!res.ok) {
      onReportFeedback('error', res.error || 'Could not update staff record.');
      return;
    }
    setEditingStaffId(null);
    onReportFeedback('success', `Updated staff record for ${editStaffDraft.fullName}.`);
  };

  const handleCreateStudent = async (e: FormEvent) => {
    e.preventDefault();
    const gradeLabel =
      GRADE_OPTIONS.find((g) => g.id === newStuGradeId)?.label ?? 'Kindergarten';
    const adviser = staffRecords.find((s) => s.id === newStuAdviserId);
    setIsSavingStudent(true);
    const res = await onAddStudent({
      lrn: newStuLrn.trim(),
      studentName: newStuName.trim(),
      gradeId: newStuGradeId,
      gradeLabel,
      section: newStuSection.trim() || 'Section A',
      adviserId: adviser?.id ?? newStuAdviserId,
      adviserName: adviser?.fullName ?? 'Assigned Grade Adviser',
      academicYear: newStuYear,
      enrollmentStatus: newStuStatus,
      attendance: newStuAttendance,
      currentAverage: Number(newStuAverage) || 90,
      missingWork: Number(newStuMissing) || 0,
      guardianName: newStuGuardian.trim() || 'Parent / Guardian',
      guardianContact: newStuContact.trim() || '+63 917 555 0100',
    });
    setIsSavingStudent(false);
    if (!res.ok) {
      onReportFeedback('error', res.error || 'Could not add student record.');
      return;
    }
    setNewStuLrn('');
    setNewStuName('');
    setNewStuGuardian('');
    setNewStuContact('');
    setShowAddStudent(false);
    onReportFeedback('success', 'Added new student record to the school database.');
  };

  const handleStartEditStudent = (stu: StudentRecord) => {
    setEditingStudentId(stu.id);
    setConfirmDeleteStudentId(null);
    setEditStudentDraft({
      lrn: stu.lrn,
      studentName: stu.studentName,
      gradeId: stu.gradeId,
      gradeLabel: stu.gradeLabel,
      section: stu.section,
      adviserId: stu.adviserId,
      adviserName: stu.adviserName,
      academicYear: stu.academicYear,
      enrollmentStatus: stu.enrollmentStatus,
      attendance: stu.attendance,
      currentAverage: stu.currentAverage,
      missingWork: stu.missingWork,
      guardianName: stu.guardianName,
      guardianContact: stu.guardianContact,
    });
  };

  const handleSaveStudentEdit = async (id: string) => {
    setIsSavingStudent(true);
    const res = await onUpdateStudent(id, editStudentDraft);
    setIsSavingStudent(false);
    if (!res.ok) {
      onReportFeedback('error', res.error || 'Could not update student record.');
      return;
    }
    setEditingStudentId(null);
    onReportFeedback('success', `Updated student record for ${editStudentDraft.studentName}.`);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation Header */}
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-display text-lg font-semibold text-[#111315]">
            AO-II Staff &amp; Student Records Directory
          </h4>
          <p className="text-xs text-[#525866]">
            Add, edit, update, or remove personnel profiles, portal logins, and learner enrollment
            records.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('staff')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'staff' ? 'bg-[#0B291E] text-white' : 'text-[#525866] hover:text-[#111315]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Records ({staffRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('students')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'students'
                ? 'bg-[#0B291E] text-white'
                : 'text-[#525866] hover:text-[#111315]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Records ({studentRecords.length})</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          SUB-TAB 1: STAFF RECORDS (ADD, EDIT, UPDATE, DELETE)
         ================================================================= */}
      {subTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff name, title, grade, username..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value as 'ALL' | StaffRole)}
                aria-label="Filter staff by role"
                className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                <option value="ALL">All Staff Roles ({staffRecords.length})</option>
                <option value="Teacher">Teacher</option>
                <option value="Principal">Principal</option>
                <option value="Administrative Officer">Administrative Officer</option>
                <option value="Support Staff">Support Staff</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStaff((p) => !p)}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0 self-start lg:self-auto"
            >
              {showAddStaff ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAddStaff ? 'Close Form' : 'Add Staff Member'}</span>
            </button>
          </div>

          {showAddStaff && (
            <form
              onSubmit={handleCreateStaff}
              className="bg-white rounded-xl border border-[#A7F3D0] p-6 space-y-4 shadow-xs"
            >
              <div className="text-sm font-semibold text-[#111315]">Add New Staff Member</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffFullName}
                    onChange={(e) => setNewStaffFullName(e.target.value)}
                    placeholder="e.g., Mr. Ramon Villanueva"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Role *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Principal">Principal</option>
                    <option value="Administrative Officer">Administrative Officer</option>
                    <option value="Support Staff">Support Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={newStaffTitle}
                    onChange={(e) => setNewStaffTitle(e.target.value)}
                    placeholder="e.g., Teacher I · Grade 2 Adviser"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Department / Division
                  </label>
                  <input
                    type="text"
                    value={newStaffDepartment}
                    onChange={(e) => setNewStaffDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Grade Assignment
                  </label>
                  <select
                    value={newStaffGradeId}
                    onChange={(e) => setNewStaffGradeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Employment Status
                  </label>
                  <select
                    value={newStaffStatus}
                    onChange={(e) => setNewStaffStatus(e.target.value as StaffEmploymentStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="Regular / Permanent">Regular / Permanent</option>
                    <option value="Contractual">Contractual</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Room / Station
                  </label>
                  <input
                    type="text"
                    value={newStaffRoom}
                    onChange={(e) => setNewStaffRoom(e.target.value)}
                    placeholder="e.g., Grade 2 Room 104"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="name@danloges.edu.ph"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+63 917 555 0190"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Consultation / Office Hours
                  </label>
                  <input
                    type="text"
                    value={newStaffOfficeHours}
                    onChange={(e) => setNewStaffOfficeHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
              </div>

              {(newStaffRole === 'Teacher' ||
                newStaffRole === 'Administrative Officer' ||
                newStaffRole === 'Principal') && (
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E5E9] space-y-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111315] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createPortalLogin}
                      onChange={(e) => setCreatePortalLogin(e.target.checked)}
                    />
                    <span>
                      {newStaffRole === 'Administrative Officer'
                        ? 'Create AO-II Admin Console login credentials for this administrator'
                        : newStaffRole === 'Principal'
                        ? 'Create Principal Portal login credentials for this principal'
                        : 'Create Teacher Portal login credentials for this staff member'}
                    </span>
                  </label>
                  {createPortalLogin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                          Portal Username
                        </label>
                        <input
                          type="text"
                          value={newStaffUsername}
                          onChange={(e) => setNewStaffUsername(e.target.value)}
                          placeholder="e.g., r.villanueva"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                          Initial Password (min 6 chars)
                        </label>
                        <input
                          type="password"
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder={
                            newStaffRole === 'Administrative Officer'
                              ? 'Default: DanlogAO2#1975'
                              : newStaffRole === 'Principal'
                              ? 'Default: DanlogPrincipal#1975'
                              : 'Default: DanlogFaculty#2026'
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9]">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="px-4 py-2 text-xs font-semibold border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  style={{ backgroundColor: accentColor }}
                  className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {isSavingStaff ? 'Saving...' : 'Save Staff Record'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Staff Member</th>
                    <th className="py-3 px-4 font-semibold">Role &amp; Assignment</th>
                    <th className="py-3 px-4 font-semibold">Room &amp; Contact</th>
                    <th className="py-3 px-4 font-semibold">Status &amp; Portal</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E5E9]">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-4 text-center text-xs text-[#525866]">
                        No staff records match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => {
                      const isEditing = editingStaffId === staff.id;
                      const ao2PortalCount = staffRecords.filter(
                        (x) => x.role === 'Administrative Officer' && Boolean(x.portalUsername)
                      ).length;
                      const isProtected =
                        staff.role === 'Administrative Officer' &&
                        Boolean(staff.portalUsername) &&
                        ao2PortalCount <= 1;
                      const confirmingDel = confirmDeleteStaffId === staff.id;

                      if (isEditing) {
                        return (
                          <tr key={staff.id} className="bg-[#F0FDF4]/60">
                            <td colSpan={5} className="p-4">
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Full Name
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.fullName}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          fullName: e.target.value,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Role
                                    </label>
                                    <select
                                      value={editStaffDraft.role}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          role: e.target.value as StaffRole,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    >
                                      <option value="Teacher">Teacher</option>
                                      <option value="Principal">Principal</option>
                                      <option value="Administrative Officer">
                                        Administrative Officer
                                      </option>
                                      <option value="Support Staff">Support Staff</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Title
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.title}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({ ...p, title: e.target.value }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Department
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.department}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          department: e.target.value,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Grade Assignment
                                    </label>
                                    <select
                                      value={editStaffDraft.assignedGradeId}
                                      onChange={(e) => {
                                        const g = GRADE_OPTIONS.find(
                                          (opt) => opt.id === e.target.value
                                        );
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          assignedGradeId: e.target.value,
                                          assignedGradeLabel: g?.label ?? p.assignedGradeLabel,
                                        }));
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    >
                                      {GRADE_OPTIONS.map((g) => (
                                        <option key={g.id} value={g.id}>
                                          {g.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Employment Status
                                    </label>
                                    <select
                                      value={editStaffDraft.employmentStatus}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          employmentStatus: e.target
                                            .value as StaffEmploymentStatus,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    >
                                      <option value="Regular / Permanent">
                                        Regular / Permanent
                                      </option>
                                      <option value="Contractual">Contractual</option>
                                      <option value="Volunteer">Volunteer</option>
                                      <option value="On Leave">On Leave</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Room / Station
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.room}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({ ...p, room: e.target.value }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Email
                                    </label>
                                    <input
                                      type="email"
                                      value={editStaffDraft.email}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({ ...p, email: e.target.value }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Phone
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.phone}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({ ...p, phone: e.target.value }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Portal Username
                                    </label>
                                    <input
                                      type="text"
                                      value={editStaffDraft.portalUsername ?? ''}
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          portalUsername: e.target.value,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                      Reset Password (optional)
                                    </label>
                                    <input
                                      type="password"
                                      value={editStaffDraft.newPassword}
                                      placeholder="Leave blank to keep"
                                      onChange={(e) =>
                                        setEditStaffDraft((p) => ({
                                          ...p,
                                          newPassword: e.target.value,
                                        }))
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <button
                                      type="button"
                                      disabled={isSavingStaff}
                                      onClick={() => void handleSaveStaffEdit(staff.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#047857] text-white hover:bg-[#065F46] cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingStaffId(null)}
                                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[#DCE0E6] bg-white text-[#525866] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={staff.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#111315]">{staff.fullName}</div>
                            <div className="text-[11px] text-[#525866]">{staff.title}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#111315]">{staff.role}</div>
                            <div className="text-[11px] text-[#525866]">
                              {staff.department} · {staff.assignedGradeLabel}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[#111315]">{staff.room}</div>
                            <div className="text-[11px] text-[#525866] font-mono">
                              {staff.email} · {staff.phone}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#111315]">
                              {staff.employmentStatus}
                            </div>
                            <div className="text-[11px] font-mono text-[#525866]">
                              {staff.portalUsername ? `@${staff.portalUsername}` : 'No portal login'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {confirmingDel ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await onDeleteStaff(staff.id);
                                    setConfirmDeleteStaffId(null);
                                    if (!res.ok) {
                                      onReportFeedback(
                                        'error',
                                        res.error || 'Could not delete staff record.'
                                      );
                                    } else {
                                      onReportFeedback(
                                        'success',
                                        `Deleted staff record ${staff.fullName}.`
                                      );
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStaffId(null)}
                                  className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStaff(staff)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#111315] hover:bg-[#F1F5F9] cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                {!isProtected && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteStaffId(staff.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
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
      )}

      {/* =================================================================
          SUB-TAB 2: STUDENT RECORDS (ADD, EDIT, UPDATE, DELETE)
         ================================================================= */}
      {subTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search learner name, LRN, section, guardian..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>

              <select
                value={studentYearFilter}
                onChange={(e) => setStudentYearFilter(e.target.value as 'ALL' | AcademicYear)}
                aria-label="Filter students by academic year"
                className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                <option value="ALL">All School Years</option>
                <option value="2026-2027">SY 2026–2027</option>
                <option value="2025-2026">SY 2025–2026</option>
              </select>

              <select
                value={studentGradeFilter}
                onChange={(e) => setStudentGradeFilter(e.target.value)}
                aria-label="Filter students by grade level"
                className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                <option value="ALL">All Grades</option>
                {GRADE_OPTIONS.filter((g) => g.id !== 'all').map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>

              <select
                value={studentStatusFilter}
                onChange={(e) =>
                  setStudentStatusFilter(e.target.value as 'ALL' | StudentEnrollmentStatus)
                }
                aria-label="Filter students by enrollment status"
                className="px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Transferred In">Transferred In</option>
                <option value="Transferred Out">Transferred Out</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStudent((p) => !p)}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer hover:opacity-95 whitespace-nowrap shrink-0 self-start xl:self-auto"
            >
              {showAddStudent ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAddStudent ? 'Close Form' : 'Add Student Record'}</span>
            </button>
          </div>

          {showAddStudent && (
            <form
              onSubmit={handleCreateStudent}
              className="bg-white rounded-xl border border-[#A7F3D0] p-6 space-y-4 shadow-xs"
            >
              <div className="text-sm font-semibold text-[#111315]">Enroll / Add Student Record</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStuName}
                    onChange={(e) => setNewStuName(e.target.value)}
                    placeholder="e.g., Mateo B. Navarro"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    LRN (Learner Reference No.)
                  </label>
                  <input
                    type="text"
                    value={newStuLrn}
                    onChange={(e) => setNewStuLrn(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Grade Level *
                  </label>
                  <select
                    value={newStuGradeId}
                    onChange={(e) => setNewStuGradeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    {GRADE_OPTIONS.filter((g) => g.id !== 'all').map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newStuSection}
                    onChange={(e) => setNewStuSection(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Class Adviser
                  </label>
                  <select
                    value={newStuAdviserId}
                    onChange={(e) => setNewStuAdviserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="">Auto-assign by Grade Level</option>
                    {teacherOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.assignedGradeLabel})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Academic Year
                  </label>
                  <select
                    value={newStuYear}
                    onChange={(e) => setNewStuYear(e.target.value as AcademicYear)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="2026-2027">SY 2026–2027</option>
                    <option value="2025-2026">SY 2025–2026</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Enrollment Status
                  </label>
                  <select
                    value={newStuStatus}
                    onChange={(e) => setNewStuStatus(e.target.value as StudentEnrollmentStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="Enrolled">Enrolled</option>
                    <option value="Transferred In">Transferred In</option>
                    <option value="Transferred Out">Transferred Out</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Daily Attendance
                  </label>
                  <select
                    value={newStuAttendance}
                    onChange={(e) => setNewStuAttendance(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Current Average (%)
                  </label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={newStuAverage}
                    onChange={(e) => setNewStuAverage(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Missing Work
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newStuMissing}
                    onChange={(e) => setNewStuMissing(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={newStuGuardian}
                    onChange={(e) => setNewStuGuardian(e.target.value)}
                    placeholder="e.g., Elena Navarro"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                    Guardian Contact
                  </label>
                  <input
                    type="text"
                    value={newStuContact}
                    onChange={(e) => setNewStuContact(e.target.value)}
                    placeholder="+63 917 555 0144"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E5E9]">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 text-xs font-semibold border border-[#DCE0E6] text-[#525866] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  style={{ backgroundColor: accentColor }}
                  className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {isSavingStudent ? 'Saving...' : 'Save Student Record'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E5E9] text-[#525866]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">LRN &amp; Learner Name</th>
                    <th className="py-3 px-4 font-semibold">Grade, Section &amp; Adviser</th>
                    <th className="py-3 px-4 font-semibold">Status &amp; Attendance</th>
                    <th className="py-3 px-4 font-semibold text-right">Term Avg.</th>
                    <th className="py-3 px-4 font-semibold">Guardian</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E5E9]">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-xs text-[#525866]">
                        No student records match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isEditing = editingStudentId === stu.id;
                      const confirmingDel = confirmDeleteStudentId === stu.id;

                      if (isEditing) {
                        return (
                          <tr key={stu.id} className="bg-[#F0FDF4]/60">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Student Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editStudentDraft.studentName}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        studentName: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    LRN
                                  </label>
                                  <input
                                    type="text"
                                    value={editStudentDraft.lrn}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({ ...p, lrn: e.target.value }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Grade Level
                                  </label>
                                  <select
                                    value={editStudentDraft.gradeId}
                                    onChange={(e) => {
                                      const g = GRADE_OPTIONS.find(
                                        (opt) => opt.id === e.target.value
                                      );
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        gradeId: e.target.value,
                                        gradeLabel: g?.label ?? p.gradeLabel,
                                      }));
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  >
                                    {GRADE_OPTIONS.filter((g) => g.id !== 'all').map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Section
                                  </label>
                                  <input
                                    type="text"
                                    value={editStudentDraft.section}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        section: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Adviser
                                  </label>
                                  <select
                                    value={editStudentDraft.adviserId}
                                    onChange={(e) => {
                                      const adv = teacherOptions.find(
                                        (t) => t.id === e.target.value
                                      );
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        adviserId: e.target.value,
                                        adviserName: adv?.fullName ?? p.adviserName,
                                      }));
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  >
                                    <option value={editStudentDraft.adviserId}>
                                      {editStudentDraft.adviserName || 'Select Adviser'}
                                    </option>
                                    {teacherOptions.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.fullName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Enrollment Status
                                  </label>
                                  <select
                                    value={editStudentDraft.enrollmentStatus}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        enrollmentStatus: e.target
                                          .value as StudentEnrollmentStatus,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  >
                                    <option value="Enrolled">Enrolled</option>
                                    <option value="Transferred In">Transferred In</option>
                                    <option value="Transferred Out">Transferred Out</option>
                                    <option value="Graduated">Graduated</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Attendance
                                  </label>
                                  <select
                                    value={editStudentDraft.attendance}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        attendance: e.target.value as AttendanceStatus,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  >
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Term Avg (%)
                                  </label>
                                  <input
                                    type="number"
                                    min={60}
                                    max={100}
                                    value={editStudentDraft.currentAverage}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        currentAverage: Number(e.target.value) || 60,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Guardian Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editStudentDraft.guardianName}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        guardianName: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-[#525866] mb-1">
                                    Guardian Contact
                                  </label>
                                  <input
                                    type="text"
                                    value={editStudentDraft.guardianContact}
                                    onChange={(e) =>
                                      setEditStudentDraft((p) => ({
                                        ...p,
                                        guardianContact: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex items-end justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={isSavingStudent}
                                    onClick={() => void handleSaveStudentEdit(stu.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#047857] text-white hover:bg-[#065F46] cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save Student</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStudentId(null)}
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[#DCE0E6] bg-white text-[#525866] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={stu.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#111315]">{stu.studentName}</div>
                            <div className="font-mono text-[11px] text-[#525866]">
                              LRN: {stu.lrn}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[#111315]">
                              {stu.gradeLabel} · {stu.section} ({stu.academicYear})
                            </div>
                            <div className="text-[11px] text-[#525866]">
                              Adviser: {stu.adviserName}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#111315]">{stu.enrollmentStatus}</div>
                            <div className="text-[11px] text-[#525866]">
                              Attendance: {stu.attendance}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#111315]">
                            {stu.currentAverage}%
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[#111315]">{stu.guardianName}</div>
                            <div className="font-mono text-[11px] text-[#525866]">
                              {stu.guardianContact}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {confirmingDel ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await onDeleteStudent(stu.id);
                                    setConfirmDeleteStudentId(null);
                                    if (!res.ok) {
                                      onReportFeedback(
                                        'error',
                                        res.error || 'Could not delete student record.'
                                      );
                                    } else {
                                      onReportFeedback(
                                        'success',
                                        `Deleted student record ${stu.studentName}.`
                                      );
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B91C1C] text-white cursor-pointer"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStudentId(null)}
                                  className="px-2 py-1 rounded-md text-[11px] border border-[#DCE0E6] text-[#525866] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStudent(stu)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#DCE0E6] text-[#111315] hover:bg-[#F1F5F9] cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStudentId(stu.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
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
      )}
    </div>
  );
}
