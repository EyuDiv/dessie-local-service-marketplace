'use client';

import React from 'react';
import Header from '@/components/auth/Header';
import Footer from '@/components/auth/Footer';
import AuthCard from '@/components/auth/AuthCard';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface antialiased transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-margin-mobile md:px-margin py-space-xl">
        <AuthCard initialMode="register" />
      </main>
      <Footer />
    </div>
  );
}
