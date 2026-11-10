'use client';

import React, { useState, useMemo } from 'react';
import type { Language, Translations } from '@/lib/translations';
import { formatApiError } from '@/lib/api/auth';
import {
  AdminProviderItem,
  updateProviderVerification,
  getAdminProviderCvBlob,
  getAdminProviderCertBlob,
} from '@/lib/api/providers';

type ProviderFilterTab = 'all' | 'pending' | 'verified' | 'rejected';

interface AdminProvidersPanelProps {
  providers: AdminProviderItem[];
  setProviders: React.Dispatch<React.SetStateAction<AdminProviderItem[]>>;
  loadingProviders: boolean;
  onRefresh: () => void;
  onProvidersChanged?: () => void;
  lang: Language;
  t: Translations;
}

export default function AdminProvidersPanel({
  providers,
  setProviders,
  loadingProviders,
  onRefresh,
  onProvidersChanged,
  lang,
  t,
}: AdminProvidersPanelProps) {
  const [activeTab, setActiveTab] = useState<ProviderFilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const [approveTarget, setApproveTarget] = useState<AdminProviderItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminProviderItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: providers.length,
      pending: providers.filter((p) => p.verification_status === 'pending').length,
      verified: providers.filter((p) => p.verification_status === 'verified').length,
      rejected: providers.filter((p) => p.verification_status === 'rejected').length,
    };
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (activeTab !== 'all' && p.verification_status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const bName = (p.business_name || '').toLowerCase();
        const uName = (p.user?.name || '').toLowerCase();
        const uEmail = (p.user?.email || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        return (
          bName.includes(query) ||
          uName.includes(query) ||
          uEmail.includes(query) ||
          loc.includes(query)
        );
      }
      return true;
    });
  }, [providers, activeTab, searchQuery]);

  const handleViewDocument = async (provider: AdminProviderItem, kind: 'cv' | 'cert') => {
    setDownloadingDocId(`${kind}-${provider.id}`);
    try {
      const blob =
        kind === 'cv'
          ? await getAdminProviderCvBlob(provider.id)
          : await getAdminProviderCertBlob(provider.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: unknown) {
      const { message } = formatApiError(
        err,
        kind === 'cv' ? 'Failed to download CV' : 'Failed to download certificate'
      );
      alert(message);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await updateProviderVerification(approveTarget.id, 'verified');
      setProviders((prev) =>
        prev.map((p) =>
          p.id === approveTarget.id
            ? { ...p, verification_status: 'verified', rejection_reason: null }
            : p
        )
      );
      setApproveTarget(null);
      onProvidersChanged?.();
    } catch (err: unknown) {
      const { message } = formatApiError(err, 'Failed to approve provider');
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await updateProviderVerification(rejectTarget.id, 'rejected', rejectionReason);
      setProviders((prev) =>
        prev.map((p) =>
          p.id === rejectTarget.id
            ? { ...p, verification_status: 'rejected', rejection_reason: rejectionReason }
            : p
        )
      );
      setRejectTarget(null);
      setRejectionReason('');
      onProvidersChanged?.();
    } catch (err: unknown) {
      const { message } = formatApiError(err, 'Failed to reject provider');
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider Status Filter Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-space-sm">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-primary-container/10 border-primary-container text-primary-container dark:text-primary-container shadow-sm'
              : 'bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-outline-variant'
          }`}
        >
          <span className="text-2xs sm:text-xs font-bold text-outline dark:text-inverse-on-surface/85 uppercase tracking-wider block">
            {t.filterAllProviders}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-on-surface dark:text-white mt-1 block">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-secondary/15 border-secondary text-secondary shadow-sm'
              : 'bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-outline-variant'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs sm:text-xs font-bold text-secondary dark:text-secondary-container uppercase tracking-wider">
              {t.filterPendingProviders}
            </span>
            {counts.pending > 0 && (
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-secondary animate-pulse" />
            )}
          </div>
          <span className="text-xl sm:text-2xl font-bold text-secondary dark:text-secondary-container mt-1 block">
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verified')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'verified'
              ? 'bg-primary-container/15 border-primary-container text-primary-container shadow-sm'
              : 'bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-outline-variant'
          }`}
        >
          <span className="text-2xs sm:text-xs font-bold text-primary-container dark:text-inverse-primary uppercase tracking-wider block">
            {t.filterVerifiedProviders}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-primary-container dark:text-inverse-primary mt-1 block">
            {counts.verified}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'rejected'
              ? 'bg-error/15 border-error text-error shadow-sm'
              : 'bg-surface-container-lowest dark:bg-inverse-surface border-outline-variant/40 hover:border-outline-variant'
          }`}
        >
          <span className="text-2xs sm:text-xs font-bold text-error dark:text-error-container uppercase tracking-wider block">
            {t.filterRejectedProviders}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-error dark:text-error-container mt-1 block">
            {counts.rejected}
          </span>
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline dark:text-inverse-on-surface/70 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'am' ? 'አቅራቢ ፈልግ...' : 'Search by name, business, location...'}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 focus:outline-none focus:border-primary-container text-body-sm text-on-surface dark:text-white placeholder:text-outline dark:placeholder:text-[#a89a90]"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loadingProviders}
          className="px-3.5 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface text-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-end sm:self-auto"
        >
          <span className={`material-symbols-outlined text-[18px] ${loadingProviders ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
        </button>
      </div>

      {/* Providers Table */}
      {loadingProviders ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
            progress_activity
          </span>
          <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-2">
            {lang === 'am' ? 'አቅራቢዎች በመጫን ላይ ናቸው...' : 'Loading providers...'}
          </p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[48px] text-outline dark:text-inverse-on-surface/60 mb-2">
            folder_off
          </span>
          <h3 className="text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
            {t.emptyProviders}
          </h3>
          <p className="text-body-sm text-outline dark:text-inverse-on-surface/75 mt-1">
            {lang === 'am'
              ? 'በዚህ ሁኔታ ውስጥ ምንም አቅራቢዎች አልተገኙም።'
              : 'No providers match the selected criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/50 dark:bg-surface-dim/70 text-label-md font-bold text-outline dark:text-inverse-on-surface/90">
                  <th className="py-3 px-4">{t.colBusiness}</th>
                  <th className="py-3 px-4">{t.colContact}</th>
                  <th className="py-3 px-4">{t.colExperience}</th>
                  <th className="py-3 px-4">{t.colDocuments}</th>
                  <th className="py-3 px-4">{t.colStatus}</th>
                  <th className="py-3 px-4 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {filteredProviders.map((provider) => (
                  <tr
                    key={provider.id}
                    className="hover:bg-surface-container-low/30 dark:hover:bg-surface-dim/20 transition-colors"
                  >
                    {/* Business & Location */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-on-surface dark:text-white">
                        {provider.business_name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-outline dark:text-inverse-on-surface/75 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span>{provider.location}</span>
                      </div>
                      {provider.services && provider.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {provider.services.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded text-[11px] bg-primary-container/10 text-primary-container dark:bg-primary-container/20 dark:text-inverse-primary font-medium"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-on-surface dark:text-white">
                        {provider.user?.name || '—'}
                      </div>
                      <div className="text-xs text-outline dark:text-inverse-on-surface/75">
                        {provider.user?.email}
                      </div>
                      {provider.user?.phone && (
                        <div className="text-xs text-outline dark:text-inverse-on-surface/75 mt-0.5 font-mono">
                          {provider.user.phone}
                        </div>
                      )}
                    </td>

                    {/* Experience */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-semibold text-on-surface dark:text-white">
                        {provider.experience_years}
                      </span>{' '}
                      <span className="text-xs text-outline dark:text-inverse-on-surface/75">
                        {t.experienceYearsSuffix}
                      </span>
                    </td>

                    {/* Documents */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {provider.has_cv ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocument(provider, 'cv')}
                              disabled={downloadingDocId === `cv-${provider.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-container/10 text-primary-container dark:bg-primary-container/20 dark:text-inverse-primary hover:bg-primary-container/20 transition-colors cursor-pointer disabled:opacity-50 border border-primary-container/30"
                              title={provider.cv_original_name || 'CV'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {downloadingDocId === `cv-${provider.id}`
                                  ? 'progress_activity'
                                  : 'picture_as_pdf'}
                              </span>
                              <span>{t.btnViewCv}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-surface-container-high dark:bg-surface-dim text-outline dark:text-inverse-on-surface/60">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              <span>{t.badgeNoCv}</span>
                            </span>
                          )}
                          {provider.cv_original_name && (
                            <span
                              className="text-[11px] text-outline dark:text-inverse-on-surface/80 max-w-[120px] truncate block"
                              title={provider.cv_original_name}
                            >
                              {provider.cv_original_name}
                            </span>
                          )}
                        </div>

                        {provider.has_certificate && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewDocument(provider, 'cert')}
                              disabled={downloadingDocId === `cert-${provider.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-tertiary-container/15 text-tertiary hover:bg-tertiary-container/25 transition-colors cursor-pointer disabled:opacity-50 border border-tertiary-container/30"
                              title={provider.certificate_original_name || 'Certificate'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {downloadingDocId === `cert-${provider.id}`
                                  ? 'progress_activity'
                                  : 'verified'}
                              </span>
                              <span>{t.btnViewCertificate}</span>
                            </button>
                            {provider.certificate_original_name && (
                              <span
                                className="text-[11px] text-outline dark:text-inverse-on-surface/80 max-w-[120px] truncate block"
                                title={provider.certificate_original_name}
                              >
                                {provider.certificate_original_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          provider.verification_status === 'verified'
                            ? 'bg-primary-container/15 text-primary-container border-primary-container/30'
                            : provider.verification_status === 'rejected'
                            ? 'bg-error/15 text-error border-error/30'
                            : 'bg-secondary/15 text-secondary border-secondary/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {provider.verification_status === 'verified'
                            ? 'verified'
                            : provider.verification_status === 'rejected'
                            ? 'cancel'
                            : 'schedule'}
                        </span>
                        <span>
                          {provider.verification_status === 'verified'
                            ? t.badgeVerified
                            : provider.verification_status === 'rejected'
                            ? t.statusRejected
                            : t.statusPendingVerification}
                        </span>
                      </span>

                      {provider.verification_status === 'rejected' && provider.rejection_reason && (
                        <div
                          className="text-[11px] text-error mt-1 max-w-[200px] line-clamp-2"
                          title={provider.rejection_reason}
                        >
                          {provider.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {provider.verification_status !== 'verified' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setApproveTarget(provider);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>{t.btnApprove}</span>
                          </button>
                        )}

                        {provider.verification_status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setRejectTarget(provider);
                              setRejectionReason(provider.rejection_reason || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-error hover:bg-error hover:text-white dark:bg-surface-dim dark:hover:bg-error text-xs font-semibold transition-colors cursor-pointer border border-error/30"
                          >
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            <span>{t.btnReject}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-inverse-on-surface">
                  {t.confirmApproveTitle}
                </h3>
                <p className="text-body-sm text-outline mt-1">{t.confirmApproveMsg}</p>
                <div className="mt-3 p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 text-body-sm">
                  <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                    {approveTarget.business_name}
                  </span>
                  <span className="text-outline block text-xs mt-0.5">
                    {approveTarget.user?.name} ({approveTarget.user?.email})
                  </span>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-xs border border-error/20">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim text-body-sm font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-body-sm font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                )}
                <span>{t.btnApprove}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation & Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center text-error shrink-0">
                <span className="material-symbols-outlined text-[24px]">gpp_bad</span>
              </div>
              <div className="flex-1">
                <h3 className="text-title-lg font-bold text-on-surface dark:text-inverse-on-surface">
                  {t.confirmRejectTitle}
                </h3>
                <p className="text-body-sm text-outline mt-1">{t.confirmRejectMsg}</p>
                <div className="mt-3 p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 text-body-sm">
                  <span className="font-bold text-on-surface dark:text-inverse-on-surface">
                    {rejectTarget.business_name}
                  </span>
                  <span className="text-outline block text-xs mt-0.5">
                    {rejectTarget.user?.name} ({rejectTarget.user?.email})
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                {t.rejectionReasonLabel}
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t.rejectionReasonPlaceholder}
                className="w-full p-3 rounded-lg bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 focus:outline-none focus:border-error text-body-sm text-on-surface dark:text-inverse-on-surface"
              />
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-xs border border-error/20">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim text-body-sm font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-error text-white text-body-sm font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                )}
                <span>{t.btnReject}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

