'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import ServiceRequestCard from '@/components/customer/ServiceRequestCard';
import { useLanguage } from '@/components/LanguageContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { getCustomerRequests, ServiceRequestItem } from '@/lib/api/requests';
import { getProviders, Provider } from '@/lib/api/providers';

const POPULAR_CATEGORIES = [
  { id: 'plumbing', nameEn: 'Plumbing', nameAm: 'የቧንቧ ስራ', icon: 'plumbing', color: 'from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-400' },
  { id: 'electrical', nameEn: 'Electrical', nameAm: 'የኤሌክትሪክ ስራ', icon: 'bolt', color: 'from-amber-500/20 to-amber-600/10 text-amber-800 dark:text-amber-300' },
  { id: 'carpentry', nameEn: 'Carpentry', nameAm: 'የአናጺ ስራ', icon: 'carpenter', color: 'from-orange-500/20 to-orange-600/10 text-orange-800 dark:text-orange-300' },
  { id: 'painting', nameEn: 'Painting', nameAm: 'የቀለም ቅብ', icon: 'format_paint', color: 'from-purple-500/20 to-purple-600/10 text-purple-800 dark:text-purple-300' },
  { id: 'cleaning', nameEn: 'Cleaning', nameAm: 'የጽዳት ስራ', icon: 'cleaning_services', color: 'from-teal-500/20 to-teal-600/10 text-teal-800 dark:text-teal-300' },
  { id: 'tech', nameEn: 'Tech & PC', nameAm: 'የኮምፒውተር ጥገና', icon: 'computer', color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-800 dark:text-emerald-300' },
];

let lastRawCustomerUser: string | null = null;
let lastParsedCustomerUser: User | null = null;

function subscribeAuthStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getCachedCustomerSnapshot(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('dessie_auth_user');
    if (raw === lastRawCustomerUser) return lastParsedCustomerUser;
    lastRawCustomerUser = raw;
    if (!raw) {
      lastParsedCustomerUser = null;
      return null;
    }
    const parsed = JSON.parse(raw) as User;
    lastParsedCustomerUser = parsed?.role === 'customer' ? parsed : null;
    return lastParsedCustomerUser;
  } catch {
    lastRawCustomerUser = null;
    lastParsedCustomerUser = null;
    return null;
  }
}

function getCachedCustomerServerSnapshot(): User | null {
  return null;
}

