'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, ApiError, apiPost } from '@/lib/api';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    city: 'Lahore',
    role: 'worker',
    invite_code: '',
  });

  const requiresInviteCode = form.role === 'verifier' || form.role === 'advocate';

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      ...form,
      email: form.email.trim().toLowerCase(),
      invite_code: form.invite_code.trim(),
    };

    try {
      await apiPost(`${API.auth}/auth/signup`, payload);
      toast.success('Signup complete. Please login.');
      router.push('/login');
    } catch (error) {
      if (error instanceof ApiError && error.detail) {
        toast.error(`Signup failed: ${error.detail}`);
      } else {
        toast.error('Signup failed. Please check your details and try again.');
      }
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Signup</h1>
        <p className="mt-1 text-sm text-slate-300">Create your FairGig account.</p>
        <form onSubmit={handleSignup} className="mt-5 space-y-3">
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <input className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <select className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="worker">Worker</option>
            <option value="verifier">Verifier</option>
            <option value="advocate">Advocate</option>
          </select>
          {requiresInviteCode && (
            <div className="space-y-1">
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm"
                placeholder={form.role === 'verifier' ? 'Visitor code' : 'Advocate code'}
                value={form.invite_code}
                onChange={(e) => setForm((p) => ({ ...p, invite_code: e.target.value }))}
              />
              <p className="text-xs text-slate-400">
                {form.role === 'verifier' ? 'Verifier accounts need the visitor code.' : 'Advocate accounts need the Softec code.'}
              </p>
            </div>
          )}
          <button type="submit" className="w-full rounded-xl bg-violet px-4 py-3 font-semibold text-slate-950">Create account</button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <Link href="/login" className="text-teal">Go to Login</Link>
        </p>
      </div>
    </main>
  );
}
