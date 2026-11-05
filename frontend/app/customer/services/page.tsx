'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmLogoutModal from '@/components/ConfirmLogoutModal';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { getCurrentUser, logoutUser, User, getStoredToken } from '@/lib/api/auth';
import { getServices, Service } from '@/lib/api/services';
import { getProviders, Provider } from '@/lib/api/providers';

// Helper to map service names to Material Symbols icon names
const getServiceIcon = (serviceName?: string): string => {
  if (!serviceName) return 'handyman';
  const name = serviceName.toLowerCase();
  if (name.includes('plumb')) return 'plumbing';
  if (name.includes('electr')) return 'electrical_services';
  if (name.includes('clean')) return 'cleaning_services';
  if (name.includes('photo')) return 'photo_camera';
  if (name.includes('comp') || name.includes('tech') || name.includes('repair')) return 'build';
  if (name.includes('tutor') || name.includes('teach')) return 'school';
  if (name.includes('paint')) return 'format_paint';
  if (name.includes('carpent') || name.includes('wood')) return 'carpenter';
  return 'handyman';
};

// Known Dessie neighborhoods for filter options
const DESSIE_NEIGHBORHOODS = [
  'Hotie',
  'Piazza',
  'Menhariya',
  'Arada',
  'Robit',
  'Buanbuawha',
];

// Bilingual synonyms dictionary for robust English & Amharic search in Dessie
const SERVICE_SYNONYMS: Record<string, string[]> = {
  plumbing: ['plumb', 'pipe', 'leak', 'water', 'ቧንቧ', 'የቧንቧ', 'ውሃ', 'ፍሳሽ', 'ቧንቧ ውሃ'],
  electrical: ['electr', 'wire', 'light', 'breaker', 'volt', 'power', 'ኤሌክትሪክ', 'የኤሌክትሪክ', 'መብራት', 'ሽቦ', 'ኃይል'],
  cleaning: ['clean', 'sanitize', 'wash', 'housekeep', 'maid', 'ጽዳት', 'የጽዳት', 'ማጽዳት', 'ቤት ጽዳት'],
  carpentry: ['carpent', 'wood', 'furniture', 'door', 'table', 'chair', 'አናጺ', 'የአናጺ', 'እንጨት', 'የእንጨት', 'በር', 'ቁምሳጥን', 'ወንበር'],
  painting: ['paint', 'color', 'wall', 'ቀለም', 'የቀለም', 'ቅብ', 'የቀለም ቅብ', 'ግድግዳ'],
  tech: ['tech', 'comp', 'pc', 'repair', 'phone', 'software', 'laptop', 'ቴክ', 'ኮምፒውተር', 'ስልክ', 'ጥገና', 'የኮምፒውተር ጥገና', 'ላፕቶፕ'],
  photo: ['photo', 'camera', 'video', 'shoot', 'ፎቶ', 'ካሜራ', 'ቪዲዮ'],
  tutor: ['tutor', 'teach', 'learn', 'math', 'school', 'english', 'አስተማሪ', 'ትምህርት', 'ማስተማር', 'እንግሊዝኛ'],
};

const LOCATION_SYNONYMS: Record<string, string[]> = {
  piazza: ['piazza', 'piassa', 'ፒያሳ'],
  hotie: ['hotie', 'hote', 'ሆቴ'],
  menhariya: ['menhariya', 'መናኸሪያ', 'መናሀሪያ'],
  arada: ['arada', 'አራዳ'],
  robit: ['robit', 'ሮቢት'],
  buanbuawha: ['buanbuawha', 'buanbua', 'ቧንቧ ውሃ', 'ቧንቧውሃ'],
};

