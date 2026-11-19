import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Megaphone,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ActivityPostCategory,
  ActivityPostItem,
  HomeFeedPost,
  HomePostCategory,
} from '../types/schoolConfig';
import { ResilientImage } from './ResilientImage';

interface PortalPostPublisherProps {
  accentColor: string;
  actorName: string;
  actorRole: 'Teacher' | 'Principal' | 'AO-II';
  actorAccountId: string;
  homePosts: HomeFeedPost[];
  activityPosts: ActivityPostItem[];
  onCreateHomePost: (payload: {
    title: string;
    content: string;
    category: HomePostCategory;
    pinned?: boolean;
    imageFile?: File | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteHomePost: (postId: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateActivityPost: (payload: {
    title: string;
    category: ActivityPostCategory;
    dateConducted: string;
    participants: string;
    location: string;
    description: string;
    imageFile?: File | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteActivityPost: (postId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function PortalPostPublisher({
  accentColor,
  actorName,
  actorRole,
  actorAccountId,
  homePosts,
  activityPosts,
  onCreateHomePost,
  onDeleteHomePost,
  onCreateActivityPost,
  onDeleteActivityPost,
}: PortalPostPublisherProps) {
  const [targetFeed, setTargetFeed] = useState<'home' | 'activity'>('home');

  // Website Post State
  const [homeTitle, setHomeTitle] = useState('');
  const [homeCategory, setHomeCategory] = useState<HomePostCategory>('Campus Update');
  const [homeContent, setHomeContent] = useState('');
  const [homePinned, setHomePinned] = useState(false);
  const [homeImageFile, setHomeImageFile] = useState<File | null>(null);
  const [homePreviewUrl, setHomePreviewUrl] = useState('');

  // Activity Post State
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState<ActivityPostCategory>('STEM & Labs');
  const [actDate, setActDate] = useState(() =>
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  );
  const [actParticipants, setActParticipants] = useState('');
  const [actLocation, setActLocation] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actImageFile, setActImageFile] = useState<File | null>(null);
  const [actPreviewUrl, setActPreviewUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (homePreviewUrl) URL.revokeObjectURL(homePreviewUrl);
    };
  }, [homePreviewUrl]);

  useEffect(() => {
    return () => {
      if (actPreviewUrl) URL.revokeObjectURL(actPreviewUrl);
    };
  }, [actPreviewUrl]);

  const handleHomeFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (homePreviewUrl) URL.revokeObjectURL(homePreviewUrl);
    setHomeImageFile(file);
    setHomePreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleActFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (actPreviewUrl) URL.revokeObjectURL(actPreviewUrl);
    setActImageFile(file);
    setActPreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmitHome = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');
    if (!homeTitle.trim() && !homeContent.trim()) {
      setFeedbackError('Write a headline or message before publishing to the website.');
      return;
    }
    setIsSubmitting(true);
    const res = await onCreateHomePost({
      title: homeTitle.trim(),
      content: homeContent.trim(),
      category: homeCategory,
      pinned: homePinned,
      imageFile: homeImageFile,
    });
    setIsSubmitting(false);
    if (!res.ok) {
      setFeedbackError(res.error || 'Could not publish website post.');
      return;
    }
    setHomeTitle('');
    setHomeContent('');
    setHomePinned(false);
    setHomeImageFile(null);
    if (homePreviewUrl) URL.revokeObjectURL(homePreviewUrl);
    setHomePreviewUrl('');
    setFeedbackSuccess(
      'Published! Your post is now live on the website for public viewing.'
    );
  };

  const handleSubmitActivity = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');
    if (actTitle.trim().length < 3 || actDescription.trim().length < 5) {
      setFeedbackError('Enter an activity title and description (at least 5 characters).');
      return;
    }
    setIsSubmitting(true);
    const res = await onCreateActivityPost({
      title: actTitle.trim(),
      category: actCategory,
      dateConducted: actDate.trim(),
      participants: actParticipants.trim() || 'Danlog Elementary Pupils',
      location: actLocation.trim() || 'Danlog Elementary Campus',
      description: actDescription.trim(),
      imageFile: actImageFile,
    });
    setIsSubmitting(false);
    if (!res.ok) {
      setFeedbackError(res.error || 'Could not publish activity photo.');
      return;
    }
    setActTitle('');
    setActParticipants('');
    setActLocation('');
    setActDescription('');
    setActImageFile(null);
    if (actPreviewUrl) URL.revokeObjectURL(actPreviewUrl);
    setActPreviewUrl('');
    setFeedbackSuccess(
      'Published! Your activity and photo now appear in Student Life & Activities Conducted for viewing.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E2E5E9] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E5E9] pb-4">
          <div className="space-y-1">
            <div
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: accentColor }}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>
                Posting as {actorName} ({actorRole})
              </span>
            </div>
            <h4 className="font-display text-lg font-semibold text-[#111315]">
              Publish Posts to the Public Website
            </h4>
            <p className="text-xs text-[#525866]">
              Only signed-in Teacher, Principal, and AO-II accounts can create or manage posts.
              Published items appear on the public website for viewing only.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-[#DCE0E6] bg-[#F8F9FA] p-1 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setTargetFeed('home');
                setFeedbackError('');
                setFeedbackSuccess('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                targetFeed === 'home' ? 'bg-[#0B291E] text-white' : 'text-[#525866] hover:text-[#111315]'
              }`}
            >
              Website Announcements ({homePosts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetFeed('activity');
                setFeedbackError('');
                setFeedbackSuccess('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                targetFeed === 'activity'
                  ? 'bg-[#0B291E] text-white'
                  : 'text-[#525866] hover:text-[#111315]'
              }`}
            >
              Student Life &amp; Activities ({activityPosts.length})
            </button>
          </div>
        </div>

        {feedbackSuccess && (
          <div
            role="status"
            className="rounded-lg border border-[#047857] bg-[#ECFDF5] px-4 py-2.5 text-xs font-medium text-[#047857] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
        )}
        {feedbackError && (
          <div
            role="alert"
            className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs font-medium text-[#B91C1C] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
        )}

        {targetFeed === 'home' ? (
          <form onSubmit={handleSubmitHome} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Post Headline / Title
                </label>
                <input
                  type="text"
                  value={homeTitle}
                  onChange={(e) => setHomeTitle(e.target.value)}
                  placeholder="Write an announcement or update title..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Category
                </label>
                <select
                  value={homeCategory}
                  onChange={(e) => setHomeCategory(e.target.value as HomePostCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Campus Update">Campus Update</option>
                  <option value="Classroom Story">Classroom Story</option>
                  <option value="Photo Post">Photo Post</option>
                  <option value="Achievement">Achievement</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-8">
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Message / Post Content *
                </label>
                <textarea
                  rows={4}
                  value={homeContent}
                  onChange={(e) => setHomeContent(e.target.value)}
                  placeholder="Write updates, reminders, or announcements to display on the website..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div className="lg:col-span-4 space-y-2">
                <span className="block text-xs font-semibold text-[#111315]">
                  Optional Photo Attachment
                </span>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBDAD0] bg-[#F8FAFC] hover:bg-[#ECFDF5]/60 p-4 text-center cursor-pointer">
                  {homePreviewUrl ? (
                    <img
                      src={homePreviewUrl}
                      alt="Website post upload preview"
                      className="w-full h-24 object-cover rounded-lg border border-[#DCE0E6]"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-[#047857]" />
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{homeImageFile ? homeImageFile.name : 'Choose Photo (PNG/JPG)'}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleHomeFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E5E9]">
              {actorRole === 'AO-II' || actorRole === 'Principal' ? (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111315] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homePinned}
                    onChange={(e) => setHomePinned(e.target.checked)}
                  />
                  <span>Pin this post at the top of the Campus Bulletin</span>
                </label>
              ) : (
                <span className="text-[11px] text-[#525866]">
                  Appears on the public website for viewing only
                </span>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: accentColor }}
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Website Post'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitActivity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g., Grade 6 Science Investigatory Project Showcase"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Category *
                </label>
                <select
                  value={actCategory}
                  onChange={(e) => setActCategory(e.target.value as ActivityPostCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                >
                  <option value="STEM & Labs">STEM &amp; Labs</option>
                  <option value="Arts & Music">Arts &amp; Music</option>
                  <option value="Athletics & Field">Athletics &amp; Field</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Date Conducted
                </label>
                <input
                  type="text"
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Participants / Grade Level
                </label>
                <input
                  type="text"
                  value={actParticipants}
                  onChange={(e) => setActParticipants(e.target.value)}
                  placeholder="e.g., Grade 5 & Grade 6 Pupils"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Campus Location
                </label>
                <input
                  type="text"
                  value={actLocation}
                  onChange={(e) => setActLocation(e.target.value)}
                  placeholder="e.g., Danlog Quadrangle / Science Lab"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7">
                <label className="block text-xs font-semibold text-[#111315] mb-1">
                  Activity Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  placeholder="Describe the conducted student activity and highlights..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE0E6] bg-[#F8F9FA]"
                />
              </div>
              <div className="lg:col-span-5 space-y-2">
                <span className="block text-xs font-semibold text-[#111315]">
                  Upload Activity Photograph (PNG, JPG, WEBP)
                </span>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#A7F3D0] bg-[#F0FDF4]/60 hover:bg-[#ECFDF5] p-4 text-center cursor-pointer">
                  {actPreviewUrl ? (
                    <img
                      src={actPreviewUrl}
                      alt="Activity upload preview"
                      className="w-full h-24 object-cover rounded-lg border border-[#DCE0E6]"
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-[#047857]" />
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{actImageFile ? actImageFile.name : 'Upload Activity Image'}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleActFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E5E9]">
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: accentColor }}
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-95 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSubmitting ? 'Uploading & Publishing...' : 'Publish to Student Life & Activities'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Portal-Only Management Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E5E9] bg-[#F8FAFC] flex items-center justify-between">
            <h5 className="text-xs font-semibold text-[#111315] tabular-nums">
              Published Website Announcements ({homePosts.length})
            </h5>
          </div>
          <div className="divide-y divide-[#E2E5E9] max-h-96 overflow-y-auto">
            {homePosts.length === 0 ? (
              <p className="p-6 text-xs text-center text-[#525866]">No website announcements yet.</p>
            ) : (
              homePosts.map((post) => {
                const canDelete = actorRole === 'AO-II';
                return (
                  <div key={post.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[11px] text-[#525866]">
                        {post.category} · {post.authorName} ({post.authorRole}) · {post.createdAt}
                      </div>
                      <div className="text-xs font-semibold text-[#111315]">{post.title}</div>
                      <p className="text-xs text-[#525866] line-clamp-2">{post.content}</p>
                    </div>
                    {canDelete &&
                      (confirmDeleteId === post.id ? (
                        <div className="inline-flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteHomePost(post.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-[11px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-[#525866] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          aria-label={`Delete ${post.title}`}
                          className="p-1.5 text-[#525866] hover:text-[#B91C1C] cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E5E9] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E5E9] bg-[#F8FAFC] flex items-center justify-between">
            <h5 className="text-xs font-semibold text-[#111315] tabular-nums">
              Uploaded Student Life &amp; Activities ({activityPosts.length})
            </h5>
          </div>
          <div className="divide-y divide-[#E2E5E9] max-h-96 overflow-y-auto">
            {activityPosts.length === 0 ? (
              <p className="p-6 text-xs text-center text-[#525866]">
                No custom uploaded activities yet. Built-in campus gallery photos remain active.
              </p>
            ) : (
              activityPosts.map((act) => {
                const canDelete = actorRole === 'AO-II';
                return (
                  <div key={act.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#EAEDF1] shrink-0">
                        <ResilientImage
                          key={act.image}
                          src={act.image}
                          alt={act.imageAlt}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="text-[11px] text-[#525866]">
                          {act.category} · {act.dateConducted} · {act.authorName} ({act.authorRole})
                        </div>
                        <div className="text-xs font-semibold text-[#111315] truncate">
                          {act.title}
                        </div>
                        <p className="text-[11px] text-[#525866] line-clamp-2">{act.description}</p>
                      </div>
                    </div>
                    {canDelete &&
                      (confirmDeleteId === act.id ? (
                        <div className="inline-flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteActivityPost(act.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-[11px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-[#525866] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(act.id)}
                          aria-label={`Delete ${act.title}`}
                          className="p-1.5 text-[#525866] hover:text-[#B91C1C] cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
