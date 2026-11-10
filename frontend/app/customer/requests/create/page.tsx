'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { getProviders, Provider, ProviderService } from '@/lib/api/providers';
import { createServiceRequest, CreateServiceRequestPayload, ServiceRequestItem } from '@/lib/api/requests';

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
  return 'construction';
};

function CreateRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerIdParam = searchParams.get('provider_id');
  const serviceIdParam = searchParams.get('service_id');

  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Provider & Service Data
  const [provider, setProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Form Fields
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');

  // Form Field Validation Errors
  const [fieldErrors, setFieldErrors] = useState<{
    description?: string;
    location?: string;
    requested_date?: string;
    requested_time?: string;
  }>({});

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<ServiceRequestItem | null>(null);

  // Today's date in YYYY-MM-DD for min attribute
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // 1. Authenticate Customer
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

  // 2. Fetch Provider & Selected Service
  const loadProviderAndService = useCallback(async () => {
    if (!providerIdParam) {
      setInitError(t.errInvalidProvider);
      setDataLoading(false);
      return;
    }

    const pId = Number(providerIdParam);
    if (isNaN(pId) || pId <= 0) {
      setInitError(t.errInvalidProvider);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setInitError(null);

    try {
      const providersList = await getProviders();
      const matched = providersList.find((p) => p.id === pId);

      if (!matched) {
        setInitError(t.errInvalidProvider);
        setDataLoading(false);
        return;
      }

      if (matched.verification_status !== 'verified') {
        setInitError(t.errProviderNotVerified);
        setDataLoading(false);
        return;
      }

      setProvider(matched);

      // Resolve Service
      let chosenService: ProviderService | null = null;
      if (serviceIdParam) {
        const sId = Number(serviceIdParam);
        const found = matched.services?.find((s) => s.id === sId);
        if (found) {
          chosenService = found;
        } else {
          setInitError(t.errInvalidService);
          setDataLoading(false);
          return;
        }
      } else if (matched.services && matched.services.length > 0) {
        // Default to provider's first service
        chosenService = matched.services[0];
      }

      if (!chosenService) {
        setInitError(t.errInvalidService);
        setDataLoading(false);
        return;
      }

      setSelectedService(chosenService);
      setDataLoading(false);
    } catch {
      setInitError(t.providerErrorTitle);
      setDataLoading(false);
    }
  }, [providerIdParam, serviceIdParam, t]);

  useEffect(() => {
    loadProviderAndService();
  }, [loadProviderAndService]);

  // Sign out handler
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

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: {
      description?: string;
      location?: string;
      requested_date?: string;
      requested_time?: string;
    } = {};

    if (!description.trim()) {
      errors.description = t.errDescRequired;
    }
    if (!location.trim()) {
      errors.location = t.errLocRequired;
    }
    if (!requestedDate.trim()) {
      errors.requested_date = t.errDateRequired;
    }
    if (!requestedTime.trim()) {
      errors.requested_time = t.errTimeRequired;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate clicks
    if (submitting) return;

    // Reset error banners
    setSubmissionError(null);

    // Validate client-side
    const isValid = validateForm();
    if (!isValid) {
      setSubmissionError(t.errSubmissionDesc);
      return;
    }

    // Verify provider and service exist
    if (!provider || !selectedService) {
      setSubmissionError(t.errInvalidProvider);
      return;
    }

    setSubmitting(true);

    // Format requested_time to HH:mm if needed
    let formattedTime = requestedTime.trim();
    // In case time input returns HH:mm or HH:mm:ss, keep it clean
    if (/^\d{1,2}:\d{2}$/.test(formattedTime)) {
      // standard HH:mm is accepted by Laravel regex /^\d{1,2}:\d{2}(:\d{2})?$/
    }

    const payload: CreateServiceRequestPayload = {
      provider_id: provider.id,
      service_id: selectedService.id,
      description: description.trim(),
      location: location.trim(),
      requested_date: requestedDate.trim(),
      requested_time: formattedTime,
    };

    try {
      const response = await createServiceRequest(payload);
      setCreatedRequest(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        router.replace('/login');
        return;
      }

      if (status === 422) {
        const resData = err.response?.data;
        if (resData?.errors) {
          const apiFieldErrors: typeof fieldErrors = {};
          if (resData.errors.description) apiFieldErrors.description = resData.errors.description[0];
          if (resData.errors.location) apiFieldErrors.location = resData.errors.location[0];
          if (resData.errors.requested_date) apiFieldErrors.requested_date = resData.errors.requested_date[0];
          if (resData.errors.requested_time) apiFieldErrors.requested_time = resData.errors.requested_time[0];
          setFieldErrors(apiFieldErrors);
        }
        setSubmissionError(resData?.message || t.errSubmissionDesc);
      } else if (status === 403) {
        setSubmissionError('Forbidden. Only authenticated customers can create service requests.');
      } else if (status === 404) {
        setSubmissionError(t.errInvalidProvider);
      } else if (status === 409) {
        setSubmissionError(err.response?.data?.message || t.errSubmissionDesc);
      } else {
        setSubmissionError(t.errSubmissionDesc);
      }
    } finally {
      setSubmitting(false);
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
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${lang === 'en'
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
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${lang === 'am'
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
              <Link
                id="navLinkDashboard"
                href="/customer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="font-label-lg text-label-lg">{t.navDashboard}</span>
              </Link>

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

              <Link
                id="navLinkMyRequests"
                href="/customer/requests"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
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
        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full pb-28 md:pb-8">
          {/* Breadcrumb Back Navigation */}
          <div className="mb-6">
            <Link
              id="breadcrumbBackBtn"
              href={provider ? `/customer/providers/${provider.id}` : '/customer/services'}
              className="inline-flex items-center gap-2 text-primary-container dark:text-inverse-primary hover:text-primary font-label-lg text-label-lg group transition-colors"
            >
              <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
              <span>{t.backToProviderProfile}</span>
              {provider && (
                <span className="text-on-surface-variant dark:text-outline-variant font-normal">
                  / {provider.business_name}
                </span>
              )}
            </Link>
          </div>

          {/* Initial Data Loading State */}
          {dataLoading && (
            <div className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-xl p-8 sm:p-12 shadow-sm text-center">
              <div className="w-12 h-12 border-4 border-primary-container/20 border-t-primary-container rounded-full animate-spin mx-auto mb-4" />
              <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                {t.requestLoadingTitle}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-1">
                {t.requestLoadingSubtitle}
              </p>
            </div>
          )}

          {/* Initial Load Error / Invalid Provider or Service */}
          {!dataLoading && initError && (
            <div className="bg-surface-container-lowest dark:bg-inverse-surface border border-error/30 rounded-xl p-8 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-error-container/40 text-error mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">error</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                  {initError}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant mt-1">
                  {t.providerErrorSubtitle}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={loadProviderAndService}
                  className="px-5 py-2.5 rounded-lg bg-surface-container dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface font-label-lg font-semibold hover:bg-surface-container-high transition-colors"
                >
                  {t.btnTryAgain}
                </button>
                <Link
                  href="/customer/services"
                  className="px-5 py-2.5 rounded-lg bg-primary-container text-white font-label-lg font-bold hover:bg-primary transition-colors shadow-sm"
                >
                  {t.backToServices}
                </Link>
              </div>
            </div>
          )}

          {/* Form & Success State Canvas */}
          {!dataLoading && !initError && provider && selectedService && (
            <>
              {/* SUCCESS STATE CARD */}
              {createdRequest ? (
                <div
                  id="service-request-success-card"
                  className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-2xl p-8 sm:p-12 shadow-sm text-center animate-fade-in"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 text-primary-container dark:text-inverse-primary flex items-center justify-center mb-6 ring-8 ring-primary/5">
                    <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>

                  <h2
                    id="successTitle"
                    className="font-headline-lg text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight"
                  >
                    {t.requestSuccessTitle}
                  </h2>

                  <p
                    id="successDesc"
                    className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline-variant mt-3 max-w-lg mx-auto"
                  >
                    {t.requestSuccessDesc}
                  </p>

                  {/* Reference Summary Badge */}
                  <div className="my-8 inline-flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-3 rounded-xl bg-surface-container dark:bg-surface-dim border border-outline-variant/30 text-on-surface dark:text-inverse-on-surface text-left">
                    <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-2xl">
                      receipt
                    </span>
                    <div>
                      <span className="block font-label-md text-label-md text-on-surface-variant dark:text-outline-variant font-bold uppercase tracking-wider">
                        {t.refSummaryHeading}
                      </span>
                      <span id="successSummaryText" className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                        {provider.business_name} • {selectedService.name} • {createdRequest.location}
                      </span>
                    </div>
                    <div className="sm:ml-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{t.statusPendingTag}</span>
                      </span>
                    </div>
                  </div>

                  {/* Success Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      id="viewRequestsBtn"
                      href="/customer/requests"
                      className="w-full sm:w-auto h-12 px-8 rounded-lg bg-primary-container text-white font-label-lg text-label-lg font-bold hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-xl">receipt_long</span>
                      <span>{t.btnViewMyRequests}</span>
                    </Link>

                    <Link
                      id="backDashboardBtn"
                      href="/customer"
                      className="w-full sm:w-auto h-12 px-6 rounded-lg bg-surface-container-high dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-highest transition-colors flex items-center justify-center active:scale-[0.99]"
                    >
                      <span>{t.btnBackToDashboard}</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* FORM CANVAS */
                <div className="space-y-6">
                  {/* Top Error Alert Banner */}
                  {submissionError && (
                    <div
                      id="sim-error-banner"
                      className="p-4 rounded-xl bg-error-container/70 border border-error/20 flex items-start justify-between shadow-sm animate-fade-in text-on-error-container"
                    >
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-error text-2xl mt-0.5">error</span>
                        <div>
                          <h4 className="font-headline-sm text-headline-sm font-bold">
                            {t.errSubmissionTitle}
                          </h4>
                          <p className="font-body-sm text-body-sm mt-0.5 opacity-90">
                            {submissionError}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmissionError(null)}
                        className="px-3 py-1.5 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface rounded-lg font-label-md text-label-md border border-outline-variant/40 hover:bg-surface-container transition-colors shadow-xs"
                      >
                        {t.btnTryAgain}
                      </button>
                    </div>
                  )}

                  {/* Header Title Section */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h1
                        id="pageTitle"
                        className="font-headline-xl text-headline-xl font-bold text-on-surface dark:text-inverse-on-surface tracking-tight"
                      >
                        {t.requestServicePageTitle}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant border border-outline-variant/30">
                        {t.requestServiceStepLabel}
                      </span>
                    </div>
                    <p
                      id="pageSubtitle"
                      className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant mt-1.5"
                    >
                      {t.requestServiceSubtitlePrefix} {provider.business_name}
                      {t.requestServiceSubtitleSuffix}
                    </p>
                  </div>

                  {/* Selected Provider & Service Summary Card (Read-only anchor) */}
                  <div className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-surface-container-high dark:bg-surface-dim flex items-center justify-center text-primary-container dark:text-inverse-primary border border-outline-variant/20 shadow-inner">
                          <span
                            className="material-symbols-outlined text-3xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {getServiceIcon(selectedService.name)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              id="summaryProviderName"
                              className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface"
                            >
                              {provider.business_name}
                            </h3>
                            {provider.verification_status === 'verified' && (
                              <span
                                id="summaryVerifiedBadge"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container dark:text-inverse-primary border border-primary-container/20"
                                title="Identity Verified"
                              >
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  verified
                                </span>
                                <span>{t.verifiedProTag}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-on-surface-variant dark:text-outline-variant font-label-md text-label-md">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">location_on</span>
                              <span id="summaryProviderLocation">{provider.location}, Dessie</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Indicator Pill */}
                      <div>
                        {provider.availability_status === 'available' && (
                          <div
                            id="summaryAvailabilityBadge"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary-container dark:text-inverse-primary font-label-md text-label-md font-medium border border-primary/20"
                          >
                            <span className="w-2 h-2 rounded-full bg-primary-container dark:bg-inverse-primary animate-pulse" />
                            <span>{t.availableForWorkBadge}</span>
                          </div>
                        )}
                        {provider.availability_status === 'busy' && (
                          <div
                            id="summaryAvailabilityBadge"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-label-md text-label-md font-medium border border-amber-500/20"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>{t.busyForWorkBadge}</span>
                          </div>
                        )}
                        {provider.availability_status === 'offline' && (
                          <div
                            id="summaryAvailabilityBadge"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container dark:bg-surface-dim text-outline font-label-md text-label-md font-medium border border-outline-variant/30"
                          >
                            <span className="w-2 h-2 rounded-full bg-outline" />
                            <span>{t.offlineForWorkBadge}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Read-only Selected Service specification pill */}
                    <div className="pt-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant uppercase tracking-wider font-semibold">
                          {t.selectedServiceLabel}
                        </span>
                        <span
                          id="summarySelectedServicePill"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container dark:bg-surface-dim font-label-lg text-label-lg font-semibold text-primary-container dark:text-inverse-primary border border-outline-variant/30"
                        >
                          <span className="material-symbols-outlined text-base">
                            {getServiceIcon(selectedService.name)}
                          </span>
                          <span>{selectedService.name}</span>
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant dark:text-outline-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-outline">lock</span>
                        <span>{t.serviceLockedHint}</span>
                      </div>
                    </div>
                  </div>

                  {/* MAIN FORM CONTAINER */}
                  <div
                    id="service-request-form-card"
                    className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-xl p-6 sm:p-8 shadow-sm relative"
                  >
                    <form id="requestForm" onSubmit={handleSubmit} className="space-y-6">
                      {/* Field 1: Description of Work (Textarea) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="workDescription"
                            className="block font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface font-semibold"
                          >
                            <span>{t.lblWorkDescription}</span>
                            <span className="text-error ml-1">*</span>
                          </label>
                          <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                            {t.reqTag}
                          </span>
                        </div>
                        <div className="relative">
                          <textarea
                            id="workDescription"
                            name="description"
                            rows={4}
                            value={description}
                            onChange={(e) => {
                              setDescription(e.target.value);
                              if (fieldErrors.description) {
                                setFieldErrors((prev) => ({ ...prev, description: undefined }));
                              }
                            }}
                            placeholder={t.phWorkDescription}
                            className={`w-full rounded-lg border p-3.5 text-body-md font-body-md transition-colors text-on-surface dark:text-inverse-on-surface bg-surface-container-lowest dark:bg-surface-dim/40 placeholder:text-outline-variant resize-y focus:outline-none focus:ring-2 ${fieldErrors.description
                                ? 'border-error focus:border-error focus:ring-error/20'
                                : 'border-outline-variant/50 focus:border-primary-container focus:ring-primary-container/20'
                              }`}
                          />
                        </div>
                        <p className="mt-1.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>{t.helperWorkDescription}</span>
                        </p>
                        {fieldErrors.description && (
                          <p id="err-desc" className="mt-1.5 font-label-md text-label-md text-error flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <span>{fieldErrors.description}</span>
                          </p>
                        )}
                      </div>

                      {/* Field 2: Location in Dessie (Text Input) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="serviceLocation"
                            className="block font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface font-semibold"
                          >
                            <span>{t.lblServiceLocation}</span>
                            <span className="text-error ml-1">*</span>
                          </label>
                          <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                            {t.reqTag}
                          </span>
                        </div>
                        <div className="relative rounded-lg">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant dark:text-outline-variant">
                            <span className="material-symbols-outlined text-xl">location_city</span>
                          </div>
                          <input
                            id="serviceLocation"
                            name="location"
                            type="text"
                            value={location}
                            onChange={(e) => {
                              setLocation(e.target.value);
                              if (fieldErrors.location) {
                                setFieldErrors((prev) => ({ ...prev, location: undefined }));
                              }
                            }}
                            placeholder={t.phServiceLocation}
                            className={`w-full pl-11 pr-4 py-3 rounded-lg border font-body-md transition-colors text-on-surface dark:text-inverse-on-surface bg-surface-container-lowest dark:bg-surface-dim/40 placeholder:text-outline-variant focus:outline-none focus:ring-2 ${fieldErrors.location
                                ? 'border-error focus:border-error focus:ring-error/20'
                                : 'border-outline-variant/50 focus:border-primary-container focus:ring-primary-container/20'
                              }`}
                          />
                        </div>
                        <p className="mt-1.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">my_location</span>
                          <span>{t.helperServiceLocation}</span>
                        </p>
                        {fieldErrors.location && (
                          <p id="err-loc" className="mt-1.5 font-label-md text-label-md text-error flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <span>{fieldErrors.location}</span>
                          </p>
                        )}
                      </div>

                      {/* Field 3: Two-Column Grid for Requested Date & Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Requested Date */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label
                              htmlFor="requestedDate"
                              className="block font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface font-semibold"
                            >
                              <span>{t.lblRequestedDate}</span>
                              <span className="text-error ml-1">*</span>
                            </label>
                            <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                              {t.reqTag}
                            </span>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant dark:text-outline-variant">
                              <span className="material-symbols-outlined text-xl">calendar_today</span>
                            </div>
                            <input
                              id="requestedDate"
                              name="requested_date"
                              type="date"
                              min={todayStr}
                              value={requestedDate}
                              onChange={(e) => {
                                setRequestedDate(e.target.value);
                                if (fieldErrors.requested_date) {
                                  setFieldErrors((prev) => ({ ...prev, requested_date: undefined }));
                                }
                              }}
                              className={`w-full pl-11 pr-4 py-3 rounded-lg border font-body-md transition-colors text-on-surface dark:text-inverse-on-surface bg-surface-container-lowest dark:bg-surface-dim/40 placeholder:text-outline-variant focus:outline-none focus:ring-2 ${fieldErrors.requested_date
                                  ? 'border-error focus:border-error focus:ring-error/20'
                                  : 'border-outline-variant/50 focus:border-primary-container focus:ring-primary-container/20'
                                }`}
                            />
                          </div>
                          {fieldErrors.requested_date && (
                            <p id="err-date" className="mt-1.5 font-label-md text-label-md text-error flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">error</span>
                              <span>{fieldErrors.requested_date}</span>
                            </p>
                          )}
                        </div>

                        {/* Requested Time */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label
                              htmlFor="requestedTime"
                              className="block font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface font-semibold"
                            >
                              <span>{t.lblRequestedTime}</span>
                              <span className="text-error ml-1">*</span>
                            </label>
                            <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                              {t.reqTag}
                            </span>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant dark:text-outline-variant">
                              <span className="material-symbols-outlined text-xl">schedule</span>
                            </div>
                            <input
                              id="requestedTime"
                              name="requested_time"
                              type="time"
                              value={requestedTime}
                              onChange={(e) => {
                                setRequestedTime(e.target.value);
                                if (fieldErrors.requested_time) {
                                  setFieldErrors((prev) => ({ ...prev, requested_time: undefined }));
                                }
                              }}
                              className={`w-full pl-11 pr-4 py-3 rounded-lg border font-body-md transition-colors text-on-surface dark:text-inverse-on-surface bg-surface-container-lowest dark:bg-surface-dim/40 placeholder:text-outline-variant focus:outline-none focus:ring-2 ${fieldErrors.requested_time
                                  ? 'border-error focus:border-error focus:ring-error/20'
                                  : 'border-outline-variant/50 focus:border-primary-container focus:ring-primary-container/20'
                                }`}
                            />
                          </div>
                          {fieldErrors.requested_time && (
                            <p id="err-time" className="mt-1.5 font-label-md text-label-md text-error flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">error</span>
                              <span>{fieldErrors.requested_time}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Informational Notice (Civic Trust Note) */}
                      <div className="p-4 rounded-xl bg-surface-container dark:bg-surface-dim flex items-start gap-3 border border-outline-variant/30">
                        <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-xl mt-0.5">
                          info
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant leading-relaxed">
                          {t.infoNoticeText}
                        </p>
                      </div>

                      {/* Form Actions Buttons */}
                      <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center gap-3">
                        {/* Primary Submit Button */}
                        <button
                          id="submitBtn"
                          type="submit"
                          disabled={submitting}
                          className="w-full sm:w-auto min-w-[200px] h-12 px-6 rounded-lg bg-primary-container text-white font-label-lg text-label-lg font-bold hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-1" />
                              <span id="btn-text">{t.btnSendingRequest}</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-xl" id="btn-icon">
                                send
                              </span>
                              <span id="btn-text">{t.btnSubmitRequest}</span>
                            </>
                          )}
                        </button>

                        {/* Cancel Button */}
                        <Link
                          id="cancelBtn"
                          href={`/customer/providers/${provider.id}`}
                          className="w-full sm:w-auto h-12 px-6 rounded-lg bg-surface-container-high dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-highest transition-colors active:scale-[0.99] flex items-center justify-center"
                        >
                          <span>{t.btnCancel}</span>
                        </Link>
                      </div>
                    </form>

                    {/* Submitting Loading Overlay */}
                    {submitting && (
                      <div
                        id="loading-overlay"
                        className="absolute inset-0 bg-surface-container-lowest/80 dark:bg-inverse-surface/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center z-10"
                      >
                        <div className="p-6 bg-surface-container-lowest dark:bg-surface-dim rounded-2xl shadow-xl border border-outline-variant/30 flex flex-col items-center text-center max-w-xs">
                          <div className="w-12 h-12 border-4 border-primary-container/20 border-t-primary-container rounded-full animate-spin mb-3" />
                          <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                            {t.requestLoadingTitle}
                          </h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-1">
                            {t.requestLoadingSubtitle}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                            */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 h-16 md:hidden bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant/30 dark:border-outline/20 shadow-lg dark:shadow-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
          className="flex flex-col items-center justify-center text-primary-container dark:text-inverse-primary font-bold py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            search
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navFindService}</span>
        </Link>

        <Link
          href="/customer/requests"
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
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

export default function CreateServiceRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
          <span className="material-symbols-outlined text-[40px] animate-spin text-primary-container">
            progress_activity
          </span>
        </div>
      }
    >
      <CreateRequestContent />
    </Suspense>
  );
}
