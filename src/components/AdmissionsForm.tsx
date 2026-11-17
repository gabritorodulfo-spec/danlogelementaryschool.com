import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { AdmissionsSubmission } from '../types/schoolConfig';

interface AdmissionsFormProps {
  admissionsOpen: boolean;
  accentColor: string;
  preselectedFacility?: string;
  shouldFocus?: boolean;
  onFocusHandled?: () => void;
  onSubmissionCreated: (submission: AdmissionsSubmission) => void;
}

interface FormErrors {
  parentName?: string;
  email?: string;
  notes?: string;
  server?: string;
}

export function AdmissionsForm({
  admissionsOpen,
  accentColor,
  preselectedFacility = '',
  shouldFocus = false,
  onFocusHandled,
  onSubmissionCreated,
}: AdmissionsFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeApplying, setGradeApplying] = useState('Kindergarten (Primary)');
  const [entryYear, setEntryYear] = useState('SY 2027–2028');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<AdmissionsSubmission | null>(null);

  useEffect(() => {
    if (preselectedFacility) {
      setNotes((prev) =>
        prev.trim().length > 0
          ? prev
          : `Inquiry regarding ${preselectedFacility} and related school programs.`
      );
    }
  }, [preselectedFacility]);

  useEffect(() => {
    if (shouldFocus && nameInputRef.current) {
      nameInputRef.current.focus();
      onFocusHandled?.();
    }
  }, [shouldFocus, onFocusHandled]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (parentName.trim().length < 2) {
      nextErrors.parentName = 'Please enter parent or guardian name (at least 2 characters).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Please provide a valid email address.';
    }
    if (notes.trim().length < 15) {
      nextErrors.notes = 'Please enter your inquiry or question (at least 15 characters).';
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: parentName.trim(),
          email: email.trim(),
          gradeApplying,
          entryYear,
          notes: notes.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ server: data.error || 'Unable to submit parent/guardian inquiry.' });
        return;
      }
      setSubmittedReceipt(data.submission);
      onSubmissionCreated(data.submission);
    } catch {
      setErrors({ server: 'Network error communicating with the school office.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setParentName('');
    setEmail('');
    setNotes('');
    setErrors({});
    setSubmittedReceipt(null);
  };

  if (!admissionsOpen) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E5E9] p-8 space-y-3">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-display text-xl font-semibold text-[#111315]">
              Parents/Guardian Inquiry Window Currently Paused
            </h3>
            <p className="text-sm text-[#525866]">
              The AO-II Administrative Office has temporarily paused new online parent and guardian
              inquiries during term scheduling. Please contact the school office directly by phone
              or email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submittedReceipt) {
    return (
      <div
        className="bg-white rounded-2xl border border-[#E2E5E9] p-8 space-y-5"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: accentColor }} />
          <div className="space-y-1">
            <h3 className="font-display text-xl font-semibold text-[#111315]">
              Parents/Guardian Inquiry Submitted
            </h3>
            <p className="text-sm text-[#525866]">
              Thank you, {submittedReceipt.parentName}. Our School Office will reply to{' '}
              <span className="font-medium text-[#111315]">{submittedReceipt.email}</span> within two
              school days.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E5E9] text-xs">
          <div>
            <dt className="text-[#525866]">Reference Number</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111315] mt-1">
              {submittedReceipt.referenceCode}
            </dd>
          </div>
          <div>
            <dt className="text-[#525866]">Learner Grade Level</dt>
            <dd className="font-medium text-[#111315] mt-1">{submittedReceipt.gradeApplying}</dd>
          </div>
          <div>
            <dt className="text-[#525866]">Inquiry Topic / Year</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111315] mt-1">
              {submittedReceipt.entryYear}
            </dd>
          </div>
        </dl>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-[#111315] border border-[#E2E5E9] hover:bg-[#F2F4F6] rounded-lg transition-colors cursor-pointer"
          >
            Submit Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-2xl border border-[#E2E5E9] p-6 md:p-8 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="adm-name" className="block text-xs font-semibold text-[#111315] mb-1.5">
            Parent / Guardian Name
          </label>
          <input
            ref={nameInputRef}
            id="adm-name"
            type="text"
            value={parentName}
            onChange={(e) => {
              setParentName(e.target.value);
              if (errors.parentName) setErrors((prev) => ({ ...prev, parentName: undefined }));
            }}
            placeholder="Elena & Thomas Alvarez"
            aria-invalid={Boolean(errors.parentName)}
            className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#F8F9FA] text-[#111315] placeholder:text-[#8A92A1] focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
              errors.parentName ? 'border-[#B91C1C]' : 'border-[#DCE0E6]'
            }`}
          />
          {errors.parentName && (
            <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.parentName}</span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="adm-email" className="block text-xs font-semibold text-[#111315] mb-1.5">
            Email Address
          </label>
          <input
            id="adm-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="family@example.org"
            aria-invalid={Boolean(errors.email)}
            className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#F8F9FA] text-[#111315] placeholder:text-[#8A92A1] focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
              errors.email ? 'border-[#B91C1C]' : 'border-[#DCE0E6]'
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.email}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="adm-grade" className="block text-xs font-semibold text-[#111315] mb-1.5">
            Learner Grade Level
          </label>
          <select
            id="adm-grade"
            value={gradeApplying}
            onChange={(e) => setGradeApplying(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] focus:outline-none focus:bg-white transition-colors"
          >
            <option value="Kindergarten (Primary)">Kindergarten (Primary)</option>
            <option value="Grade 1 – Grade 3 (Primary)">Grade 1 – Grade 3 (Primary)</option>
            <option value="Grade 4 – Grade 5 (Intermediate)">Grade 4 – Grade 5 (Intermediate)</option>
            <option value="Grade 6 (Intermediate)">Grade 6 (Intermediate)</option>
          </select>
        </div>

        <div>
          <label htmlFor="adm-entry" className="block text-xs font-semibold text-[#111315] mb-1.5">
            Inquiry Category / School Year
          </label>
          <select
            id="adm-entry"
            value={entryYear}
            onChange={(e) => setEntryYear(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] text-[#111315] focus:outline-none focus:bg-white transition-colors"
          >
            <option value="SY 2027–2028">SY 2027–2028 · Enrollment Inquiry</option>
            <option value="SY 2026–2027 Transferee">SY 2026–2027 · Learner Transfer Inquiry</option>
            <option value="Academic / Schedule Concern">Academic &amp; Class Schedule Question</option>
            <option value="School Records / Certificates">School Records &amp; Document Request</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="adm-notes" className="block text-xs font-semibold text-[#111315] mb-1.5">
          Parent / Guardian Inquiry or Message
        </label>
        <textarea
          id="adm-notes"
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (errors.notes) setErrors((prev) => ({ ...prev, notes: undefined }));
          }}
          placeholder="Write your question regarding enrollment requirements, learner transfer, schedules, or school programs..."
          aria-invalid={Boolean(errors.notes)}
          className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#F8F9FA] text-[#111315] placeholder:text-[#8A92A1] focus:outline-none focus:bg-white transition-colors resize-y ${
            errors.notes ? 'border-[#B91C1C]' : 'border-[#DCE0E6]'
          }`}
        />
        {errors.notes && (
          <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors.notes}</span>
          </p>
        )}
      </div>

      {errors.server && (
        <p className="text-xs text-[#B91C1C] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errors.server}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <p className="text-xs text-[#525866]">
          Please prepare PSA Birth Certificate &amp; Learner Reference Number for enrollment inquiries.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: accentColor }}
          className="px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 rounded-lg transition-opacity cursor-pointer whitespace-nowrap shrink-0"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Parent/Guardian Inquiry'}
        </button>
      </div>
    </form>
  );
}