// Matches query against provider attributes with bilingual synonym support
const matchesProviderSearch = (provider: Provider, rawQuery: string): boolean => {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return true;

  // 1. Direct text match on business name, description, location, phone, username
  if (provider.business_name?.toLowerCase().includes(q)) return true;
  if (provider.description?.toLowerCase().includes(q)) return true;
  if (provider.location?.toLowerCase().includes(q)) return true;
  if (provider.phone?.includes(q)) return true;
  if (provider.user?.name?.toLowerCase().includes(q)) return true;

  // 2. Direct match on attached services names and descriptions
  if (
    provider.services?.some(
      (s) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )
  ) {
    return true;
  }

  // 3. Bilingual / synonym matching for services
  for (const [key, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    const queryMatchesSynonym = synonyms.some((syn) => q.includes(syn) || syn.includes(q));
    if (queryMatchesSynonym) {
      const providerOffers =
        provider.services?.some((s) => s.name?.toLowerCase().includes(key) || key.includes(s.name?.toLowerCase())) ||
        provider.business_name?.toLowerCase().includes(key) ||
        (provider.description?.toLowerCase().includes(key) ?? false);
      if (providerOffers) return true;
    }
  }

  // 4. Bilingual / synonym matching for Dessie neighborhoods
  for (const [key, synonyms] of Object.entries(LOCATION_SYNONYMS)) {
    const queryMatchesLocation = synonyms.some((syn) => q.includes(syn) || syn.includes(q));
    if (queryMatchesLocation) {
      if (provider.location?.toLowerCase().includes(key)) return true;
    }
  }

  return false;
};

function FindServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Authentication & User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Data States
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  // Filter States
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Read URL search params on mount
  useEffect(() => {
    const qParam = searchParams?.get('q') || searchParams?.get('search');
    if (qParam && qParam.trim()) {
      setSearchQuery(qParam.trim());
    }
  }, [searchParams]);

  // 1. Authenticate customer
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getCurrentUser()
      .then((user) => {
        if (user.role !== 'customer') {
          if (user.role === 'provider') router.replace('/provider');
          else if (user.role === 'admin') router.replace('/admin');
          return;
        }
        setCurrentUser(user);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [router]);

  // 2. Fetch services catalog once
  useEffect(() => {
    getServices()
      .then((data) => {
        setServices(data);
      })
      .catch(() => {
        // Services will remain empty if network fails, covered by dataError
      });
  }, []);

  // Match optional service name from URL after services load
  useEffect(() => {
    const serviceParam = searchParams?.get('service');
    if (serviceParam && services.length > 0) {
      const match = services.find((s) => s.name.toLowerCase() === serviceParam.toLowerCase());
      if (match) {
        setSelectedServiceId(match.id);
      }
    }
  }, [searchParams, services]);

  // 3. Fetch verified providers according to backend filters
  const fetchProviders = useCallback(async () => {
    setDataLoading(true);
    setDataError(false);
    try {
      const data = await getProviders({
        service_id: selectedServiceId ?? undefined,
        location: selectedLocation !== 'all' ? selectedLocation : undefined,
        availability_status: selectedAvailability !== 'all' ? selectedAvailability : undefined,
      });
      setProviders(data);
    } catch {
      setDataError(true);
    } finally {
      setDataLoading(false);
    }
  }, [selectedServiceId, selectedLocation, selectedAvailability]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Client-side text search over returned verified providers with bilingual support
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    return providers.filter((p) => matchesProviderSearch(p, searchQuery));
  }, [providers, searchQuery]);

  // Handle explicit search submission (clicking button or pressing Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resultsEl = document.getElementById('resultsCanvas');
    if (resultsEl) {
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Combined locations list: default Dessie neighborhoods + any from returned providers
  const locationOptions = useMemo(() => {
    const unique = new Set(DESSIE_NEIGHBORHOODS);
    providers.forEach((p) => {
      if (p.location && p.location.trim()) {
        unique.add(p.location.trim());
      }
    });
    return Array.from(unique);
  }, [providers]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedServiceId(null);
    setSelectedLocation('all');
    setSelectedAvailability('all');
    setSearchQuery('');
  };

  // Sign out handler
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      router.replace('/login');
    }
  };

  // Compute initials for avatar
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'CU';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <span className="material-symbols-outlined text-[40px] animate-spin text-primary-container">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md text-body-md antialiased transition-colors duration-200 selection:bg-primary-container selection:text-white">
      {/* ============================================================== */}
      {/* TOP APP BAR (Dessie Service Header)                             */}
      {/* ============================================================== */}
      <header className="bg-surface-container-lowest dark:bg-inverse-surface border-b border-outline-variant/30 dark:border-outline/20 shadow-sm dark:shadow-none top-0 sticky z-40 w-full px-margin-mobile md:px-margin flex justify-between items-center h-16 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="flex items-center gap-3 focus:outline-none">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white font-bold shadow-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                handshake
              </span>
            </div>
            <div>
              <div className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary leading-none">
                {t.brandTitle}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-outline text-[14px]">location_on</span>
                <span className="font-label-sm text-label-sm text-outline dark:text-outline-variant">
                  {t.locationTag}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Language Toggle EN | አማ */}
          <div className="inline-flex items-center p-1 rounded-full border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim shadow-sm">
            <button
              id="langBtnEn"
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-0.5 rounded-full text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'en'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              EN
            </button>
            <button
              id="langBtnAm"
              type="button"
              onClick={() => setLang('am')}
              className={`px-2.5 py-0.5 rounded-full text-label-md font-label-md transition-all duration-150 cursor-pointer ${
                lang === 'am'
                  ? 'font-semibold bg-primary-container text-white shadow-xs'
                  : 'font-medium text-on-surface-variant dark:text-outline-variant hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              አማ
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            id="themeToggleBtn"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-lg border border-outline-variant/60 dark:border-outline/40 flex items-center justify-center text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-dim hover:text-primary dark:hover:text-inverse-primary transition-colors duration-150 focus:outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User quick indicator in header (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-outline-variant/40">
            <div className="w-8 h-8 rounded-full bg-primary-container/15 text-primary-container dark:text-inverse-primary font-bold text-xs flex items-center justify-center border border-primary-container/20">
              {userInitials}
            </div>
            <span className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN BODY LAYOUT (Desktop Sidebar + Main Canvas)                */}
      {/* ============================================================== */}
      <div className="flex flex-1">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col p-4 w-64 h-[calc(100vh-4rem)] sticky top-16 bg-surface-container-lowest dark:bg-inverse-surface border-r border-outline-variant/30 dark:border-outline/20 justify-between shrink-0 transition-colors duration-200">
          <div className="space-y-6">
            {/* Customer Profile Card */}
            <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/30 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-container text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                {userInitials}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface truncate">
                  {currentUser?.name}
                </h4>
                <p className="font-label-sm text-label-sm text-outline dark:text-outline-variant truncate flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                  <span>Dessie, Wollo</span>
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav aria-label="Desktop Side Navigation" className="space-y-1.5">
              {/* 1. Dashboard */}
              <Link
                id="navLinkDashboard"
                href="/customer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant dark:text-outline-variant font-medium hover:bg-surface-container dark:hover:bg-surface-dim hover:text-on-surface dark:hover:text-inverse-on-surface transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="font-label-lg text-label-lg">{t.navDashboard}</span>
              </Link>

              {/* 2. Find a Service (ACTIVE) */}
              <Link
                id="navLinkFindService"
                href="/customer/services"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-container/15 dark:bg-primary-container/25 text-primary-container dark:text-inverse-primary font-semibold transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  search
                </span>
                <span className="font-label-lg text-label-lg">{t.navFindService}</span>
              </Link>

              {/* 3. My Requests */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-outline dark:text-outline-variant/60 font-medium cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                <span className="font-label-lg text-label-lg">{t.navMyRequests}</span>
              </div>

              {/* 4. Profile */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-outline dark:text-outline-variant/60 font-medium cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined text-[22px]">person</span>
                <span className="font-label-lg text-label-lg">{t.navProfile}</span>
              </div>
            </nav>
          </div>

          {/* Bottom of Sidebar: Sign Out */}
          <div className="pt-4 border-t border-outline-variant/30 dark:border-outline/20">
            <button
              id="sidebarSignOutBtn"
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error-container/40 dark:hover:bg-error/20 transition-colors duration-150 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
              <span className="font-label-lg text-label-lg">
                {loggingOut ? t.btnLogoutLoading : t.navSignOut}
              </span>
            </button>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN CONTENT CANVAS                                             */}
        {/* ============================================================== */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {/* PAGE HEADER */}
          <section className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1
                  id="pageTitle"
                  className="font-headline-xl text-headline-xl text-on-surface dark:text-inverse-on-surface tracking-tight"
                >
                  {t.findServiceTitle}
                </h1>
                <p
                  id="pageSubtitle"
                  className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant mt-1"
                >
                  {t.findServiceSubtitle}
                </p>
              </div>

              {/* Verified stats pill */}
              <div
                id="verifiedNetworkPill"
                className="inline-flex items-center gap-2 self-start md:self-auto px-3.5 py-1.5 bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/40 rounded-full shadow-xs text-outline"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
                  {t.verifiedNetworkPill}
                </span>
              </div>
            </div>
          </section>

          {/* SEARCH BAR */}
          <section className="mb-5">
            <form
              onSubmit={handleSearchSubmit}
              className="relative bg-surface-container-lowest dark:bg-inverse-surface rounded-xl shadow-xs border border-outline-variant/40 p-1.5 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary-container focus-within:border-primary-container gap-2"
            >
              <div className="pl-3 flex items-center pointer-events-none text-outline shrink-0">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <input
                id="searchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent border-none text-on-surface dark:text-inverse-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none px-2 py-2 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-1.5 text-outline hover:text-on-surface dark:hover:text-inverse-on-surface cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
              <button
                id="searchSubmitBtn"
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-white rounded-lg font-label-md text-label-md font-bold transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>{t.searchBtn}</span>
              </button>
            </form>
          </section>

          {/* SERVICE CATEGORY FILTER CHIPS (Loaded from GET /api/services) */}
          <section className="mb-6">
            <div
              id="servicePillsContainer"
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
            >
              {/* "All Services" Pill */}
              <button
                id="pillAllServices"
                type="button"
                onClick={() => setSelectedServiceId(null)}
                className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors cursor-pointer shadow-xs ${
                  selectedServiceId === null
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/60 dark:border-outline/40 text-on-surface-variant dark:text-outline-variant hover:border-primary-container hover:text-primary-container dark:hover:text-inverse-primary'
                }`}
              >
                {t.pillAllServices}
              </button>

              {/* Dynamic Service Pills */}
              {services.map((svc) => (
                <button
                  key={svc.id}
                  id={`pillService-${svc.id}`}
                  type="button"
                  onClick={() =>
                    setSelectedServiceId(selectedServiceId === svc.id ? null : svc.id)
                  }
                  className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors cursor-pointer shadow-xs ${
                    selectedServiceId === svc.id
                      ? 'bg-primary-container text-white'
                      : 'bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/60 dark:border-outline/40 text-on-surface-variant dark:text-outline-variant hover:border-primary-container hover:text-primary-container dark:hover:text-inverse-primary'
                  }`}
                >
                  {svc.name}
                </button>
              ))}
            </div>
          </section>

          {/* BACKEND-SUPPORTED FILTERS ROW */}
          <section className="mb-6 p-4 bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Location Filter */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="locationFilter"
                  className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant shrink-0"
                >
                  {t.filterLocationLabel}
                </label>
                <select
                  id="locationFilter"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="h-10 px-3 py-1.5 rounded-lg border border-outline-variant/60 dark:border-outline/40 bg-surface dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface font-body-sm text-body-sm focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none cursor-pointer"
                >
                  <option value="all">{t.optAllLocations}</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="availabilityFilter"
                  className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant shrink-0"
                >
                  {t.filterAvailabilityLabel}
                </label>
                <select
                  id="availabilityFilter"
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="h-10 px-3 py-1.5 rounded-lg border border-outline-variant/60 dark:border-outline/40 bg-surface dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface font-body-sm text-body-sm focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none cursor-pointer"
                >
                  <option value="all">{t.optAllAvailability}</option>
                  <option value="available">{t.optAvailable}</option>
                  <option value="busy">{t.optBusy}</option>
                  <option value="offline">{t.optOffline}</option>
                </select>
              </div>
            </div>

            {/* Dynamic Results Counter */}
            <div className="text-left md:text-right">
              <p
                id="resultsCountDisplay"
                className="font-label-lg text-label-lg text-on-surface dark:text-inverse-on-surface"
              >
                <span>{t.showingPrefix}</span>{' '}
                <strong id="dynamicCount" className="text-primary-container dark:text-inverse-primary font-bold">
                  {filteredProviders.length}
                </strong>{' '}
                <span>{t.showingSuffix}</span>
              </p>
            </div>
          </section>

          {/* ============================================================== */}
          {/* RESULTS CANVAS (Loading / Error / Empty / Provider Cards)       */}
          {/* ============================================================== */}
          <div id="resultsCanvas">
            {/* 1. LOADING SKELETON STATE */}
            {dataLoading && (
              <div id="loadingView" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/30 p-5 animate-pulse flex flex-col justify-between h-56"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-container-high dark:bg-surface-dim shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-surface-container-high dark:bg-surface-dim rounded w-3/4" />
                          <div className="h-3 bg-surface-container-high dark:bg-surface-dim rounded w-1/2" />
                        </div>
                      </div>
                      <div className="flex gap-2 my-4">
                        <div className="h-6 w-16 bg-surface-container-high dark:bg-surface-dim rounded-md" />
                        <div className="h-6 w-24 bg-surface-container-high dark:bg-surface-dim rounded-md" />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
                      <div className="h-4 w-16 bg-surface-container-high dark:bg-surface-dim rounded" />
                      <div className="h-8 w-24 bg-surface-container-high dark:bg-surface-dim rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. ERROR STATE */}
            {!dataLoading && dataError && (
              <div
                id="errorView"
                className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-error/30 my-6 shadow-xs"
              >
                <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center text-error mb-4">
                  <span className="material-symbols-outlined text-[36px]">error</span>
                </div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
                  {t.errorTitle}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant mt-2 max-w-sm">
                  {t.errorSubtitle}
                </p>
                <button
                  id="errorRetryBtn"
                  type="button"
                  onClick={fetchProviders}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-container text-white font-label-md text-label-md hover:bg-primary transition-colors cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>{t.errorRetryBtn}</span>
                </button>
              </div>
            )}

            {/* 3. EMPTY STATE */}
            {!dataLoading && !dataError && filteredProviders.length === 0 && (
              <div
                id="emptyView"
                className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface-container-lowest dark:bg-inverse-surface rounded-2xl border border-outline-variant/30 my-6 shadow-xs space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-surface-container dark:bg-surface-dim flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[36px]">search_off</span>
                </div>
                <div className="space-y-1">
                  <h3
                    id="emptyStateTitle"
                    className="font-headline-md text-xl font-bold text-on-surface dark:text-inverse-on-surface"
                  >
                    {searchQuery.trim()
                      ? lang === 'am'
                        ? `ለ "${searchQuery}" ${t.searchNoResultsFound}`
                        : `${t.searchNoResultsFound} for "${searchQuery}"`
                      : t.emptyStateTitle}
                  </h3>
                  <p
                    id="emptyStateSubtitle"
                    className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant max-w-md mx-auto"
                  >
                    {searchQuery.trim()
                      ? t.searchNoResultsDesc
                      : t.emptyStateSubtitle}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-xl bg-surface-container dark:bg-surface-dim hover:bg-surface-container-high text-on-surface dark:text-inverse-on-surface font-semibold text-xs border border-outline-variant/40 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>{t.searchClearBtn}</span>
                    </button>
                  )}
                  <button
                    id="emptyResetBtn"
                    type="button"
                    onClick={handleResetFilters}
                    className="px-5 py-2 rounded-xl bg-primary-container text-white font-label-md text-label-md font-bold hover:bg-primary transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>{t.emptyResetBtn}</span>
                  </button>
                </div>

                {/* Quick Service Suggestions */}
                {services.length > 0 && (
                  <div className="pt-4 border-t border-outline-variant/20 w-full max-w-md">
                    <p className="text-xs text-outline dark:text-outline-variant mb-2 font-medium">
                      {lang === 'am' ? 'ታዋቂ የአገልግሎት ምድቦችን ይሞክሩ፡' : 'Try searching popular services:'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {services.slice(0, 4).map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedServiceId(svc.id);
                          }}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-container-high dark:bg-surface-dim hover:bg-primary-container hover:text-white transition-colors text-on-surface dark:text-inverse-on-surface border border-outline-variant/30 cursor-pointer"
                        >
                          {svc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. NORMAL RESULTS GRID */}
            {!dataLoading && !dataError && filteredProviders.length > 0 && (
              <div
                id="normalViewGrid"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredProviders.map((provider) => {
                  const primaryService = provider.services?.[0]?.name;
                  const serviceIcon = getServiceIcon(primaryService);

                  return (
                    <article
                      key={provider.id}
                      className="provider-card bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/30 dark:border-outline/20 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      <div className="w-full min-w-0">
                        {/* Header: Service Icon + Business Name + Verified Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-primary-container/15 text-primary-container dark:text-inverse-primary flex items-center justify-center font-bold text-lg border border-primary-container/20 shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-[26px]">
                                {serviceIcon}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="font-headline-sm text-base sm:text-lg font-bold text-on-surface dark:text-inverse-on-surface leading-snug break-words line-clamp-2"
                                title={provider.business_name}
                              >
                                {provider.business_name}
                              </h3>
                              {provider.experience_years > 0 && (
                                <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant flex items-center gap-1 mt-0.5">
                                  <span className="material-symbols-outlined text-[14px]">timeline</span>
                                  <span>
                                    {provider.experience_years} {t.experienceYearsSuffix}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Verified Badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container dark:text-inverse-primary border border-primary-container/20 shrink-0 self-start">
                            <span
                              className="material-symbols-outlined text-[14px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                            <span>{t.badgeVerified}</span>
                          </span>
                        </div>

                        {/* Description snippet if available */}
                        {provider.description && (
                          <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant line-clamp-2 mt-2 break-words">
                            {provider.description}
                          </p>
                        )}

                        {/* Service & Neighborhood Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {provider.services?.map((svc) => (
                            <span
                              key={svc.id}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-container dark:bg-surface-dim text-on-surface dark:text-inverse-on-surface border border-outline-variant/20 max-w-full truncate"
                              title={svc.name}
                            >
                              {svc.name}
                            </span>
                          ))}
                          <span className="px-2.5 py-1 rounded-md text-xs text-outline dark:text-outline-variant flex items-center gap-1 bg-surface-container-low dark:bg-surface-dim/40 border border-outline-variant/20 max-w-full">
                            <span className="material-symbols-outlined text-[13px] shrink-0">location_on</span>
                            <span className="truncate">{provider.location}, Dessie</span>
                          </span>
                          {provider.phone && (
                            <a
                              href={`tel:${provider.phone}`}
                              className="px-2.5 py-1 rounded-md text-xs text-primary-container dark:text-inverse-primary font-mono flex items-center gap-1 bg-primary-container/10 border border-primary-container/20 hover:underline shrink-0"
                              title={t.callProviderBtn}
                            >
                              <span className="material-symbols-outlined text-[13px] shrink-0">call</span>
                              <span>{provider.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Footer of Card: Availability & Profile Action */}
                      <div className="mt-5 pt-4 border-t border-outline-variant/30 dark:border-outline/20 flex items-center justify-between gap-2">
                        {/* Availability Status */}
                        {provider.availability_status === 'available' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container dark:text-inverse-primary shrink-0">
                            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse shrink-0"></span>
                            <span>{t.statusAvailable}</span>
                          </span>
                        )}
                        {provider.availability_status === 'busy' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary shrink-0">
                            <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
                            <span>{t.statusBusy}</span>
                          </span>
                        )}
                        {provider.availability_status === 'offline' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-outline shrink-0">
                            <span className="w-2 h-2 rounded-full bg-outline shrink-0"></span>
                            <span>{t.statusOffline}</span>
                          </span>
                        )}

                        {/* View Profile Action Link (navigation only, per specification) */}
                        <Link
                          href={`/customer/providers/${provider.id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-surface-container-high dark:bg-surface-dim hover:bg-primary-container hover:text-white dark:hover:bg-primary-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md transition-colors flex items-center gap-1 shadow-2xs shrink-0"
                        >
                          <span>{t.btnViewProfile}</span>
                          <span className="material-symbols-outlined text-[16px] shrink-0">arrow_forward</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                            */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 h-16 md:hidden bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant/30 dark:border-outline/20 shadow-lg dark:shadow-none"
      >
        {/* Tab 1: Dashboard */}
        <Link
          href="/customer"
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navDashboard}</span>
        </Link>

        {/* Tab 2: Find Service (ACTIVE) */}
        <Link
          href="/customer/services"
          className="flex flex-col items-center justify-center text-primary-container dark:text-inverse-primary font-bold py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            search
          </span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navFindService}</span>
        </Link>

        {/* Tab 3: Requests */}
        <div className="flex flex-col items-center justify-center text-outline dark:text-outline-variant/50 py-1 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navMyRequests}</span>
        </div>

        {/* Tab 4: Profile */}
        <div className="flex flex-col items-center justify-center text-outline dark:text-outline-variant/50 py-1 opacity-60 cursor-not-allowed">
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span className="font-label-sm text-label-sm mt-0.5">{t.navProfile}</span>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* FOOTER                                                          */}
      {/* ============================================================== */}
      <footer className="mt-auto hidden md:block border-t border-outline-variant/30 dark:border-outline/20 bg-surface-container-lowest dark:bg-inverse-surface py-5 px-margin text-center transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-on-surface-variant dark:text-outline-variant font-label-md">
          <span>{t.footerCopyright}</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerPrivacy}</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerTerms}</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t.footerSupport}</span>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </div>
  );
}

export default function FindServicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
            progress_activity
          </span>
        </div>
      }
    >
      <FindServiceContent />
    </Suspense>
  );
}
