import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { HomeFeedPost, HomePostCategory } from '../types/schoolConfig';
import { ResilientImage } from './ResilientImage';

interface HomeCommunityFeedProps {
  accentColor: string;
  posts: HomeFeedPost[];
}

const POST_CATEGORIES: ('All Posts' | HomePostCategory)[] = [
  'All Posts',
  'Announcement',
  'Campus Update',
  'Classroom Story',
  'Photo Post',
  'Achievement',
  'General',
];

export function HomeCommunityFeed({ accentColor, posts }: HomeCommunityFeedProps) {
  const [categoryFilter, setCategoryFilter] = useState<'All Posts' | HomePostCategory>('All Posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  const sortedAndFilteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      const matchesCat = categoryFilter === 'All Posts' || post.category === categoryFilter;
      const matchesQ =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
    return [...filtered].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  }, [posts, categoryFilter, searchQuery]);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section
      id="community-posts"
      className="py-16 lg:py-20 bg-transparent border-b border-[#D2DFD7]"
    >
      <div className="max-w-[1200px] mx-auto px-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-xs font-medium" style={{ color: accentColor }}>
              Campus Bulletin &amp; Announcements
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[#111315]">
              Latest updates, milestones, and notices from Danlog Elementary School.
            </h2>
            <p className="text-sm md:text-base text-[#525866]">
              Official school dispatches, campus reminders, and published stories for parents,
              guardians, and pupils.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Filter announcements by category"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-white/90 rounded-lg border border-[#D2DFD7] shadow-xs"
          >
            {POST_CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0F3D2E] text-white shadow-xs'
                      : 'text-[#3F4A44] hover:text-[#111315]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements or authors..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D2DFD7] bg-white/95 text-[#111315]"
            />
          </div>
        </div>

        {/* Posts Feed Grid (Viewing Only) */}
        {sortedAndFilteredPosts.length === 0 ? (
          <div className="bg-white/95 rounded-2xl border border-[#D2DFD7] p-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#111315]">
              No announcements match your current filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedAndFilteredPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white/95 backdrop-blur-xs rounded-2xl border border-[#D2DFD7] overflow-hidden flex flex-col justify-between shadow-xs"
              >
                {post.imageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxImage({ src: post.imageUrl!, title: post.title })
                    }
                    aria-label={`Enlarge photo for ${post.title}`}
                    className="aspect-[16/9] w-full overflow-hidden bg-[#EAEDF1] cursor-pointer block text-left"
                  >
                    <ResilientImage
                      key={post.imageUrl}
                      src={post.imageUrl}
                      alt={post.imageAlt ?? post.title}
                      title={post.title}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                      containerClassName="w-full h-full"
                    />
                  </button>
                )}

                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-[#525866] flex flex-wrap items-center gap-2">
                      {post.pinned && (
                        <>
                          <span className="font-semibold" style={{ color: accentColor }}>
                            Pinned
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>{post.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.createdAt}</span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-[#111315]">
                      {post.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#3F4A44] whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E2E5E9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#525866]">
                    <div>
                      <span className="font-semibold text-[#111315]">{post.authorName}</span>
                      <span> · {post.authorRole}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111315]/85 backdrop-blur-xs p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#E2E5E9] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2E5E9] flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[#111315] truncate">
                {lightboxImage.title}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close image preview"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-[#111315] text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] bg-[#EAEDF1] flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
