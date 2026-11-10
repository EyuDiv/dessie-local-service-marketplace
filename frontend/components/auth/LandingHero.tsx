'use client';

import React from 'react';
import { useLanguage } from '@/components/LanguageContext';

interface LandingHeroProps {
  authMode: 'register' | 'login';
  onSwitchMode: (mode: 'register' | 'login') => void;
  className?: string;
}

export default function LandingHero({
  authMode,
  onSwitchMode,
  className = '',
}: LandingHeroProps) {
  const { t } = useLanguage();

  return (
    <section className={`flex flex-col gap-space-lg lg:sticky lg:top-24 ${className}`}>
      <div>
        <h1
          id="heroTitle"
          className="text-headline-xl-mobile md:text-headline-xl font-headline-xl text-on-surface dark:text-inverse-on-surface tracking-tight"
        >
          {t.heroTitle}
        </h1>
        <p
          id="heroIntro"
          className="text-body-md font-body-md text-on-surface-variant dark:text-outline-variant mt-space-sm leading-relaxed"
        >
          {t.heroIntro}
        </p>
      </div>

      {/* Service list / categories */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest dark:bg-surface-variant/20 border border-outline-variant/40 shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center gap-2 text-primary-container dark:text-inverse-primary mb-1">
          <span className="material-symbols-outlined text-[20px]">category</span>
          <span
            id="servicesHeading"
            className="text-label-md font-label-md uppercase tracking-wider font-semibold"
          >
            {t.servicesHeading}
          </span>
        </div>
        <div id="serviceTagsContainer" className="flex flex-wrap gap-2">
          {t.services.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-label-sm font-label-sm bg-surface-container dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface border border-outline-variant/30"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Concise Note */}
      <div className="p-space-md rounded-lg bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 flex items-center gap-space-sm text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant">
        <span className="material-symbols-outlined text-primary-container dark:text-inverse-primary text-[20px] shrink-0">
          chat
        </span>
        <span id="conciseNote">{t.conciseNote}</span>
      </div>

      {/* Left Switch Auth Link */}
      <div className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant">
        <span id="leftAlreadyText">
          {authMode === 'register' ? t.leftAlreadyText : t.bottomNoAccountText}
        </span>
        <button
          id="leftAuthSwitchBtn"
          type="button"
          onClick={() => onSwitchMode(authMode === 'register' ? 'login' : 'register')}
          className="font-semibold text-primary-container dark:text-inverse-primary hover:underline ml-1 cursor-pointer focus:outline-none"
        >
          {authMode === 'register' ? t.leftSignInLink : t.tabRegisterText}
        </button>
      </div>
    </section>
  );
}

