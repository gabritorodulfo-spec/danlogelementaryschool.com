import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AccountNotification,
  PrincipalDocument,
  PrincipalDocumentCategory,
  SiteBackendConfig,
} from '../types/schoolConfig';

export const PRINCIPAL_DOC_CATEGORIES: PrincipalDocumentCategory[] = [
  'School Memorandum',
  'Division Circular',
  'Faculty Directive',
  'Policy & Guidelines',
  'Event Notice',
  'Official Form',
  'General',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${Math.max(1, bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AccountNotificationsBarProps {
  accentColor: string;
  currentAccountId: string;
  notifications: AccountNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onOpenDocument: (documentId: string) => void;
}

export function AccountNotificationsBar({
  accentColor,
  currentAccountId,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onOpenDocument,
}: AccountNotificationsBarProps) {
  const [expanded, setExpanded] = useState(false);

  const myNotifications = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.recipientAccountIds.length === 0 ||
        n.recipientAccountIds.includes(currentAccountId)
    );
  }, [notifications, currentAccountId]);

  const unreadNotifications = useMemo(
    () => myNotifications.filter((n) => !n.readByAccountIds.includes(currentAccountId)),
    [myNotifications, currentAccountId]
  );

  if (myNotifications.length === 0) {
    return null;
  }

  const latestUnread = unreadNotifications[0];

  return (
    <div className="bg-[#F8FAFC] border-b border-[#E2E5E9] px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: unreadNotifications.length > 0 ? '#FEF3C7' : '#FFFFFF',
              borderColor: unreadNotifications.length > 0 ? '#F59E0B' : '#DCE0E6',
            }}
          >
            <Bell
              className={`w-4 h-4 ${
                unreadNotifications.length > 0 ? 'text-[#B45309]' : 'text-[#525866]'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#111315]">
                Account Notifications
              </span>
              {unreadNotifications.length > 0 ? (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[#B45309] text-white tabular-nums">
                  {unreadNotifications.length} Unread
                </span>
              ) : (
                <span className="text-[11px] text-[#047857] font-medium">
                  All caught up ({myNotifications.length})
                </span>
              )}
            </div>
            {latestUnread ? (
              <p className="text-xs text-[#334155] truncate">
                <strong className="text-[#111315]">{latestUnread.title}</strong> —{' '}
                {latestUnread.message}
              </p>
            ) : (
              <p className="text-xs text-[#525866] truncate">
                Latest: {myNotifications[0].title} ({myNotifications[0].createdAt})
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {latestUnread && (
            <button
              type="button"
              onClick={() => {
                void onMarkRead(latestUnread.id);
                onOpenDocument(latestUnread.documentId);
              }}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg cursor-pointer hover:opacity-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Open Latest Document</span>
            </button>
          )}
          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => void onMarkAllRead()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#F1F5F9] border border-[#DCE0E6] rounded-lg cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#047857]" />
              <span>Mark All Read</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#F1F5F9] border border-[#DCE0E6] rounded-lg cursor-pointer"
          >
            {expanded ? 'Hide Notifications' : `View All (${myNotifications.length})`}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#E2E5E9] space-y-2 max-h-64 overflow-y-auto">
          {myNotifications.map((notif) => {
            const isRead = notif.readByAccountIds.includes(currentAccountId);
            return (
              <div
                key={notif.id}
                className={`rounded-lg border px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  isRead
                    ? 'bg-white border-[#E2E5E9]'
                    : 'bg-[#FFFBEB] border-[#FDE68A]'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#B45309] shrink-0"
                        aria-label="Unread"
                      />
                    )}
                    <span className="text-xs font-semibold text-[#111315]">
                      {notif.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#525866]">
                      {notif.documentCategory} · {notif.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569]">{notif.message}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isRead) void onMarkRead(notif.id);
                      onOpenDocument(notif.documentId);
                      setExpanded(false);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#F1F5F9] border border-[#DCE0E6] rounded-md cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Document</span>
                  </button>
                  {!isRead ? (
                    <button
                      type="button"
                      onClick={() => void onMarkRead(notif.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-md cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark Read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-[#525866]">Read</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PrincipalDocumentsManagerProps {
  mode: 'principal' | 'teacher' | 'ao2';
  accentColor: string;
  backendConfig: SiteBackendConfig;
  principalDocuments: PrincipalDocument[];
  accountNotifications: AccountNotification[];
  authQueryParam: string; // e.g. "principalToken=..." or "teacherToken=..." or "ao2Token=..."
  selectedDocId?: string | null;
  onSelectDocId?: (id: string | null) => void;
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
  onDeletePrincipalDocument?: (docId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function PrincipalDocumentsManager({
  mode,
  accentColor,
  backendConfig,
  principalDocuments,
  accountNotifications,
  authQueryParam,
  selectedDocId,
  onSelectDocId,
  onUploadPrincipalDocument,
  onDeletePrincipalDocument,
}: PrincipalDocumentsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PrincipalDocumentCategory>('School Memorandum');
  const [notes, setNotes] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PrincipalDocumentCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<'content' | 'file'>('content');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return principalDocuments.filter((doc) => {
      const catOk = categoryFilter === 'ALL' || doc.category === categoryFilter;
      const queryOk =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.notes.toLowerCase().includes(q) ||
        (doc.documentContent ?? '').toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [principalDocuments, categoryFilter, searchQuery]);

  const activeDocId = selectedDocId ?? internalSelectedId;
  const inspectedDoc =
    filteredDocs.find((d) => d.id === activeDocId) ??
    principalDocuments.find((d) => d.id === activeDocId) ??
    filteredDocs[0] ??
    null;

  const setActiveDoc = (id: string | null) => {
    setInternalSelectedId(id);
    if (onSelectDocId) onSelectDocId(id);
  };

  const handleFileChosen = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess('');
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
    }
    const lower = file.name.toLowerCase();
    if (
      (lower.endsWith('.txt') ||
        lower.endsWith('.csv') ||
        lower.endsWith('.md') ||
        file.type.startsWith('text/')) &&
      file.size <= 512 * 1024
    ) {
      void file.text().then((txt) => {
        if (txt.trim()) {
          setDocumentContent((prev) => prev.trim() || txt.slice(0, 60000));
        }
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChosen(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChosen(e.dataTransfer.files?.[0] ?? null);
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onUploadPrincipalDocument) return;
    setUploadError('');
    setUploadSuccess('');

    if (!selectedFile) {
      setUploadError('Choose or drag-and-drop a document file to upload.');
      return;
    }
    if (title.trim().length < 3) {
      setUploadError('Enter a document title (at least 3 characters).');
      return;
    }

    setIsUploading(true);
    const res = await onUploadPrincipalDocument({
      title: title.trim(),
      category,
      fileName: selectedFile.name,
      fileSizeBytes: selectedFile.size,
      notes: notes.trim(),
      documentContent: documentContent.trim() || undefined,
      mimeType: selectedFile.type || undefined,
      file: selectedFile,
    });
    setIsUploading(false);

    if (!res.ok) {
      setUploadError(res.error || 'Could not upload document.');
      return;
    }

    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTitle('');
    setNotes('');
    setDocumentContent('');
    setUploadSuccess(
      `Document uploaded and automatic notification sent to all ${
        res.notifiedCount ?? 'portal'
      } accounts.`
    );
  };

  const handleConfirmDelete = async (docId: string) => {
    if (!onDeletePrincipalDocument) return;
    setDeleteBusy(true);
    await onDeletePrincipalDocument(docId);
    setDeleteBusy(false);
    setConfirmDeleteId(null);
  };

  const renderInspector = (doc: PrincipalDocument) => {
    const fileExt = doc.fileName.toLowerCase().split('.').pop() ?? '';
    const isImageFile =
      fileExt === 'png' || fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'webp';
    const isInlineFrameFile =
      fileExt === 'pdf' || fileExt === 'txt' || fileExt === 'csv' || fileExt === 'md';
    const fileViewUrl = `/api/principal-documents/${encodeURIComponent(doc.id)}/file?${authQueryParam}`;
    const fileDownloadUrl = `${fileViewUrl}&download=1`;
    const linkedNotif = accountNotifications.find((n) => n.documentId === doc.id);
    const readCount = linkedNotif?.readByAccountIds.length ?? 0;
    const totalNotified = linkedNotif?.recipientCount ?? doc.notifiedAccountCount;

    return (
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
        <div className="border-b border-[#E2E5E9] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs text-[#525866]">
              {doc.category} · {doc.uploadedAt}
            </div>
            <h4 className="font-display text-xl font-semibold text-[#111315]">{doc.title}</h4>
            <p className="text-xs text-[#525866]">
              Issued by{' '}
              <span className="font-semibold text-[#111315]">{doc.uploadedByName}</span> (School
              Principal · @{doc.uploadedByUsername})
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
              <Bell className="w-3 h-3" />
              <span>
                Notified {totalNotified} accounts · {readCount} read
              </span>
            </span>

            {mode === 'ao2' && onDeletePrincipalDocument && (
              confirmDeleteId === doc.id ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => void handleConfirmDelete(doc.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-md cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1 text-[11px] font-medium text-[#525866] border border-[#DCE0E6] rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(doc.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEF2F2] rounded-md cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete (AO-II)</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Viewer Switcher */}
        <div className="rounded-xl border border-[#DCE0E6] bg-[#F8F9FA] overflow-hidden">
          <div className="px-4 py-2.5 bg-white border-b border-[#E2E5E9] flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-0.5 bg-[#F2F4F6] rounded-md border border-[#E2E5E9]">
              <button
                type="button"
                onClick={() => setContentMode('content')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                  contentMode === 'content'
                    ? 'bg-white text-[#111315] shadow-xs'
                    : 'text-[#525866]'
                }`}
              >
                Document Details &amp; Content
              </button>
              <button
                type="button"
                onClick={() => setContentMode('file')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                  contentMode === 'file'
                    ? 'bg-white text-[#111315] shadow-xs'
                    : 'text-[#525866]'
                }`}
              >
                File Preview ({fileExt.toUpperCase() || 'FILE'})
              </button>
            </div>

            <a
              href={fileDownloadUrl}
              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-[#111315] bg-white hover:bg-[#EAEDF1] border border-[#DCE0E6] rounded-md"
            >
              <Download className="w-3 h-3" />
              <span>Download File</span>
            </a>
          </div>

          {contentMode === 'content' ? (
            <div className="p-4 space-y-3 text-xs">
              <div className="bg-white rounded-lg border border-[#E2E5E9] p-3">
                <div className="font-semibold text-[#111315] mb-1">Principal Summary Notes</div>
                <p className="text-[#475569] leading-relaxed">{doc.notes}</p>
              </div>
              {doc.documentContent ? (
                <div className="bg-white rounded-lg border border-[#E2E5E9] p-3.5 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-[#111315] leading-relaxed">
                  {doc.documentContent}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-[#E2E5E9] p-4 text-center text-[#525866] space-y-2">
                  <FileText className="w-6 h-6 mx-auto text-[#64748B]" />
                  <p>
                    Attached file: <strong className="text-[#111315]">{doc.fileName}</strong> (
                    {doc.fileSizeLabel})
                  </p>
                  <p className="text-[11px]">
                    Switch to <strong>File Preview</strong> or click <strong>Download File</strong>{' '}
                    above to view the attached document.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-white">
              {isImageFile ? (
                <img
                  src={fileViewUrl}
                  alt={doc.title}
                  className="max-h-96 mx-auto rounded-lg border border-[#E2E5E9]"
                />
              ) : isInlineFrameFile ? (
                <iframe
                  title={doc.title}
                  src={fileViewUrl}
                  className="w-full h-96 rounded-lg border border-[#E2E5E9]"
                />
              ) : (
                <div className="p-6 text-center space-y-2 text-xs text-[#525866]">
                  <FileText className="w-7 h-7 mx-auto text-[#64748B]" />
                  <p className="font-semibold text-[#111315]">{doc.fileName}</p>
                  <p>
                    Inline browser preview is unavailable for .{fileExt || 'bin'} files. Click
                    Download File to open it locally.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {mode === 'principal' && onUploadPrincipalDocument && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleUploadSubmit}
            className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-4"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A]">
                <Send className="w-3.5 h-3.5" />
                <span>Principal Issuance &amp; Auto-Broadcast</span>
              </div>
              <h4 className="font-display text-lg font-semibold text-[#111315]">
                Upload Document &amp; Notify All Accounts
              </h4>
              <p className="text-xs text-[#525866]">
                Every uploaded document is saved in the school database and automatically sends a
                notification to all Teacher, Principal, and AO-II accounts.
              </p>
            </div>

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
                onChange={handleFileChange}
                className="sr-only"
                id="principal-doc-file-upload"
              />
              <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: accentColor }} />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#111315]">{selectedFile.name}</p>
                  <p className="font-mono text-[11px] text-[#525866]">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <label
                    htmlFor="principal-doc-file-upload"
                    className="inline-block text-xs font-semibold underline cursor-pointer"
                    style={{ color: accentColor }}
                  >
                    Choose a different file
                  </label>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#111315]">
                    Drag and drop a file here, or{' '}
                    <label
                      htmlFor="principal-doc-file-upload"
                      className="font-semibold underline cursor-pointer"
                      style={{ color: accentColor }}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="pdoc-title"
                  className="block text-xs font-semibold text-[#111315] mb-1"
                >
                  Document Title
                </label>
                <input
                  id="pdoc-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., School Memorandum No. 18"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label
                  htmlFor="pdoc-cat"
                  className="block text-xs font-semibold text-[#111315] mb-1"
                >
                  Category
                </label>
                <select
                  id="pdoc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PrincipalDocumentCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                >
                  {PRINCIPAL_DOC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="pdoc-notes"
                className="block text-xs font-semibold text-[#111315] mb-1"
              >
                Summary Notes for All Staff
              </label>
              <textarea
                id="pdoc-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key directives or instructions sent with the notification..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div>
              <label
                htmlFor="pdoc-content"
                className="block text-xs font-semibold text-[#111315] mb-1"
              >
                Document Body Text (Optional Preview)
              </label>
              <textarea
                id="pdoc-content"
                rows={3}
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Optional text content (auto-filled for .txt / .csv / .md files)..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              />
            </div>

            <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2 text-[11px] text-[#1E3A8A] flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>
                Automatic notifications are sent immediately to every Teacher, Principal, and AO-II
                account upon upload.
              </span>
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
              disabled={isUploading}
              style={{ backgroundColor: accentColor }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading & Notifying...' : 'Upload Document & Notify All Accounts'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-base font-semibold text-[#111315]">
                Issued Principal Documents ({principalDocuments.length})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as 'ALL' | PrincipalDocumentCategory)
                  }
                  aria-label="Filter principal documents by category"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                >
                  <option value="ALL">All Categories</option>
                  {PRINCIPAL_DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#525866] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memos..."
                    className="pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                  />
                </div>
              </div>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E5E9] p-8 text-center text-xs text-[#525866]">
                No Principal documents uploaded yet. Use the upload form to publish a memorandum,
                circular, or directive and automatically notify all accounts.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                  {filteredDocs.map((doc) => {
                    const selected = inspectedDoc?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setActiveDoc(doc.id)}
                        className={`w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] font-semibold text-[#1E40AF]">
                            {doc.category} · {doc.uploadedAt}
                          </div>
                          <div className="text-sm font-semibold text-[#111315] truncate">
                            {doc.title}
                          </div>
                          <div className="text-[11px] font-mono text-[#525866] truncate">
                            {doc.fileName} ({doc.fileSizeLabel})
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-md shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {inspectedDoc && renderInspector(inspectedDoc)}
              </div>
            )}
          </div>
        </div>
      )}

      {mode !== 'principal' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E5E9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-lg font-semibold text-[#111315]">
                Official Documents Uploaded by the School Principal ({principalDocuments.length})
              </h4>
              <p className="text-xs text-[#525866]">
                Memoranda, circulars, and official files distributed by the Principal&apos;s Office.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as 'ALL' | PrincipalDocumentCategory)
                }
                aria-label="Filter principal documents by category"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
              >
                <option value="ALL">All Categories</option>
                {PRINCIPAL_DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#525866] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Principal documents..."
                  className="pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E5E9] p-10 text-center text-xs text-[#525866]">
              No documents have been uploaded by the School Principal yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E5E9] divide-y divide-[#E2E5E9]">
                {filteredDocs.map((doc) => {
                  const selected = inspectedDoc?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveDoc(doc.id)}
                      className={`w-full text-left p-4 space-y-1 cursor-pointer transition-colors ${
                        selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#1E40AF]">{doc.category}</span>
                        <span className="text-[#525866]">{doc.uploadedAt}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#111315]">{doc.title}</div>
                      <div className="text-[11px] font-mono text-[#525866] truncate">
                        {doc.fileName} ({doc.fileSizeLabel})
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="lg:col-span-7">
                {inspectedDoc && renderInspector(inspectedDoc)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
