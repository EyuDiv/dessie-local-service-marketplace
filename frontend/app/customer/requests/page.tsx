'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';

export default function MyRequestsPlaceholderPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((user) => {
        if (user.role !== 'customer') {
          if (user.role === 'provider') router.replace('/provider');
          else if (user.role === 'admin') router.replace('/admin');
          return;
        }
        setCurrentUser(user);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setAuthLoading(false);
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

  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'CU';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <span className="material-symbols-outlined text-[40px] animate-spin text-primary-container">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md text-body-md antialiased transition-colors duration-200 selection:bg-primary-container selection:text-white">
      {/* Top Bar */}
      <header className="bg-surface-container-lowest dark:bg-inverse-surface border-b border-outline-variant/30 dark:border-outline/20 shadow-sm dark:shadow-none top-0 sticky z-40 w-full px-margin-mobile md:px-margin flex justify-between items-center h-16 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="flex items-center gap-3 focus:outline-none">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white font-bold shadow-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                handshake
              </span>
            </div>
            <div>
              <div className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary leading-none">
                {t.brandTitle}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-outline text-[14px]">location_on</span>
                <span className="font-label-sm text-label-sm text-outline dark:text-outline-variant">
                  {t.locationTag}
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="inline-flex items-center p-1 rounded-full border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim shadow-sm">
            <button
              id="langBtnEn"
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-0.5 rounded-full text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'en'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface'
              }`}
            >
              EN
            </button>
            <button
              id="langBtnAm"
              type="button"
              onClick={() => setLang('am')}
              className={`px-2.5 py-0.5 rounded-full text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'am'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface'
              }`}
            >
              አማ
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            id="themeToggleBtn"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-lg border border-outline-variant/60 dark:border-outline/40 flex items-center justify-center text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-dim hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 focus:outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User quick indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-outline-variant/40">
            <div className="w-8 h-8 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary font-bold text-xs flex items-center justify-center border border-primary-container/20">
              {userInitials}
            </div>
            <span className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col p-4 w-64 h-[calc(100vh-4rem)] sticky top-16 bg-surface-container-lowest dark:bg-inverse-surface border-r border-outline-variant/30 dark:border-outline/20 justify-between shrink-0 transition-colors duration-200">
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-container text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                {userInitials}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                  {currentUser?.name}
                </h4>
                <p className="font-label-sm text-label-sm text-outline dark:text-outline-variant truncate flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                  <span>Dessie, Wollo</span>
                </p>
              </div>
            </div>

            <nav aria-label="Desktop Side Navigation" className="space-y-1.5">
              <Link
                href="/customer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="font-label-lg text-label-lg">{t.navDashboard}</span>
              </Link>

              <Link
                href="/customer/services"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">search</span>
                <span className="font-label-lg text-label-lg">{t.navFindService}</span>
              </Link>

              <Link
                href="/customer/requests"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-container/15 dark:bg-primary-container/25 text-primary-container dark:text-inverse-primary font-semibold transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  receipt_long
                </span>
                <span className="font-label-lg text-label-lg">{t.navMyRequests}</span>
              </Link>

              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-outline dark:text-outline-variant/60 font-medium cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined text-[22px]">person</span>
                <span className="font-label-lg text-label-lg">{t.navProfile}</span>
              </div>
            </nav>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 dark:border-outline/20">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error-container/40 dark:hover:bg-error/20 transition-colors duration-150 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
              <span className="font-label-lg text-label-lg">
                {loggingOut ? t.btnLogoutLoading : t.navSignOut}
              </span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col justify-center items-center text-center pb-24 md:pb-8">
          <div className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-2xl p-8 sm:p-12 shadow-sm max-w-lg w-full space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                receipt_long
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {t.myRequestsPlaceholderTitle}
            </h2>

            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
              {t.myRequestsPlaceholderDesc}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/customer"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-surface-container dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-colors"
              >
                {t.btnBackToDashboard}
              </Link>
              <Link
                href="/customer/services"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary-container text-white font-label-lg text-label-lg font-bold hover:bg-primary transition-colors shadow-sm"
              >
                {t.navFindService}
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 h-16 md:hidden bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant/30 dark:border-outline/20 shadow-lg dark:shadow-none"
      >
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navDashboard}</span>
        </Link>

        <Link
          href="/customer/services"
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navFindService}</span>
        </Link>

        <Link
          href="/customer/requests"
          className="flex flex-col items-center justify-center text-primary-container dark:text-inverse-primary font-bold py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            receipt_long
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navMyRequests}</span>
        </Link>

        <div className="flex flex-col items-center justify-center text-outline dark:text-outline-variant/60 py-1 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navProfile}</span>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </div>
  );
}
