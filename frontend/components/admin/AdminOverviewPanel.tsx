'use client';

import React from 'react';
import type { Language, Translations } from '@/lib/translations';
import type { AdminDashboardStats } from '@/lib/api/admin';
import { formatRequestDate, getRequestStatusBadgeClass, getRequestStatusLabel } from '@/components/customer/ServiceRequestCard';

export type AdminSectionTab = 'overview' | 'providers' | 'users' | 'complaints';

interface AdminOverviewPanelProps {
  stats: AdminDashboardStats | null;
  loading: boolean;
  lang: Language;
  t: Translations;
  onNavigateTab: (tab: AdminSectionTab) => void;
  onRefresh: () => void;
}

export default function AdminOverviewPanel({
  stats,
  loading,
  lang,
  onNavigateTab,
  onRefresh,
}: AdminOverviewPanelProps) {
  if (loading && !stats) {
    return (
      <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
        <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
          progress_activity
        </span>
        <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-2">
          {lang === 'am' ? 'የመድረክ ትንታኔ በመጫን ላይ ነው...' : 'Loading platform analytics...'}
        </p>
      </div>
    );
  }

  const totalReq = stats?.total_requests ?? 0;
  const completedRatio = totalReq > 0 ? Math.round(((stats?.completed_requests ?? 0) / totalReq) * 100) : 0;
  const totalProv = stats?.total_providers ?? 0;
  const verifiedRatio = totalProv > 0 ? Math.round(((stats?.verified_providers ?? 0) / totalProv) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-space-md">
        {/* Card 1: Service Requests Volume */}
        <section className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[22px]">
                analytics
              </span>
              <h2 className="text-title-md font-bold text-on-surface dark:text-white">
                {lang === 'am' ? 'የአገልግሎት ጥያቄዎች መጠን' : 'Service Requests Volume'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs font-semibold text-primary-container dark:text-inverse-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30">
              <span className="text-[11px] font-bold uppercase text-outline dark:text-outline-variant block">
                {lang === 'am' ? 'ጠቅላላ' : 'Total'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-on-surface dark:text-white mt-0.5 block">
                {stats?.total_requests ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20">
              <span className="text-[11px] font-bold uppercase text-secondary block">
                {lang === 'am' ? 'በመጠባበቅ ላይ' : 'Pending'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-secondary mt-0.5 block">
                {stats?.pending_requests ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400 block">
                {lang === 'am' ? 'በሂደት ላይ' : 'In Progress'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                {stats?.in_progress_requests ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-primary-container/10 border border-primary-container/20">
              <span className="text-[11px] font-bold uppercase text-primary-container dark:text-inverse-primary block">
                {lang === 'am' ? 'የተጠናቀቁ' : 'Completed'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-primary-container dark:text-inverse-primary mt-0.5 block">
                {stats?.completed_requests ?? 0}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-medium text-on-surface-variant dark:text-outline-variant">
              <span>
                {lang === 'am'
                  ? `ዛሬ የቀረቡ ጥያቄዎች: ${stats?.requests_today ?? 0}`
                  : `Requests submitted today: ${stats?.requests_today ?? 0}`}
              </span>
              <span className="font-bold text-primary-container dark:text-inverse-primary">
                {completedRatio}% {lang === 'am' ? 'ተጠናቅቋል' : 'completed'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high dark:bg-surface-dim overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-300"
                style={{ width: `${completedRatio}%` }}
              />
            </div>
          </div>
        </section>

        {/* Card 2: Provider & Community Health */}
        <section className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[22px]">
                shield_person
              </span>
              <h2 className="text-title-md font-bold text-on-surface dark:text-white">
                {lang === 'am' ? 'የባለሙያዎችና የድጋፍ ሁኔታ' : 'Verification & Support Health'}
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container dark:text-inverse-primary">
              {verifiedRatio}% {lang === 'am' ? 'የተረጋገጡ' : 'verified'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('providers')}
              className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 hover:border-secondary text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase text-secondary block">
                {lang === 'am' ? 'ማረጋገጫ የሚጠብቁ' : 'Pending Verification'}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-secondary">
                  {stats?.pending_providers ?? 0}
                </span>
                <span className="text-xs font-semibold text-primary-container dark:text-inverse-primary flex items-center gap-0.5">
                  <span>{lang === 'am' ? 'ገምግም' : 'Review'}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('complaints')}
              className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 hover:border-error text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase text-error block">
                {lang === 'am' ? 'ያልተፈቱ ቅሬታዎች' : 'Open Complaints'}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-error">
                  {stats?.pending_complaints_count ?? 0}
                </span>
                <span className="text-xs font-semibold text-primary-container dark:text-inverse-primary flex items-center gap-0.5">
                  <span>{lang === 'am' ? 'ይመልከቱ' : 'Inspect'}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 hover:border-primary-container text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase text-outline dark:text-outline-variant block">
                {lang === 'am' ? 'የታገዱ ተጠቃሚዎች' : 'Suspended Users'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-on-surface dark:text-white mt-1 block">
                {stats?.suspended_users_count ?? 0}
              </span>
            </button>

            <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30">
              <span className="text-[11px] font-bold uppercase text-outline dark:text-outline-variant block">
                {lang === 'am' ? 'የተፈቱ ቅሬታዎች' : 'Resolved Disputes'}
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-primary-container dark:text-inverse-primary mt-1 block">
                {stats?.resolved_complaints_count ?? 0}
                <span className="text-xs font-medium text-outline ml-1">
                  / {stats?.total_complaints_count ?? 0}
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-space-md">
        {/* Recent Service Requests */}
        <section className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-4 sm:p-6 space-y-3">
          <h3 className="text-title-md font-bold text-on-surface dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[20px]">
              receipt_long
            </span>
            <span>{lang === 'am' ? 'የቅርብ ጊዜ የአገልግሎት ጥያቄዎች' : 'Recent Service Requests'}</span>
          </h3>

          {!stats?.recent_requests?.length ? (
            <p className="text-xs text-outline dark:text-outline-variant py-6 text-center">
              {lang === 'am' ? 'እስካሁን ምንም ጥያቄ አልቀረበም።' : 'No service requests recorded yet.'}
            </p>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {stats.recent_requests.map((req) => (
                <div key={req.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface dark:text-white truncate">
                      {req.service?.name || 'Service'} — {req.provider?.business_name || 'Provider'}
                    </p>
                    <p className="text-outline dark:text-outline-variant truncate">
                      {req.customer?.name || 'Customer'} • {formatRequestDate(req.requested_date)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${getRequestStatusBadgeClass(
                      req.status
                    )}`}
                  >
                    {getRequestStatusLabel(req.status, lang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Newly Registered Customers */}
        <section className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-bold text-on-surface dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[20px]">
                group_add
              </span>
              <span>{lang === 'am' ? 'አዲስ የተመዘገቡ ደንበኞች' : 'Recent Registered Clients'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="text-xs font-bold text-primary-container dark:text-inverse-primary hover:underline cursor-pointer"
            >
              {lang === 'am' ? 'ሁሉንም ይመልከቱ' : 'Manage all'}
            </button>
          </div>

          {!stats?.recent_users?.length ? (
            <p className="text-xs text-outline dark:text-outline-variant py-6 text-center">
              {lang === 'am' ? 'እስካሁን ምንም ደንበኛ አልተመዘገበም።' : 'No registered clients yet.'}
            </p>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {stats.recent_users.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface dark:text-white truncate">{u.name}</p>
                    <p className="text-outline dark:text-outline-variant truncate">
                      {u.email} • {u.total_requests_count}{' '}
                      {lang === 'am' ? 'ጥያቄዎች' : 'requests'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${
                      u.status === 'suspended'
                        ? 'bg-error/15 text-error border-error/30'
                        : 'bg-primary-container/15 text-primary-container border-primary-container/30'
                    }`}
                  >
                    {u.status === 'suspended'
                      ? lang === 'am'
                        ? 'የታገደ'
                        : 'Suspended'
                      : lang === 'am'
                      ? 'ንቁ'
                      : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

