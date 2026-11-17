import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, Calendar, Clock, MapPin } from 'lucide-react';
import { ActivitiesGallery } from './components/ActivitiesGallery';
import { AdmissionsForm } from './components/AdmissionsForm';
import { DispatchModal } from './components/DispatchModal';
import { EnrollmentDashboard } from './components/EnrollmentDashboard';
import { FacilityLightbox } from './components/FacilityLightbox';
import { AppPage, Header } from './components/Header';
import {
  PortalWorkspace,
  RoleWorkspace,
  StaffAuthSession,
  TeacherAuthSession,
} from './components/PortalWorkspace';
import { ResilientImage } from './components/ResilientImage';
import { SchoolCalendar } from './components/SchoolCalendar';
import {
  ACADEMIC_PROGRAMS,
  AcademicYear,
  CAMPUS_FACILITIES,
  CampusFacility,
  FacilityCategory,
  HERO_CAMPUS,
  INITIAL_ENROLLMENT_BY_YEAR,
  PARENT_TESTIMONIALS,
  SCHOOL_CALENDAR_EVENTS,
  SCHOOL_DISPATCHES,
  SchoolDispatch,
} from './data/schoolData';
import {
  AdminAuditEntry,
  AdmissionsSubmission,
  DatabaseOverview,
  DatabaseRecordCollection,
  InventoryItem,
  PrincipalDocumentStatus,
  SchoolSystemBootstrap,
  SiteBackendConfig,
  SiteFrontendConfig,
  StaffAccountSummary,
  TeacherAccountSummary,
  UploadedCourseDocument,
} from './types/schoolConfig';

function parseRouteFromWindow(): { page: AppPage; role: RoleWorkspace } {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role');
  const role: RoleWorkspace =
    roleParam === 'principal' || roleParam === 'ao2' ? roleParam : 'teacher';
  const page: AppPage = /^\/portals?\/?$/i.test(path)
    ? 'portal'
    : /^\/academics\/?$/i.test(path)
    ? 'academics'
    : /^\/enrollment\/?$/i.test(path)
    ? 'enrollment'
    : 'home';
  return { page, role };
}

const FACILITY_CATEGORIES: FacilityCategory[] = [
  'All Spaces',
  'Sciences',
  'Humanities',
  'Arts & Design',
];

