import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  BookOpen,
  Building2,
  GraduationCap,
  Lock,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  AcademicYear,
  DivisionFilter,
  FACULTY_BY_DEPARTMENT,
  GradeEnrollmentRow,
} from '../data/schoolData';
import type { StaffMemberRecord } from '../types/schoolConfig';

type SortOption = 'grade' | 'enrollment' | 'teachers' | 'capacity' | 'fillRate' | 'ratio' | 'sections';

const DIVISION_TABS: DivisionFilter[] = [
  'All Grades',
  'Primary (K–3)',
  'Intermediate (4–6)',
];

const DEPARTMENT_SWATCHES = [
  'bg-[#ECFDF5] text-[#15803D] border-[#BBF7D0]',
  'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
  'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
];

interface EnrollmentDashboardProps {
  enrollmentByYear: Record<AcademicYear, GradeEnrollmentRow[]>;
  staffRecords?: StaffMemberRecord[];
  defaultYear: AcademicYear;
  accentColor: string;
  canEdit: boolean;
  viewerRoleLabel?: string;
  onOpenAo2Portal?: () => void;
  onUpdateEnrollment: (
    year: AcademicYear,
    gradeId: string,
    field: 'enrolledStudents' | 'teachers',
    nextValue: number
  ) => Promise<void>;
}

