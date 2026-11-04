'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  getRoleDestination,
  formatApiError,
  RegisterCustomerData,
  RegisterProviderData,
} from '@/lib/api/auth';

interface AuthCardProps {
  initialMode?: 'register' | 'login';
}

export default function AuthCard({ initialMode = 'register' }: AuthCardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const [authMode, setAuthMode] = useState<'register' | 'login'>(initialMode);
  const [role, setRole] = useState<'customer' | 'provider'>('customer');

  const registrationFormRef = useRef<HTMLFormElement>(null);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // Provider specific states
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [description, setDescription] = useState('');

  // Provider document upload states
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCvSelect = (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrors((prev) => ({ ...prev, cv: t.errCvInvalidType }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, cv: t.errCvTooLarge }));
      return;
    }
    setCvFile(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.cv;
      return next;
    });
  };

  const handleCertSelect = (file: File | null) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const ext = file.name.toLowerCase().split('.').pop();
    if (!allowedTypes.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setErrors((prev) => ({ ...prev, certificate: t.errCertificateInvalidType }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, certificate: t.errCertificateTooLarge }));
      return;
    }
    setCertFile(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.certificate;
      return next;
    });
  };

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Reset registration form state to empty on initial mount / page refresh
  useEffect(() => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPasswordConfirmation('');
    setBusinessName('');
    setLocation('');
    setExperienceYears('');
    setDescription('');
    setCvFile(null);
    setCertFile(null);
    if (registrationFormRef.current) {
      registrationFormRef.current.reset();
    }
  }, []);

  // UI state: errors & loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Switch between register and login
  const handleModeSwitch = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setErrors({});
    setGeneralError(null);
    setSuccessMessage(null);
    setCvFile(null);
    setCertFile(null);
  };


  // Validate Register Form
  const validateRegister = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t.errors.name;
    }

    if (!email.trim() || !email.includes('@')) {
      newErrors.email = t.errors.email;
    }

    if (!phone.trim()) {
      newErrors.phone = t.errors.phone;
    }

    if (!password || password.length < 8) {
      newErrors.password = t.errors.password;
    }

    if (password !== passwordConfirmation) {
      newErrors.confirm = t.errors.confirm;
    }

    if (role === 'provider') {
      if (!businessName.trim()) {
        newErrors.business = t.errors.business;
      }
      if (!location.trim()) {
        newErrors.location = t.errors.location;
      }
      if (!experienceYears || isNaN(Number(experienceYears)) || Number(experienceYears) < 0) {
        newErrors.experience = t.errors.experience;
      }
      if (!description.trim()) {
        newErrors.description = t.errors.description;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Login Form
  const validateLogin = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      newErrors.loginEmail = t.errors.loginEmail;
    }

    if (!loginPassword) {
      newErrors.loginPassword = t.errors.loginPassword;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateRegister()) return;

    setIsSubmitting(true);
    try {
      if (role === 'customer') {
        const payload: RegisterCustomerData = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          password_confirmation: passwordConfirmation,
          role: 'customer',
        };
        await registerUser(payload);
      } else {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        formData.append('phone', phone.trim());
        formData.append('password', password);
        formData.append('password_confirmation', passwordConfirmation);
        formData.append('role', 'provider');
        formData.append('business_name', businessName.trim());
        formData.append('description', description.trim());
        formData.append('experience_years', String(parseInt(experienceYears, 10) || 0));
        formData.append('location', location.trim());
        if (cvFile) {
          formData.append('cv', cvFile);
        }
        if (certFile) {
          formData.append('certificate', certFile);
        }
        await registerUser(formData);
      }

      setSuccessMessage(t.successNoticeTitle);

      // Clear password values from memory immediately after successful registration
      setPassword('');
      setPasswordConfirmation('');

      // Verify authenticated user role from server via /me
      const me = await getCurrentUser();
      const destination = getRoleDestination(me.role);

      setTimeout(() => {
        router.push(destination);
      }, 700);
    } catch (err) {
      const formatted = formatApiError(err, t.errors.genericError);
      setGeneralError(formatted.message);

      if (formatted.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(formatted.errors)) {
          fieldErrors[key] = messages[0];
        }
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateLogin()) return;

    setIsSubmitting(true);
    try {
      await loginUser({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      setSuccessMessage(t.loginSuccessNoticeTitle);

      // Verify authenticated user role from server via /me
      const me = await getCurrentUser();
      const destination = getRoleDestination(me.role);

      setTimeout(() => {
        router.push(destination);
      }, 600);
    } catch (err) {
      const formatted = formatApiError(err, t.errors.invalidCredentials);
      setGeneralError(formatted.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
      {/* Left Column: Context, Services List & Value Props */}
      <section className="lg:col-span-5 flex flex-col gap-space-lg lg:sticky lg:top-24">
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
            onClick={() => handleModeSwitch(authMode === 'register' ? 'login' : 'register')}
            className="font-semibold text-primary-container dark:text-inverse-primary hover:underline ml-1 cursor-pointer focus:outline-none"
          >
            {authMode === 'register' ? t.leftSignInLink : t.tabRegisterText}
          </button>
        </div>

      </section>

      {/* Right Column: Registration & Login Form Card */}
      <section className="lg:col-span-7">
        <div className="bg-surface-container-lowest dark:bg-inverse-surface rounded-xl border border-outline-variant/40 shadow-sm p-space-lg md:p-space-xl transition-colors duration-200">
          {/* Auth Tabs */}
          <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3 mb-space-lg">
            <button
              id="tabRegister"
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`pb-1 text-headline-sm font-headline-sm transition-colors focus:outline-none cursor-pointer ${
                authMode === 'register'
                  ? 'font-bold border-b-2 border-primary-container text-primary-container dark:text-inverse-primary'
                  : 'font-medium text-outline hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              <span id="tabRegisterText">{t.tabRegisterText}</span>
            </button>
            <span className="text-outline-variant">|</span>
            <button
              id="tabLogin"
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`pb-1 text-headline-sm font-headline-sm transition-colors focus:outline-none cursor-pointer ${
                authMode === 'login'
                  ? 'font-bold border-b-2 border-primary-container text-primary-container dark:text-inverse-primary'
                  : 'font-medium text-outline hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              <span id="tabLoginText">{t.tabLoginText}</span>
            </button>
          </div>

          {/* Header Info */}
          <div className="pb-space-sm mb-space-md">
            <h2
              id="formHeaderTitle"
              className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-surface dark:text-inverse-on-surface"
            >
              {authMode === 'register' ? t.formHeaderTitleRegister : t.formHeaderTitleLogin}
            </h2>
            <p
              id="formHeaderSubtitle"
              className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant mt-1"
            >
              {authMode === 'register' ? t.formHeaderSubtitleRegister : t.formHeaderSubtitleLogin}
            </p>
          </div>

          {/* General API Error Notice */}
          {generalError && (
            <div className="mb-space-md p-space-md rounded-lg bg-error-container/40 border border-error/30 text-error flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
              <div className="text-body-sm font-body-sm font-medium">{generalError}</div>
            </div>
          )}

          {/* Success Notice */}
          {successMessage && (
            <div
              id="successNotice"
              className="mb-space-md p-space-md rounded-lg bg-primary/10 border border-primary/30 text-primary-container dark:text-inverse-primary flex items-start gap-space-sm"
            >
              <span
                className="material-symbols-outlined text-[20px] shrink-0 mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div className="text-body-sm font-body-sm">
                <span id="successNoticeTitle" className="font-semibold block">
                  {successMessage}
                </span>
                <p
                  id="successNoticeDesc"
                  className="text-label-sm font-label-sm text-on-surface-variant dark:text-outline-variant mt-0.5"
                >
                  {authMode === 'register' ? t.successNoticeDesc : t.loginSuccessNoticeDesc}
                </p>
              </div>
            </div>
          )}

          {/* REGISTER FORM */}
          {authMode === 'register' && (
            <form
              id="registrationForm"
              ref={registrationFormRef}
              onSubmit={handleRegisterSubmit}
              noValidate
              autoComplete="off"
              className="space-y-space-md"
            >
              {/* ROLE SELECTOR */}
              <div id="roleSelectorContainer">
                <label
                  id="roleLabel"
                  className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-space-xs"
                >
                  {t.roleLabel}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  {/* Option 1: Customer */}
                  <label
                    id="roleCustomerCard"
                    onClick={() => setRole('customer')}
                    className={`relative flex items-center p-3.5 rounded-lg cursor-pointer transition-all duration-150 ${
                      role === 'customer'
                        ? 'border-2 border-primary-container bg-primary-container/5 dark:bg-primary-container/20'
                        : 'border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim/30 hover:border-outline'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      id="roleCustomer"
                      value="customer"
                      checked={role === 'customer'}
                      onChange={() => setRole('customer')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-space-sm w-full">
                      <div
                        id="roleCustomerIconWrap"
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          role === 'customer'
                            ? 'bg-primary-container text-white'
                            : 'bg-surface-variant dark:bg-surface-dim text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">person_search</span>
                      </div>
                      <div className="flex flex-col">
                        <span
                          id="roleCustomerTitle"
                          className="text-label-lg font-label-lg text-on-surface dark:text-inverse-on-surface"
                        >
                          {t.roleCustomerTitle}
                        </span>
                        <span id="roleCustomerSub" className="text-label-sm font-label-sm text-outline">
                          {t.roleCustomerSub}
                        </span>
                      </div>
                    </div>
                    <div
                      id="roleCustomerPip"
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        role === 'customer'
                          ? 'border-2 border-primary-container bg-primary-container'
                          : 'border border-outline-variant'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${role === 'customer' ? 'bg-white' : 'bg-transparent'}`}
                      />
                    </div>
                  </label>

                  {/* Option 2: Provider */}
                  <label
                    id="roleProviderCard"
                    onClick={() => setRole('provider')}
                    className={`relative flex items-center p-3.5 rounded-lg cursor-pointer transition-all duration-150 ${
                      role === 'provider'
                        ? 'border-2 border-primary-container bg-primary-container/5 dark:bg-primary-container/20'
                        : 'border border-outline-variant/50 bg-surface-container-low dark:bg-surface-dim/30 hover:border-outline'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      id="roleProvider"
                      value="provider"
                      checked={role === 'provider'}
                      onChange={() => setRole('provider')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-space-sm w-full">
                      <div
                        id="roleProviderIconWrap"
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          role === 'provider'
                            ? 'bg-primary-container text-white'
                            : 'bg-surface-variant dark:bg-surface-dim text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">construction</span>
                      </div>
                      <div className="flex flex-col">
                        <span
                          id="roleProviderTitle"
                          className="text-label-lg font-label-lg text-on-surface dark:text-inverse-on-surface"
                        >
                          {t.roleProviderTitle}
                        </span>
                        <span id="roleProviderSub" className="text-label-sm font-label-sm text-outline">
                          {t.roleProviderSub}
                        </span>
                      </div>
                    </div>
                    <div
                      id="roleProviderPip"
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        role === 'provider'
                          ? 'border-2 border-primary-container bg-primary-container'
                          : 'border border-outline-variant'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${role === 'provider' ? 'bg-white' : 'bg-transparent'}`}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* COMMON CUSTOMER FIELDS */}
              <div className="space-y-space-md pt-space-xs">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                  >
                    <span id="labelName">{t.labelName}</span> <span className="text-error">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="off"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder={t.namePlaceholder}
                      className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                    />
                  </div>
                  {errors.name && (
                    <p id="nameError" className="text-error text-label-sm font-label-sm mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email Address & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelEmail">{t.labelEmail}</span> <span className="text-error">*</span>
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder={t.emailPlaceholder}
                        className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                      />
                    </div>
                    {errors.email && (
                      <p id="emailError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelPhone">{t.labelPhone}</span> <span className="text-error">*</span>
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-[20px]">call</span>
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="off"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder={t.phonePlaceholder}
                        className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                      />
                    </div>
                    {errors.phone && (
                      <p id="phoneError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelPassword">{t.labelPassword}</span> <span className="text-error">*</span>
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        minLength={8}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                      />
                      <button
                        id="togglePassword"
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface dark:hover:text-inverse-on-surface focus:outline-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.password && (
                      <p id="passwordError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="password_confirmation"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelConfirmPassword">{t.labelConfirmPassword}</span>{' '}
                      <span className="text-error">*</span>
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                      </div>
                      <input
                        id="password_confirmation"
                        name="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        minLength={8}
                        required
                        autoComplete="new-password"
                        value={passwordConfirmation}
                        onChange={(e) => {
                          setPasswordConfirmation(e.target.value);
                          if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: '' }));
                        }}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                      />
                      <button
                        id="toggleConfirmPassword"
                        type="button"
                        aria-label="Toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface dark:hover:text-inverse-on-surface focus:outline-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.confirm && (
                      <p id="confirmError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.confirm}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* DYNAMIC PROVIDER PROFILE FIELDS */}
              {role === 'provider' && (
                <div
                  id="providerFieldsContainer"
                  className="pt-space-sm border-t border-outline-variant/30 space-y-space-md"
                >
                  {/* Business Name */}
                  <div>
                    <label
                      htmlFor="business_name"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelBusiness">{t.labelBusiness}</span> <span className="text-error">*</span>
                    </label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined text-[20px]">store</span>
                      </div>
                      <input
                        id="business_name"
                        name="business_name"
                        type="text"
                        autoComplete="off"
                        value={businessName}
                        onChange={(e) => {
                          setBusinessName(e.target.value);
                          if (errors.business) setErrors((prev) => ({ ...prev, business: '' }));
                        }}
                        placeholder={t.businessPlaceholder}
                        className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                      />
                    </div>
                    {errors.business && (
                      <p id="businessError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.business}
                      </p>
                    )}
                  </div>

                  {/* Location & Experience Years */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    {/* Location */}
                    <div>
                      <label
                        htmlFor="location"
                        className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                      >
                        <span id="labelLocation">{t.labelLocation}</span> <span className="text-error">*</span>
                      </label>
                      <div className="relative rounded-lg">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                          <span className="material-symbols-outlined text-[20px]">location_on</span>
                        </div>
                        <input
                          id="location"
                          name="location"
                          type="text"
                          autoComplete="off"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            if (errors.location) setErrors((prev) => ({ ...prev, location: '' }));
                          }}
                          placeholder={t.locationPlaceholder}
                          className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                        />
                      </div>
                      {errors.location && (
                        <p id="locationError" className="text-error text-label-sm font-label-sm mt-1">
                          {errors.location}
                        </p>
                      )}
                    </div>

                    {/* Experience Years */}
                    <div>
                      <label
                        htmlFor="experience_years"
                        className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                      >
                        <span id="labelExperience">{t.labelExperience}</span> <span className="text-error">*</span>
                      </label>
                      <div className="relative rounded-lg">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                          <span className="material-symbols-outlined text-[20px]">timeline</span>
                        </div>
                        <input
                          id="experience_years"
                          name="experience_years"
                          type="number"
                          autoComplete="off"
                          min={0}
                          max={60}
                          value={experienceYears}
                          onChange={(e) => {
                            setExperienceYears(e.target.value);
                            if (errors.experience) setErrors((prev) => ({ ...prev, experience: '' }));
                          }}
                          placeholder={t.experiencePlaceholder}
                          className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                        />
                      </div>
                      {errors.experience && (
                        <p id="experienceError" className="text-error text-label-sm font-label-sm mt-1">
                          {errors.experience}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                    >
                      <span id="labelDescription">{t.labelDescription}</span> <span className="text-error">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      autoComplete="off"
                      rows={3}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                      }}
                      placeholder={t.descPlaceholder}
                      className="w-full p-3.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none resize-none"
                    />
                    {errors.description && (
                      <p id="descError" className="text-error text-label-sm font-label-sm mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* DOCUMENT UPLOAD SECTION FOR PROVIDERS */}
                  <div id="providerDocumentsSection" className="pt-space-sm border-t border-outline-variant/30 space-y-space-md">
                    <div>
                      <h4 className="text-label-lg font-label-lg font-bold text-on-surface dark:text-inverse-on-surface">
                        {t.labelCvUpload}
                      </h4>
                      <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant mt-0.5">
                        {t.cvUploadHelp}
                      </p>
                    </div>

                    {/* CV Upload Card */}
                    <div className="space-y-2">
                      <input
                        ref={cvInputRef}
                        id="cv_file_input"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleCvSelect(file);
                        }}
                      />

                      {!cvFile ? (
                        <div
                          id="cvDropZone"
                          onClick={() => cvInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0] || null;
                            handleCvSelect(file);
                          }}
                          className="border-2 border-dashed border-outline-variant/60 hover:border-primary-container rounded-xl p-5 text-center cursor-pointer transition-all bg-surface-container-low/50 dark:bg-surface-dim/30 hover:bg-surface-container/70 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container dark:text-inverse-primary mx-auto flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[26px]">upload_file</span>
                          </div>
                          <p className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                            {t.btnChooseFile}
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline-variant mt-1">
                            {t.dragDropText}
                          </p>
                          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container dark:bg-surface-dim text-outline">
                            PDF • Max 5MB
                          </span>
                        </div>
                      ) : (
                        <div
                          id="cvFileSelectedCard"
                          className="p-3.5 rounded-xl border border-primary-container/40 bg-primary-container/5 dark:bg-primary-container/10 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-label-lg text-label-lg font-bold text-on-surface dark:text-inverse-on-surface truncate">
                                {cvFile.name}
                              </p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant flex items-center gap-2">
                                <span>{formatFileSize(cvFile.size)}</span>
                                <span className="inline-flex items-center text-primary-container dark:text-inverse-primary font-medium text-xs">
                                  <span className="material-symbols-outlined text-[14px] mr-0.5">check_circle</span>
                                  Ready to upload
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              id="replaceCvBtn"
                              type="button"
                              onClick={() => cvInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container dark:bg-surface-dim hover:bg-surface-container-high text-on-surface dark:text-inverse-on-surface transition-colors cursor-pointer"
                            >
                              {t.btnReplaceFile}
                            </button>
                            <button
                              id="removeCvBtn"
                              type="button"
                              onClick={() => {
                                setCvFile(null);
                                if (cvInputRef.current) cvInputRef.current.value = '';
                              }}
                              className="p-1.5 rounded-lg text-error hover:bg-error-container/40 dark:hover:bg-error/20 transition-colors cursor-pointer"
                              title={t.btnRemoveFile}
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {errors.cv && (
                        <p id="cvError" className="text-error text-label-sm font-label-sm mt-1">
                          {errors.cv}
                        </p>
                      )}
                    </div>

                    {/* Certificate Upload Card (Optional) */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <label
                          htmlFor="cert_file_input"
                          className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface"
                        >
                          {t.labelCertificateUpload}
                        </label>
                        <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant mt-0.5">
                          {t.certificateUploadHelp}
                        </p>
                      </div>

                      <input
                        ref={certInputRef}
                        id="cert_file_input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleCertSelect(file);
                        }}
                      />

                      {!certFile ? (
                        <div
                          id="certDropZone"
                          onClick={() => certInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0] || null;
                            handleCertSelect(file);
                          }}
                          className="border border-dashed border-outline-variant/60 hover:border-secondary rounded-xl p-4 text-center cursor-pointer transition-all bg-surface-container-low/30 dark:bg-surface-dim/20 hover:bg-surface-container/50 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary mx-auto flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                          </div>
                          <p className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                            {t.btnChooseFile}
                          </p>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container dark:bg-surface-dim text-outline">
                            PDF, JPG, PNG • Max 5MB
                          </span>
                        </div>
                      ) : (
                        <div
                          id="certFileSelectedCard"
                          className="p-3.5 rounded-xl border border-secondary/40 bg-secondary/5 dark:bg-secondary/10 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-[22px]">verified</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-label-lg text-label-lg font-bold text-on-surface dark:text-inverse-on-surface truncate">
                                {certFile.name}
                              </p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
                                {formatFileSize(certFile.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              id="replaceCertBtn"
                              type="button"
                              onClick={() => certInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container dark:bg-surface-dim hover:bg-surface-container-high text-on-surface dark:text-inverse-on-surface transition-colors cursor-pointer"
                            >
                              {t.btnReplaceFile}
                            </button>
                            <button
                              id="removeCertBtn"
                              type="button"
                              onClick={() => {
                                setCertFile(null);
                                if (certInputRef.current) certInputRef.current.value = '';
                              }}
                              className="p-1.5 rounded-lg text-error hover:bg-error-container/40 dark:hover:bg-error/20 transition-colors cursor-pointer"
                              title={t.btnRemoveFile}
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {errors.certificate && (
                        <p id="certError" className="text-error text-label-sm font-label-sm mt-1">
                          {errors.certificate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms Notice */}
              <div id="termsNoticeContainer" className="text-label-sm font-label-sm text-outline pt-space-xs">
                {t.termsNoticePrefix}{' '}
                <a href="#" className="text-primary-container dark:text-inverse-primary hover:underline">
                  {t.termsOfService}
                </a>{' '}
                {t.termsNoticeAnd}{' '}
                <a href="#" className="text-primary-container dark:text-inverse-primary hover:underline">
                  {t.privacyPolicy}
                </a>
                {t.termsNoticeSuffix}
              </div>

              {/* Submit Action Button */}
              <div className="pt-space-xs">
                <button
                  id="submitBtn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-lg bg-primary-container text-white font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow hover:bg-primary-container/95 active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary-container/25 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span id="btnText">
                    {isSubmitting
                      ? (cvFile || certFile ? t.uploadingFiles : t.btnRegisterLoading)
                      : t.btnRegisterText}
                  </span>
                  {isSubmitting && (
                    <span id="btnSpinner" className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                  )}
                </button>
              </div>

              {/* Bottom Navigation Link */}
              <div className="text-center pt-space-sm">
                <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant">
                  <span id="bottomAlreadyText">{t.bottomAlreadyText}</span>
                  <button
                    id="bottomSignInLink"
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-bold text-primary-container dark:text-inverse-primary hover:underline ml-1 cursor-pointer focus:outline-none"
                  >
                    {t.bottomSignInLink}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* LOGIN FORM */}
          {authMode === 'login' && (
            <form id="loginForm" onSubmit={handleLoginSubmit} noValidate className="space-y-space-md">
              {/* Login Email */}
              <div>
                <label
                  htmlFor="loginEmail"
                  className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                >
                  <span id="labelLoginEmail">{t.labelLoginEmail}</span> <span className="text-error">*</span>
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <input
                    id="loginEmail"
                    name="loginEmail"
                    type="email"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errors.loginEmail) setErrors((prev) => ({ ...prev, loginEmail: '' }));
                    }}
                    placeholder={t.loginEmailPlaceholder}
                    className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                  />
                </div>
                {errors.loginEmail && (
                  <p id="loginEmailError" className="text-error text-label-sm font-label-sm mt-1">
                    {errors.loginEmail}
                  </p>
                )}
              </div>

              {/* Login Password */}
              <div>
                <label
                  htmlFor="loginPassword"
                  className="block text-label-md font-label-md text-on-surface dark:text-inverse-on-surface mb-1"
                >
                  <span id="labelLoginPassword">{t.labelLoginPassword}</span> <span className="text-error">*</span>
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    id="loginPassword"
                    name="loginPassword"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errors.loginPassword) setErrors((prev) => ({ ...prev, loginPassword: '' }));
                    }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 h-12 rounded-lg border border-outline-variant/60 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface text-body-md font-body-md focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                  />
                  <button
                    id="toggleLoginPassword"
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface dark:hover:text-inverse-on-surface focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showLoginPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.loginPassword && (
                  <p id="loginPasswordError" className="text-error text-label-sm font-label-sm mt-1">
                    {errors.loginPassword}
                  </p>
                )}
              </div>

              {/* Submit Login Button */}
              <div className="pt-space-xs">
                <button
                  id="loginSubmitBtn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-lg bg-primary-container text-white font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow hover:bg-primary-container/95 active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary-container/25 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span id="btnLoginText">{isSubmitting ? t.btnLoginLoading : t.btnLoginText}</span>
                  {isSubmitting && (
                    <span id="loginSpinner" className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                  )}
                </button>
              </div>

              {/* Bottom Switch to Register */}
              <div className="text-center pt-space-sm">
                <p className="text-body-sm font-body-sm text-on-surface-variant dark:text-outline-variant">
                  <span id="bottomNoAccountText">{t.bottomNoAccountText}</span>
                  <button
                    id="bottomRegisterLink"
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    className="font-bold text-primary-container dark:text-inverse-primary hover:underline ml-1 cursor-pointer focus:outline-none"
                  >
                    {t.bottomRegisterLink}
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
