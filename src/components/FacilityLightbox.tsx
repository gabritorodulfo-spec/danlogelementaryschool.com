import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { CampusFacility } from '../data/schoolData';
import { ResilientImage } from './ResilientImage';

interface FacilityLightboxProps {
  facility: CampusFacility | null;
  accentColor: string;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onBookTourForFacility: (facilityTitle: string) => void;
}

export function FacilityLightbox({
  facility,
  accentColor,
  onClose,
  onNavigate,
  onBookTourForFacility,
}: FacilityLightboxProps) {
  useEffect(() => {
    if (!facility) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate('prev');
      if (event.key === 'ArrowRight') onNavigate('next');
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [facility, onClose, onNavigate]);

  if (!facility) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111315]/80 backdrop-blur-xs p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="facility-lightbox-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E5E9] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-white/95 backdrop-blur-xs border-b border-[#E2E5E9]">
          <div className="text-xs text-[#525866] flex items-center gap-2 truncate">
            <span>{facility.category}</span>
            <span aria-hidden="true">·</span>
            <span>{facility.building}</span>
            <span aria-hidden="true">·</span>
            <span>{facility.gradesServed}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('prev')}
              aria-label="Previous campus space"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2E5E9] text-[#111315] hover:bg-[#F2F4F6] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('next')}
              aria-label="Next campus space"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2E5E9] text-[#111315] hover:bg-[#F2F4F6] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close campus space details"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-[#111315] text-white hover:bg-[#272B30] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="aspect-[16/9] w-full bg-[#EAEDF1] overflow-hidden">
          <ResilientImage
            src={facility.image}
            alt={facility.imageAlt}
            title={facility.title}
            className="w-full h-full object-cover"
            containerClassName="w-full h-full"
          />
        </div>

        <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h2
              id="facility-lightbox-title"
              className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-[#111315]"
            >
              {facility.title}
            </h2>
            <p className="text-sm font-medium" style={{ color: accentColor }}>
              {facility.outcomeMetric}
            </p>
            <p className="text-base leading-relaxed text-[#32363E]">{facility.summary}</p>
            <p className="text-base leading-relaxed text-[#525866]">
              {facility.architecturalAndAcademicNotes}
            </p>

            <div className="pt-4 border-t border-[#E2E5E9] flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#525866]">
                Department Lead:{' '}
                <span className="font-medium text-[#111315]">{facility.departmentChair}</span>
              </div>
              <button
                type="button"
                onClick={() => onBookTourForFacility(facility.title)}
                style={{ backgroundColor: accentColor }}
                className="px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 rounded-lg transition-opacity cursor-pointer whitespace-nowrap shrink-0"
              >
                Inquire About This Space
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#F8F9FA] rounded-xl border border-[#E2E5E9] p-6">
              <h3 className="text-sm font-semibold text-[#111315] mb-4">
                Facility &amp; Program Specifications
              </h3>
              <dl className="divide-y divide-[#E2E5E9]">
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-xs text-[#525866]">Capacity &amp; Scope</dt>
                  <dd className="text-xs font-medium text-[#111315] text-right">
                    {facility.capacityLabel}
                  </dd>
                </div>
                {facility.specs.map((spec) => (
                  <div key={spec.label} className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-[#525866]">{spec.label}</dt>
                    <dd className="text-xs font-mono tabular-nums font-medium text-[#111315] text-right">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