export function EnrollmentDashboard({
  enrollmentByYear,
  staffRecords = [],
  defaultYear,
  accentColor,
  canEdit,
  viewerRoleLabel,
  onOpenAo2Portal,
  onUpdateEnrollment,
}: EnrollmentDashboardProps) {
  const [academicYear, setAcademicYear] = useState<AcademicYear>(defaultYear);
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('All Grades');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('grade');
  const [hoveredGradeId, setHoveredGradeId] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    setAcademicYear(defaultYear);
  }, [defaultYear]);

  const currentYearRows = enrollmentByYear[academicYear] ?? [];

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = currentYearRows.filter((row) => {
      const matchesDivision =
        divisionFilter === 'All Grades' || row.division === divisionFilter;
      const matchesSearch =
        query.length === 0 ||
        row.gradeLabel.toLowerCase().includes(query) ||
        row.facultyLead.toLowerCase().includes(query) ||
        row.curriculumFocus.toLowerCase().includes(query);
      return matchesDivision && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'enrollment') return b.enrolledStudents - a.enrolledStudents;
      if (sortBy === 'teachers') return b.teachers - a.teachers;
      if (sortBy === 'capacity') return b.capacity - a.capacity;
      if (sortBy === 'sections') return b.sections - a.sections;
      if (sortBy === 'fillRate') {
        const fillA = a.capacity > 0 ? a.enrolledStudents / a.capacity : 0;
        const fillB = b.capacity > 0 ? b.enrolledStudents / b.capacity : 0;
        return fillB - fillA;
      }
      if (sortBy === 'ratio') {
        const rA = a.teachers > 0 ? a.enrolledStudents / a.teachers : 0;
        const rB = b.teachers > 0 ? b.enrolledStudents / b.teachers : 0;
        return rB - rA;
      }
      return a.gradeOrder - b.gradeOrder;
    });
  }, [currentYearRows, divisionFilter, searchQuery, sortBy]);

  const totals = useMemo(() => {
    const totalStudents = filteredRows.reduce((sum, r) => sum + r.enrolledStudents, 0);
    const totalCapacity = filteredRows.reduce((sum, r) => sum + r.capacity, 0);
    const totalTeachers = filteredRows.reduce((sum, r) => sum + r.teachers, 0);
    const totalSections = filteredRows.reduce((sum, r) => sum + r.sections, 0);
    const ratio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '0.0';
    const fillPct = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

    return {
      totalStudents,
      totalCapacity,
      totalTeachers,
      totalSections,
      ratio,
      fillPct,
    };
  }, [filteredRows]);

  const departmentBreakdown = FACULTY_BY_DEPARTMENT[academicYear];

  const handleDelta = (
    row: GradeEnrollmentRow,
    field: 'enrolledStudents' | 'teachers',
    delta: number
  ) => {
    if (!canEdit) return;
    if (field === 'enrolledStudents') {
      const next = Math.max(0, Math.min(row.capacity + 10, row.enrolledStudents + delta));
      void onUpdateEnrollment(academicYear, row.id, field, next);
    } else {
      const next = Math.max(1, Math.min(25, row.teachers + delta));
      void onUpdateEnrollment(academicYear, row.id, field, next);
    }
  };

  const cycleDivision = () => {
    setSelectedDepartment(null);
    setDivisionFilter((prev) => {
      const idx = DIVISION_TABS.indexOf(prev);
      return DIVISION_TABS[(idx + 1) % DIVISION_TABS.length];
    });
  };

  const handleDepartmentClick = (deptName: string, scope: string) => {
    if (selectedDepartment === deptName) {
      setSelectedDepartment(null);
      setDivisionFilter('All Grades');
      return;
    }
    setSelectedDepartment(deptName);
    const lower = scope.toLowerCase();
    if (lower.includes('primary') || lower.includes('k–3') || lower.includes('k-3')) {
      setDivisionFilter('Primary (K–3)');
    } else if (lower.includes('intermediate') || lower.includes('4–6') || lower.includes('4-6')) {
      setDivisionFilter('Intermediate (4–6)');
    } else {
      setDivisionFilter('All Grades');
    }
  };

  return (
    <section
      id="dashboard"
      className="relative overflow-hidden py-12 lg:py-16 bg-transparent border-b border-[#D2DFD7]"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 space-y-8">
        {/* Campus Backdrop Dashboard Header Card */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1E4D3B]/40 shadow-sm">
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <img
              src="/src/assets/images/dashboard_campus_backdrop_1794821642444.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09231A]/94 via-[#0E3326]/88 to-[#123344]/84" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-[#A7F3D0]">
                Enrollment &amp; Faculty Dashboard · Danlog Elementary School
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
                Students enrolled per grade level and teaching faculty distribution.
              </h2>
              <p className="text-sm md:text-base text-[#D7E9E0]">
                Click any summary card, department, or table row to inspect Kindergarten through
                Grade 6 class sizes and seat capacities.
              </p>
            </div>

            <div
              role="group"
              aria-label="Academic year"
              className="inline-flex items-center p-1 bg-white/12 backdrop-blur-sm rounded-xl border border-white/25 shrink-0 self-start lg:self-auto"
            >
              {(['2026-2027'] as AcademicYear[]).map((year) => {
                const active = academicYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setAcademicYear(year)}
                    aria-pressed={active}
                    className={`px-3.5 py-2 text-xs font-mono tabular-nums font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#0B291E] shadow-xs'
                        : 'text-[#E2F3EA] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 Interactive Color-Coded Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() =>
              setSortBy((prev) => (prev === 'enrollment' ? 'grade' : 'enrollment'))
            }
            aria-pressed={sortBy === 'enrollment'}
            className={`text-left bg-gradient-to-br from-white to-[#ECFDF5] rounded-xl border overflow-hidden shadow-xs transition-all cursor-pointer ${
              sortBy === 'enrollment'
                ? 'border-[#15803D] ring-2 ring-[#15803D]/25'
                : 'border-[#BBF7D0] hover:border-[#15803D]'
            }`}
          >
            <div className="h-1 w-full bg-[#15803D]" />
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#14532D]">Students Enrolled</span>
                <span className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#15803D] inline-flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-semibold text-[#0B291E] tabular-nums">
                  {totals.totalStudents}
                </span>
                <span className="text-xs font-mono tabular-nums font-semibold text-[#15803D]">
                  {totals.fillPct}% of {totals.totalCapacity} seats
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#15803D]">
                {sortBy === 'enrollment' ? 'Sorted by enrollment ↓' : 'Click to sort by enrollment'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSortBy((prev) => (prev === 'teachers' ? 'grade' : 'teachers'))
            }
            aria-pressed={sortBy === 'teachers'}
            className={`text-left bg-gradient-to-br from-white to-[#EFF6FF] rounded-xl border overflow-hidden shadow-xs transition-all cursor-pointer ${
              sortBy === 'teachers'
                ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25'
                : 'border-[#BFDBFE] hover:border-[#1D4ED8]'
            }`}
          >
            <div className="h-1 w-full bg-[#1D4ED8]" />
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1E3A8A]">Instructional Teachers</span>
                <span className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] inline-flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-semibold text-[#172554] tabular-nums">
                  {totals.totalTeachers}
                </span>
                <span className="text-xs font-medium text-[#1D4ED8]">Full-Time Faculty</span>
              </div>
              <div className="text-[11px] font-medium text-[#1D4ED8]">
                {sortBy === 'teachers' ? 'Sorted by teachers ↓' : 'Click to sort by faculty'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === 'ratio' ? 'grade' : 'ratio'))}
            aria-pressed={sortBy === 'ratio'}
            className={`text-left bg-gradient-to-br from-white to-[#FFFBEB] rounded-xl border overflow-hidden shadow-xs transition-all cursor-pointer ${
              sortBy === 'ratio'
                ? 'border-[#D97706] ring-2 ring-[#D97706]/25'
                : 'border-[#FDE68A] hover:border-[#D97706]'
            }`}
          >
            <div className="h-1 w-full bg-[#D97706]" />
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#78350F]">Student-to-Teacher Ratio</span>
                <span className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#B45309] inline-flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-semibold text-[#451A03] tabular-nums">
                  {totals.ratio} : 1
                </span>
                <span className="text-xs font-medium text-[#B45309]">Filtered Cohort</span>
              </div>
              <div className="text-[11px] font-medium text-[#B45309]">
                {sortBy === 'ratio' ? 'Sorted by ratio ↓' : 'Click to rank class ratios'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={cycleDivision}
            className={`text-left bg-gradient-to-br from-white to-[#F0FDFA] rounded-xl border overflow-hidden shadow-xs transition-all cursor-pointer ${
              divisionFilter !== 'All Grades'
                ? 'border-[#0F766E] ring-2 ring-[#0F766E]/25'
                : 'border-[#99F6E4] hover:border-[#0F766E]'
            }`}
          >
            <div className="h-1 w-full bg-[#0F766E]" />
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#134E4A]">Active Grade Sections</span>
                <span className="w-7 h-7 rounded-lg bg-[#CCFBF1] text-[#0F766E] inline-flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-3xl font-semibold text-[#042F2E] tabular-nums">
                  {totals.totalSections}
                </span>
                <span className="text-xs font-mono tabular-nums font-medium text-[#0F766E]">
                  {filteredRows.length} Grade Levels
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#0F766E]">
                Division: {divisionFilter} (click to cycle)
              </div>
            </div>
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-[#D2DFD7] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div
            role="group"
            aria-label="Filter by school division"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EAF2ED] rounded-lg border border-[#D2DFD7]"
          >
            {DIVISION_TABS.map((tab) => {
              const active = divisionFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setDivisionFilter(tab);
                    setSelectedDepartment(null);
                  }}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0F3D2E] text-white shadow-xs'
                      : 'text-[#3F4A44] hover:text-[#111315] hover:bg-white/60'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#4B5B53] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search grade or advisor..."
                aria-label="Search grade level or faculty advisor"
                className="w-full sm:w-56 pl-9 pr-3 py-2 text-xs rounded-lg border border-[#CFDCD4] bg-[#F5F9F6] text-[#111315] placeholder:text-[#73847B] focus:outline-none focus:bg-white focus:border-[#0F3D2E]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort grade levels"
              className="px-3 py-2 text-xs rounded-lg border border-[#CFDCD4] bg-[#F5F9F6] text-[#111315] font-medium focus:outline-none focus:bg-white focus:border-[#0F3D2E]"
            >
              <option value="grade">Sort: Kindergarten → Grade 6</option>
              <option value="enrollment">Sort: Highest Enrollment</option>
              <option value="teachers">Sort: Most Teachers</option>
              <option value="fillRate">Sort: Highest Fill Rate</option>
              <option value="capacity">Sort: Seat Capacity</option>
              <option value="ratio">Sort: Pupil-Teacher Ratio</option>
              <option value="sections">Sort: Most Sections</option>
            </select>
          </div>
        </div>

        {/* Department Faculty Summary */}
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-[#D2DFD7] overflow-hidden flex flex-col justify-between shadow-xs">
          <div className="px-6 py-4 bg-gradient-to-r from-[#EFF6FF]/90 to-[#F0FDFA]/90 border-b border-[#DCE6E0] flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="font-display text-lg font-semibold text-[#111315]">
                Teachers by Department
              </h3>
              <p className="text-xs text-[#525866]">
                Click a department to scope the dashboard to its grade division.
              </p>
            </div>
            {selectedDepartment && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDepartment(null);
                  setDivisionFilter('All Grades');
                }}
                className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
            {departmentBreakdown.map((dept, index) => {
              const badgeClass =
                DEPARTMENT_SWATCHES[index % DEPARTMENT_SWATCHES.length];
              const active = selectedDepartment === dept.department;
              return (
                <button
                  key={dept.department}
                  type="button"
                  onClick={() => handleDepartmentClick(dept.department, dept.divisionScope)}
                  aria-pressed={active}
                  className={`w-full text-left py-3 px-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#ECFDF5] border-[#15803D]/40'
                      : 'bg-[#F9FBFA] border-[#E5ECE8] hover:bg-[#F3F8F5]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-semibold text-[#111315] truncate">
                      {dept.department}
                    </div>
                    <div className="text-[11px] text-[#525866]">
                      {dept.divisionScope} · {dept.advancedDegreesPct} Adv. Degrees
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums shrink-0 px-2.5 py-1 rounded-md border ${badgeClass}`}
                  >
                    {dept.teachers}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-6 py-3.5 bg-[#0F3828] text-white flex items-center justify-between text-xs font-semibold">
            <span>Total Campus Instructional Faculty</span>
            <span className="font-mono tabular-nums text-[#A7F3D0]">
              {departmentBreakdown.reduce((sum, d) => sum + d.teachers, 0)} Teachers
            </span>
          </div>
        </div>

        {/* Grade-by-Grade Interactive Data Table */}
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-[#D2DFD7] overflow-hidden shadow-xs">
          <div className="px-6 py-4 bg-gradient-to-r from-[#F3F8F5] via-white to-[#F0F7FC] border-b border-[#DCE6E0] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-[#111315]">
                Grade-Level Enrollment &amp; Teacher Roster
              </h3>
              <p className="text-xs text-[#525866]">
                {canEdit
                  ? 'AO-II Edit Mode active — click any column header to sort or use +/− controls to update counts.'
                  : 'Click column headers to sort grade-level enrollment and faculty data.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canEdit ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{viewerRoleLabel ?? 'AO-II Edit Access'}</span>
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#D2DFD7] bg-[#F5F9F6] text-[#475569] text-[11px] font-medium">
                    <Lock className="w-3 h-3" />
                    <span>{viewerRoleLabel ?? 'View Only · AO-II Only'}</span>
                  </span>
                  {onOpenAo2Portal && (
                    <button
                      type="button"
                      onClick={onOpenAo2Portal}
                      className="text-[11px] font-semibold underline underline-offset-4 hover:opacity-80 cursor-pointer"
                      style={{ color: accentColor }}
                    >
                      AO-II Sign In
                    </button>
                  )}
                </div>
              )}
              <span className="font-mono text-xs tabular-nums text-[#525866]">
                Showing {filteredRows.length} of {currentYearRows.length} grades
              </span>
            </div>
          </div>

          {filteredRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F3828] text-[11px] font-semibold text-[#E2F3EA]">
                    <th className="py-3 px-6">
                      <button
                        type="button"
                        onClick={() => setSortBy('grade')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Grade Level</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Grade Lead</th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('sections')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Sections</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('enrollment')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Students Enrolled</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('capacity')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Capacity</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('fillRate')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Fill Rate</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('teachers')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Teachers</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                    <th className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSortBy('ratio')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-white"
                      >
                        <span>Ratio</span>
                        <ArrowDownUp className="w-3 h-3 opacity-75" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4ECE7] text-xs">
                  {filteredRows.map((row) => {
                    const fillRate = Math.round((row.enrolledStudents / row.capacity) * 100);
                    const ratio = (row.enrolledStudents / row.teachers).toFixed(1);
                    const isRowHighlighted =
                      hoveredGradeId === row.id || selectedGradeId === row.id;
                    const isPrimary = row.division === 'Primary (K–3)';
                    const isNearFull = fillRate >= 95;

                    return (
                      <tr
                        key={row.id}
                        onClick={() =>
                          setSelectedGradeId((prev) => (prev === row.id ? null : row.id))
                        }
                        onMouseEnter={() => setHoveredGradeId(row.id)}
                        onMouseLeave={() => setHoveredGradeId(null)}
                        className={`transition-colors cursor-pointer ${
                          isRowHighlighted ? 'bg-[#ECFDF5]/85' : 'hover:bg-[#F5F9F7]'
                        }`}
                      >
                        <td className="py-3.5 px-6 font-semibold text-[#111315] whitespace-nowrap">
                          {row.gradeLabel}
                        </td>
                        <td
                          className={`py-3.5 px-4 font-medium whitespace-nowrap ${
                            isPrimary ? 'text-[#15803D]' : 'text-[#0369A1]'
                          }`}
                        >
                          {row.division}
                        </td>
                        <td className="py-3.5 px-4 text-[#475569] whitespace-nowrap">
                          {row.facultyLead}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#475569]">
                          {row.sections}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => {
                            if (canEdit) e.stopPropagation();
                          }}
                        >
                          {canEdit ? (
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDelta(row, 'enrolledStudents', -1)}
                                aria-label={`Decrease enrolled students for ${row.gradeLabel}`}
                                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#CBD8D0] bg-[#F5F9F6] text-[#3F4A44] hover:bg-white hover:text-[#111315] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono tabular-nums font-semibold text-[#111315] w-7 text-center">
                                {row.enrolledStudents}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelta(row, 'enrolledStudents', 1)}
                                aria-label={`Increase enrolled students for ${row.gradeLabel}`}
                                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#CBD8D0] bg-[#F5F9F6] text-[#3F4A44] hover:bg-white hover:text-[#111315] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono tabular-nums font-semibold text-[#111315]">
                              {row.enrolledStudents}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#525866]">
                          {row.capacity}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-[#E4ECE7] overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, fillRate)}%` }}
                                className={`h-full rounded-full ${
                                  isNearFull ? 'bg-[#D97706]' : 'bg-[#15803D]'
                                }`}
                              />
                            </div>
                            <span
                              className={`font-mono tabular-nums font-semibold ${
                                isNearFull ? 'text-[#B45309]' : 'text-[#15803D]'
                              }`}
                            >
                              {fillRate}%
                            </span>
                          </div>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => {
                            if (canEdit) e.stopPropagation();
                          }}
                        >
                          {canEdit ? (
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDelta(row, 'teachers', -1)}
                                aria-label={`Decrease teachers for ${row.gradeLabel}`}
                                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#CBD8D0] bg-[#F5F9F6] text-[#3F4A44] hover:bg-white hover:text-[#111315] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span
                                className={`font-mono tabular-nums font-semibold w-5 text-center ${
                                  isPrimary ? 'text-[#15803D]' : 'text-[#0369A1]'
                                }`}
                              >
                                {row.teachers}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelta(row, 'teachers', 1)}
                                aria-label={`Increase teachers for ${row.gradeLabel}`}
                                className="w-6 h-6 inline-flex items-center justify-center rounded border border-[#CBD8D0] bg-[#F5F9F6] text-[#3F4A44] hover:bg-white hover:text-[#111315] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`font-mono tabular-nums font-semibold ${
                                isPrimary ? 'text-[#15803D]' : 'text-[#0369A1]'
                              }`}
                            >
                              {row.teachers}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono tabular-nums text-[#111315]">
                          {ratio}:1
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Database-Synced School Faculty & Staff Directory */}
        {staffRecords.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-[#D2DFD7] overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-gradient-to-r from-[#ECFDF5]/90 via-white to-[#EFF6FF]/90 border-b border-[#DCE6E0] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#111315]">
                  Active Faculty &amp; Staff Directory
                </h3>
                <p className="text-xs text-[#525866]">
                  Live personnel roster synced directly from the AO-II School Database.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-[#0B291E]">
                {staffRecords.filter((s) => s.role === 'Teacher').length} Teachers ·{' '}
                {staffRecords.length} Total Personnel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {staffRecords.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-xl border border-[#E2EAE5] bg-[#F9FBFA] p-4 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[#15803D]">{staff.role}</span>
                      <span className="text-[#525866]">{staff.employmentStatus}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#111315]">{staff.fullName}</div>
                    <div className="text-xs text-[#525866]">{staff.title}</div>
                  </div>
                  <div className="pt-2 border-t border-[#E2EAE5] text-[11px] text-[#525866] space-y-0.5">
                    <div className="font-medium text-[#111315]">{staff.assignedGradeLabel}</div>
                    <div>
                      {staff.department} · {staff.room}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
