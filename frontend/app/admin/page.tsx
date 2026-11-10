'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
import { AdminDashboardStats, getAdminDashboardStats } from '@/lib/api/admin';

const VALID_TABS: AdminSectionTab[] = ['overview', 'providers', 'users', 'complaints'];

function AdminPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminSectionTab | null;

  const { t, lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [activeSection, setActiveSection] = useState<AdminSectionTab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview'
  );

  // Analytics & Providers Data
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

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

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((data) => {
        if (data.role !== 'admin') {
          if (data.role === 'customer') router.replace('/customer/services');
          else if (data.role === 'provider') router.replace('/provider');
          return;
        }
        setUser(data);
        fetchStats();
        fetchProviders();
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, fetchStats, fetchProviders]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      router.replace('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-on-surface">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
            progress_activity
          </span>
        </main>
        <Footer />
      </div>
    );
  }

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
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-margin-mobile md:px-margin py-4 sm:py-space-lg md:py-space-xl space-y-4 sm:space-y-space-lg">
        {/* Admin Header Bar */}
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-3.5 sm:p-space-md md:p-space-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[24px] sm:text-[28px] shrink-0">
                admin_panel_settings
              </span>
              <h1 className="text-lg sm:text-headline-sm font-headline-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                {lang === 'am' ? 'የደሴ ሎካል አስተዳዳሪ ፖርታል' : 'Dessie Local Admin Portal'}
              </h1>
            </div>
            <p className="text-xs sm:text-body-sm text-on-surface-variant dark:text-inverse-on-surface/90 mt-0.5 sm:mt-1 font-medium">
              {portalSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-start shrink-0">
            <div className="text-left sm:text-right min-w-0">
              <p className="text-xs sm:text-label-md font-bold text-on-surface dark:text-inverse-on-surface truncate">
                {user?.name}
              </p>
              <p className="text-2xs sm:text-xs text-outline dark:text-inverse-on-surface/75 truncate">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={loggingOut}
              className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-error hover:text-white dark:hover:bg-error text-on-surface dark:text-inverse-on-surface text-2xs sm:text-label-md font-label-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">logout</span>
              <span>{loggingOut ? t.btnLogoutLoading : t.btnLogout}</span>
            </button>
          </div>
        </div>

        {/* Admin Sub-Navigation Tabs */}
        <nav
          aria-label="Admin Portal Sections"
          className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 p-1.5 shadow-sm overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 min-w-max">
            {navTabs.map((tab) => {
              const isActive = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSection(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-label-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{lang === 'am' ? tab.labelAm : tab.labelEn}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : tab.badgeTone === 'danger'
                          ? 'bg-error/15 text-error'
                          : 'bg-secondary/15 text-secondary'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Expanded Overview KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-space-sm">
          {/* Card 1: Total Providers */}
          <button
            type="button"
            onClick={() => setActiveSection('providers')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-outline dark:text-inverse-on-surface/85 uppercase tracking-wider">
                {lang === 'am' ? 'ጠቅላላ አቅራቢዎች' : 'Total Providers'}
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container dark:text-inverse-primary">
                engineering
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white mt-1 block">
              {totalProvidersCount}
            </span>
            <span className="text-[11px] text-secondary font-medium mt-0.5 block">
              {pendingProvidersCount}{' '}
              {lang === 'am' ? 'ማረጋገጫ የሚጠብቁ' : 'pending verification'}
            </span>
          </button>

          {/* Card 2: Total Users / Clients */}
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-outline dark:text-inverse-on-surface/85 uppercase tracking-wider">
                {lang === 'am' ? 'ጠቅላላ ደንበኞች' : 'Total Users / Clients'}
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container dark:text-inverse-primary">
                group
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white mt-1 block">
              {stats?.total_users ?? 0}
            </span>
            <span className="text-[11px] text-outline dark:text-outline-variant font-medium mt-0.5 block">
              {stats?.total_requests ?? 0}{' '}
              {lang === 'am' ? 'ጠቅላላ ጥያቄዎች' : 'total requests'}
            </span>
          </button>

          {/* Card 3: Today's Active Users / Activity */}
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-primary-container text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-primary-container dark:text-inverse-primary uppercase tracking-wider">
                {lang === 'am' ? 'የዛሬ ንቁ ተጠቃሚዎች' : "Today's Active Users"}
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary-container dark:text-inverse-primary">
                trending_up
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-primary-container dark:text-inverse-primary mt-1 block">
              {stats?.active_users_today ?? 0}
            </span>
            <span className="text-[11px] text-outline dark:text-outline-variant font-medium mt-0.5 block">
              {stats?.requests_today ?? 0}{' '}
              {lang === 'am' ? 'የዛሬ ጥያቄዎች' : 'requests today'}
            </span>
          </button>

          {/* Card 4: Open Complaints / Issues */}
          <button
            type="button"
            onClick={() => setActiveSection('complaints')}
            className="p-3 sm:p-4 rounded-xl border bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-error text-left transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs sm:text-xs font-bold text-error dark:text-error-container uppercase tracking-wider">
                {lang === 'am' ? 'ክፍት ቅሬታዎች' : 'Open Complaints'}
              </span>
              {pendingComplaintsCount > 0 ? (
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse shrink-0" />
              ) : (
                <span className="material-symbols-outlined text-[18px] text-outline">
                  support_agent
                </span>
              )}
            </div>
            <span className="text-xl sm:text-2xl font-bold text-error dark:text-error-container mt-1 block">
              {pendingComplaintsCount}
            </span>
            <span className="text-[11px] text-outline dark:text-outline-variant font-medium mt-0.5 block">
              {stats?.total_complaints_count ?? 0}{' '}
              {lang === 'am' ? 'ጠቅላላ ቅሬታዎች' : 'total tickets'}
            </span>
          </button>
        </div>

        {/* Active Admin Section View */}
        {activeSection === 'overview' && (
          <AdminOverviewPanel
            stats={stats}
            loading={loadingStats}
            lang={lang}
            t={t}
            onNavigateTab={setActiveSection}
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
          <AdminComplaintsPanel lang={lang} onComplaintUpdated={fetchStats} />
        )}
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background text-on-surface">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
              progress_activity
            </span>
          </main>
          <Footer />
        </div>
      }
    >
      <AdminPortalContent />
    </Suspense>
  );
}