const DEFAULT_FRONTEND_CONFIG: SiteFrontendConfig = {
  schoolName: 'Danlog Elementary School',
  taglineLocation: HERO_CAMPUS.kicker,
  heroHeadline: HERO_CAMPUS.headline,
  heroLead: HERO_CAMPUS.lead,
  heroImage: HERO_CAMPUS.image,
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

const DEFAULT_BACKEND_CONFIG: SiteBackendConfig = {
  activeAcademicYear: '2026-2027',
  admissionsOpen: true,
  teacherUploadsEnabled: true,
  maxUploadSizeMb: 100,
  allowedExtensions: ['.pdf', '.docx', '.csv', '.xlsx', '.png', '.jpg'],
  maintenanceMode: false,
  maintenanceMessage:
    'Danlog Elementary School public systems are undergoing scheduled registrar updates. Faculty and AO-II portals remain active.',
};

export default function App() {
  const initialRoute = useMemo(() => parseRouteFromWindow(), []);
  const [currentPage, setCurrentPage] = useState<AppPage>(initialRoute.page);
  const [portalInitialRole, setPortalInitialRole] = useState<RoleWorkspace>(initialRoute.role);

  const [frontendConfig, setFrontendConfig] =
    useState<SiteFrontendConfig>(DEFAULT_FRONTEND_CONFIG);
  const [backendConfig, setBackendConfig] =
    useState<SiteBackendConfig>(DEFAULT_BACKEND_CONFIG);
  const [enrollmentByYear, setEnrollmentByYear] = useState(() =>
    structuredClone(INITIAL_ENROLLMENT_BY_YEAR)
  );
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedCourseDocument[]>([]);
  const [admissionsSubmissions, setAdmissionsSubmissions] = useState<AdmissionsSubmission[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>([]);
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccountSummary[]>([]);
  const [principalAccount, setPrincipalAccount] = useState<StaffAccountSummary | null>(null);
  const [ao2Account, setAo2Account] = useState<StaffAccountSummary | null>(null);
  const [teacherSession, setTeacherSession] = useState<TeacherAuthSession | null>(null);
  const [principalSession, setPrincipalSession] = useState<StaffAuthSession | null>(null);
  const [ao2Session, setAo2Session] = useState<StaffAuthSession | null>(null);

  const [facilityFilter, setFacilityFilter] = useState<FacilityCategory>('All Spaces');
  const [selectedFacility, setSelectedFacility] = useState<CampusFacility | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<SchoolDispatch | null>(null);
  const [tourFacilityRef, setTourFacilityRef] = useState('');
  const [focusAdmissions, setFocusAdmissions] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const next = parseRouteFromWindow();
      setCurrentPage(next.page);
      setPortalInitialRole(next.role);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SchoolSystemBootstrap | null) => {
        if (!active || !data) return;
        setFrontendConfig(data.frontendConfig);
        setBackendConfig(data.backendConfig);
        setEnrollmentByYear(data.enrollmentByYear);
        setUploadedDocuments(data.uploadedDocuments);
        setAdmissionsSubmissions(data.admissionsSubmissions);
        setInventoryItems(data.inventoryItems ?? []);
        setAuditLog(data.auditLog);
        setTeacherAccounts(data.teacherAccounts ?? []);
        setPrincipalAccount(data.principalAccount ?? null);
        setAo2Account(data.ao2Account ?? null);
      })
      .catch(() => {
        // Retain clean initial state if API is unreachable
      });

    return () => {
      active = false;
    };
  }, []);

  const navigateToPage = (page: AppPage, hash?: string, role?: RoleWorkspace) => {
    if (page === 'portal') {
      const nextRole = role ?? 'teacher';
      setPortalInitialRole(nextRole);
      setCurrentPage('portal');
      const url = nextRole === 'teacher' ? '/portal' : `/portal?role=${nextRole}`;
      window.history.pushState(null, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'academics') {
      setCurrentPage('academics');
      window.history.pushState(null, '', '/academics');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'enrollment') {
      setCurrentPage('enrollment');
      window.history.pushState(null, '', '/enrollment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentPage('home');
    const cleanHash = hash && hash.startsWith('#') ? hash : '';
    window.history.pushState(null, '', cleanHash ? `/${cleanHash}` : '/');
    if (cleanHash && cleanHash !== '#top') {
      window.setTimeout(() => {
        const el = document.getElementById(cleanHash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredFacilities = useMemo(() => {
    if (facilityFilter === 'All Spaces') return CAMPUS_FACILITIES;
    return CAMPUS_FACILITIES.filter((item) => item.category === facilityFilter);
  }, [facilityFilter]);

  const upcomingCalendarNotices = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const parseEventDate = (dayNumber: string, monthGroup: string) => {
      const parsed = new Date(`${monthGroup.replace(' ', ` ${Number(dayNumber)}, `)}`);
      return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    };
    const upcoming = SCHOOL_CALENDAR_EVENTS.filter(
      (ev) => parseEventDate(ev.dayNumber, ev.monthGroup).getTime() >= todayStart.getTime()
    );
    return (upcoming.length > 0 ? upcoming : SCHOOL_CALENDAR_EVENTS).slice(0, 3);
  }, []);

  const scrollToAdmissions = (facilityTitle?: string) => {
    if (facilityTitle) setTourFacilityRef(facilityTitle);
    setSelectedFacility(null);
    if (currentPage !== 'home') {
      navigateToPage('home', '#admissions');
    } else {
      const target = document.getElementById('admissions');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setFocusAdmissions(true);
  };

  const handleNavigateFacility = (direction: 'prev' | 'next') => {
    if (!selectedFacility) return;
    const pool = filteredFacilities.length > 0 ? filteredFacilities : CAMPUS_FACILITIES;
    const idx = pool.findIndex((f) => f.id === selectedFacility.id);
    const base = idx === -1 ? 0 : idx;
    const nextIdx =
      direction === 'next' ? (base + 1) % pool.length : (base - 1 + pool.length) % pool.length;
    setSelectedFacility(pool[nextIdx]);
  };

  // --- Full-Stack API Handlers ---
  const handleSaveFrontendConfig = async (next: SiteFrontendConfig) => {
    setFrontendConfig(next);
    const res = await fetch('/api/admin/frontend-settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data = await res.json();
      setFrontendConfig(data.frontendConfig);
      setAuditLog(data.auditLog);
    }
  };

  const handleSaveBackendConfig = async (next: SiteBackendConfig) => {
    setBackendConfig(next);
    const res = await fetch('/api/admin/backend-settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data = await res.json();
      setBackendConfig(data.backendConfig);
      setAuditLog(data.auditLog);
    }
  };

  const handleUpdateEnrollment = async (
    year: AcademicYear,
    gradeId: string,
    field: 'enrolledStudents' | 'teachers',
    value: number
  ) => {
    if (!ao2Session) return;
    const previous = enrollmentByYear;
    setEnrollmentByYear((prev) => ({
      ...prev,
      [year]: prev[year].map((row) =>
        row.id === gradeId ? { ...row, [field]: value } : row
      ),
    }));
    const res = await fetch('/api/enrollment', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session.token,
      },
      body: JSON.stringify({ year, gradeId, field, value }),
    });
    if (res.ok) {
      const data = await res.json();
      setEnrollmentByYear(data.enrollmentByYear);
      if (data.auditLog) setAuditLog(data.auditLog);
    } else {
      setEnrollmentByYear(previous);
    }
  };

  const handleUpdateCapacity = async (year: AcademicYear, gradeId: string, nextCap: number) => {
    const clamped = Math.max(10, Math.min(150, Math.round(nextCap) || 10));
    setEnrollmentByYear((prev) => ({
      ...prev,
      [year]: prev[year].map((row) =>
        row.id === gradeId ? { ...row, capacity: clamped } : row
      ),
    }));
    const res = await fetch('/api/enrollment', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify({ year, gradeId, field: 'capacity', value: clamped }),
    });
    if (res.ok) {
      const data = await res.json();
      setEnrollmentByYear(data.enrollmentByYear);
      setAuditLog(data.auditLog);
    }
  };

  const handleTeacherLogin = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Authentication failed.' };
    }
    setTeacherSession({
      teacherId: data.teacherId,
      username: data.username,
      token: data.token,
    });
    return { ok: true };
  };

  const handleTeacherLogout = async () => {
    if (teacherSession?.token) {
      await fetch('/api/teacher/logout', {
        method: 'POST',
        headers: { 'x-teacher-token': teacherSession.token },
      }).catch(() => {});
    }
    setTeacherSession(null);
  };

  const handleTeacherChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/teacher/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-teacher-token': teacherSession?.token ?? '',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Password update failed.' };
    }
    setTeacherAccounts(data.teacherAccounts);
    return { ok: true };
  };

  const handlePrincipalLogin = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/principal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Principal authentication failed.' };
    }
    setPrincipalSession({
      username: data.username,
      token: data.token,
    });
    return { ok: true };
  };

  const handlePrincipalLogout = async () => {
    if (principalSession?.token) {
      await fetch('/api/principal/logout', {
        method: 'POST',
        headers: { 'x-principal-token': principalSession.token },
      }).catch(() => {});
    }
    setPrincipalSession(null);
  };

  const handlePrincipalChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/principal/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-principal-token': principalSession?.token ?? '',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update Principal password.' };
    }
    setPrincipalAccount(data.principalAccount ?? null);
    return { ok: true };
  };

  const handleAo2Login = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/ao2/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'AO-II authentication failed.' };
    }
    setAo2Session({
      username: data.username,
      token: data.token,
    });
    return { ok: true };
  };

  const handleAo2Logout = async () => {
    if (ao2Session?.token) {
      await fetch('/api/ao2/logout', {
        method: 'POST',
        headers: { 'x-ao2-token': ao2Session.token },
      }).catch(() => {});
    }
    setAo2Session(null);
  };

  const handleAo2UpdateTeacherAccount = async (
    teacherId: string,
    username: string,
    newPassword?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/admin/teacher-accounts/${encodeURIComponent(teacherId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify({ username, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update teacher account.' };
    }
    setTeacherAccounts(data.teacherAccounts);
    setAuditLog(data.auditLog);
    if (teacherSession && teacherSession.teacherId === teacherId) {
      setTeacherSession((prev) => (prev ? { ...prev, username } : null));
    }
    return { ok: true };
  };

  const handleAo2UpdatePrincipalAccount = async (
    username: string,
    newPassword?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/admin/principal-account', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify({ username, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update Principal account.' };
    }
    setPrincipalAccount(data.principalAccount ?? null);
    setAuditLog(data.auditLog);
    if (principalSession) {
      setPrincipalSession((prev) =>
        prev ? { ...prev, username: data.principalAccount?.username ?? username } : null
      );
    }
    return { ok: true };
  };

  const handleAo2UpdateOwnAccount = async (
    username: string,
    newPassword?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/admin/ao2-account', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify({ username, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update AO-II administrator account.' };
    }
    setAo2Account(data.ao2Account ?? null);
    setAuditLog(data.auditLog);
    if (ao2Session) {
      setAo2Session((prev) =>
        prev ? { ...prev, username: data.ao2Account?.username ?? username } : null
      );
    }
    return { ok: true };
  };

  const handleUploadTeacherDocument = async (payload: {
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
  }): Promise<{ ok: boolean; error?: string }> => {
    const { file, ...metadata } = payload;
    const res = await fetch('/api/teacher-documents/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-teacher-token': teacherSession?.token ?? '',
      },
      body: JSON.stringify(metadata),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Upload failed.' };
    }
    setUploadedDocuments(data.uploadedDocuments);

    if (file && data.document?.id) {
      const fileRes = await fetch(
        `/api/teacher-documents/${encodeURIComponent(data.document.id)}/file`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'x-teacher-token': teacherSession?.token ?? '',
          },
          body: file,
        }
      );
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        setUploadedDocuments(fileData.uploadedDocuments);
      }
    }

    return { ok: true };
  };

  const handleDeleteUploadedDocument = async (docId: string) => {
    const res = await fetch(`/api/teacher-documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: { 'x-teacher-token': teacherSession?.token ?? '' },
    });
    if (res.ok) {
      const data = await res.json();
      setUploadedDocuments(data.uploadedDocuments);
    }
  };

  const handlePrincipalReviewDocument = async (
    docId: string,
    status: PrincipalDocumentStatus,
    note?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/principal/documents/${encodeURIComponent(docId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-principal-role': 'PRINCIPAL',
        'x-principal-token': principalSession?.token ?? '',
      },
      body: JSON.stringify({ principalReviewStatus: status, principalNote: note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not save Principal review decision.' };
    }
    setUploadedDocuments(data.uploadedDocuments);
    setAuditLog(data.auditLog);
    return { ok: true };
  };

  const handleUpdateAdmissionStatus = async (
    id: string,
    status: AdmissionsSubmission['status']
  ) => {
    const res = await fetch(`/api/admin/admissions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setAdmissionsSubmissions(data.admissionsSubmissions);
      setAuditLog(data.auditLog);
    }
  };

  const handleAo2AddInventoryItem = async (
    payload: Omit<InventoryItem, 'id'>
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/admin/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not add inventory item.' };
    }
    setInventoryItems(data.inventoryItems ?? []);
    setAuditLog(data.auditLog ?? []);
    return { ok: true };
  };

  const handleAo2UpdateInventoryItem = async (
    id: string,
    patch: Partial<Omit<InventoryItem, 'id'>>
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/admin/inventory/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update inventory item.' };
    }
    setInventoryItems(data.inventoryItems ?? []);
    setAuditLog(data.auditLog ?? []);
    return { ok: true };
  };

  const handleAo2DeleteInventoryItem = async (
    id: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/admin/inventory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not remove inventory item.' };
    }
    setInventoryItems(data.inventoryItems ?? []);
    setAuditLog(data.auditLog ?? []);
    return { ok: true };
  };

  const applyDatabaseBootstrap = (data: SchoolSystemBootstrap) => {
    setFrontendConfig(data.frontendConfig);
    setBackendConfig(data.backendConfig);
    setEnrollmentByYear(data.enrollmentByYear);
    setUploadedDocuments(data.uploadedDocuments);
    setAdmissionsSubmissions(data.admissionsSubmissions);
    setInventoryItems(data.inventoryItems ?? []);
    setAuditLog(data.auditLog);
    setTeacherAccounts(data.teacherAccounts ?? []);
    setPrincipalAccount(data.principalAccount ?? null);
    setAo2Account(data.ao2Account ?? null);
  };

  const handleAo2FetchDatabase = async (): Promise<{
    ok: boolean;
    overview?: DatabaseOverview;
    error?: string;
  }> => {
    const res = await fetch('/api/admin/database', {
      headers: {
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: payload.error || 'Could not load database overview.' };
    }
    const overview = payload as DatabaseOverview;
    applyDatabaseBootstrap(overview.data);
    return { ok: true, overview };
  };

  const handleAo2UpdateDbEnrollmentRow = async (payload: {
    year: AcademicYear;
    gradeId: string;
    enrolledStudents: number;
    capacity: number;
    teachers: number;
    sections: number;
    facultyLead: string;
  }): Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }> => {
    const res = await fetch('/api/admin/database/enrollment-row', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not update enrollment record.' };
    }
    const overview = data as DatabaseOverview;
    applyDatabaseBootstrap(overview.data);
    return { ok: true, overview };
  };

  const handleAo2DeleteDbRecord = async (
    collection: DatabaseRecordCollection,
    id: string
  ): Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }> => {
    const res = await fetch(
      `/api/admin/database/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'x-admin-role': 'AO-II',
          'x-ao2-token': ao2Session?.token ?? '',
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not delete database record.' };
    }
    const overview = data as DatabaseOverview;
    applyDatabaseBootstrap(overview.data);
    return { ok: true, overview };
  };

  const handleAo2RestoreDatabase = async (
    payload: Partial<SchoolSystemBootstrap>
  ): Promise<{ ok: boolean; overview?: DatabaseOverview; error?: string }> => {
    const res = await fetch('/api/admin/database/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not restore database JSON.' };
    }
    const overview = data as DatabaseOverview;
    applyDatabaseBootstrap(overview.data);
    return { ok: true, overview };
  };

  const handleResetSystemDefaults = async () => {
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: {
        'x-admin-role': 'AO-II',
        'x-ao2-token': ao2Session?.token ?? '',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as SchoolSystemBootstrap;
      applyDatabaseBootstrap(data);
      setTeacherSession(null);
      setPrincipalSession(null);
      setAo2Session(null);
    }
  };

  return (
    <div id="top" className="relative min-h-screen flex flex-col bg-[#ECF3EE] text-[#111315]">
      {/* Global Portal Atmospheric Botanical & Sage Backdrop */}
      <div className="fixed inset-0 pointer-events-none select-none z-0" aria-hidden="true">
        <img
          src="/src/assets/images/dashboard_botanical_texture_1794821643689.jpg"
          alt=""
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#EAF2EC]/82 via-[#F2F7F4]/90 to-[#E8EFF5]/94" />
      </div>

      <Header
        frontendConfig={frontendConfig}
        currentPage={currentPage}
        onNavigate={(page, hash) => navigateToPage(page, hash)}
        onScheduleClick={() => scrollToAdmissions()}
      />

      {currentPage === 'portal' ? (
        <main className="relative z-10 flex-1 bg-transparent">
          <div className="bg-[#E5EFE8]/90 backdrop-blur-xs border-b border-[#CBDAD0]">
            <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigateToPage('home', '#top')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B291E] hover:underline underline-offset-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {frontendConfig.schoolName} Home Page</span>
              </button>
              <span className="text-xs font-medium text-[#3F5348]">
                Dedicated Staff &amp; Administrative Portal (`/portal`)
              </span>
            </div>
          </div>

          <PortalWorkspace
            initialRole={portalInitialRole}
            frontendConfig={frontendConfig}
            backendConfig={backendConfig}
            enrollmentByYear={enrollmentByYear}
            uploadedDocuments={uploadedDocuments}
            admissionsSubmissions={admissionsSubmissions}
            inventoryItems={inventoryItems}
            auditLog={auditLog}
            teacherAccounts={teacherAccounts}
            principalAccount={principalAccount}
            ao2Account={ao2Account}
            teacherSession={teacherSession}
            principalSession={principalSession}
            ao2Session={ao2Session}
            onTeacherLogin={handleTeacherLogin}
            onTeacherLogout={handleTeacherLogout}
            onTeacherChangePassword={handleTeacherChangePassword}
            onPrincipalLogin={handlePrincipalLogin}
            onPrincipalLogout={handlePrincipalLogout}
            onPrincipalChangePassword={handlePrincipalChangePassword}
            onAo2Login={handleAo2Login}
            onAo2Logout={handleAo2Logout}
            onAo2UpdateTeacherAccount={handleAo2UpdateTeacherAccount}
            onAo2UpdatePrincipalAccount={handleAo2UpdatePrincipalAccount}
            onAo2UpdateOwnAccount={handleAo2UpdateOwnAccount}
            onSaveFrontendConfig={handleSaveFrontendConfig}
            onSaveBackendConfig={handleSaveBackendConfig}
            onUpdateCapacity={handleUpdateCapacity}
            onUploadTeacherDocument={handleUploadTeacherDocument}
            onDeleteUploadedDocument={handleDeleteUploadedDocument}
            onPrincipalReviewDocument={handlePrincipalReviewDocument}
            onUpdateAdmissionStatus={handleUpdateAdmissionStatus}
            onAo2AddInventoryItem={handleAo2AddInventoryItem}
            onAo2UpdateInventoryItem={handleAo2UpdateInventoryItem}
            onAo2DeleteInventoryItem={handleAo2DeleteInventoryItem}
            onAo2FetchDatabase={handleAo2FetchDatabase}
            onAo2UpdateDbEnrollmentRow={handleAo2UpdateDbEnrollmentRow}
            onAo2DeleteDbRecord={handleAo2DeleteDbRecord}
            onAo2RestoreDatabase={handleAo2RestoreDatabase}
            onResetSystemDefaults={handleResetSystemDefaults}
          />
        </main>
      ) : currentPage === 'academics' ? (
        <main className="relative z-10 flex-1 bg-transparent">
          <div className="bg-[#E5EFE8]/90 backdrop-blur-xs border-b border-[#CBDAD0]">
            <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigateToPage('home', '#top')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B291E] hover:underline underline-offset-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {frontendConfig.schoolName} Home Page</span>
              </button>
              <span className="text-xs font-medium text-[#3F5348]">
                Academics &amp; Curriculum Divisions (`/academics`)
              </span>
            </div>
          </div>

          {frontendConfig.visibleSections.academics ? (
            <>
              <section
                id="academics"
                className="py-12 lg:py-16 bg-transparent border-b border-[#D2DFD7]"
              >
                <div className="max-w-[1200px] mx-auto px-6 space-y-10">
                  <div className="relative rounded-2xl overflow-hidden border border-[#1E4D3B]/40 shadow-sm">
                    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
                      <img
                        src="/src/assets/images/dashboard_campus_backdrop_1794821642444.jpg"
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#09231A]/94 via-[#0E3326]/88 to-[#123344]/84" />
                    </div>
                    <div className="relative z-10 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                      <div className="lg:col-span-7 space-y-2.5">
                        <p className="text-xs font-semibold tracking-wide text-[#A7F3D0]">
                          Academics &amp; Divisions · {frontendConfig.schoolName}
                        </p>
                        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
                          Foundational literacy and hands-on inquiry from Kindergarten to Grade 6.
                        </h1>
                      </div>
                      <p className="lg:col-span-5 text-sm md:text-base leading-relaxed text-[#D7E9E0]">
                        Serving Barangay Danlog and the District of Pilar II since 1975 with
                        structured primary literacy and intermediate STEM ateliers.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {ACADEMIC_PROGRAMS.map((prog, idx) => {
                      const spanClass = idx === 0 || idx === 3 ? 'lg:col-span-7' : 'lg:col-span-5';
                      return (
                        <div
                          key={prog.index}
                          className={`${spanClass} bg-white/95 backdrop-blur-xs rounded-2xl border border-[#D2DFD7] p-8 flex flex-col justify-between gap-6 shadow-xs`}
                        >
                          <div className="space-y-2.5">
                            <div className="text-xs font-medium text-[#475569]">{prog.gradeRange}</div>
                            <h2 className="font-display text-xl font-semibold text-[#111315]">
                              {prog.index} {prog.title}
                            </h2>
                            <p className="text-sm font-medium text-[#111315]">{prog.lead}</p>
                            <p className="text-sm leading-relaxed text-[#525866]">
                              {prog.description}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-[#E2EAE5] flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="text-[#525866]">{prog.deliverables}</span>
                            <span
                              className="font-mono tabular-nums font-medium"
                              style={{ color: frontendConfig.accentColor }}
                            >
                              {prog.highlightMetric}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="py-14 lg:py-20 bg-transparent">
                <div className="max-w-[1200px] mx-auto px-6 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                      <p
                        className="text-xs font-medium"
                        style={{ color: frontendConfig.accentColor }}
                      >
                        Grade-Level Curriculum Focus · SY {backendConfig.activeAcademicYear}
                      </p>
                      <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-[#111315]">
                        Kindergarten through Grade 6 Learning Progression
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateToPage('enrollment')}
                        className="px-4 py-2 text-xs font-semibold text-[#0B291E] bg-white/95 hover:bg-[#ECFDF5] border border-[#CBDAD0] rounded-lg cursor-pointer"
                      >
                        View Enrollment &amp; Teachers
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToAdmissions()}
                        style={{ backgroundColor: frontendConfig.accentColor }}
                        className="px-4 py-2 text-xs font-semibold text-white hover:opacity-95 rounded-lg cursor-pointer"
                      >
                        Parents/Guardian Inquiry
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-[#D2DFD7] overflow-x-auto shadow-xs">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#0F3828] text-xs font-semibold text-[#E2F3EA]">
                          <th className="py-3.5 px-5">Grade Level</th>
                          <th className="py-3.5 px-4">Division</th>
                          <th className="py-3.5 px-4">Core Curriculum Focus</th>
                          <th className="py-3.5 px-4">Faculty Lead</th>
                          <th className="py-3.5 px-5 text-right">Sections / Teachers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4ECE7]">
                        {(enrollmentByYear[backendConfig.activeAcademicYear] ?? []).map((row) => (
                          <tr key={row.id} className="hover:bg-[#F5F9F7]">
                            <td className="py-3.5 px-5 font-semibold text-[#111315] whitespace-nowrap">
                              {row.gradeLabel}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#525866] whitespace-nowrap">
                              {row.division}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#525866]">
                              {row.curriculumFocus}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-[#111315] whitespace-nowrap">
                              {row.facultyLead}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs text-[#111315] whitespace-nowrap">
                              {row.sections} sec · {row.teachers} teachers
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="py-20">
              <div className="max-w-[700px] mx-auto px-6 text-center space-y-4">
                <h1 className="font-display text-2xl font-semibold text-[#111315]">
                  Academics section is currently hidden by AO-II settings.
                </h1>
                <button
                  type="button"
                  onClick={() => navigateToPage('home', '#top')}
                  style={{ backgroundColor: frontendConfig.accentColor }}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                >
                  Return to Home Page
                </button>
              </div>
            </section>
          )}
        </main>
      ) : currentPage === 'enrollment' ? (
        <main className="relative z-10 flex-1 bg-transparent">
          <div className="bg-[#E5EFE8]/90 backdrop-blur-xs border-b border-[#CBDAD0]">
            <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigateToPage('home', '#top')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B291E] hover:underline underline-offset-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {frontendConfig.schoolName} Home Page</span>
              </button>
              <span className="text-xs font-medium text-[#3F5348]">
                Enrollment &amp; Teachers Directory (`/enrollment`)
              </span>
            </div>
          </div>

          {frontendConfig.visibleSections.dashboard ? (
            <EnrollmentDashboard
              enrollmentByYear={enrollmentByYear}
              defaultYear={backendConfig.activeAcademicYear}
              accentColor={frontendConfig.accentColor}
              canEdit={Boolean(ao2Session)}
              viewerRoleLabel={
                ao2Session
                  ? `AO-II Edit Mode (${ao2Session.username})`
                  : teacherSession
                    ? `Teacher View Only (${teacherSession.username})`
                    : principalSession
                      ? `Principal View Only (${principalSession.username})`
                      : 'View Only (AO-II Sign-In Required)'
              }
              onOpenAo2Portal={() => navigateToPage('portal', undefined, 'ao2')}
              onUpdateEnrollment={handleUpdateEnrollment}
            />
          ) : (
            <section className="py-20">
              <div className="max-w-[700px] mx-auto px-6 text-center space-y-4">
                <h1 className="font-display text-2xl font-semibold text-[#111315]">
                  Enrollment &amp; Teachers section is currently hidden by AO-II settings.
                </h1>
                <button
                  type="button"
                  onClick={() => navigateToPage('home', '#top')}
                  style={{ backgroundColor: frontendConfig.accentColor }}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                >
                  Return to Home Page
                </button>
              </div>
            </section>
          )}
        </main>
      ) : (
      <main className="relative z-10 flex-1 bg-transparent">
        {/* Home Hero Section with School Campus Photo + Contrast Scrim */}
        <section className="relative overflow-hidden border-b border-[#CBDAD0]">
          <div className="absolute inset-0">
            <ResilientImage
              src={frontendConfig.heroImage}
              alt={HERO_CAMPUS.imageAlt}
              title={frontendConfig.schoolName}
              className="w-full h-full object-cover object-center"
              containerClassName="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1426]/90 via-[#0B1426]/72 to-[#0B1426]/28" />
          </div>

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-14 lg:py-20">
            <div className="max-w-2xl md:max-w-none md:pr-[340px] lg:pr-[390px] space-y-6">
              <p className="text-xs font-medium text-white/90 tracking-wide">
                {frontendConfig.taglineLocation}
              </p>
              <h1 className="font-display text-[clamp(2.25rem,4.2vw,3.65rem)] leading-[1.08] font-semibold tracking-tight text-white max-w-2xl">
                {frontendConfig.heroHeadline}
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-white/90 max-w-[54ch]">
                {frontendConfig.heroLead}
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-3">
                <a
                  href="/enrollment"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('enrollment');
                  }}
                  style={{ backgroundColor: frontendConfig.accentColor }}
                  className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white hover:opacity-95 rounded-lg transition-opacity whitespace-nowrap shrink-0 shadow-sm"
                >
                  View Enrollment &amp; Teachers
                </a>
                <a
                  href="/portal"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage('portal', undefined, 'teacher');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>D-ES-SYS/Portal</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Upper-Right Notice Board Anchored Over Background Picture */}
          {upcomingCalendarNotices.length > 0 && (
            <div className="relative z-20 px-6 pb-8 md:p-0 md:absolute md:top-5 md:right-5 lg:top-7 lg:right-8 md:w-[320px] lg:w-[370px]">
              <aside
                aria-label="School Notice from Calendar of Activities"
                className="w-full bg-[#0B1426]/84 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-white shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: frontendConfig.accentColor }}
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    >
                      <Bell className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div>
                      <div className="text-[11px] font-semibold tracking-wide uppercase text-white leading-tight">
                        School Notice
                      </div>
                      <div className="text-[10px] text-white/75 leading-tight">
                        Calendar of Activities
                      </div>
                    </div>
                  </div>
                  <a
                    href="#calendar"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 hover:text-white hover:underline underline-offset-4 shrink-0"
                  >
                    <span>Calendar</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>

                {/* Primary Featured Upcoming Notice */}
                {(() => {
                  const primary = upcomingCalendarNotices[0];
                  return (
                    <div className="bg-white/10 border border-white/15 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-11 h-11 rounded-lg bg-white text-[#111315] flex flex-col items-center justify-center shrink-0">
                          <span
                            style={{ color: frontendConfig.accentColor }}
                            className="text-[9px] font-bold tracking-wider"
                          >
                            {primary.monthShort}
                          </span>
                          <span className="font-display text-base font-bold leading-none tabular-nums">
                            {primary.dayNumber}
                          </span>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-[10px] font-semibold text-white/80">
                            {primary.dayOfWeek} · {primary.divisionScope}
                          </div>
                          <h2 className="font-display text-xs sm:text-sm font-semibold text-white leading-snug">
                            {primary.title}
                          </h2>
                        </div>
                      </div>
                      <p className="text-[11px] leading-snug text-white/80 line-clamp-2">
                        {primary.details}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/75 pt-0.5">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3 h-3" />
                          {primary.timeRange}
                        </span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{primary.venue}</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Next Scheduled Notices */}
                {upcomingCalendarNotices.length > 1 && (
                  <div className="divide-y divide-white/10">
                    {upcomingCalendarNotices.slice(1).map((ev) => (
                      <a
                        key={ev.id}
                        href="#calendar"
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono font-semibold text-white/90 shrink-0">
                            <Calendar className="w-2.5 h-2.5" />
                            {ev.monthShort} {ev.dayNumber}
                          </span>
                          <span className="text-[11px] font-medium text-white/90 group-hover:text-white group-hover:underline truncate">
                            {ev.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/65 shrink-0">
                          {ev.dayOfWeek}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>



        {/* Section 3: Photos of Activities Conducted (Home Page) */}
        <ActivitiesGallery accentColor={frontendConfig.accentColor} />

        {/* Section 4: Separate School Calendar of Activities (Home Page) */}
        <SchoolCalendar accentColor={frontendConfig.accentColor} />



        {/* Section 5: Campus Facilities & Community Voices (toggleable by AO-II) */}
        {frontendConfig.visibleSections.campus && (
          <section id="campus" className="py-16 lg:py-24 bg-transparent border-b border-[#D2DFD7]">
            <div className="max-w-[1200px] mx-auto px-6 space-y-14">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <p className="text-xs font-medium" style={{ color: frontendConfig.accentColor }}>
                    Campus Spaces &amp; Facilities
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#111315]">
                    Purpose-built libraries, wet labs, and studio workshops.
                  </h2>
                </div>

                <div
                  role="group"
                  aria-label="Filter campus spaces"
                  className="inline-flex flex-wrap items-center gap-1 p-1 bg-white/95 rounded-lg border border-[#D2DFD7] self-start md:self-auto shadow-xs"
                >
                  {FACILITY_CATEGORIES.map((category) => {
                    const active = facilityFilter === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setFacilityFilter(category)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#111315] text-white'
                            : 'text-[#525866] hover:text-[#111315]'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredFacilities.map((facility, idx) => {
                  const isWide = facilityFilter === 'All Spaces' && idx === 0;
                  return (
                    <article
                      key={facility.id}
                      className={`group rounded-2xl border border-[#E2E5E9] bg-white overflow-hidden flex flex-col ${
                        isWide ? 'lg:col-span-2 lg:grid lg:grid-cols-12' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFacility(facility)}
                        aria-label={`Inspect ${facility.title}`}
                        className={`relative block overflow-hidden bg-[#EAEDF1] text-left cursor-pointer ${
                          isWide
                            ? 'lg:col-span-7 aspect-[16/10] lg:aspect-auto lg:min-h-[360px]'
                            : 'aspect-[4/3]'
                        }`}
                      >
                        <ResilientImage
                          src={facility.image}
                          alt={facility.imageAlt}
                          title={facility.title}
                          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                          containerClassName="w-full h-full min-h-[240px]"
                        />
                      </button>

                      <div
                        className={`p-7 flex flex-col justify-between gap-6 ${
                          isWide ? 'lg:col-span-5 lg:p-9' : ''
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                            <span>{facility.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{facility.building}</span>
                            <span aria-hidden="true">·</span>
                            <span>{facility.gradesServed}</span>
                          </div>
                          <h3 className="font-display text-2xl font-semibold text-[#111315]">
                            {facility.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-[#525866]">
                            {facility.summary}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-[#E2E5E9] flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-[#111315]">
                            {facility.capacityLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFacility(facility)}
                            style={{ color: frontendConfig.accentColor }}
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>Inspect Space</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Parent & Alumni Outcomes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {PARENT_TESTIMONIALS.map((item) => (
                  <figure
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#E2E5E9] p-8 flex flex-col justify-between gap-6"
                  >
                    <blockquote className="text-base leading-relaxed text-[#111315]">
                      “{item.quote}”
                    </blockquote>
                    <figcaption className="pt-4 border-t border-[#E2E5E9] flex flex-wrap items-baseline justify-between gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-[#111315]">{item.author}</span>
                        <span className="text-[#525866]"> · {item.role}</span>
                      </div>
                      <span className="font-medium" style={{ color: frontendConfig.accentColor }}>
                        {item.context}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>

              {/* Campus Dispatches & Upcoming Dates */}
              <div className="bg-white rounded-2xl border border-[#E2E5E9] p-6 md:p-8 space-y-6">
                <div>
                  <p className="text-xs font-medium" style={{ color: frontendConfig.accentColor }}>
                    Campus News &amp; Calendar
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-[#111315] mt-1">
                    Upcoming dates and academic dispatches.
                  </h3>
                </div>
                <div className="divide-y divide-[#E2E5E9]">
                  {SCHOOL_DISPATCHES.map((dispatch) => (
                    <article
                      key={dispatch.id}
                      className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-8 items-baseline"
                    >
                      <div className="lg:col-span-3 text-xs text-[#525866]">
                        {dispatch.date} · {dispatch.category}
                      </div>
                      <div className="lg:col-span-7 space-y-1">
                        <h4 className="font-display text-lg font-semibold text-[#111315]">
                          {dispatch.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-[#525866]">
                          {dispatch.excerpt}
                        </p>
                      </div>
                      <div className="lg:col-span-2 lg:text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDispatch(dispatch)}
                          style={{ color: frontendConfig.accentColor }}
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Read Notice</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 6: Parents/Guardian Inquiry (toggleable by AO-II) */}
        {frontendConfig.visibleSections.admissions && (
          <section id="admissions" className="py-16 lg:py-24 bg-transparent">
            <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium" style={{ color: frontendConfig.accentColor }}>
                    Parents/Guardian Inquiry
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#111315]">
                    Send a question or enrollment inquiry to our school office.
                  </h2>
                  <p className="text-sm md:text-base leading-relaxed text-[#525866]">
                    Reach out to our grade-level advisers and school administration in Barangay
                    Danlog, District of Pilar II regarding enrollment requirements, learner
                    transfers, class schedules, or school records.
                  </p>
                </div>

                <div className="pt-6 border-t border-[#E2E5E9] space-y-2 text-xs text-[#525866]">
                  <p className="font-semibold text-[#111315]">
                    {frontendConfig.schoolName} — Principal &amp; Enrollment Office
                  </p>
                  <p>{frontendConfig.campusAddress}</p>
                  <p className="font-mono tabular-nums text-[#111315]">
                    {frontendConfig.admissionsPhone} · {frontendConfig.admissionsEmail}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7">
                <AdmissionsForm
                  admissionsOpen={backendConfig.admissionsOpen}
                  accentColor={frontendConfig.accentColor}
                  preselectedFacility={tourFacilityRef}
                  shouldFocus={focusAdmissions}
                  onFocusHandled={() => setFocusAdmissions(false)}
                  onSubmissionCreated={(sub) =>
                    setAdmissionsSubmissions((prev) => [sub, ...prev])
                  }
                />
              </div>
            </div>
          </section>
        )}
      </main>
      )}

      {/* Quiet School Footer */}
      <footer className="relative z-10 bg-[#E5EFE8]/90 backdrop-blur-sm border-t border-[#CBDAD0] py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#525866]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/image_935e1122_da3e06c0.jpg"
              alt="Danlog Elementary School Official Seal"
              className="w-11 h-11 rounded-lg object-cover shrink-0"
            />
            <div className="space-y-0.5">
              <span className="font-display text-sm font-semibold text-[#111315] block">
                {frontendConfig.schoolName}
              </span>
              <span>Est. 1975 · {frontendConfig.campusAddress}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a
              href="/academics"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('academics');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Academics
            </a>
            <a
              href="/#activities"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('home', '#activities');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Activities
            </a>
            <a
              href="/#calendar"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('home', '#calendar');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Calendar
            </a>
            <a
              href="/enrollment"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('enrollment');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Enrollment
            </a>
            <a
              href="/portal"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('portal');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Portals
            </a>
            <a
              href="/#campus"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('home', '#campus');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Campus
            </a>
            <a
              href="/#admissions"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('home', '#admissions');
              }}
              className="hover:text-[#111315] transition-colors"
            >
              Parents/Guardian Inquiry
            </a>
          </div>

          <p className="tabular-nums">© 2026 {frontendConfig.schoolName}</p>
        </div>
      </footer>

      <FacilityLightbox
        facility={selectedFacility}
        accentColor={frontendConfig.accentColor}
        onClose={() => setSelectedFacility(null)}
        onNavigate={handleNavigateFacility}
        onBookTourForFacility={(title) => scrollToAdmissions(title)}
      />

      <DispatchModal dispatch={selectedDispatch} onClose={() => setSelectedDispatch(null)} />
    </div>
  );
}
