'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, useSyncExternalStore, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import AdminOverviewPanel, { AdminSectionTab } from '@/components/admin/AdminOverviewPanel';
import AdminProvidersPanel from '@/components/admin/AdminProvidersPanel';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminComplaintsPanel from '@/components/admin/AdminComplaintsPanel';
import { useLanguage } from '@/components/LanguageContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { AdminProviderItem, getAdminProviders } from '@/lib/api/providers';
import {
  AdminComplaintItem,
  AdminDashboardStats,
  getAdminComplaints,
  getAdminDashboardStats,
} from '@/lib/api/admin';

const VALID_TABS: AdminSectionTab[] = ['overview', 'providers', 'users', 'complaints'];

let lastRawAdminUser: string | null = null;
let lastParsedAdminUser: User | null = null;

function subscribeStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getCachedAdminSnapshot(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('dessie_auth_user');
    if (raw === lastRawAdminUser) return lastParsedAdminUser;
    lastRawAdminUser = raw;
    if (!raw) {
      lastParsedAdminUser = null;
      return null;
    }
    const parsed = JSON.parse(raw) as User;
    lastParsedAdminUser = parsed?.role === 'admin' ? parsed : null;
    return lastParsedAdminUser;
  } catch {
    lastRawAdminUser = null;
    lastParsedAdminUser = null;
    return null;
  }
}

function getCachedAdminServerSnapshot(): User | null {
  return null;
}

function subscribePopState(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getWindowSearchSnapshot(): string {
  if (typeof window === 'undefined') return '';
  return window.location.search;
}

function getWindowSearchServerSnapshot(): string {
  return '';
}

function AdminTabParamSync({
  onTabParamChange,
}: {
  onTabParamChange: (tab: AdminSectionTab | null) => void;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') as AdminSectionTab | null;
  const resolved = tabParam && VALID_TABS.includes(tabParam) ? tabParam : null;
  const prevRef = useRef<AdminSectionTab | null | undefined>(undefined);

  useEffect(() => {
    if (prevRef.current === undefined) {
      prevRef.current = resolved;
      return;
    }
    if (prevRef.current === resolved) return;
    prevRef.current = resolved;
    Promise.resolve().then(() => onTabParamChange(resolved));
  }, [resolved, onTabParamChange]);

  return null;
}

function KpiSkeletonBar() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-6 sm:h-7 w-10 rounded bg-surface-container-high dark:bg-surface-dim animate-pulse align-middle"
    />
  );
}

