'use client';

import Hero from '@/components/hero';
import Dashboard from '@/components/dashboard';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function HomePage() {
  const { token } = useAuthStore();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:py-10">
      <Hero />
      {!token && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-200">Authentication is now split into dedicated pages.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="rounded-xl bg-teal px-4 py-2 font-semibold text-slate-950">Go to Login</Link>
            <Link href="/signup" className="rounded-xl bg-violet px-4 py-2 font-semibold text-slate-950">Go to Signup</Link>
          </div>
        </div>
      )}
      <Dashboard />
    </main>
  );
}
