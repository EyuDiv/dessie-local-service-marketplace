'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { getCurrentUser, logoutUser, User, getStoredToken, uploadProviderCv, formatApiError } from '@/lib/api/auth';
import {
  getProviderRequests,
  acceptProviderRequest,
  rejectProviderRequest,
  startProviderRequest,
  completeProviderRequest,
  updateProviderAvailability,
  ServiceRequestItem,
} from '@/lib/api/requests';
import {
  getProviderServices,
  getServices,
  addProviderService,
  removeProviderService,
  Service,
} from '@/lib/api/services';

type Availability = 'available' | 'busy' | 'offline';

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Provider Data
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability>('available');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Service Management
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('');
  const [addingService, setAddingService] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // CV Re-upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((data) => {
        if (data.role !== 'provider') {
          if (data.role === 'customer') router.replace('/customer/services');
          else if (data.role === 'admin') router.replace('/admin');
          return;
        }
        setUser(data);
        if (data.provider_profile?.availability_status) {
          setAvailability(data.provider_profile.availability_status as Availability);
        }
        loadProviderData();
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const loadProviderData = async () => {
    try {
      const [reqData, mySrvData, allSrvData] = await Promise.all([
        getProviderRequests().catch(() => []),
        getProviderServices().catch(() => []),
        getServices().catch(() => []),
      ]);
      setRequests(reqData);
      setMyServices(mySrvData);
      setAllServices(allSrvData);
    } catch (err) {
      console.error('Error loading provider data:', err);
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

  const handleAvailabilityChange = async (newStatus: Availability) => {
    setUpdatingAvailability(true);
    try {
      await updateProviderAvailability(newStatus);
      setAvailability(newStatus);
    } catch (err) {
      console.error('Failed to update availability:', err);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleRequestAction = async (
    requestId: number,
    action: 'accept' | 'reject' | 'start' | 'complete'
  ) => {
    setActionLoadingId(requestId);
    try {
      if (action === 'accept') await acceptProviderRequest(requestId);
      else if (action === 'reject') await rejectProviderRequest(requestId);
      else if (action === 'start') await startProviderRequest(requestId);
      else if (action === 'complete') await completeProviderRequest(requestId);

      // Refresh requests list
      const updated = await getProviderRequests();
      setRequests(updated);
    } catch (err: any) {
      console.error(`Failed to ${action} request:`, err);
      alert(err.response?.data?.message || `Failed to perform action`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceToAdd) return;
    setAddingService(true);
    try {
      await addProviderService(selectedServiceToAdd);
      const updated = await getProviderServices();
      setMyServices(updated);
      setSelectedServiceToAdd('');
    } catch (err: any) {
      console.error('Failed to add service:', err);
      alert(err.response?.data?.message || 'Could not add service');
    } finally {
      setAddingService(false);
    }
  };

  const handleRemoveService = async (serviceId: number) => {
    try {
      await removeProviderService(serviceId);
      setMyServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (err: any) {
      console.error('Failed to remove service:', err);
      alert(err.response?.data?.message || 'Could not remove service');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdfMime = file.type === 'application/pdf' || file.type === 'application/x-pdf';
    const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !(file.type === '' && hasPdfExt)) {
      setUploadError(t.errCvInvalidType);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t.errCvTooLarge);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCvUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const response = await uploadProviderCv(selectedFile);
      setUploadSuccess(response.message || t.cvUploadedSuccess);
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const formatted = formatApiError(err, 'Failed to upload CV. Please check the file and try again.');
      const msg = formatted.errors?.cv?.[0] || formatted.message;
      setUploadError(msg);
    } finally {
      setUploading(false);
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

  const status = user?.provider_profile?.verification_status || 'pending';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isVerified = status === 'verified';

  // Counts
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const activeJobs = requests.filter((r) => r.status === 'accepted' || r.status === 'in_progress');
  const completedJobs = requests.filter((r) => r.status === 'completed');

  // Services available to add
  const myServiceIds = new Set(myServices.map((s) => s.id));
  const availableServicesToAdd = allServices.filter((s) => !myServiceIds.has(s.id));

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-margin-mobile md:px-margin py-4 sm:py-space-lg md:py-space-xl space-y-4 sm:space-y-space-lg">
        {/* Provider Business Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low dark:from-inverse-surface dark:via-[#1c1916] dark:to-inverse-surface rounded-2xl border border-outline-variant/40 shadow-sm p-4 sm:p-space-lg md:p-space-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Verification Badge */}
                <span
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-2xs sm:text-xs font-bold uppercase tracking-wider border ${
                    isVerified
                      ? 'bg-primary-container/15 text-primary-container dark:bg-primary-container/25 dark:text-inverse-primary border-primary-container/30'
                      : isRejected
                      ? 'bg-error/15 text-error border-error/30'
                      : 'bg-secondary/15 text-secondary border-secondary/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                    {isVerified ? 'verified' : isRejected ? 'gpp_bad' : 'schedule'}
                  </span>
                  <span>
                    {isVerified
                      ? t.badgeVerified
                      : isRejected
                      ? t.statusRejected
                      : t.statusPendingVerification}
                  </span>
                </span>

                {user?.provider_profile?.location && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-2xs sm:text-xs font-semibold bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/80 border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">location_on</span>
                    <span>{user.provider_profile.location}</span>
                  </span>
                )}

                {user?.provider_profile?.experience_years !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-2xs sm:text-xs font-semibold bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/80 border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[12px] sm:text-[14px]">work_history</span>
                    <span>
                      {user.provider_profile.experience_years} {t.experienceYearsSuffix}
                    </span>
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-headline-lg font-headline-lg font-extrabold text-on-surface dark:text-white tracking-tight">
                {user?.provider_profile?.business_name || user?.name}
              </h1>
              <p className="text-2xs sm:text-body-sm text-outline dark:text-inverse-on-surface/80">
                {user?.name} • {user?.email} {user?.phone ? `• ${user.phone}` : ''}
              </p>
            </div>

            {/* Availability Switcher & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 self-stretch md:self-auto">
              {/* Availability Segmented Switcher */}
              <div className="bg-surface-container-high/60 dark:bg-surface-dim/80 p-1 rounded-xl border border-outline-variant/30 backdrop-blur-sm flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => handleAvailabilityChange('available')}
                  disabled={updatingAvailability}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-2xs sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                    availability === 'available'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-outline dark:text-inverse-on-surface/70 hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400" />
                  <span>{t.statusAvailable}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAvailabilityChange('busy')}
                  disabled={updatingAvailability}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-2xs sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                    availability === 'busy'
                      ? 'bg-secondary text-white shadow-xs'
                      : 'text-outline dark:text-inverse-on-surface/70 hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
                  <span>{t.statusBusy}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAvailabilityChange('offline')}
                  disabled={updatingAvailability}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-2xs sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                    availability === 'offline'
                      ? 'bg-outline text-white shadow-xs'
                      : 'text-outline dark:text-inverse-on-surface/70 hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-stone-400" />
                  <span>{t.statusOffline}</span>
                </button>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                disabled={loggingOut}
                title={t.btnLogout}
                className="px-3 py-1.5 sm:py-2 rounded-xl bg-surface-container-high dark:bg-surface-dim hover:bg-error hover:text-white dark:hover:bg-error text-on-surface dark:text-inverse-on-surface text-2xs sm:text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">logout</span>
                <span className="inline">{t.btnLogout}</span>
              </button>
            </div>
          </div>

          {/* Pending Verification Notice */}
          {isPending && (
            <div className="mt-6 p-4 rounded-xl bg-secondary/10 border border-secondary/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[24px] shrink-0 mt-0.5">
                pending_actions
              </span>
              <div className="space-y-1">
                <h4 className="font-label-lg text-label-lg font-bold text-on-surface dark:text-white">
                  {t.statusPendingVerification}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-inverse-on-surface/90 leading-relaxed">
                  {t.pendingVerificationNotice}
                </p>
              </div>
            </div>
          )}

          {/* Rejected Verification Notice with Reason and Re-upload */}
          {isRejected && (
            <div className="mt-6 p-4 rounded-xl bg-error/10 border border-error/30 space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">
                  gpp_bad
                </span>
                <div className="space-y-1 flex-1">
                  <h4 className="font-label-lg text-label-lg font-bold text-error">
                    {t.rejectionNoticeTitle}
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface dark:text-white leading-relaxed">
                    {t.rejectionNoticeDesc}
                  </p>
                  {user?.provider_profile?.rejection_reason && (
                    <div className="mt-2 p-3 rounded-lg bg-surface-container-lowest dark:bg-inverse-surface border border-error/20 text-body-sm">
                      <span className="font-semibold text-error block text-xs uppercase tracking-wide">
                        {t.rejectionReasonLabel}:
                      </span>
                      <p className="mt-1 text-on-surface dark:text-white font-medium">
                        {user.provider_profile.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 rounded-lg bg-error text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>{t.reUploadCvBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4 Provider Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-space-sm md:gap-space-md">
          {/* Total Incoming Requests */}
          <div className="p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-outline dark:text-inverse-on-surface/80 uppercase tracking-wider">
                {t.dashTotalRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-container/10 dark:bg-primary-container/20 text-primary-container dark:text-inverse-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">receipt_long</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface dark:text-white mt-1.5 sm:mt-2">
              {requests.length}
            </div>
            <p className="text-2xs sm:text-xs text-outline dark:text-inverse-on-surface/70 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'የገቡ ጥያቄዎች በሙሉ' : 'Lifetime customer inquiries'}
            </p>
          </div>

          {/* Action Required: Pending Approval */}
          <div className="p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-secondary dark:text-secondary-container uppercase tracking-wider">
                {lang === 'am' ? 'እርምጃ የሚያስፈልጋቸው' : 'Action Needed'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/15 text-secondary dark:text-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">notification_important</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-secondary dark:text-secondary-container mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
              <span>{pendingRequests.length}</span>
              {pendingRequests.length > 0 && (
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-secondary animate-pulse" />
              )}
            </div>
            <p className="text-2xs sm:text-xs text-outline dark:text-inverse-on-surface/70 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'መቀበል ወይም አለመቀበል' : 'Awaiting your acceptance'}
            </p>
          </div>

          {/* Active Jobs */}
          <div className="p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-primary-container dark:text-inverse-primary uppercase tracking-wider">
                {t.dashActiveRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-container/15 text-primary-container dark:text-inverse-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">engineering</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary-container dark:text-inverse-primary mt-1.5 sm:mt-2">
              {activeJobs.length}
            </div>
            <p className="text-2xs sm:text-xs text-outline dark:text-inverse-on-surface/70 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'ተቀባይነት ያገኙ / በሂደት ላይ' : 'Accepted and in progress'}
            </p>
          </div>

          {/* Completed Jobs */}
          <div className="p-3 sm:p-space-md rounded-xl sm:rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xs sm:text-xs font-bold text-tertiary dark:text-amber-400 uppercase tracking-wider">
                {t.dashCompletedRequests}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-tertiary-container/20 text-tertiary dark:text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">task_alt</span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface dark:text-white mt-1.5 sm:mt-2">
              {completedJobs.length}
            </div>
            <p className="text-2xs sm:text-xs text-outline dark:text-inverse-on-surface/70 mt-0.5 sm:mt-1 truncate">
              {lang === 'am' ? 'የተጠናቀቁ ስራዎች' : 'Delivered jobs'}
            </p>
          </div>
        </div>

        {/* Two-Column Layout: Incoming Jobs & Services Offered */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Main Column: Incoming Customer Requests (2 Cols) */}
          <div className="lg:col-span-2 space-y-space-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[24px]">
                  inbox
                </span>
                <h2 className="text-title-lg font-bold text-on-surface dark:text-white">
                  {t.dashIncomingJobs}
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/80 border border-outline-variant/30">
                {requests.length} {lang === 'am' ? 'ጥያቄዎች' : 'requests'}
              </span>
            </div>

            {requests.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-3">
                <div className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/60 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">assignment_turned_in</span>
                </div>
                <h3 className="text-title-md font-bold text-on-surface dark:text-white">
                  {t.dashNoIncomingJobs}
                </h3>
                <p className="text-body-sm text-outline dark:text-inverse-on-surface/75 max-w-sm mx-auto">
                  {lang === 'am'
                    ? 'አዳዲስ የአገልግሎት ጥያቄዎች ከደንበኞች ሲላኩ በዚህ ክፍል ውስጥ ይታያሉ።'
                    : 'When customers request services from your business in Dessie, they will appear here for you to accept.'}
                </p>
              </div>
            ) : (
              <div className="space-y-space-sm">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-on-surface dark:text-white">
                            {req.customer?.name || 'Customer'}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
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
                        <div className="flex flex-wrap items-center gap-3 text-xs text-outline dark:text-inverse-on-surface/75 mt-1">
                          {req.customer?.phone && (
                            <a
                              href={`tel:${req.customer.phone}`}
                              className="font-mono text-primary-container dark:text-inverse-primary font-bold hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">call</span>
                              <span>{req.customer.phone}</span>
                            </a>
                          )}
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span>{req.location}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-xs text-outline dark:text-inverse-on-surface/70 shrink-0">
                        <div className="font-semibold text-on-surface dark:text-white">
                          {req.service?.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          <span>{req.requested_date}</span>
                          {req.requested_time && <span>• {req.requested_time}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Customer Job Description */}
                    <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 text-body-sm text-on-surface dark:text-inverse-on-surface/90 leading-relaxed">
                      <span className="text-xs font-bold text-outline dark:text-inverse-on-surface/75 block mb-1 uppercase tracking-wider">
                        {lang === 'am' ? 'የስራው ዝርዝር መግለጫ:' : 'Job Description:'}
                      </span>
                      {req.description}
                    </div>

                    {/* Action Workflow Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRequestAction(req.id, 'reject')}
                            disabled={actionLoadingId === req.id}
                            className="px-4 py-2 rounded-xl bg-surface-container-high dark:bg-surface-dim hover:bg-error hover:text-white dark:hover:bg-error text-error text-xs font-bold transition-colors cursor-pointer border border-error/30 disabled:opacity-50"
                          >
                            {t.dashDeclineJob}
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, 'accept')}
                            disabled={actionLoadingId === req.id}
                            className="px-5 py-2 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoadingId === req.id && (
                              <span className="material-symbols-outlined text-[14px] animate-spin">
                                progress_activity
                              </span>
                            )}
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>{t.dashAcceptJob}</span>
                          </button>
                        </>
                      )}

                      {req.status === 'accepted' && (
                        <button
                          onClick={() => handleRequestAction(req.id, 'start')}
                          disabled={actionLoadingId === req.id}
                          className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoadingId === req.id && (
                            <span className="material-symbols-outlined text-[14px] animate-spin">
                              progress_activity
                            </span>
                          )}
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          <span>{t.dashStartJob}</span>
                        </button>
                      )}

                      {req.status === 'in_progress' && (
                        <button
                          onClick={() => handleRequestAction(req.id, 'complete')}
                          disabled={actionLoadingId === req.id}
                          className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoadingId === req.id && (
                            <span className="material-symbols-outlined text-[14px] animate-spin">
                              progress_activity
                            </span>
                          )}
                          <span className="material-symbols-outlined text-[16px]">task_alt</span>
                          <span>{t.dashCompleteJob}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Offered Services & Credentials (1 Col) */}
          <div className="space-y-space-md">
            {/* Offered Services Box */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">
                    handyman
                  </span>
                  <h3 className="text-title-md font-bold text-on-surface dark:text-white">
                    {t.dashManageServices}
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container dark:text-inverse-primary">
                  {myServices.length}
                </span>
              </div>

              {/* Service Badges */}
              <div className="flex flex-wrap gap-2">
                {myServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high dark:bg-surface-dim border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-white"
                  >
                    <span>{srv.name}</span>
                    <button
                      onClick={() => handleRemoveService(srv.id)}
                      title={t.btnRemoveFile}
                      className="w-4 h-4 rounded-full hover:bg-error hover:text-white text-outline transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                ))}

                {myServices.length === 0 && (
                  <p className="text-xs text-outline dark:text-inverse-on-surface/70 py-2">
                    {lang === 'am' ? 'እስካሁን ምንም የተመረጡ አገልግሎቶች የሉም።' : 'No offered services selected yet.'}
                  </p>
                )}
              </div>

              {/* Add New Service Selector */}
              {availableServicesToAdd.length > 0 && (
                <div className="pt-2 flex items-center gap-2">
                  <select
                    value={selectedServiceToAdd}
                    onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                    className="flex-1 p-2 rounded-xl bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary-container"
                  >
                    <option value="">{lang === 'am' ? 'አገልግሎት ይምረጡ...' : 'Select service to offer...'}</option>
                    {availableServicesToAdd.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddService}
                    disabled={!selectedServiceToAdd || addingService}
                    className="px-3.5 py-2 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>{t.dashAddService}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document Credentials Box */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">
                    description
                  </span>
                  <h3 className="text-title-md font-bold text-on-surface dark:text-white">
                    {lang === 'am' ? 'የቀረቡ ሰነዶች' : 'Credentials & CV'}
                  </h3>
                </div>
              </div>

              {/* CV Status */}
              <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-primary-container text-[22px] shrink-0">
                    picture_as_pdf
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface dark:text-white">
                      Curriculum Vitae (CV)
                    </p>
                    <p className="text-[11px] text-outline dark:text-inverse-on-surface/75 truncate" title={user?.provider_profile?.cv_original_name || ''}>
                      {user?.provider_profile?.cv_original_name || t.badgeNoCv}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-xs font-bold text-on-surface dark:text-white transition-colors cursor-pointer border border-outline-variant/40 shrink-0"
                >
                  {user?.provider_profile?.has_cv ? t.btnReplaceFile : t.btnChooseFile}
                </button>
              </div>

              {/* Certificate Status */}
              {user?.provider_profile?.has_certificate && (
                <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary dark:text-amber-400 text-[22px] shrink-0">
                    verified
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface dark:text-white">
                      Certificate
                    </p>
                    <p className="text-[11px] text-outline dark:text-inverse-on-surface/75 truncate" title={user.provider_profile.certificate_original_name || ''}>
                      {user.provider_profile.certificate_original_name || t.badgeHasCert}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Overview Card */}
            <div className="p-space-lg rounded-2xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm space-y-3">
              <h3 className="text-title-md font-bold text-on-surface dark:text-white border-b border-outline-variant/20 pb-2">
                {lang === 'am' ? 'የአካውንት መረጃ' : 'Account Details'}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-outline-variant/10">
                  <span className="text-outline dark:text-inverse-on-surface/75">{t.dashboardEmail}:</span>
                  <span className="font-semibold text-on-surface dark:text-white">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-outline dark:text-inverse-on-surface/75">{t.providerPhoneLabel}:</span>
                    <span className="font-mono font-semibold text-on-surface dark:text-white">{user.phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-outline-variant/10">
                  <span className="text-outline dark:text-inverse-on-surface/75">{t.labelLocation}:</span>
                  <span className="font-semibold text-on-surface dark:text-white">{user?.provider_profile?.location}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-outline dark:text-inverse-on-surface/75">{t.labelExperience}:</span>
                  <span className="font-semibold text-on-surface dark:text-white">
                    {user?.provider_profile?.experience_years} {t.experienceYearsSuffix}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload/Replace CV Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-title-lg font-bold text-on-surface dark:text-white">
                {t.reUploadCvBtn}
              </h3>
              <button
                type="button"
                onClick={closeUploadModal}
                className="text-outline hover:text-on-surface dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-sm text-outline dark:text-inverse-on-surface/80">
              {t.cvUploadHelp}
            </p>

            {uploadSuccess ? (
              <div className="p-3 rounded-lg bg-primary-container/15 text-primary-container dark:text-inverse-primary text-body-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>{uploadSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleCvUploadSubmit} className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed border-outline-variant/60 hover:border-primary-container transition-colors text-center cursor-pointer bg-surface-container-low/40 dark:bg-surface-dim/30"
                >
                  <span className="material-symbols-outlined text-[36px] text-primary-container dark:text-inverse-primary block mb-1">
                    upload_file
                  </span>
                  <p className="text-body-sm font-semibold text-on-surface dark:text-white">
                    {selectedFile ? selectedFile.name : t.btnChooseFile}
                  </p>
                  {selectedFile ? (
                    <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  ) : (
                    <p className="text-xs text-outline dark:text-inverse-on-surface/70 mt-1">{t.cvUploadHelp}</p>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 rounded-lg bg-error/10 text-error text-xs border border-error/20">
                    {uploadError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    disabled={uploading}
                    className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim text-body-sm font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer text-on-surface dark:text-white"
                  >
                    {t.btnCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 rounded-lg bg-primary-container text-white text-body-sm font-bold hover:bg-primary transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploading && (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                    )}
                    <span>{uploading ? t.uploadingFiles : t.reUploadCvBtn}</span>
                  </button>
                </div>
              </form>
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

      <Footer />
    </div>
  );
}
