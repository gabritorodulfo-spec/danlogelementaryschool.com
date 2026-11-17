import type { MouseEvent } from 'react';
import { SiteFrontendConfig } from '../types/schoolConfig';

export type AppPage = 'home' | 'academics' | 'enrollment' | 'portal';

interface HeaderProps {
  frontendConfig: SiteFrontendConfig;
  currentPage: AppPage;
  onNavigate: (page: AppPage, hash?: string) => void;
  onScheduleClick: () => void;
}

export function Header({
  frontendConfig,
  currentPage,
  onNavigate,
  onScheduleClick,
}: HeaderProps) {
  const navItems = [
    { label: 'Home', page: 'home' as AppPage, hash: '#top' },
    frontendConfig.visibleSections.academics && {
      label: 'Academics',
      page: 'academics' as AppPage,
      hash: undefined,
    },
    { label: 'Activities', page: 'home' as AppPage, hash: '#activities' },
    { label: 'Calendar', page: 'home' as AppPage, hash: '#calendar' },
    frontendConfig.visibleSections.dashboard && {
      label: 'Enrollment',
      page: 'enrollment' as AppPage,
      hash: undefined,
    },
    { label: 'Portals', page: 'portal' as AppPage, hash: undefined },
  ].filter(Boolean) as { label: string; page: AppPage; hash?: string }[];

  const handleNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    page: AppPage,
    hash?: string
  ) => {
    e.preventDefault();
    onNavigate(page, hash);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F4F8F5]/92 backdrop-blur-md border-b border-[#D2DFD7]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Official School Logo + Single-line Wordmark */}
        <a
          href="/"
          onClick={(e) => handleNavClick(e, 'home', '#top')}
          className="flex items-center gap-2.5 font-display text-sm sm:text-lg font-bold tracking-tight text-[#111315] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D] rounded-sm"
        >
          <img
            src="/assets/aistudio/image_935e1122_da3e06c0.jpg"
            alt="Danlog Elementary School official seal"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0"
          />
          <span>{frontendConfig.schoolName}</span>
        </a>

        {/* Zone 2: Visible Primary Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-[#111315]"
        >
          {navItems.map((item) => {
            const isPortalActive = currentPage === 'portal' && item.page === 'portal';
            const isAcademicsActive = currentPage === 'academics' && item.page === 'academics';
            const isEnrollmentActive = currentPage === 'enrollment' && item.page === 'enrollment';
            const isHomeActive = currentPage === 'home' && item.label === 'Home';
            const isActive =
              isPortalActive || isAcademicsActive || isEnrollmentActive || isHomeActive;
            const href =
              item.page === 'portal'
                ? '/portal'
                : item.page === 'academics'
                ? '/academics'
                : item.page === 'enrollment'
                ? '/enrollment'
                : `/${item.hash ?? ''}`;
            return (
              <a
                key={item.label}
                href={href}
                onClick={(e) => handleNavClick(e, item.page, item.hash)}
                style={isActive ? { color: frontendConfig.accentColor } : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`hover:text-[#15803D] underline-offset-4 hover:underline transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D] rounded-sm ${
                  isActive ? 'font-semibold underline' : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onScheduleClick}
            style={{ backgroundColor: frontendConfig.accentColor }}
            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs font-semibold text-white hover:opacity-90 rounded-lg transition-opacity duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Parents/Guardian Inquiry
          </button>
        </div>
      </div>

      {/* Compact Visible Header Menu Strip for Narrow / Mobile Screens */}
      <nav
        aria-label="Header Menu Strip"
        className="md:hidden border-t border-[#D2DFD7] bg-[#E8F1EB]/90 px-4 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-[#111315]"
      >
        {navItems.map((item) => {
          const isPortalActive = currentPage === 'portal' && item.page === 'portal';
          const isAcademicsActive = currentPage === 'academics' && item.page === 'academics';
          const isEnrollmentActive = currentPage === 'enrollment' && item.page === 'enrollment';
          const isHomeActive = currentPage === 'home' && item.label === 'Home';
          const isActive =
            isPortalActive || isAcademicsActive || isEnrollmentActive || isHomeActive;
          const href =
            item.page === 'portal'
              ? '/portal'
              : item.page === 'academics'
              ? '/academics'
              : item.page === 'enrollment'
              ? '/enrollment'
              : `/${item.hash ?? ''}`;
          return (
            <a
              key={`compact-${item.label}`}
              href={href}
              onClick={(e) => handleNavClick(e, item.page, item.hash)}
              style={isActive ? { color: frontendConfig.accentColor } : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`whitespace-nowrap shrink-0 py-0.5 hover:underline underline-offset-4 ${
                isActive ? 'font-semibold underline' : ''
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
