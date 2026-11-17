import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SchoolDispatch } from '../data/schoolData';

interface DispatchModalProps {
  dispatch: SchoolDispatch | null;
  onClose: () => void;
}

export function DispatchModal({ dispatch, onClose }: DispatchModalProps) {
  useEffect(() => {
    if (!dispatch) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [dispatch, onClose]);

  if (!dispatch) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111315]/75 backdrop-blur-xs p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-modal-title"
      onClick={onClose}
    >
      <article
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E5E9] shadow-2xl p-6 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#E2E5E9]">
          <div className="space-y-2">
            <div className="text-xs text-[#525866] flex items-center gap-2">
              <span>{dispatch.category}</span>
              <span aria-hidden="true">·</span>
              <span>{dispatch.date}</span>
              <span aria-hidden="true">·</span>
              <span>{dispatch.readTime}</span>
            </div>
            <h2
              id="dispatch-modal-title"
              className="font-display text-2xl font-semibold tracking-tight text-[#111315]"
            >
              {dispatch.title}
            </h2>
            <p className="text-xs text-[#525866]">Published by {dispatch.author}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close school dispatch"
            className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-[#E2E5E9] text-[#111315] hover:bg-[#F2F4F6] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-6 space-y-5 text-base leading-relaxed text-[#32363E]">
          <p className="font-medium text-[#111315]">{dispatch.excerpt}</p>
          {dispatch.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