function AdminPortalContent() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const cachedUser = useSyncExternalStore(
    subscribeStorage,
    getCachedAdminSnapshot,
    getCachedAdminServerSnapshot
  );
  const initialWindowSearch = useSyncExternalStore(
    subscribePopState,
    getWindowSearchSnapshot,
    getWindowSearchServerSnapshot
  );

  const [freshUser, setFreshUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const initialUrlTab = useMemo(() => {
    const raw = new URLSearchParams(initialWindowSearch).get('tab') as AdminSectionTab | null;
    return raw && VALID_TABS.includes(raw) ? raw : 'overview';
  }, [initialWindowSearch]);

  const [urlTabOverride, setUrlTabOverride] = useState<AdminSectionTab | null>(null);
  const [sectionOverride, setSectionOverride] = useState<AdminSectionTab | null>(null);
  const activeSection = sectionOverride ?? urlTabOverride ?? initialUrlTab;

  // Analytics, Providers & Disputes Data
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [prefetchedComplaints, setPrefetchedComplaints] = useState<AdminComplaintItem[] | null>(null);
  const tablistRef = useRef<HTMLDivElement>(null);

  const user = freshUser ?? cachedUser;

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const data = await getAdminProviders();
      setProviders(data);
    } catch (err) {
      console.error('Failed to load admin providers:', err);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const refreshAllSummary = useCallback(() => {
    fetchStats();
    fetchProviders();
  }, [fetchStats, fetchProviders]);

  const handleTabParamChange = useCallback((nextTab: AdminSectionTab | null) => {
    if (nextTab) {
      setUrlTabOverride(nextTab);
      setSectionOverride(null);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    let active = true;

    Promise.allSettled([
      getCurrentUser(),
      getAdminDashboardStats(),
      getAdminProviders(),
      getAdminComplaints(),
    ]).then(([userRes, statsRes, providersRes, complaintsRes]) => {
      if (!active) return;

      if (userRes.status === 'rejected') {
        router.replace('/login');
        return;
      }

      const data = userRes.value;
      if (data.role !== 'admin') {
        if (data.role === 'customer') router.replace('/customer/services');
        else if (data.role === 'provider') router.replace('/provider');
        return;
      }

      setFreshUser(data);
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (providersRes.status === 'fulfilled') {
        setProviders(providersRes.value);
      }
      if (complaintsRes.status === 'fulfilled') {
        setPrefetchedComplaints(complaintsRes.value);
      }
      setLoadingStats(false);
      setLoadingProviders(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      router.replace('/login');
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tablistRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  const pendingProvidersCount =
    stats?.pending_providers ??
    providers.filter((p) => p.verification_status === 'pending').length;
  const totalProvidersCount = stats?.total_providers ?? providers.length;
  const pendingComplaintsCount = stats?.pending_complaints_count ?? 0;

  const navTabs: Array<{
    key: AdminSectionTab;
    icon: string;
    labelEn: string;
    labelAm: string;
    badge?: number;
    badgeTone?: 'warning' | 'danger';
  }> = [
    {
      key: 'overview',
      icon: 'analytics',
      labelEn: 'Overview & Analytics',
      labelAm: 'አጠቃላይ እይታ',
    },
    {
      key: 'providers',
      icon: 'verified_user',
      labelEn: 'Provider Verifications',
      labelAm: 'የአቅራቢዎች ማረጋገጫ',
      badge: pendingProvidersCount,
      badgeTone: 'warning',
    },
    {
      key: 'users',
      icon: 'group',
      labelEn: 'Users Management',
      labelAm: 'የተጠቃሚዎች አስተዳደር',
    },
    {
      key: 'complaints',
      icon: 'support_agent',
      labelEn: 'User Complaints & Support',
      labelAm: 'ቅሬታዎች እና ድጋፍ',
      badge: pendingComplaintsCount,
      badgeTone: 'danger',
    },
  ];

  const portalSubtitle =
    activeSection === 'providers'
      ? t.adminProvidersSubtitle
      : lang === 'am'
      ? 'የተጠቃሚዎችን እንቅስቃሴ፣ የአገልግሎት ሰጪዎችን ማረጋገጫ እና የድጋፍ ቅሬታዎችን ከአንድ ቦታ ያስተዳድሩ።'
      : 'Monitor platform growth, verify service providers, manage registered clients, and resolve user support disputes.';

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-200">
      <Suspense fallback={null}>
        <AdminTabParamSync onTabParamChange={handleTabParamChange} />
      </Suspense>
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-margin-mobile md:px-margin py-4 sm:py-space-lg md:py-space-xl space-y-4 sm:space-y-space-lg">
        {/* Admin Header Bar */}
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-3.5 sm:p-space-md md:p-space-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div className="min-w-0 max-w-2xl">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-emerald-800 dark:text-inverse-primary text-[24px] sm:text-[28px] shrink-0">
                admin_panel_settings
              </span>
              <h1 className="text-lg sm:text-headline-sm font-headline-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                {lang === 'am' ? 'የደሴ ሎካል አስተዳዳሪ ፖርታል' : 'Dessie Local Admin Portal'}
              </h1>
            </div>
            <p className="text-xs sm:text-body-sm text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 font-medium leading-relaxed">
              {portalSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-start shrink-0">
            <div className="text-left sm:text-right min-w-0">
              <p className="text-xs sm:text-label-md font-bold text-on-surface dark:text-inverse-on-surface truncate">
                {user?.name || (lang === 'am' ? 'የመድረክ አስተዳዳሪ' : 'Platform Admin')}
              </p>
              <p className="text-2xs sm:text-xs text-gray-700 dark:text-gray-300 truncate">
                {user?.email || (
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-28 rounded bg-surface-container-high dark:bg-surface-dim animate-pulse align-middle"
                  />
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={loggingOut}
              aria-label="Logout"
              className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-error hover:text-white dark:hover:bg-error text-on-surface dark:text-inverse-on-surface text-2xs sm:text-label-md font-label-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">logout</span>
              <span>{loggingOut ? t.btnLogoutLoading : t.btnLogout}</span>
            </button>
          </div>
        </div>

        {/* Admin Sub-Navigation Tabs */}
        <nav
          aria-label="Admin Portal Sections"
          className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 p-1.5 shadow-sm flex items-center gap-1"
        >
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollTabs('left')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-surface-dim transition-colors cursor-pointer shrink-0"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Admin Portal Sections"
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0"
          >
            {navTabs.map((tab) => {
              const isActive = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`admin-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`admin-panel-${tab.key}`}
                  onClick={() => setSectionOverride(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-label-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-primary-container dark:bg-emerald-700 text-white shadow-xs'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{lang === 'am' ? tab.labelAm : tab.labelEn}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : tab.badgeTone === 'danger'
                          ? 'bg-error/15 text-red-800 dark:text-red-300'
                          : 'bg-secondary/15 text-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollTabs('right')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-surface-dim transition-colors cursor-pointer shrink-0"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </nav>

        {/* Expanded Overview KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-space-sm">
          {/* Card 1: Total Providers */}
          <button
            type="button"
            onClick={() => setSectionOverride('providers')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {lang === 'am' ? 'ጠቅላላ አቅራቢዎች' : 'Total Providers'}
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-emerald-800 dark:text-inverse-primary">
                engineering
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white mt-1 min-h-[28px] sm:min-h-[32px] flex items-center">
              {loadingStats && loadingProviders && !stats ? <KpiSkeletonBar /> : totalProvidersCount}
            </span>
            <span className="text-[11px] text-amber-900 dark:text-amber-300 font-medium mt-0.5 block">
              {loadingStats && loadingProviders && !stats ? '—' : pendingProvidersCount}{' '}
              {lang === 'am' ? 'ማረጋገጫ የሚጠብቁ' : 'pending verification'}
            </span>
          </button>

          {/* Card 2: Total Users / Clients */}
          <button
            type="button"
            onClick={() => setSectionOverride('users')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {lang === 'am' ? 'ጠቅላላ ደንበኞች' : 'Total Users / Clients'}
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-emerald-800 dark:text-inverse-primary">
                group
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white mt-1 min-h-[28px] sm:min-h-[32px] flex items-center">
              {loadingStats && !stats ? <KpiSkeletonBar /> : (stats?.total_users ?? 0)}
            </span>
            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium mt-0.5 block">
              {loadingStats && !stats ? '—' : (stats?.total_requests ?? 0)}{' '}
              {lang === 'am' ? 'ጠቅላላ ጥያቄዎች' : 'total requests'}
            </span>
          </button>

          {/* Card 3: Today's Active Users / Activity */}
          <button
            type="button"
            onClick={() => setSectionOverride('overview')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-emerald-800 dark:text-inverse-primary uppercase tracking-wider">
                {lang === 'am' ? 'የዛሬ ንቁ ተጠቃሚዎች' : "Today's Active Users"}
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-emerald-800 dark:text-inverse-primary">
                trending_up
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-inverse-primary mt-1 min-h-[28px] sm:min-h-[32px] flex items-center">
              {loadingStats && !stats ? <KpiSkeletonBar /> : (stats?.active_users_today ?? 0)}
            </span>
            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium mt-0.5 block">
              {loadingStats && !stats ? '—' : (stats?.requests_today ?? 0)}{' '}
              {lang === 'am' ? 'የዛሬ ጥያቄዎች' : 'requests today'}
            </span>
          </button>

          {/* Card 4: Open Complaints / Issues */}
          <button
            type="button"
            onClick={() => setSectionOverride('complaints')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-error text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                {lang === 'am' ? 'ክፍት ቅሬታዎች' : 'Open Complaints'}
              </span>
              {pendingComplaintsCount > 0 ? (
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-error animate-pulse shrink-0" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray-700 dark:text-gray-300">
                  support_agent
                </span>
              )}
            </div>
            <span className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300 mt-1 min-h-[28px] sm:min-h-[32px] flex items-center">
              {loadingStats && !stats ? <KpiSkeletonBar /> : pendingComplaintsCount}
            </span>
            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium mt-0.5 block">
              {loadingStats && !stats ? '—' : (stats?.total_complaints_count ?? 0)}{' '}
              {lang === 'am' ? 'ጠቅላላ ቅሬታዎች' : 'total tickets'}
            </span>
          </button>
        </div>

        {/* Active Admin Section View */}
        <div
          role="tabpanel"
          id={`admin-panel-${activeSection}`}
          aria-labelledby={`admin-tab-${activeSection}`}
        >
          {activeSection === 'overview' && (
            <AdminOverviewPanel
              stats={stats}
              loading={loadingStats}
              lang={lang}
              t={t}
              onNavigateTab={setSectionOverride}
              onRefresh={refreshAllSummary}
            />
          )}

          {activeSection === 'providers' && (
            <AdminProvidersPanel
              providers={providers}
              setProviders={setProviders}
              loadingProviders={loadingProviders}
              onRefresh={fetchProviders}
              onProvidersChanged={fetchStats}
              lang={lang}
              t={t}
            />
          )}

          {activeSection === 'users' && (
            <AdminUsersPanel lang={lang} onUserUpdated={fetchStats} />
          )}

          {activeSection === 'complaints' && (
            <AdminComplaintsPanel
              lang={lang}
              onComplaintUpdated={fetchStats}
              initialComplaints={prefetchedComplaints}
            />
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={loggingOut}
      />

      <Footer />
    </div>
  );
}

export default function AdminDashboardPage() {
  return <AdminPortalContent />;
}
