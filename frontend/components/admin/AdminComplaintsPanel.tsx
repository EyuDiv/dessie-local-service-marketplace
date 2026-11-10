'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Language } from '@/lib/translations';
import { formatApiError } from '@/lib/api/auth';
import { formatRequestDate } from '@/components/customer/ServiceRequestCard';
import {
  AdminComplaintItem,
  ComplaintStatus,
  getAdminComplaints,
  updateAdminComplaintStatus,
} from '@/lib/api/admin';

interface AdminComplaintsPanelProps {
  lang: Language;
  onComplaintUpdated?: () => void;
}

type ComplaintFilter = 'all' | ComplaintStatus;

const COMPLAINT_STATUS_STYLES: Record<ComplaintStatus, string> = {
  pending: 'bg-secondary/15 text-secondary border-secondary/30',
  resolved: 'bg-primary-container/15 text-primary-container border-primary-container/30',
  dismissed: 'bg-surface-container-high dark:bg-surface-dim text-outline border-outline-variant/40',
};

export default function AdminComplaintsPanel({
  lang,
  onComplaintUpdated,
}: AdminComplaintsPanelProps) {
  const [complaints, setComplaints] = useState<AdminComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ComplaintFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaintItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getAdminComplaints();
      setComplaints(items);
    } catch (err: unknown) {
      const { message } = formatApiError(
        err,
        lang === 'am' ? 'ቅሬታዎችን መጫን አልተቻለም።' : 'Failed to load user complaints.'
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    let active = true;
    getAdminComplaints()
      .then((items) => {
        if (!active) return;
        setComplaints(items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const { message } = formatApiError(err, 'Failed to load user complaints.');
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      all: complaints.length,
      pending: complaints.filter((c) => c.status === 'pending').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      dismissed: complaints.filter((c) => c.status === 'dismissed').length,
    };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const subject = (c.subject || '').toLowerCase();
        const msg = (c.message || '').toLowerCase();
        const uName = (c.user?.name || '').toLowerCase();
        const uEmail = (c.user?.email || '').toLowerCase();
        const pName = (c.provider?.business_name || '').toLowerCase();
        return (
          subject.includes(q) ||
          msg.includes(q) ||
          uName.includes(q) ||
          uEmail.includes(q) ||
          pName.includes(q)
        );
      }
      return true;
    });
  }, [complaints, statusFilter, searchQuery]);

  const handleStatusUpdate = async (complaintId: number, status: ComplaintStatus) => {
    setUpdatingId(complaintId);
    setActionError(null);
    try {
      const res = await updateAdminComplaintStatus(complaintId, status);
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, ...res.data } : c))
      );
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint((prev) => (prev ? { ...prev, ...res.data } : null));
      }
      onComplaintUpdated?.();
    } catch (err: unknown) {
      const { message } = formatApiError(
        err,
        lang === 'am' ? 'የቅሬታውን ሁኔታ መቀየር አልተቻለም።' : 'Failed to update complaint status.'
      );
      setActionError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusLabel = (status: ComplaintStatus): string => {
    if (status === 'resolved') return lang === 'am' ? 'ተፈቷል' : 'Resolved';
    if (status === 'dismissed') return lang === 'am' ? 'ውድቅ ተደርጓል' : 'Dismissed';
    return lang === 'am' ? 'በመጠባበቅ ላይ' : 'Pending';
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs + Search Bar */}
      <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'pending', 'resolved', 'dismissed'] as ComplaintFilter[]).map((key) => {
              const active = statusFilter === key;
              const label =
                key === 'all'
                  ? lang === 'am'
                    ? 'ሁሉም'
                    : 'All'
                  : key === 'pending'
                  ? lang === 'am'
                    ? 'በመጠባበቅ ላይ'
                    : 'Pending'
                  : key === 'resolved'
                  ? lang === 'am'
                    ? 'የተፈቱ'
                    : 'Resolved'
                  : lang === 'am'
                  ? 'የተዘጉ'
                  : 'Dismissed';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container-low dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant border-outline-variant/40 hover:border-primary-container'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`px-1.5 rounded-full text-[11px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container dark:bg-inverse-surface text-on-surface dark:text-white'
                    }`}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline dark:text-inverse-on-surface/70 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'am' ? 'ቅሬታ ወይም ተጠቃሚ ፈልግ...' : 'Search complaints, user, provider...'
                }
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-low dark:bg-surface-dim border border-outline-variant/50 focus:outline-none focus:border-primary-container text-body-sm text-on-surface dark:text-white placeholder:text-outline dark:placeholder:text-[#a89a90]"
              />
            </div>

            <button
              type="button"
              onClick={fetchComplaints}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest text-on-surface dark:text-inverse-on-surface text-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span className="hidden sm:inline">{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-error/10 text-error text-xs border border-error/30 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Table / Loading / Error / Empty */}
      {loading ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
            progress_activity
          </span>
          <p className="text-body-sm text-on-surface-variant dark:text-inverse-on-surface/85 mt-2">
            {lang === 'am' ? 'ቅሬታዎች በመጫን ላይ ናቸው...' : 'Loading complaints & disputes...'}
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-error/30 space-y-3">
          <p className="text-sm font-medium text-error">{error}</p>
          <button
            type="button"
            onClick={fetchComplaints}
            className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-bold cursor-pointer"
          >
            {lang === 'am' ? 'እንደገና ሞክር' : 'Retry'}
          </button>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40">
          <span className="material-symbols-outlined text-[48px] text-outline dark:text-inverse-on-surface/60 mb-2">
            mark_email_read
          </span>
          <h3 className="text-title-md font-bold text-on-surface dark:text-inverse-on-surface">
            {lang === 'am' ? 'ምንም ቅሬታ አልተገኘም' : 'No complaints found'}
          </h3>
          <p className="text-body-sm text-outline dark:text-inverse-on-surface/75 mt-1">
            {lang === 'am'
              ? 'በዚህ ምድብ ውስጥ የተመዘገበ የተጠቃሚ ቅሬታ የለም።'
              : 'There are currently no support disputes matching this view.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/50 dark:bg-surface-dim/70 text-label-md font-bold text-outline dark:text-inverse-on-surface/90">
                  <th className="py-3 px-4">{lang === 'am' ? 'ቅሬታ አቅራቢ' : 'Complainant'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ተዛማጅ አቅራቢ' : 'Related Provider'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ርዕስ እና መልእክት' : 'Message / Reason'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ቀን' : 'Date'}</th>
                  <th className="py-3 px-4">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'am' ? 'እርምጃዎች' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {filteredComplaints.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-surface-container-low/30 dark:hover:bg-surface-dim/20 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-bold text-on-surface dark:text-white">
                        {c.user?.name || `User #${c.user_id}`}
                      </div>
                      {c.user?.email && (
                        <div className="text-xs text-outline dark:text-inverse-on-surface/75">
                          {c.user.email}
                        </div>
                      )}
                      {c.user?.phone && (
                        <div className="text-xs text-outline dark:text-inverse-on-surface/75 font-mono mt-0.5">
                          {c.user.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {c.provider ? (
                        <div>
                          <div className="font-semibold text-on-surface dark:text-white">
                            {c.provider.business_name}
                          </div>
                          <div className="text-xs text-outline dark:text-inverse-on-surface/75 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            <span>{c.provider.location}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-outline dark:text-outline-variant">
                          {lang === 'am' ? 'አጠቃላይ የመድረክ ድጋፍ' : 'General Platform Issue'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-bold text-on-surface dark:text-white line-clamp-1">
                        {c.subject}
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-outline-variant line-clamp-2 mt-0.5">
                        {c.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedComplaint(c)}
                        className="text-[11px] font-semibold text-primary-container dark:text-inverse-primary hover:underline mt-1 cursor-pointer"
                      >
                        {lang === 'am' ? 'ሙሉውን አንብብ' : 'View details'}
                      </button>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-xs text-on-surface-variant dark:text-outline-variant">
                      {formatRequestDate(c.created_at)}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          COMPLAINT_STATUS_STYLES[c.status]
                        }`}
                      >
                        <span>{getStatusLabel(c.status)}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {c.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingId === c.id}
                            onClick={() => handleStatusUpdate(c.id, 'resolved')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">task_alt</span>
                            <span>{lang === 'am' ? 'ተፈቷል በል' : 'Mark as Resolved'}</span>
                          </button>
                        )}
                        {c.status === 'pending' && (
                          <button
                            type="button"
                            disabled={updatingId === c.id}
                            onClick={() => handleStatusUpdate(c.id, 'dismissed')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-dim text-on-surface-variant dark:text-outline-variant hover:text-error border border-outline-variant/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span>{lang === 'am' ? 'ዝጋ' : 'Dismiss'}</span>
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

      {/* Full Complaint Detail Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/40 backdrop-blur-sm"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-3">
              <div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                    COMPLAINT_STATUS_STYLES[selectedComplaint.status]
                  }`}
                >
                  {getStatusLabel(selectedComplaint.status)}
                </span>
                <h3 className="text-title-lg font-bold text-on-surface dark:text-white mt-1.5">
                  {selectedComplaint.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container dark:hover:bg-surface-dim cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 space-y-1">
                <span className="text-[10px] font-bold uppercase text-outline block">
                  {lang === 'am' ? 'ቅሬታ አቅራቢ' : 'Complainant'}
                </span>
                <p className="font-bold text-on-surface dark:text-white text-sm">
                  {selectedComplaint.user?.name || `User #${selectedComplaint.user_id}`}
                </p>
                <p className="text-outline dark:text-outline-variant">
                  {selectedComplaint.user?.email} • {selectedComplaint.user?.phone}
                </p>
              </div>

              {selectedComplaint.provider && (
                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-outline block">
                    {lang === 'am' ? 'ተዛማጅ አቅራቢ' : 'Related Provider'}
                  </span>
                  <p className="font-bold text-on-surface dark:text-white text-sm">
                    {selectedComplaint.provider.business_name} ({selectedComplaint.provider.location})
                  </p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase text-outline block mb-1">
                  {lang === 'am' ? 'ዝርዝር መልእክት' : 'Complaint Message'}
                </span>
                <p className="p-3.5 rounded-xl bg-surface-container-low/60 dark:bg-surface-dim/25 border border-outline-variant/20 text-sm text-on-surface dark:text-inverse-on-surface whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              {selectedComplaint.status === 'pending' && (
                <button
                  type="button"
                  disabled={updatingId === selectedComplaint.id}
                  onClick={() => handleStatusUpdate(selectedComplaint.id, 'dismissed')}
                  className="px-4 py-2 rounded-lg bg-surface-container-high dark:bg-surface-dim text-xs font-semibold cursor-pointer"
                >
                  {lang === 'am' ? 'ዝጋ' : 'Dismiss'}
                </button>
              )}
              {selectedComplaint.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={updatingId === selectedComplaint.id}
                  onClick={() => handleStatusUpdate(selectedComplaint.id, 'resolved')}
                  className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {lang === 'am' ? 'ተፈቷል በል' : 'Mark as Resolved'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
