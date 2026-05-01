'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiGet, apiPost } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const loginRes = await apiPost(`${API.auth}/auth/login`, { email, password });
      const me = await apiGet(`${API.auth}/auth/me`, loginRes.access_token);
      setSession(loginRes.access_token, loginRes.refresh_token, me.role, me.id);
      toast.success('Logged in successfully');
      router.push('/');
    } catch {
      toast.error('Login failed. Check credentials or role approval.');
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-300">Access the FairGig dashboard.</p>
        <form onSubmit={handleLogin} className="mt-5 space-y-3">
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full rounded-xl bg-teal px-4 py-3 font-semibold text-slate-950">Login</button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          Need an account? <Link href="/signup" className="text-violet">Go to Signup</Link>
        </p>
      </div>
    </main>
  );
}
