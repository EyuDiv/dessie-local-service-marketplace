'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { getCustomerRequests, ServiceRequestItem } from '@/lib/api/requests';
import { getProviders, Provider } from '@/lib/api/providers';

const POPULAR_CATEGORIES = [
  { id: 'plumbing', nameEn: 'Plumbing', nameAm: 'የቧንቧ ስራ', icon: 'plumbing', color: 'from-blue-500/20 to-blue-600/10 text-blue-600 dark:text-blue-400' },
  { id: 'electrical', nameEn: 'Electrical', nameAm: 'የኤሌክትሪክ ስራ', icon: 'bolt', color: 'from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400' },
  { id: 'carpentry', nameEn: 'Carpentry', nameAm: 'የአናጺ ስራ', icon: 'carpenter', color: 'from-orange-500/20 to-orange-600/10 text-orange-600 dark:text-orange-400' },
  { id: 'painting', nameEn: 'Painting', nameAm: 'የቀለም ቅብ', icon: 'format_paint', color: 'from-purple-500/20 to-purple-600/10 text-purple-600 dark:text-purple-400' },
  { id: 'cleaning', nameEn: 'Cleaning', nameAm: 'የጽዳት ስራ', icon: 'cleaning_services', color: 'from-teal-500/20 to-teal-600/10 text-teal-600 dark:text-teal-400' },
  { id: 'tech', nameEn: 'Tech & PC', nameAm: 'የኮምፒውተር ጥገና', icon: 'computer', color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400' },
];

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Live Data
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((data) => {
        if (data.role !== 'customer') {
          if (data.role === 'provider') router.replace('/provider');
          else if (data.role === 'admin') router.replace('/admin');
          return;
        }
        setUser(data);
        loadDashboardData();
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const [reqData, provData] = await Promise.all([
        getCustomerRequests().catch(() => []),
        getProviders().catch(() => []),
      ]);
      setRequests(reqData);
      setProviders(provData);
    } catch (err) {
      console.error('Error loading customer dashboard data:', err);
    }
  };

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

  const activeCount = requests.filter(
    (r) => r.status === 'in_progress' || r.status === 'accepted'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl space-y-space-lg">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low dark:from-inverse-surface dark:via-[#1c1916] dark:to-inverse-surface rounded-2xl border border-outline-variant/40 shadow-sm p-space-lg md:p-space-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container dark:bg-primary-container/20 dark:text-inverse-primary border border-primary-container/30">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{lang === 'am' ? 'የደሴ ማዘጋጃ ቤት የአገልግሎት አውታረ መረብ' : 'Dessie Verified Local Marketplace'}</span>
              </div>
              <h1 className="text-headline-lg font-headline-lg font-extrabold text-on-surface dark:text-white tracking-tight">
                {t.dashWelcome}, {user?.name}!
              </h1>
              <p className="text-body-md text-on-surface-variant dark:text-inverse-on-surface/90 leading-relaxed">
                {t.dashboardCustomerSubtitle}
              </p>
            </div>

            {/* Profile Pill & Logout */}
            <div className="flex items-center gap-3 bg-surface-container-high/60 dark:bg-surface-dim/80 p-2.5 rounded-xl border border-outline-variant/30 backdrop-blur-sm self-stretch md:self-auto justify-between md:justify-start">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary-container/15 text-primary-container dark:bg-primary-container/25 dark:text-inverse-primary flex items-center justify-center font-bold text-base">
                  {user?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface dark:text-white leading-tight">
                    {user?.name}
                  </p>
                  <p className="text-xs text-outline dark:text-inverse-on-surface/75">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                disabled={loggingOut}
                title={t.btnLogout}
                className="p-2 rounded-lg hover:bg-error hover:text-white text-on-surface dark:text-inverse-on-surface transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>

          {/* Quick Search Bar inside Hero */}
          <form onSubmit={handleSearchSubmit} className="mt-6 max-w-2xl relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline dark:text-inverse-on-surface/70 text-[22px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'am' ? 'የቧንቧ፣ ኤሌክትሪክ ወይም አናጺ አገልግሎት በደሴ ይፈልጉ...' : 'Search plumbers, electricians, carpenters in Dessie...'}
              className="w-full pl-12 pr-28 py-3.5 rounded-xl bg-surface-container-lowest dark:bg-surface-dim border border-outline-variant/60 dark:border-outline-variant/80 focus:outline-none focus:border-primary-container text-body-sm text-on-surface dark:text-white placeholder:text-outline dark:placeholder:text-[#a89a90] shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-bold hover:bg-primary transition-colors cursor-pointer shadow-sm"
            >
              {t.findServiceBtn}
            </button>
          </form>
        </div>

        {/* 4 Key Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm md:gap-space-md">
          {/* Total Requests */}
          <div
            onClick={() => router.push('/customer/requests')}
            className="p-space-md rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-outline dark:text-inverse-on-surface/80 uppercase tracking-wider">
                {t.dashTotalRequests}
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-container/10 dark:bg-primary-container/20 text-primary-container dark:text-inverse-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-on-surface dark:text-white mt-2">
              {requests.length}
            </div>
            <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">
              {lang === 'am' ? 'የቀረቡ ጥያቄዎች' : 'All submitted requests'}
            </p>
          </div>

          {/* Active Jobs */}
          <div
            onClick={() => router.push('/customer/requests')}
            className="p-space-md rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-secondary transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary dark:text-secondary-container uppercase tracking-wider">
                {t.dashActiveRequests}
              </span>
              <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary dark:text-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">engineering</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-secondary dark:text-secondary-container mt-2">
              {activeCount}
            </div>
            <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">
              {lang === 'am' ? 'ተቀባይነት ያገኙ / በስራ ላይ' : 'Accepted or in progress'}
            </p>
          </div>

          {/* Completed Services */}
          <div
            onClick={() => router.push('/customer/requests')}
            className="p-space-md rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary-container dark:text-inverse-primary uppercase tracking-wider">
                {t.dashCompletedRequests}
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-container/15 text-primary-container dark:text-inverse-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-primary-container dark:text-inverse-primary mt-2">
              {completedCount}
            </div>
            <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">
              {lang === 'am' ? 'በተሳካ ሁኔታ የተጠናቀቁ' : 'Successfully completed'}
            </p>
          </div>

          {/* Verified Pros Available */}
          <div
            onClick={() => router.push('/customer/services')}
            className="p-space-md rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-tertiary-container transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tertiary dark:text-amber-400 uppercase tracking-wider">
                {t.dashVerifiedPros}
              </span>
              <div className="w-8 h-8 rounded-lg bg-tertiary-container/20 text-tertiary dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-on-surface dark:text-white mt-2">
              {providers.length > 0 ? providers.length : '10+'}
            </div>
            <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">
              {lang === 'am' ? 'በደሴ የተረጋገጡ ባለሙያዎች' : 'Active pros in Dessie'}
            </p>
          </div>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {/* Find Services Card */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container/15 text-primary-container dark:bg-primary-container/25 dark:text-inverse-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">search</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-white">
                  {lang === 'am' ? 'የተረጋገጡ አቅራቢዎችን ፈልግ' : 'Find Local Service Providers'}
                </h3>
                <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-1 leading-relaxed">
                  {lang === 'am'
                    ? 'በደሴ ከተማ (ፒያሳ፣ ሆቴ፣ መናኸሪያ፣ ሮቢት) ውስጥ የተረጋገጡ የቧንቧ፣ የኤሌክትሪክ እና የአናጺ ባለሙያዎችን ያስሱ።'
                    : 'Browse vetted professionals across Piazza, Hote, Menhariya, and Robit with direct phone contacts and reviews.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/customer/services')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-white text-body-sm font-bold hover:bg-primary transition-all shadow-sm cursor-pointer self-start"
            >
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span>{t.findServiceBtn}</span>
            </button>
          </div>

          {/* Manage Requests Card */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">receipt_long</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-white">
                  {lang === 'am' ? 'የአገልግሎት ጥያቄዎቼን ተከታተል' : 'Track & Manage Service Requests'}
                </h3>
                <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-1 leading-relaxed">
                  {lang === 'am'
                    ? 'የጠየቋቸውን አገልግሎቶች ሁኔታ ይመልከቱ፣ ከአቅራቢው ጋር ይገናኙ እና የተጠናቀቁ ስራዎችን ደረጃ ይስጡ።'
                    : 'Check live status transitions, review quotes, contact your assigned tradesperson, and submit verified ratings.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/customer/requests')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-white text-body-sm font-bold transition-all border border-outline-variant/50 cursor-pointer self-start"
            >
              <span className="material-symbols-outlined text-[18px]">checklist</span>
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
              onClick={() => router.push('/customer/services')}
              className="text-xs font-bold text-primary-container dark:text-inverse-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{lang === 'am' ? 'ሁሉንም ይመልከቱ' : 'View all'}</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-space-sm">
            {POPULAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/customer/services?q=${encodeURIComponent(cat.nameEn.toLowerCase())}`)}
                className="p-4 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 hover:border-primary-container hover:shadow-sm text-center transition-all cursor-pointer group flex flex-col items-center gap-2"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[24px]">{cat.icon}</span>
                </div>
                <span className="text-xs font-bold text-on-surface dark:text-white group-hover:text-primary-container dark:group-hover:text-inverse-primary">
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
            {requests.length > 0 && (
              <button
                onClick={() => router.push('/customer/requests')}
                className="text-xs font-bold text-primary-container dark:text-inverse-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{lang === 'am' ? 'ሁሉንም ጥያቄዎች' : 'View all requests'}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/60 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">assignment_add</span>
              </div>
              <h3 className="text-title-md font-bold text-on-surface dark:text-white">
                {t.dashNoRequests}
              </h3>
              <p className="text-body-sm text-outline dark:text-inverse-on-surface/75 max-w-md mx-auto">
                {t.dashNoRequestsSub}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => router.push('/customer/services')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-white text-body-sm font-bold hover:bg-primary transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  <span>{t.findServiceBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {requests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  onClick={() => router.push('/customer/requests')}
                  className="p-4 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer space-y-3 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-on-surface dark:text-white text-body-md line-clamp-1 min-w-0 flex-1">
                        {req.service?.name || 'Service Request'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase shrink-0 border ${
                          req.status === 'completed'
                            ? 'bg-primary-container/15 text-primary-container border-primary-container/30'
                            : req.status === 'in_progress'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : req.status === 'accepted'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : req.status === 'rejected'
                            ? 'bg-error/15 text-error border-error/30'
                            : 'bg-secondary/15 text-secondary border-secondary/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {req.provider && (
                      <div className="flex items-center gap-1.5 text-xs text-outline dark:text-inverse-on-surface/75">
                        <span className="material-symbols-outlined text-[15px]">storefront</span>
                        <span className="font-semibold text-on-surface dark:text-white">
                          {req.provider.business_name}
                        </span>
                        <span>•</span>
                        <span>{req.provider.location}</span>
                      </div>
                    )}

                    <p className="text-body-sm text-outline dark:text-inverse-on-surface/85 line-clamp-2">
                      {req.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-xs text-outline dark:text-inverse-on-surface/70">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>{req.requested_date}</span>
                    </span>
                    <span className="font-semibold text-primary-container dark:text-inverse-primary flex items-center gap-0.5">
                      <span>{lang === 'am' ? 'ዝርዝር ይመልከቱ' : 'Details'}</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </span>
                  </div>
                </div>
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
