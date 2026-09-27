'use client';

import React from 'react';
import { useLanguage } from '@/components/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-surface-container dark:bg-inverse-surface mt-auto border-t border-outline-variant/20 transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin py-space-lg flex flex-col md:flex-row justify-between items-center gap-space-md">
        <p
          id="footerCopyright"
          className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant text-center md:text-left"
        >
          {t.footerCopyright}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-space-md text-label-md font-label-md">
          <a
            href="#"
            id="footerPrivacy"
            className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 active:opacity-80"
          >
            {t.footerPrivacy}
          </a>
          <span className="text-outline-variant">·</span>
          <a
            href="#"
            id="footerTerms"
            className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 active:opacity-80"
          >
            {t.footerTerms}
          </a>
          <span className="text-outline-variant">·</span>
          <a
            href="#"
            id="footerSupport"
            className="text-on-surface-variant dark:text-outline-variant hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 active:opacity-80"
          >
            {t.footerSupport}
          </a>
        </nav>
      </div>
    </footer>
  );
}
