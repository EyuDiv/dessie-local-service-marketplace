'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import { useLanguage } from '@/components/LanguageContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((data) => {
        if (data.role !== 'provider') {
          if (data.role === 'customer') router.replace('/customer');
          else if (data.role === 'admin') router.replace('/admin');
          return;
        }
        setUser(data);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

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

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-margin-mobile md:px-margin py-space-xl">
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-space-lg md:p-space-xl max-w-2xl mx-auto">
          <div className="flex justify-between items-start border-b border-outline-variant/30 pb-space-md mb-space-md">
            <div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface dark:text-inverse-on-surface">
                {t.dashboardProvider}
              </h1>
              <p className="text-body-sm text-on-surface-variant dark:text-outline-variant mt-1">
                {t.dashboardPlaceholder}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-error hover:text-white dark:hover:bg-error text-on-surface dark:text-inverse-on-surface text-label-md font-label-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>{loggingOut ? t.btnLogoutLoading : t.btnLogout}</span>
            </button>
          </div>

          <div className="space-y-space-sm text-body-md">
            <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
              <span className="font-semibold text-outline">{t.dashboardUser}:</span>
              <span className="font-bold text-on-surface dark:text-inverse-on-surface">{user?.name}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
              <span className="font-semibold text-outline">{t.dashboardEmail}:</span>
              <span>{user?.email}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
              <span className="font-semibold text-outline">{t.dashboardRole}:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container/20 text-secondary border border-secondary-container/40">
                {user?.role}
              </span>
            </div>
            {user?.provider_profile && (
              <>
                <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
                  <span className="font-semibold text-outline">{t.labelBusiness}:</span>
                  <span>{user.provider_profile.business_name}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
                  <span className="font-semibold text-outline">{t.labelLocation}:</span>
                  <span>{user.provider_profile.location}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 flex justify-between">
                  <span className="font-semibold text-outline">{t.labelExperience}:</span>
                  <span>{user.provider_profile.experience_years} years</span>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
