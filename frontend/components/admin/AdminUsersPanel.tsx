'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { Language } from '@/lib/translations';
import { formatApiError } from '@/lib/api/auth';
import { formatRequestDate } from '@/components/customer/ServiceRequestCard';
import {
  AdminUserItem,
  getAdminUsers,
  updateAdminUserStatus,
} from '@/lib/api/admin';

interface AdminUsersPanelProps {
  lang: Language;
  onUserUpdated?: () => void;
}

type UserStatusFilter = 'all' | 'active' | 'suspended';

export default function AdminUsersPanel({ lang, onUserUpdated }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AdminUserItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Debounce search input cleanly
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers({
        search: debouncedSearch,
        status: statusFilter,
        page,
        per_page: 10,
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
      setTotalPages(Math.max(1, res.last_page || 1));
      setTotalUsers(res.total || 0);
    } catch (err: unknown) {
      const { message } = formatApiError(
        err,
        lang === 'am' ? 'ተጠቃሚዎችን መጫን አልተቻለም።' : 'Failed to load registered users.'
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page, lang]);

  useEffect(() => {
    let active = true;
    getAdminUsers({
      search: debouncedSearch,
      status: statusFilter,
      page,
      per_page: 10,
    })
      .then((res) => {
        if (!active) return;
        setUsers(Array.isArray(res.data) ? res.data : []);
        setTotalPages(Math.max(1, res.last_page || 1));
        setTotalUsers(res.total || 0);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const { message } = formatApiError(err, 'Failed to load registered users.');
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, statusFilter, page]);

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    setUpdatingId(user.id);
    setActionError(null);
    try {
      const res = await updateAdminUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...res.data } : u))
      );
      setConfirmTarget(null);
      onUserUpdated?.();
    } catch (err: unknown) {
      const { message } = formatApiError(
        err,
        lang === 'am' ? 'የተጠቃሚ ሁኔታን መቀየር አልተቻለም።' : 'Failed to update user status.'
      );
      setActionError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline dark:text-inverse-on-surface/70 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                lang === 'am'
                  ? 'በስም፣ ኢሜይል ወይም ስልክ ፈልግ...'
                  : 'Search users by name, email, phone...'
              }
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 focus:outline-none focus:border-primary-container text-body-sm text-on-surface dark:text-white placeholder:text-outline dark:placeholder:text-[#a89a90]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'active', 'suspended'] as UserStatusFilter[]).map((key) => {
              const active = statusFilter === key;
              const label =
                key === 'all'
                  ? lang === 'am'
                    ? 'ሁሉም'
                    : 'All'
                  : key === 'active'
                  ? lang === 'am'
                    ? 'ንቁ'
                    : 'Active'
                  : lang === 'am'
                  ? 'የታገዱ'
                  : 'Suspended';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container-low dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant border-outline-variant/40 hover:border-primary-container'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="text-xs font-medium text-outline dark:text-outline-variant">
            {totalUsers} {lang === 'am' ? 'ደንበኞች' : 'users'}
          </span>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface text-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Table / Loading / Error / Empty */}
      {loading ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
            progress_activity
          </span>
          <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-2">
            {lang === 'am' ? 'ተጠቃሚዎች በመጫን ላይ ናቸው...' : 'Loading registered users...'}
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-error/30 space-y-3">
          <p className="text-sm font-medium text-error">{error}</p>
          <button
            type="button"
            onClick={fetchUsers}
            className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-bold cursor-pointer"
          >
            {lang === 'am' ? 'እንደገና ሞክር' : 'Retry'}
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[48px] text-outline dark:text-inverse-on-surface/60 mb-2">
            person_search
          </span>
          <h3 className="text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
            {lang === 'am' ? 'ምንም ተጠቃሚ አልተገኘም' : 'No users found'}
          </h3>
          <p className="text-body-sm text-outline dark:text-inverse-on-surface/75 mt-1">
            {lang === 'am'
              ? 'ከፍለጋዎ ጋር የሚስማማ የተመዘገበ ደንበኛ የለም።'
              : 'No registered clients match your current filter or search.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/50 dark:bg-surface-dim/70 text-label-md font-bold text-outline dark:text-inverse-on-surface/90">
                  <th className="py-3 px-4">{lang === 'am' ? 'ተጠቃሚ' : 'Client / User'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'የመገናኛ መረጃ' : 'Contact Details'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ጥያቄዎች' : 'Requests'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'የተመዘገበበት ቀን' : 'Registered Date'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'am' ? 'እርምጃ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-container-low/30 dark:hover:bg-surface-dim/20 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface dark:text-white">{u.name}</div>
                          <div className="text-[11px] text-outline dark:text-inverse-on-surface/70">
                            ID #{u.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-on-surface dark:text-white">
                        {u.email}
                      </div>
                      {u.phone && (
                        <div className="text-xs text-outline dark:text-inverse-on-surface/75 font-mono mt-0.5">
                          {u.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container dark:bg-surface-dim text-on-surface dark:text-white border border-outline-variant/30">
                        {u.total_requests_count ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-on-surface-variant dark:text-outline-variant">
                      {formatRequestDate(u.created_at)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          u.status === 'suspended'
                            ? 'bg-error/15 text-error border-error/30'
                            : 'bg-primary-container/15 text-primary-container border-primary-container/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {u.status === 'suspended' ? 'block' : 'check_circle'}
                        </span>
                        <span>
                          {u.status === 'suspended'
                            ? lang === 'am'
                              ? 'የታገደ'
                              : 'Suspended'
                            : lang === 'am'
                            ? 'ንቁ'
                            : 'Active'}
                        </span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={updatingId === u.id}
                        onClick={() => {
                          setActionError(null);
                          setConfirmTarget(u);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border ${
                          u.status === 'active'
                            ? 'bg-surface-container-high text-error hover:bg-error hover:text-white dark:bg-surface-dim border-error/30'
                            : 'bg-primary-container text-white hover:opacity-90 border-primary-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {u.status === 'active' ? 'person_off' : 'person_check'}
                        </span>
                        <span>
                          {u.status === 'active'
                            ? lang === 'am'
                              ? 'አግድ'
                              : 'Suspend'
                            : lang === 'am'
                            ? 'አንቃ'
                            : 'Activate'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="text-outline dark:text-outline-variant">
                {lang === 'am' ? `ገጽ ${page} ከ ${totalPages}` : `Page ${page} of ${totalPages}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-low dark:bg-surface-dim text-on-surface dark:text-white font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {lang === 'am' ? 'ቀዳሚ' : 'Previous'}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-low dark:bg-surface-dim text-on-surface dark:text-white font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {lang === 'am' ? 'ቀጣይ' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Suspend / Activate */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmTarget.status === 'active'
                    ? 'bg-error/15 text-error'
                    : 'bg-primary-container/15 text-primary-container'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {confirmTarget.status === 'active' ? 'person_off' : 'person_check'}
                </span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-inverse-on-surface">
                  {confirmTarget.status === 'active'
                    ? lang === 'am'
                      ? 'ተጠቃሚውን ማገድ ይፈልጋሉ?'
                      : 'Suspend User Account?'
                    : lang === 'am'
                    ? 'ተጠቃሚውን እንደገና ማንቃት ይፈልጋሉ?'
                    : 'Activate User Account?'}
                </h3>
                <p className="text-body-sm text-outline mt-1">
                  {confirmTarget.status === 'active'
                    ? lang === 'am'
                      ? `${confirmTarget.name} ወደ መድረኩ መግባት አይችልም፤ ነባር ክፍለ ጊዜዎችም ይዘጋሉ።`
                      : `${confirmTarget.name} will be blocked from signing in and active sessions will be revoked.`
                    : lang === 'am'
                    ? `${confirmTarget.name} ወደ መድረኩ እንደገና መግባት ይችላል።`
                    : `${confirmTarget.name} will regain full access to sign in and request services.`}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-xs border border-error/20">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={updatingId === confirmTarget.id}
                className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim text-xs sm:text-body-sm font-semibold cursor-pointer"
              >
                {lang === 'am' ? 'ተመለስ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={updatingId === confirmTarget.id}
                onClick={() => handleToggleUserStatus(confirmTarget)}
                className={`px-4 py-2 rounded-lg text-white text-xs sm:text-body-sm font-semibold cursor-pointer disabled:opacity-50 ${
                  confirmTarget.status === 'active' ? 'bg-error' : 'bg-primary-container'
                }`}
              >
                {confirmTarget.status === 'active'
                  ? lang === 'am'
                    ? 'አዎ፣ አግድ'
                    : 'Confirm Suspend'
                  : lang === 'am'
                  ? 'አዎ፣ አንቃ'
                  : 'Confirm Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
