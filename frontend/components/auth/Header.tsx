'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-surface-container-lowest dark:bg-inverse-surface docked full-width top-0 sticky z-50 shadow-sm dark:shadow-none border-b border-outline-variant/20 transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin flex justify-between items-center h-16">
        {/* Brand Logo & Identity */}
        <Link
          href="/login"
          className="text-headline-sm font-headline-sm font-bold text-primary dark:text-inverse-primary flex items-center gap-space-xs tracking-tight"
        >
          <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[22px]">handshake</span>
          </div>
          <div className="flex flex-col">
            <span className="leading-tight font-extrabold text-on-surface dark:text-inverse-on-surface">
              {t.brandTitle}
            </span>
            <span className="text-label-sm font-label-sm text-outline dark:text-inverse-on-surface/75 font-normal">
              {t.brandSubtitle}
            </span>
          </div>
        </Link>

        {/* Trailing Controls: Compact EN | አማ & Theme Toggle */}
        <div className="flex items-center gap-space-sm">
          {/* Language Switcher Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-full border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim shadow-sm">
            <button
              id="langBtnEn"
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-label-md font-label-md transition-all duration-150 ${
                lang === 'en'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-inverse-on-surface/80 hover:text-on-surface dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              id="langBtnAm"
              type="button"
              onClick={() => setLang('am')}
              className={`px-3 py-1 rounded-full text-label-md font-label-md transition-all duration-150 ${
                lang === 'am'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-inverse-on-surface/80 hover:text-on-surface dark:hover:text-white'
              }`}
            >
              አማ
            </button>
          </div>

          {/* Theme Mode Toggle */}
          <button
            id="themeToggle"
            type="button"
            aria-label="Toggle theme mode"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant dark:text-inverse-on-surface/85 hover:text-primary dark:hover:text-inverse-primary hover:bg-surface-container dark:hover:bg-surface-dim transition-colors duration-150 cursor-pointer"
          >
            {theme === 'dark' ? (
              <span className="material-symbols-outlined text-[20px]">light_mode</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