function MetricSkeletonBar() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-7 sm:h-8 w-12 rounded bg-surface-container-high dark:bg-surface-dim animate-pulse"
    />
  );
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const cachedUser = useSyncExternalStore(
    subscribeAuthStorage,
    getCachedCustomerSnapshot,
    getCachedCustomerServerSnapshot
  );
  const [freshUser, setFreshUser] = useState<User | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Live Data
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const user = freshUser ?? cachedUser;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    let active = true;

    Promise.allSettled([
      getCurrentUser(),
      getCustomerRequests(),
      getProviders(),
    ]).then(([userRes, reqRes, provRes]) => {
      if (!active) return;

      if (userRes.status === 'rejected') {
        router.replace('/login');
        return;
      }

      const data = userRes.value;
      if (data.role !== 'customer') {
        if (data.role === 'provider') router.replace('/provider');
        else if (data.role === 'admin') router.replace('/admin');
        return;
      }

      setFreshUser(data);
      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value);
      }
      if (provRes.status === 'fulfilled') {
        setProviders(provRes.value);
      }
      setDataLoading(false);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customer/services?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/customer/services');
    }
  };

  const activeCount = requests.filter(
    (r) => r.status === 'in_progress' || r.status === 'accepted'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-margin-mobile md:px-margin py-4 sm:py-space-lg md:py-space-xl space-y-4 sm:space-y-space-lg">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low dark:from-inverse-surface dark:via-[#1c1916] dark:to-inverse-surface rounded-2xl border border-outline-variant/40 shadow-sm p-4 sm:p-space-lg md:p-space-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-2xs sm:text-xs font-semibold bg-primary-container/10 text-emerald-800 dark:bg-primary-container/20 dark:text-inverse-primary border border-primary-container/30">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px] sm:text-[16px]">verified</span>
                <span>{lang === 'am' ? 'የደሴ ማዘጋጃ ቤት የአገልግሎት አውታረ መረብ' : 'Dessie Verified Local Marketplace'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-headline-lg font-headline-lg font-extrabold text-on-surface dark:text-white tracking-tight">
                {user?.name ? `${t.dashWelcome}, ${user.name}!` : `${t.dashWelcome}!`}
              </h1>
              <p className="text-xs sm:text-body-md text-gray-700 dark:text-gray-300 leading-relaxed">
                {t.dashboardCustomerSubtitle}
              </p>
            </div>

            {/* Profile Pill & Logout */}
            <div className="flex items-center gap-2.5 sm:gap-3 bg-surface-container-high/60 dark:bg-surface-dim/80 p-2 sm:p-2.5 rounded-xl border border-outline-variant/30 backdrop-blur-sm self-stretch md:self-auto justify-between md:justify-start">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-container/15 text-emerald-800 dark:bg-primary-container/25 dark:text-inverse-primary flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-label-md font-bold text-on-surface dark:text-white leading-tight truncate">
                    {user?.name || t.dashboardCustomer}
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
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                disabled={loggingOut}
                aria-label="Logout"
                title={t.btnLogout}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-error hover:text-white text-on-surface dark:text-inverse-on-surface transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] sm:text-[20px]">logout</span>
              </button>
            </div>
          </div>

          {/* Quick Search Bar inside Hero */}
          <form onSubmit={handleSearchSubmit} className="mt-4 sm:mt-6 max-w-2xl relative">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 text-[18px] sm:text-[22px]">
              search
            </span>
            <input
              type="text"
              aria-label="Search plumbers, electricians, carpenters in Dessie"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'am' ? 'የቧንቧ፣ ኤሌክትሪክ ወይም አናጺ አገልግሎት በደሴ ይፈልጉ...' : 'Search plumbers, electricians, carpenters in Dessie...'}
              className="w-full pl-9 sm:pl-12 pr-20 sm:pr-28 py-2.5 sm:py-3.5 rounded-xl bg-surface-container-lowest dark:bg-surface-dim border border-outline-variant/60 dark:border-outline-variant/80 focus:outline-none focus:border-primary-container text-xs sm:text-body-sm text-on-surface dark:text-white placeholder:text-gray-600 dark:placeholder:text-[#a89a90] shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary-container dark:bg-emerald-700 text-white text-2xs sm:text-xs font-bold hover:bg-primary dark:hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm"
            >
              {t.findServiceBtn}
            </button>
          </form>
        </div>

        {/* 4 Key Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-space-sm md:gap-space-md">
          {/* Total Requests */}
          <button
            type="button"
            onClick={() => router.push('/customer/requests')}
            className="text-left p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {t.dashTotalRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-container/10 dark:bg-primary-container/20 text-emerald-800 dark:text-inverse-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">receipt_long</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface dark:text-white mt-1.5 sm:mt-2 min-h-[32px] sm:min-h-[36px] flex items-center">
              {dataLoading ? <MetricSkeletonBar /> : requests.length}
            </div>
            <p className="text-2xs sm:text-xs text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'የቀረቡ ጥያቄዎች' : 'All submitted requests'}
            </p>
          </button>

          {/* Active Jobs */}
          <button
            type="button"
            onClick={() => router.push('/customer/requests')}
            className="text-left p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-secondary transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-amber-900 dark:text-secondary-container uppercase tracking-wider">
                {t.dashActiveRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/15 text-amber-900 dark:text-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">engineering</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 dark:text-secondary-container mt-1.5 sm:mt-2 min-h-[32px] sm:min-h-[36px] flex items-center">
              {dataLoading ? <MetricSkeletonBar /> : activeCount}
            </div>
            <p className="text-2xs sm:text-xs text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'ተቀባይነት ያገኙ / በስራ ላይ' : 'Accepted or in progress'}
            </p>
          </button>

          {/* Completed Services */}
          <button
            type="button"
            onClick={() => router.push('/customer/requests')}
            className="text-left p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-emerald-800 dark:text-inverse-primary uppercase tracking-wider">
                {t.dashCompletedRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-container/15 text-emerald-800 dark:text-inverse-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">task_alt</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800 dark:text-inverse-primary mt-1.5 sm:mt-2 min-h-[32px] sm:min-h-[36px] flex items-center">
              {dataLoading ? <MetricSkeletonBar /> : completedCount}
            </div>
            <p className="text-2xs sm:text-xs text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'በተሳካ ሁኔታ የተጠናቀቁ' : 'Successfully completed'}
            </p>
          </button>

          {/* Verified Pros Available */}
          <button
            type="button"
            onClick={() => router.push('/customer/services')}
            className="text-left p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-amber-600 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                {t.dashVerifiedPros}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface dark:text-white mt-1.5 sm:mt-2 min-h-[32px] sm:min-h-[36px] flex items-center">
              {dataLoading ? (
                <MetricSkeletonBar />
              ) : providers.length > 0 ? (
                providers.length
              ) : (
                '10+'
              )}
            </div>
            <p className="text-2xs sm:text-xs text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'በደሴ የተረጋገጡ ባለሙያዎች' : 'Active pros in Dessie'}
            </p>
          </button>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {/* Find Services Card */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container/15 text-emerald-800 dark:bg-primary-container/25 dark:text-inverse-primary flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[28px]">search</span>
              </div>
              <div>
                <h2 className="text-title-lg font-bold text-on-surface dark:text-white">
                  {lang === 'am' ? 'የተረጋገጡ አቅራቢዎችን ፈልግ' : 'Find Local Service Providers'}
                </h2>
                <p className="text-body-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                  {lang === 'am'
                    ? 'በደሴ ከተማ (ፒያሳ፣ ሆቴ፣ መናኸሪያ፣ ሮቢት) ውስጥ የተረጋገጡ የቧንቧ፣ የኤሌክትሪክ እና የአናጺ ባለሙያዎችን ያስሱ።'
                    : 'Browse vetted professionals across Piazza, Hote, Menhariya, and Robit with direct phone contacts and reviews.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/customer/services')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container dark:bg-emerald-700 text-white text-body-sm font-bold hover:bg-primary dark:hover:bg-emerald-600 transition-all shadow-sm cursor-pointer self-start"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span>{t.findServiceBtn}</span>
            </button>
          </div>

          {/* Manage Requests Card */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-amber-900 dark:bg-secondary/25 dark:text-secondary-container flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[28px]">receipt_long</span>
              </div>
              <div>
                <h2 className="text-title-lg font-bold text-on-surface dark:text-white">
                  {lang === 'am' ? 'የአገልግሎት ጥያቄዎቼን ተከታተል' : 'Track & Manage Service Requests'}
                </h2>
                <p className="text-body-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                  {lang === 'am'
                    ? 'የጠየቋቸውን አገልግሎቶች ሁኔታ ይመልከቱ፣ ከአቅራቢው ጋር ይገናኙ እና የተጠናቀቁ ስራዎችን ደረጃ ይስጡ።'
                    : 'Check live status transitions, review quotes, contact your assigned tradesperson, and submit verified ratings.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/customer/requests')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-white text-body-sm font-bold transition-all border border-outline-variant/50 cursor-pointer self-start"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">checklist</span>
              <span>{t.navMyRequests}</span>
            </button>
          </div>
        </div>

        {/* Popular Service Categories in Dessie */}
        <div className="space-y-space-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-title-lg font-bold text-on-surface dark:text-white">
              {t.dashPopularCategories}
            </h2>
            <button
              type="button"
              onClick={() => router.push('/customer/services')}
              className="text-xs font-bold text-emerald-800 dark:text-inverse-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{lang === 'am' ? 'ሁሉንም ይመልከቱ' : 'View all'}</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-space-sm">
            {POPULAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => router.push(`/customer/services?q=${encodeURIComponent(cat.nameEn.toLowerCase())}`)}
                className="p-4 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 hover:border-primary-container hover:shadow-sm text-center transition-all cursor-pointer group flex flex-col items-center gap-2"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[24px]">{cat.icon}</span>
                </div>
                <span className="text-xs font-bold text-on-surface dark:text-white group-hover:text-emerald-800 dark:group-hover:text-inverse-primary">
                  {lang === 'am' ? cat.nameAm : cat.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Service Requests Section */}
        <div className="space-y-space-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-title-lg font-bold text-on-surface dark:text-white">
              {t.dashRecentRequests}
            </h2>
            {!dataLoading && requests.length > 0 && (
              <button
                type="button"
                onClick={() => router.push('/customer/requests')}
                className="text-xs font-bold text-emerald-800 dark:text-inverse-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{lang === 'am' ? 'ሁሉንም ጥያቄዎች' : 'View all requests'}</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>

          {dataLoading ? (
            <div
              aria-busy="true"
              aria-label="Loading recent service requests"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md animate-pulse"
            >
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-3 h-36"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 rounded bg-surface-container-high dark:bg-surface-dim" />
                    <div className="h-5 w-16 rounded-full bg-surface-container-high dark:bg-surface-dim" />
                  </div>
                  <div className="h-3.5 w-3/4 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="h-3 w-1/2 rounded bg-surface-container-high dark:bg-surface-dim" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-surface-dim text-gray-700 dark:text-gray-300 flex items-center justify-center mx-auto">
                <span aria-hidden="true" className="material-symbols-outlined text-[32px]">assignment_add</span>
              </div>
              <h3 className="text-title-md font-bold text-on-surface dark:text-white">
                {t.dashNoRequests}
              </h3>
              <p className="text-body-sm text-gray-700 dark:text-gray-300 max-w-md mx-auto">
                {t.dashNoRequestsSub}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/customer/services')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container dark:bg-emerald-700 text-white text-body-sm font-bold hover:bg-primary dark:hover:bg-emerald-600 transition-all shadow-sm cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">search</span>
                  <span>{t.findServiceBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {requests.slice(0, 3).map((req) => (
                <ServiceRequestCard
                  key={req.id}
                  request={req}
                  lang={lang}
                  onClick={() => router.push(`/customer/requests?requestId=${req.id}`)}
                />
              ))}
            </div>
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
