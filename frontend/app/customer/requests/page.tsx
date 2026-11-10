'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import ServiceRequestCard, {
  formatRequestDate,
  formatRequestTime,
  getRequestStatusBadgeClass,
  getRequestStatusLabel,
} from '@/components/customer/ServiceRequestCard';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { getCurrentUser, logoutUser, User, getStoredToken, formatApiError } from '@/lib/api/auth';
import {
  getCustomerRequests,
  cancelCustomerRequest,
  submitRequestReview,
  ServiceRequestItem,
} from '@/lib/api/requests';

type StatusFilter = 'all' | 'pending' | 'active' | 'completed' | 'closed';

const FILTER_TABS: Array<{
  key: StatusFilter;
  en: string;
  am: string;
}> = [
  { key: 'all', en: 'All', am: 'ሁሉም' },
  { key: 'pending', en: 'Pending', am: 'በመጠባበቅ ላይ' },
  { key: 'active', en: 'Active', am: 'በሂደት ላይ' },
  { key: 'completed', en: 'Completed', am: 'የተጠናቀቁ' },
  { key: 'closed', en: 'Cancelled / Rejected', am: 'የተሰረዙ / ውድቅ' },
];

const matchesStatusFilter = (req: ServiceRequestItem, filter: StatusFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'pending') return req.status === 'pending';
  if (filter === 'active') return req.status === 'accepted' || req.status === 'in_progress';
  if (filter === 'completed') return req.status === 'completed';
  if (filter === 'closed') return req.status === 'cancelled' || req.status === 'rejected';
  return true;
};

function MyRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get('requestId');

  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Auth & shell state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Service requests state
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Selected request detail modal & actions
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Review submission state (for completed, unreviewed requests)
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const autoOpenedRef = useRef(false);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(false);
    try {
      const items = await getCustomerRequests();
      const normalized = Array.isArray(items) ? items : [];
      setRequests(normalized);

      if (!autoOpenedRef.current && requestIdParam) {
        const numericId = Number(requestIdParam);
        if (!Number.isNaN(numericId) && normalized.some((r) => r.id === numericId)) {
          autoOpenedRef.current = true;
          setSelectedRequestId(numericId);
        }
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        router.replace('/login');
        return;
      }
      setRequestsError(true);
    } finally {
      setRequestsLoading(false);
    }
  }, [router, requestIdParam]);

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
        loadRequests();
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [router, loadRequests]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const openRequestModal = (req: ServiceRequestItem) => {
    setSelectedRequestId(req.id);
    setConfirmingCancel(false);
    setActionFeedback(null);
    setReviewRating(5);
    setReviewComment('');
  };

  const closeRequestModal = useCallback(() => {
    setSelectedRequestId(null);
    setConfirmingCancel(false);
    setActionFeedback(null);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedRequest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRequestModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRequest, closeRequestModal]);

  const handleCancelRequest = async (reqId: number) => {
    setCancellingId(reqId);
    setActionFeedback(null);
    try {
      const res = await cancelCustomerRequest(reqId);
      setRequests((prev) =>
        prev.map((item) =>
          item.id === reqId ? { ...item, ...res.data, status: 'cancelled' } : item
        )
      );
      setConfirmingCancel(false);
      setActionFeedback({
        type: 'success',
        message:
          lang === 'am'
            ? 'የአገልግሎት ጥያቄዎ በተሳካ ሁኔታ ተሰርዟል።'
            : 'Service request cancelled successfully.',
      });
    } catch (err: unknown) {
      const fallback = lang === 'am' ? 'ጥያቄውን መሰረዝ አልተቻለም።' : 'Failed to cancel request.';
      const { message } = formatApiError(err, fallback);
      setActionFeedback({ type: 'error', message });
    } finally {
      setCancellingId(null);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || submittingReview) return;

    setSubmittingReview(true);
    setActionFeedback(null);
    try {
      const res = await submitRequestReview({
        request_id: selectedRequest.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedRequest.id ? { ...item, review: res.data } : item
        )
      );
      setReviewComment('');
      setActionFeedback({
        type: 'success',
        message:
          lang === 'am'
            ? 'ግምገማዎ በተሳካ ሁኔታ ተልኳል። እናመሰግናለን!'
            : 'Thank you! Your review has been submitted.',
      });
    } catch (err: unknown) {
      const fallback = lang === 'am' ? 'ግምገማውን መላክ አልተቻለም።' : 'Failed to submit review.';
      const { message } = formatApiError(err, fallback);
      setActionFeedback({ type: 'error', message });
    } finally {
      setSubmittingReview(false);
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

  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'CU';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: requests.length,
      pending: 0,
      active: 0,
      completed: 0,
      closed: 0,
    };
    for (const r of requests) {
      if (r.status === 'pending') counts.pending++;
      else if (r.status === 'accepted' || r.status === 'in_progress') counts.active++;
      else if (r.status === 'completed') counts.completed++;
      else if (r.status === 'cancelled' || r.status === 'rejected') counts.closed++;
    }
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(
    () => requests.filter((r) => matchesStatusFilter(r, statusFilter)),
    [requests, statusFilter]
  );

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

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Toggle */}
          <div className="inline-flex items-center p-0.5 sm:p-1 rounded-full border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim shadow-sm">
            <button
              id="langBtnEn"
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${
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
              className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs sm:text-label-md font-label-md transition-all duration-150 cursor-pointer ${
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
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-outline-variant/60 dark:border-outline/40 flex items-center justify-center text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-dim hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 focus:outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
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

        {/* Main Content Canvas */}
        <main className="flex-1 px-3 sm:px-margin-mobile md:px-margin py-4 sm:py-8 max-w-7xl mx-auto w-full pb-28 md:pb-8 space-y-5 sm:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[22px] sm:text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  receipt_long
                </span>
                <h1 className="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface dark:text-white tracking-tight">
                  {t.myRequestsPlaceholderTitle}
                </h1>
                {!requestsLoading && requests.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container/15 text-primary-container dark:text-inverse-primary border border-primary-container/20">
                    {requests.length}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-body-sm text-on-surface-variant dark:text-outline-variant leading-relaxed">
                {t.myRequestsPlaceholderDesc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadRequests}
                disabled={requestsLoading}
                aria-label={lang === 'am' ? 'አድስ' : 'Refresh requests'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-outline-variant/40 bg-surface-container-low dark:bg-surface-dim flex items-center justify-center text-on-surface-variant dark:text-outline-variant hover:text-primary-container hover:border-primary-container transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${requestsLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>
              <Link
                href="/customer/services"
                className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl bg-primary-container text-white text-xs sm:text-label-lg font-bold hover:bg-primary transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">search</span>
                <span>{t.findServiceBtn}</span>
              </Link>
            </div>
          </div>

          {/* 1. LOADING STATE */}
          {requestsLoading && (
            <div
              id="myRequestsLoadingGrid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-space-md animate-pulse"
            >
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-4 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 space-y-3"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="h-5 w-1/2 rounded bg-surface-container-high dark:bg-surface-dim" />
                    <div className="h-5 w-20 rounded-full bg-surface-container-high dark:bg-surface-dim" />
                  </div>
                  <div className="h-4 w-2/3 rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="h-10 w-full rounded bg-surface-container-high dark:bg-surface-dim" />
                  <div className="pt-2 border-t border-outline-variant/20 flex justify-between">
                    <div className="h-4 w-24 rounded bg-surface-container-high dark:bg-surface-dim" />
                    <div className="h-4 w-16 rounded bg-surface-container-high dark:bg-surface-dim" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. ERROR STATE */}
          {!requestsLoading && requestsError && (
            <div
              id="myRequestsErrorCard"
              className="max-w-lg mx-auto my-8 bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl p-6 sm:p-8 border border-error/30 shadow-sm text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-error-container/40 text-error mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">cloud_off</span>
              </div>
              <p className="text-sm sm:text-body-md text-on-surface dark:text-inverse-on-surface font-medium">
                {lang === 'am'
                  ? 'የአገልግሎት ጥያቄዎችዎን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
                  : 'Unable to load your service requests. Please try again.'}
              </p>
              <button
                type="button"
                onClick={loadRequests}
                className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-xs sm:text-label-lg font-bold inline-flex items-center gap-2 hover:bg-primary transition-colors shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>{t.errorRetryBtn}</span>
              </button>
            </div>
          )}

          {/* 3. TRUE EMPTY STATE (ONLY WHEN requests.length === 0) */}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <div
              id="myRequestsEmptyCard"
              className="flex flex-col items-center justify-center py-4 sm:py-8"
            >
              <div className="bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 rounded-2xl p-6 sm:p-8 md:p-12 shadow-sm max-w-lg w-full text-center space-y-4 sm:space-y-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    receipt_long
                  </span>
                </div>

                <h2 className="font-headline-lg text-xl sm:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
                  {t.dashNoRequests}
                </h2>

                <p className="font-body-sm sm:font-body-md text-xs sm:text-body-md text-on-surface-variant dark:text-outline-variant">
                  {t.myRequestsPlaceholderDesc}
                </p>

                <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full">
                  <Link
                    href="/customer"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-surface-container dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface font-label-md sm:font-label-lg text-xs sm:text-label-lg font-semibold hover:bg-surface-container-high transition-colors"
                  >
                    {t.btnBackToDashboard}
                  </Link>
                  <Link
                    href="/customer/services"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary-container text-white font-label-md sm:font-label-lg text-xs sm:text-label-lg font-bold hover:bg-primary transition-colors shadow-sm"
                  >
                    {t.navFindService}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 4. REQUESTS LIST & FILTER TABS (WHEN requests.length > 0) */}
          {!requestsLoading && !requestsError && requests.length > 0 && (
            <div className="space-y-4 sm:space-y-5">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {FILTER_TABS.map((tab) => {
                  const isActive = statusFilter === tab.key;
                  const count = filterCounts[tab.key];
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-label-md font-semibold border whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-primary-container text-white border-primary-container shadow-xs'
                          : 'bg-surface-container-lowest dark:bg-inverse-surface text-on-surface-variant dark:text-outline-variant border-outline-variant/40 hover:border-primary-container'
                      }`}
                    >
                      <span>{lang === 'am' ? tab.am : tab.en}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-container dark:bg-surface-dim text-on-surface dark:text-white'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/30 space-y-3">
                  <p className="text-sm font-semibold text-on-surface dark:text-white">
                    {lang === 'am'
                      ? 'በዚህ ሁኔታ ውስጥ ምንም ጥያቄ አልተገኘም።'
                      : 'No service requests match this filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="px-4 py-2 rounded-xl bg-primary-container/15 text-primary-container dark:text-inverse-primary text-xs font-bold hover:bg-primary-container/25 transition-colors cursor-pointer"
                  >
                    {lang === 'am' ? 'ሁሉንም ጥያቄዎች አሳይ' : 'Show All Requests'}
                  </button>
                </div>
              ) : (
                <div
                  id="myRequestsListGrid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-space-md"
                >
                  {filteredRequests.map((req) => (
                    <ServiceRequestCard
                      key={req.id}
                      request={req}
                      lang={lang}
                      showTime
                      showLocation
                      onClick={() => openRequestModal(req)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
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

      {/* Request Details Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs"
          onClick={closeRequestModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="requestDetailsModalTitle"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${getRequestStatusBadgeClass(
                      selectedRequest.status
                    )}`}
                  >
                    {getRequestStatusLabel(selectedRequest.status, lang)}
                  </span>
                  <span className="text-xs text-outline dark:text-outline-variant font-mono">
                    #{selectedRequest.id}
                  </span>
                </div>
                <h2
                  id="requestDetailsModalTitle"
                  className="text-lg sm:text-xl font-bold text-on-surface dark:text-white break-words"
                >
                  {selectedRequest.service?.name || 'Service Request'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeRequestModal}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-dim cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Provider Card */}
            {selectedRequest.provider && (
              <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-outline dark:text-outline-variant">
                      {lang === 'am' ? 'የአገልግሎት ሰጪ' : 'Service Provider'}
                    </p>
                    <p className="font-bold text-sm sm:text-base text-on-surface dark:text-white truncate">
                      {selectedRequest.provider.business_name}
                    </p>
                    <p className="text-xs text-on-surface-variant dark:text-outline-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                      <span>{selectedRequest.provider.location}, Dessie</span>
                    </p>
                  </div>
                  <Link
                    href={`/customer/providers/${selectedRequest.provider_id}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 text-xs font-semibold text-primary-container dark:text-inverse-primary hover:border-primary-container transition-colors shrink-0"
                  >
                    {t.btnViewProfile}
                  </Link>
                </div>

                {selectedRequest.provider.phone && (
                  <a
                    href={`tel:${selectedRequest.provider.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary-container dark:text-inverse-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[15px]">call</span>
                    <span>{selectedRequest.provider.phone}</span>
                  </a>
                )}
              </div>
            )}

            {/* Schedule & Service Location Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-dim/25 border border-outline-variant/20">
                <p className="text-outline dark:text-outline-variant font-semibold uppercase tracking-wider text-[10px]">
                  {t.lblRequestedDate} &amp; {t.lblRequestedTime}
                </p>
                <p className="font-semibold text-on-surface dark:text-white mt-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary-container dark:text-inverse-primary">
                    calendar_today
                  </span>
                  <span>
                    {formatRequestDate(selectedRequest.requested_date)}
                    {selectedRequest.requested_time
                      ? ` • ${formatRequestTime(selectedRequest.requested_time)}`
                      : ''}
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-surface-dim/25 border border-outline-variant/20">
                <p className="text-outline dark:text-outline-variant font-semibold uppercase tracking-wider text-[10px]">
                  {t.lblServiceLocation}
                </p>
                <p className="font-semibold text-on-surface dark:text-white mt-1 flex items-center gap-1.5 break-words">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">
                    home_pin
                  </span>
                  <span>{selectedRequest.location}</span>
                </p>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-outline dark:text-outline-variant">
                {t.lblWorkDescription}
              </p>
              <div className="p-3.5 rounded-xl bg-surface-container-low/60 dark:bg-surface-dim/25 border border-outline-variant/20 text-sm text-on-surface dark:text-inverse-on-surface whitespace-pre-wrap break-words leading-relaxed">
                {selectedRequest.description}
              </div>
            </div>

            {/* Feedback Banner */}
            {actionFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  actionFeedback.type === 'success'
                    ? 'bg-primary-container/10 text-primary-container border-primary-container/30'
                    : 'bg-error/10 text-error border-error/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {actionFeedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{actionFeedback.message}</span>
              </div>
            )}

            {/* Review Section for Completed Requests */}
            {selectedRequest.status === 'completed' && (
              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                {selectedRequest.review ? (
                  <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface dark:text-white">
                        {lang === 'am' ? 'የእርስዎ ግምገማ' : 'Your Submitted Review'}
                      </span>
                      <div className="flex items-center gap-0.5 text-secondary">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className="material-symbols-outlined text-[16px]"
                            style={{
                              fontVariationSettings:
                                star <= selectedRequest.review!.rating ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedRequest.review.comment && (
                      <p className="text-xs text-on-surface-variant dark:text-outline-variant">
                        &quot;{selectedRequest.review.comment}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface dark:text-white">
                        {lang === 'am' ? 'አገልግሎቱን ይገምግሙ' : 'Rate this Service'}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            aria-label={`Rate ${star} stars`}
                            className="text-secondary hover:scale-110 transition-transform cursor-pointer"
                          >
                            <span
                              className="material-symbols-outlined text-[22px]"
                              style={{
                                fontVariationSettings: star <= reviewRating ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              star
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={
                        lang === 'am'
                          ? 'ስለ አገልግሎቱ አጭር አስተያየት ይጻፉ (አማራጭ)...'
                          : 'Share your experience with this provider (optional)...'
                      }
                      className="w-full rounded-xl bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 p-2.5 text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary-container"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submittingReview
                        ? lang === 'am'
                          ? 'በመላክ ላይ...'
                          : 'Submitting Review...'
                        : lang === 'am'
                        ? 'ግምገማ ላክ'
                        : 'Submit Review'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Cancel Request Action (for pending or accepted requests) */}
            {(selectedRequest.status === 'pending' || selectedRequest.status === 'accepted') && (
              <div className="pt-2 border-t border-outline-variant/20">
                {!confirmingCancel ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(true)}
                      className="px-4 py-2 rounded-xl border border-error/40 text-error hover:bg-error hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {lang === 'am' ? 'ጥያቄውን ሰርዝ' : 'Cancel Request'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-error/10 border border-error/30 space-y-2.5">
                    <p className="text-xs font-semibold text-error">
                      {lang === 'am'
                        ? 'እርግጠኛ ነዎት ይህን የአገልግሎት ጥያቄ መሰረዝ ይፈልጋሉ?'
                        : 'Are you sure you want to cancel this service request?'}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(false)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white cursor-pointer"
                      >
                        {lang === 'am' ? 'ተመለስ' : 'Keep Request'}
                      </button>
                      <button
                        type="button"
                        disabled={cancellingId === selectedRequest.id}
                        onClick={() => handleCancelRequest(selectedRequest.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-error text-white text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        {cancellingId === selectedRequest.id
                          ? lang === 'am'
                            ? 'በመሰረዝ ላይ...'
                            : 'Cancelling...'
                          : lang === 'am'
                          ? 'አዎ፣ ሰርዝ'
                          : 'Yes, Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

export default function MyRequestsPage() {
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
      <MyRequestsContent />
    </Suspense>
  );
}
