'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { getProviders, getProviderReviews, Provider, Review } from '@/lib/api/providers';

// Helper to map service names to Material Symbols icon names
const getServiceIcon = (serviceName?: string): string => {
  if (!serviceName) return 'handyman';
  const name = serviceName.toLowerCase();
  if (name.includes('plumb')) return 'plumbing';
  if (name.includes('electr')) return 'electrical_services';
  if (name.includes('clean')) return 'cleaning_services';
  if (name.includes('photo')) return 'photo_camera';
  if (name.includes('comp') || name.includes('tech') || name.includes('repair')) return 'build';
  if (name.includes('tutor') || name.includes('teach')) return 'school';
  if (name.includes('paint')) return 'format_paint';
  if (name.includes('carpent') || name.includes('wood')) return 'carpenter';
  if (name.includes('heat')) return 'water_heater';
  if (name.includes('pipe')) return 'water_drop';
  if (name.includes('sanit')) return 'sanitizer';
  return 'handyman';
};

export default function ProviderProfilePage() {
  const router = useRouter();
  const params = useParams();
  const providerIdParam = params?.id as string;

  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Data States
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 1. Authenticate customer
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

  // 2. Fetch Provider Details from existing public discovery endpoint
  const loadProviderData = useCallback(async () => {
    if (!providerIdParam) return;

    setDataLoading(true);
    setDataError(false);
    setNotFound(false);

    try {
      const providersList = await getProviders();
      const matched = providersList.find(
        (p) => String(p.id) === String(providerIdParam)
      );

      if (!matched) {
        setNotFound(true);
        setDataLoading(false);
        return;
      }

      setProvider(matched);
      setDataLoading(false);

      // Fetch Reviews for this provider_profiles.id
      setReviewsLoading(true);
      try {
        const revs = await getProviderReviews(matched.id);
        setReviews(revs);
      } catch {
        // Safe fallback: empty reviews list
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    } catch {
      setDataError(true);
      setDataLoading(false);
    }
  }, [providerIdParam]);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  // Logout handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      router.replace('/login');
    }
  };

  // User initials
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'CU';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  // Provider business avatar initials
  const providerInitials = useMemo(() => {
    if (!provider?.business_name) return 'PR';
    const words = provider.business_name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, [provider]);

  // Format date safely
  const formatReviewDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

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
      {/* ============================================================== */}
      {/* TOP APP BAR (Dessie Service Header)                             */}
      {/* ============================================================== */}
      <header className="bg-surface-container-lowest dark:bg-inverse-surface border-b border-outline-variant/30 dark:border-outline/20 shadow-sm dark:shadow-none top-0 sticky z-40 w-full px-3 sm:px-margin-mobile md:px-margin flex justify-between items-center h-14 sm:h-16 transition-colors duration-200">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/customer" className="flex items-center gap-2 sm:gap-3 focus:outline-none min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-container flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                handshake
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-headline-md font-bold text-primary dark:text-inverse-primary leading-none truncate">
                {t.brandTitle}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-outline text-[12px] sm:text-[14px]">location_on</span>
                <span className="text-[11px] sm:text-label-sm font-label-sm text-outline dark:text-outline-variant truncate">
                  {t.locationTag}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Toggle EN | አማ */}
          <div className="inline-flex items-center p-0.5 sm:p-1 rounded-full border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim shadow-sm">
            <button
              id="langBtnEn"
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'en'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              EN
            </button>
            <button
              id="langBtnAm"
              type="button"
              onClick={() => setLang('am')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'am'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface dark:hover:text-inverse-on-surface'
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
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-outline-variant/60 dark:border-outline/40 flex items-center justify-center text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-dim hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 focus:outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User quick indicator in header (Desktop) */}
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

      {/* ============================================================== */}
      {/* MAIN BODY LAYOUT (Desktop Sidebar + Main Content)               */}
      {/* ============================================================== */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col p-4 w-64 h-[calc(100vh-4rem)] sticky top-16 bg-surface-container-lowest dark:bg-inverse-surface border-r border-outline-variant/30 dark:border-outline/20 justify-between shrink-0 transition-colors duration-200">
          <div className="space-y-6">
            {/* Customer Profile Card */}
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

            {/* Navigation Tabs */}
            <nav aria-label="Desktop Side Navigation" className="space-y-1.5">
              {/* 1. Dashboard */}
              <Link
                id="navLinkDashboard"
                href="/customer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="font-label-lg text-label-lg">{t.navDashboard}</span>
              </Link>

              {/* 2. Find a Service (ACTIVE for this flow) */}
              <Link
                id="navLinkFindService"
                href="/customer/services"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-container/15 dark:bg-primary-container/25 text-primary-container dark:text-inverse-primary font-semibold transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  search
                </span>
                <span className="font-label-lg text-label-lg">{t.navFindService}</span>
              </Link>

              {/* 3. My Requests */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-outline dark:text-outline-variant/60 font-medium cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                <span className="font-label-lg text-label-lg">{t.navMyRequests}</span>
              </div>

              {/* 4. Profile */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-outline dark:text-outline-variant/60 font-medium cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined text-[22px]">person</span>
                <span className="font-label-lg text-label-lg">{t.navProfile}</span>
              </div>
            </nav>
          </div>

          {/* Bottom of Sidebar: Sign Out */}
          <div className="pt-4 border-t border-outline-variant/30 dark:border-outline/20">
            <button
              id="sidebarSignOutBtn"
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

        {/* ============================================================== */}
        {/* MAIN CONTENT CANVAS                                             */}
        {/* ============================================================== */}
        <main className="flex-1 px-3 sm:px-6 md:px-margin py-4 sm:py-8 max-w-7xl mx-auto w-full pb-36 md:pb-8">
          {/* Breadcrumb Navigation back to Services List */}
          <nav className="mb-3.5 sm:mb-6 flex items-center justify-between">
            <Link
              id="breadcrumbBackBtn"
              href="/customer/services"
              className="inline-flex items-center gap-1.5 sm:gap-2 text-on-surface-variant dark:text-outline-variant hover:text-primary-container dark:hover:text-inverse-primary text-xs sm:text-label-lg font-medium transition-colors duration-150 group"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
              <span id="breadcrumbText">{t.backToServices}</span>
            </Link>

            {/* Civic Trust Banner Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-primary-container dark:text-inverse-primary font-label-md text-label-md border border-primary-container/20">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <span>{t.verifiedProTag}</span>
            </div>
          </nav>

          {/* 1. LOADING STATE */}
          {dataLoading && (
            <div id="providerSkeletonView" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-pulse">
              <div className="lg:col-span-8 space-y-6">
                {/* Skeleton Header Card */}
                <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-8 border border-outline-variant/30 flex items-center gap-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-container-high dark:bg-surface-dim shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <div className="w-20 h-5 rounded-full bg-surface-container-high dark:bg-surface-dim" />
                      <div className="w-24 h-5 rounded-full bg-surface-container-high dark:bg-surface-dim" />
                    </div>
                    <div className="w-3/4 h-8 rounded bg-surface-container-high dark:bg-surface-dim" />
                    <div className="w-1/2 h-5 rounded bg-surface-container-high dark:bg-surface-dim" />
                  </div>
                </div>
                {/* Skeleton About Card */}
                <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-8 border border-outline-variant/30 space-y-4">
                  <div className="w-48 h-6 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="w-full h-4 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="w-5/6 h-4 rounded bg-surface-container-high dark:bg-surface-dim" />
                </div>
                {/* Skeleton Services Card */}
                <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-8 border border-outline-variant/30 space-y-4">
                  <div className="w-52 h-6 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="flex gap-2">
                    <div className="w-24 h-8 rounded-lg bg-surface-container-high dark:bg-surface-dim" />
                    <div className="w-32 h-8 rounded-lg bg-surface-container-high dark:bg-surface-dim" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-6 border border-outline-variant/30 space-y-4">
                  <div className="w-32 h-6 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="w-full h-12 rounded bg-surface-container-high dark:bg-surface-dim" />
                </div>
              </div>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {!dataLoading && dataError && (
            <div
              id="providerErrorView"
              className="max-w-xl mx-auto my-12 bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-8 border border-error/30 shadow-md text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-error-container/40 text-error mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">cloud_off</span>
              </div>
              <h2 id="providerErrorTitle" className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
                {t.providerErrorTitle}
              </h2>
              <p id="providerErrorSubtitle" className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
                {t.providerErrorSubtitle}
              </p>
              <div className="pt-2">
                <button
                  id="providerRetryBtn"
                  type="button"
                  onClick={loadProviderData}
                  className="px-6 py-2.5 rounded-lg bg-primary-container text-white font-label-lg text-label-lg font-bold inline-flex items-center gap-2 hover:bg-primary transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>{t.errorRetryBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. NOT FOUND STATE */}
          {!dataLoading && !dataError && notFound && (
            <div
              id="providerNotFoundView"
              className="max-w-xl mx-auto my-12 bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-8 border border-outline-variant/30 shadow-md text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-surface-container dark:bg-surface-dim mx-auto flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[36px]">person_off</span>
              </div>
              <h2 id="providerNotFoundTitle" className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
                {t.providerNotFoundTitle}
              </h2>
              <p id="providerNotFoundDesc" className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
                {t.providerNotFoundDesc}
              </p>
              <div className="pt-2">
                <Link
                  id="notFoundBackBtn"
                  href="/customer/services"
                  className="px-6 py-2.5 rounded-lg bg-primary-container text-white font-label-lg text-label-lg font-bold inline-flex items-center gap-2 hover:bg-primary transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>{t.backToServices}</span>
                </Link>
              </div>
            </div>
          )}

          {/* 4. NORMAL PROVIDER PROFILE VIEW */}
          {!dataLoading && !dataError && !notFound && provider && (
            <div id="providerProfileNormalView" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* PRIMARY CONTENT COLUMN (8 COLUMNS ON DESKTOP) */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. Provider Identity Header Card */}
                <article className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-4 sm:p-6 md:p-8 border border-outline-variant/30 shadow-sm relative overflow-hidden">
                  {/* Decorative top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary-container" />

                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-6">
                    {/* Provider Avatar initials */}
                    <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl bg-primary-container/15 dark:bg-primary-container/25 border-2 border-primary-container/20 flex items-center justify-center text-primary-container dark:text-inverse-primary font-bold text-lg sm:text-2xl md:text-3xl font-headline-lg shrink-0 shadow-sm">
                      <span>{providerInitials}</span>
                    </div>

                    {/* Provider Details */}
                    <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Verification Badge */}
                        {provider.verification_status === 'verified' && (
                          <span
                            id="profileBadgeVerified"
                            className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-2xs sm:text-xs font-semibold bg-primary-container/10 text-primary-container dark:text-inverse-primary border border-primary-container/20"
                          >
                            <span className="material-symbols-outlined text-[13px] sm:text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              verified
                            </span>
                            <span>{t.badgeVerified}</span>
                          </span>
                        )}

                        {/* Availability Badge */}
                        {provider.availability_status === 'available' && (
                          <span
                            id="profileBadgeAvailability"
                            className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-2xs sm:text-xs font-semibold bg-primary-container/10 text-primary-container dark:text-inverse-primary border border-primary-container/20"
                          >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-container animate-pulse" />
                            <span>{t.statusAvailable}</span>
                          </span>
                        )}
                        {provider.availability_status === 'busy' && (
                          <span
                            id="profileBadgeAvailability"
                            className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-2xs sm:text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20"
                          >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary" />
                            <span>{t.statusBusy}</span>
                          </span>
                        )}
                        {provider.availability_status === 'offline' && (
                          <span
                            id="profileBadgeAvailability"
                            className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-2xs sm:text-xs font-semibold bg-surface-container dark:bg-surface-dim text-outline border border-outline-variant/30"
                          >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-outline" />
                            <span>{t.statusOffline}</span>
                          </span>
                        )}

                        {/* Experience Badge (only displayed if provided) */}
                        {provider.experience_years > 0 && (
                          <span
                            id="profileBadgeExp"
                            className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-2xs sm:text-xs font-medium bg-surface-container dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant border border-outline-variant/30"
                          >
                            <span className="material-symbols-outlined text-[13px] sm:text-[14px]">workspace_premium</span>
                            <span>
                              {provider.experience_years} {t.yearsExperience}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Business Name */}
                      <h1
                        id="profileBusinessName"
                        className="font-headline-lg text-lg sm:text-2xl md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight leading-snug break-words"
                      >
                        {provider.business_name}
                      </h1>

                      {/* Location & Contact Phone */}
                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-on-surface-variant dark:text-outline-variant text-xs sm:text-label-lg font-medium">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] sm:text-[18px] text-secondary">
                            location_on
                          </span>
                          <span id="profileLocation">{provider.location}, Dessie</span>
                        </div>
                        {provider.phone && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] sm:text-[18px] text-primary-container dark:text-inverse-primary">
                              call
                            </span>
                            <a
                              id="profileHeaderPhone"
                              href={`tel:${provider.phone}`}
                              className="text-primary-container dark:text-inverse-primary font-mono hover:underline"
                            >
                              {provider.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>

                {/* 2. About this Provider Card */}
                <section
                  id="profileAboutSection"
                  className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-4 sm:p-6 md:p-8 border border-outline-variant/30 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-3">
                    <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-xl">
                      badge
                    </span>
                    <h2
                      id="profileAboutTitle"
                      className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface"
                    >
                      {t.aboutProviderTitle}
                    </h2>
                  </div>

                  <div className="pl-4 border-l-4 border-primary-container/40 py-1 bg-surface-container-low/40 dark:bg-surface-dim/20 rounded-r-lg p-3">
                    <p
                      id="profileDescription"
                      className="font-body-md text-body-md text-on-surface dark:text-inverse-on-surface leading-relaxed"
                    >
                      {provider.description && provider.description.trim()
                        ? provider.description
                        : t.noDescriptionProvided}
                    </p>
                  </div>

                  {/* ID & Municipal verification highlight */}
                  <div className="pt-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/30 border border-outline-variant/20">
                      <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[20px] shrink-0 mt-0.5">
                        verified_user
                      </span>
                      <div>
                        <h4 className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                          {t.verifiedProTag}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant">
                          Dessie, Wollo, Amhara Region • {provider.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Services Offered Card */}
                <section
                  id="profileServicesSection"
                  className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-4 sm:p-6 md:p-8 border border-outline-variant/30 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-xl">
                        build
                      </span>
                      <h2
                        id="profileServicesTitle"
                        className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface"
                      >
                        {t.servicesOfferedTitle}
                      </h2>
                    </div>
                    {provider.services?.length > 0 && (
                      <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant bg-surface-container dark:bg-surface-dim px-2.5 py-0.5 rounded-full font-medium">
                        {provider.services.length} {t.activeSpecialtiesSuffix}
                      </span>
                    )}
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant">
                    {t.servicesIntroSub}
                  </p>

                  <div id="profileServicesList" className="flex flex-wrap gap-2.5 pt-1">
                    {provider.services?.map((svc) => (
                      <Link
                        key={svc.id}
                        href={`/customer/requests/create?provider_id=${provider.id}&service_id=${svc.id}`}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/40 hover:border-primary-container transition-colors group cursor-pointer"
                        title={`${t.requestServiceBtn} - ${svc.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary-container dark:text-inverse-primary group-hover:scale-110 transition-transform">
                          {getServiceIcon(svc.name)}
                        </span>
                        <span className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                          {svc.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* 4. Customer Reviews Card (GET /api/providers/{provider}/reviews) */}
                <section
                  id="profileReviewsSection"
                  className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-4 sm:p-6 md:p-8 border border-outline-variant/30 shadow-sm space-y-4 sm:space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="material-symbols-outlined text-secondary text-xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <h2
                          id="profileReviewsTitle"
                          className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface"
                        >
                          {t.customerReviewsTitle}
                        </h2>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-0.5">
                        {t.customerReviewsSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Reviews Loading State */}
                  {reviewsLoading && (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-20 bg-surface-container-high dark:bg-surface-dim rounded-lg" />
                      <div className="h-20 bg-surface-container-high dark:bg-surface-dim rounded-lg" />
                    </div>
                  )}

                  {/* Empty Reviews State */}
                  {!reviewsLoading && reviews.length === 0 && (
                    <div
                      id="noReviewsView"
                      className="text-center py-8 px-4 bg-surface-container-low/40 dark:bg-surface-dim/20 rounded-xl border border-outline-variant/20 space-y-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-surface-container dark:bg-surface-dim mx-auto flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-2xl">rate_review</span>
                      </div>
                      <div>
                        <h3
                          id="noReviewsTitle"
                          className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface"
                        >
                          {t.noReviewsYet}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-1 max-w-md mx-auto">
                          {t.noReviewsYetDesc}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  {!reviewsLoading && reviews.length > 0 && (
                    <div id="reviewsList" className="space-y-4">
                      {reviews.map((rev) => {
                        const custName = rev.customer?.name || t.verifiedCustomerTag;
                        const custInitial = custName[0]?.toUpperCase() || 'C';

                        return (
                          <article
                            key={rev.id}
                            className="p-5 rounded-lg bg-surface-container-low/50 dark:bg-surface-dim/30 border border-outline-variant/20 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary font-bold flex items-center justify-center font-headline-sm text-headline-sm border border-primary-container/20">
                                  {custInitial}
                                </div>
                                <div>
                                  <h3 className="font-label-lg text-label-lg font-bold text-on-surface dark:text-inverse-on-surface">
                                    {custName}
                                  </h3>
                                  <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                                    {formatReviewDate(rev.created_at)}
                                  </p>
                                </div>
                              </div>

                              {/* Star Rating Display */}
                              <div
                                aria-label={`${rev.rating} out of 5 stars`}
                                className="flex text-amber-500"
                              >
                                {[1, 2, 3, 4, 5].map((starIdx) => (
                                  <span
                                    key={starIdx}
                                    className="material-symbols-outlined text-[18px]"
                                    style={{
                                      fontVariationSettings:
                                        starIdx <= rev.rating ? "'FILL' 1" : "'FILL' 0",
                                    }}
                                  >
                                    star
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Comment */}
                            {rev.comment && (
                              <p className="font-body-md text-body-md text-on-surface dark:text-inverse-on-surface">
                                &quot;{rev.comment}&quot;
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-outline font-label-sm">
                              <span className="material-symbols-outlined text-[14px] text-primary-container dark:text-inverse-primary">
                                check_circle
                              </span>
                              <span>{t.verifiedCustomerTag}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {/* Customer Privacy Guarantee Note */}
                  <div className="pt-2 flex items-center gap-2 text-xs text-on-surface-variant dark:text-outline-variant border-t border-outline-variant/20">
                    <span className="material-symbols-outlined text-[16px] text-primary-container dark:text-inverse-primary">
                      lock
                    </span>
                    <span>{t.customerPrivacyNote}</span>
                  </div>
                </section>
              </div>

              {/* RIGHT / SIDEBAR ACTION CARD (4 COLUMNS, STICKY ON DESKTOP) */}
              <aside className="lg:col-span-4 sticky top-24 space-y-6">
                <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl p-6 border border-outline-variant/30 shadow-md space-y-5">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                      {t.brandTitle}
                    </span>
                    <h3
                      id="actionCardTitle"
                      className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface mt-1"
                    >
                      {t.coordinateRequestTitle}
                    </h3>
                  </div>

                  {/* At-a-Glance Status Matrix */}
                  <div className="space-y-3 py-2 border-y border-outline-variant/20">
                    <div className="flex items-center justify-between font-label-md text-label-md">
                      <span className="text-on-surface-variant dark:text-outline-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary-container dark:text-inverse-primary">
                          radio_button_checked
                        </span>
                        <span>{t.filterAvailabilityLabel}</span>
                      </span>
                      <span className="font-semibold text-primary-container dark:text-inverse-primary capitalize">
                        {provider.availability_status}
                      </span>
                    </div>

                    {provider.experience_years > 0 && (
                      <div className="flex items-center justify-between font-label-md text-label-md">
                        <span className="text-on-surface-variant dark:text-outline-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary-container dark:text-inverse-primary">
                            history_edu
                          </span>
                          <span>{t.experienceLabel}</span>
                        </span>
                        <span className="font-semibold text-on-surface dark:text-inverse-on-surface">
                          {provider.experience_years} {t.experienceYearsSuffix}
                        </span>
                      </div>
                    )}

                    {provider.phone && (
                      <div className="flex items-center justify-between font-label-md text-label-md">
                        <span className="text-on-surface-variant dark:text-outline-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary-container dark:text-inverse-primary">
                            call
                          </span>
                          <span>{t.providerPhoneLabel}</span>
                        </span>
                        <a
                          id="actionCardPhoneLink"
                          href={`tel:${provider.phone}`}
                          className="font-semibold text-primary-container dark:text-inverse-primary font-mono hover:underline"
                        >
                          {provider.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Request Service & Call Provider */}
                  <div className="space-y-3 pt-1">
                    <Link
                      id="desktopRequestServiceBtn"
                      href={`/customer/requests/create?provider_id=${provider.id}${
                        provider.services && provider.services.length > 0
                          ? `&service_id=${provider.services[0].id}`
                          : ''
                      }`}
                      className="w-full h-12 bg-primary-container hover:bg-primary text-white font-label-lg text-label-lg font-bold rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      <span>{t.requestServiceBtn}</span>
                    </Link>

                    {provider.phone && (
                      <a
                        id="desktopCallProviderBtn"
                        href={`tel:${provider.phone}`}
                        className="w-full h-11 bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface font-label-lg text-label-lg font-semibold rounded-lg border border-outline-variant/40 transition-colors duration-150 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px] text-primary-container dark:text-inverse-primary">
                          call
                        </span>
                        <span>{t.callProviderBtn}</span>
                      </a>
                    )}

                    <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant text-center leading-normal">
                      {t.coordinateRequestSub}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE STICKY BOTTOM REQUEST CTA (< md)                         */}
      {/* ============================================================== */}
      {!dataLoading && !dataError && !notFound && provider && (
        <div className="sticky bottom-16 left-0 w-full p-margin-mobile bg-surface-container-lowest/95 dark:bg-inverse-surface/95 backdrop-blur-md border-t border-outline-variant/30 z-40 md:hidden flex gap-2">
          {provider.phone && (
            <a
              id="mobileCallProviderBtn"
              href={`tel:${provider.phone}`}
              className="h-12 px-4 bg-surface-container-high dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface rounded-xl border border-outline-variant/40 font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl text-primary-container dark:text-inverse-primary">
                call
              </span>
              <span>{t.callProviderBtn}</span>
            </a>
          )}
          <Link
            id="mobileRequestServiceBtn"
            href={`/customer/requests/create?provider_id=${provider.id}${
              provider.services && provider.services.length > 0
                ? `&service_id=${provider.services[0].id}`
                : ''
            }`}
            className="flex-1 h-12 bg-primary-container text-white hover:bg-primary rounded-xl font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">send</span>
            <span>{t.requestServiceBtn}</span>
          </Link>
        </div>
      )}

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                            */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 h-16 md:hidden bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant/30 dark:border-outline/20 shadow-lg dark:shadow-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Tab 1: Dashboard */}
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navDashboard}</span>
        </Link>

        {/* Tab 2: Find Service (ACTIVE for this customer flow) */}
        <Link
          href="/customer/services"
          className="flex flex-col items-center justify-center text-primary-container dark:text-inverse-primary font-bold py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            search
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navFindService}</span>
        </Link>

        {/* Tab 3: Requests */}
        <div className="flex flex-col items-center justify-center text-outline dark:text-outline-variant/50 py-1 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navMyRequests}</span>
        </div>

        {/* Tab 4: Profile */}
        <div className="flex flex-col items-center justify-center text-outline dark:text-outline-variant/50 py-1 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navProfile}</span>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* FOOTER                                                          */}
      {/* ============================================================== */}
      <footer className="mt-auto hidden md:block border-t border-outline-variant/30 dark:border-outline/20 bg-surface-container-lowest dark:bg-inverse-surface py-5 px-margin text-center transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-on-surface-variant dark:text-outline-variant font-label-md">
          <span>{t.footerCopyright}</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerPrivacy}</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerTerms}</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerSupport}</span>
          </div>
        </div>
      </footer>

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
