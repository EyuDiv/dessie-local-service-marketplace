'use client';

import React from 'react';
import type { Language } from '@/lib/translations';
import type { ServiceRequestItem } from '@/lib/api/requests';

const STATUS_BADGE_CLASSES: Record<ServiceRequestItem['status'], string> = {
  completed: 'bg-primary-container/15 text-primary-container border-primary-container/30',
  in_progress: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  accepted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  rejected: 'bg-error/15 text-error border-error/30',
  cancelled: 'bg-surface-container-high dark:bg-surface-dim text-outline dark:text-outline-variant border-outline-variant/40',
  pending: 'bg-secondary/15 text-secondary border-secondary/30',
};

const STATUS_LABELS: Record<ServiceRequestItem['status'], { en: string; am: string }> = {
  pending: { en: 'Pending', am: 'በመጠባበቅ ላይ' },
  accepted: { en: 'Accepted', am: 'ተቀባይነት አግኝቷል' },
  in_progress: { en: 'In Progress', am: 'በስራ ላይ' },
  completed: { en: 'Completed', am: 'ተጠናቅቋል' },
  rejected: { en: 'Rejected', am: 'ውድቅ ተደርጓል' },
  cancelled: { en: 'Cancelled', am: 'ተሰርዟል' },
};

/** Format ISO/MySQL date strings (e.g. 2026-11-10T00:00:00.000000Z) as YYYY-MM-DD. */
export function formatRequestDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr;
}

/** Trim seconds from HH:MM:SS time strings for compact UI display. */
export function formatRequestTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : timeStr;
}

export function getRequestStatusBadgeClass(status: ServiceRequestItem['status']): string {
  return STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.pending;
}

export function getRequestStatusLabel(status: ServiceRequestItem['status'], lang: Language): string {
  const entry = STATUS_LABELS[status];
  if (!entry) return status.replace('_', ' ');
  return lang === 'am' ? entry.am : entry.en;
}

interface ServiceRequestCardProps {
  request: ServiceRequestItem;
  lang: Language;
  onClick?: () => void;
  showTime?: boolean;
  showLocation?: boolean;
}

/** Reusable customer service request card shared between Dashboard and My Requests. */
export default function ServiceRequestCard({
  request,
  lang,
  onClick,
  showTime = false,
  showLocation = false,
}: ServiceRequestCardProps) {
  const formattedDate = formatRequestDate(request.requested_date);
  const formattedTime = showTime ? formatRequestTime(request.requested_time) : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="p-4 rounded-xl bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 shadow-sm hover:border-primary-container transition-all cursor-pointer space-y-3 flex flex-col justify-between overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
    >
      <div className="space-y-2 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <span className="font-bold text-on-surface dark:text-white text-body-md line-clamp-1 min-w-0 flex-1">
            {request.service?.name || 'Service Request'}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase shrink-0 border ${getRequestStatusBadgeClass(
              request.status
            )}`}
          >
            {getRequestStatusLabel(request.status, lang)}
          </span>
        </div>

        {request.provider && (
          <div className="flex items-center gap-1.5 text-xs text-outline dark:text-inverse-on-surface/75 min-w-0">
            <span className="material-symbols-outlined text-[15px] shrink-0">storefront</span>
            <span className="font-semibold text-on-surface dark:text-white truncate">
              {request.provider.business_name}
            </span>
            <span className="shrink-0">•</span>
            <span className="truncate">{request.provider.location}</span>
          </div>
        )}

        <p className="text-body-sm text-outline dark:text-inverse-on-surface/85 line-clamp-2 break-words">
          {request.description}
        </p>

        {showLocation && request.location && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant dark:text-outline-variant min-w-0">
            <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">
              location_on
            </span>
            <span className="truncate">{request.location}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center gap-2 text-xs text-outline dark:text-inverse-on-surface/70">
        <span className="flex items-center gap-1 min-w-0 truncate">
          <span className="material-symbols-outlined text-[14px] shrink-0">calendar_today</span>
          <span>{formattedDate}</span>
          {formattedTime && <span className="text-outline/80">• {formattedTime}</span>}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {request.review && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-secondary">
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span>{request.review.rating}/5</span>
            </span>
          )}
          <span className="font-semibold text-primary-container dark:text-inverse-primary flex items-center gap-0.5">
            <span>{lang === 'am' ? 'ዝርዝር ይመልከቱ' : 'Details'}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </span>
        </div>
      </div>
    </div>
  );
}

