import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import {
  ACTIVITIES_GALLERY,
  ActivityCategory,
  ActivityPhotoItem,
} from '../data/schoolData';
import { ResilientImage } from './ResilientImage';

interface ActivitiesGalleryProps {
  accentColor: string;
}

const CATEGORIES: ActivityCategory[] = [
  'All Activities',
  'STEM & Labs',
  'Arts & Music',
  'Athletics & Field',
];

export function ActivitiesGallery({ accentColor }: ActivitiesGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('All Activities');
  const [lightboxPhoto, setLightboxPhoto] = useState<ActivityPhotoItem | null>(null);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'All Activities') return ACTIVITIES_GALLERY;
    return ACTIVITIES_GALLERY.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    if (!lightboxPhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const pool = filteredPhotos.length > 0 ? filteredPhotos : ACTIVITIES_GALLERY;
        const idx = pool.findIndex((p) => p.id === lightboxPhoto.id);
        const base = idx === -1 ? 0 : idx;
        const nextIdx =
          e.key === 'ArrowRight'
            ? (base + 1) % pool.length
            : (base - 1 + pool.length) % pool.length;
        setLightboxPhoto(pool[nextIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxPhoto, filteredPhotos]);

  const stepPhoto = (dir: 'prev' | 'next') => {
    if (!lightboxPhoto) return;
    const pool = filteredPhotos.length > 0 ? filteredPhotos : ACTIVITIES_GALLERY;
    const idx = pool.findIndex((p) => p.id === lightboxPhoto.id);
    const base = idx === -1 ? 0 : idx;
    const nextIdx =
      dir === 'next' ? (base + 1) % pool.length : (base - 1 + pool.length) % pool.length;
    setLightboxPhoto(pool[nextIdx]);
  };

  return (
    <section id="activities" className="py-16 lg:py-24 bg-transparent border-b border-[#D2DFD7]">
      <div className="max-w-[1200px] mx-auto px-6 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium" style={{ color: accentColor }}>
              Student Life &amp; Activities Conducted
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#111315]">
              Photos from science fairs, recitals, botanical labs, and field days.
            </h2>
            <p className="text-sm md:text-base text-[#525866]">
              Explore recent school-wide events and classroom activities documented across our K–12
              divisions. Click any photograph to enlarge.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter conducted activities by category"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-white/90 rounded-lg border border-[#D2DFD7] self-start md:self-auto shadow-xs"
          >
            {CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={active}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0F3D2E] text-white shadow-xs'
                      : 'text-[#3F4A44] hover:text-[#111315]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredPhotos.map((item) => (
            <article
              key={item.id}
              className="group rounded-2xl border border-[#D2DFD7] bg-white/95 backdrop-blur-xs overflow-hidden flex flex-col shadow-xs"
            >
              <button
                type="button"
                onClick={() => setLightboxPhoto(item)}
                aria-label={`View full photograph of ${item.title}`}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAEDF1] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset"
              >
                <ResilientImage
                  src={item.image}
                  alt={item.imageAlt}
                  title={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  containerClassName="w-full h-full"
                />
              </button>

              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.dateConducted}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#111315]">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#525866]">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-[#E2E5E9] flex items-center justify-between gap-2 text-[11px] text-[#525866]">
                  <span>{item.location}</span>
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(item)}
                    style={{ color: accentColor }}
                    className="font-semibold hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Enlarge Photo
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Activity Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111315]/85 backdrop-blur-xs p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-photo-title"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E5E9] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E2E5E9]">
              <div className="text-xs text-[#525866] truncate">
                {lightboxPhoto.category} · {lightboxPhoto.dateConducted} · {lightboxPhoto.location}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => stepPhoto('prev')}
                  aria-label="Previous activity photo"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E2E5E9] text-[#111315] hover:bg-[#F2F4F6] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => stepPhoto('next')}
                  aria-label="Next activity photo"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E2E5E9] text-[#111315] hover:bg-[#F2F4F6] cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  aria-label="Close photo viewer"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[#111315] text-white hover:bg-[#272B30] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="aspect-[16/10] w-full bg-[#EAEDF1]">
              <ResilientImage
                src={lightboxPhoto.image}
                alt={lightboxPhoto.imageAlt}
                title={lightboxPhoto.title}
                className="w-full h-full object-cover"
                containerClassName="w-full h-full"
              />
            </div>

            <div className="p-6 md:p-8 space-y-2">
              <h3
                id="activity-photo-title"
                className="font-display text-2xl font-semibold text-[#111315]"
              >
                {lightboxPhoto.title}
              </h3>
              <p className="text-xs font-medium" style={{ color: accentColor }}>
                {lightboxPhoto.participants}
              </p>
              <p className="text-sm leading-relaxed text-[#525866] pt-1">
                {lightboxPhoto.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
