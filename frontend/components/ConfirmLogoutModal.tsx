'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';

export interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title,
  message,
  confirmText,
  cancelText,
}: ConfirmLogoutModalProps) {
  const { t } = useLanguage();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Focus Cancel button on open for safe default
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayTitle = title || t?.confirmLogoutTitle || 'Confirm Logout';
  const displayMessage =
    message || t?.confirmLogoutMessage || 'Are you sure you want to log out of your account?';
  const displayConfirm = confirmText || t?.btnConfirmLogout || 'Yes, Log Out';
  const displayCancel = cancelText || t?.btnCancel || 'Cancel';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm transition-all duration-200 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/40 dark:border-outline/30 shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-error/15 dark:bg-error/25 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] sm:text-[26px]">logout</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="logout-dialog-title"
              className="text-base sm:text-title-lg font-bold text-on-surface dark:text-inverse-on-surface"
            >
              {displayTitle}
            </h3>
            <p
              id="logout-dialog-desc"
              className="text-xs sm:text-body-md text-outline dark:text-inverse-on-surface/75 mt-1 sm:mt-1.5 leading-relaxed"
            >
              {displayMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-outline-variant/20 dark:border-outline/20">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-container-high dark:bg-surface-dim hover:bg-surface-container-highest dark:hover:bg-surface-dim/80 text-on-surface dark:text-inverse-on-surface text-body-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            {displayCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-error hover:bg-error/90 active:bg-error/95 text-white text-body-sm font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
            )}
            <span>{loading ? t?.btnLogoutLoading || 'Logging out...' : displayConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

