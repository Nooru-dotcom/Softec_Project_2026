'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API, apiGet, apiGetBlob, apiPatch, apiPost, apiPostForm } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { token, role, userId, refreshToken, setSession, clearSession } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'worker' | 'verifier' | 'advocate' | 'community'>('worker');
  const [workerIdInput, setWorkerIdInput] = useState('');
  const [shiftForm, setShiftForm] = useState({ platform: 'Careem', shift_date: '', hours: '', gross: '', deductions: '', net: '', city_zone: 'Gulberg' });
  const [screenshotShiftId, setScreenshotShiftId] = useState('');
  const [reviewState, setReviewState] = useState<Record<string, string>>({});
  const [reviewedQueueItems, setReviewedQueueItems] = useState<Record<string, string>>({});
  const [grievanceStatusOverrides, setGrievanceStatusOverrides] = useState<Record<string, string>>({});
  const [grievanceForm, setGrievanceForm] = useState({ title: '', description: '', city: 'Lahore', platform: 'Careem' });
  const canModerateGrievances = role === 'advocate';
  const proInputClass = 'w-full rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20';
  const proInputCompactClass = 'rounded-xl border border-white/15 bg-slate-900/70 p-3 text-sm outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20';
  const proBtnClass = 'rounded-xl border border-white/20 px-4 py-2 font-semibold transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-300/10';
  const proBtnSmallClass = 'rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-300/10';
  const proPrimaryClass = 'w-full rounded-xl bg-gradient-to-r from-teal to-violet px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110';

  const effectiveWorkerId = (workerIdInput.trim() || userId || '').trim();

  const worker = useQuery({
    queryKey: ['worker-analytics', effectiveWorkerId, token],
    enabled: Boolean(effectiveWorkerId && token),
    queryFn: () => apiGet(`${API.analytics}/analytics/worker/${effectiveWorkerId}`, token || undefined),
  });

  const myShifts = useQuery({
    queryKey: ['my-shifts', token],
    enabled: Boolean(token),
    queryFn: () => apiGet(`${API.earnings}/shifts/me`, token || undefined),
  });

  const myScreenshots = useQuery({
    queryKey: ['my-screenshots', token],
    enabled: Boolean(token && role === 'worker'),
    queryFn: () => apiGet(`${API.earnings}/screenshots/me`, token || undefined),
  });

  const verifierQueue = useQuery({
    queryKey: ['verifier-pending', token],
    enabled: Boolean(token && role === 'verifier'),
    queryFn: () => apiGet(`${API.earnings}/verifier/pending`, token || undefined),
  });

  const advocateKpis = useQuery({
    queryKey: ['advocate-kpis', token],
    enabled: Boolean(token && role === 'advocate'),
    queryFn: () => apiGet(`${API.analytics}/analytics/advocate/kpis`, token || undefined),
  });

  const vulnerability = useQuery({
    queryKey: ['vulnerability-flags', token],
    enabled: Boolean(token && (role === 'advocate' || role === 'verifier')),
    queryFn: () => apiGet(`${API.analytics}/analytics/vulnerability-flags`, token || undefined),
  });

  const grievances = useQuery({
    queryKey: ['grievances'],
    queryFn: () => apiGet(`${API.grievance}/grievances`),
  });

  const grievanceClusters = useQuery({
    queryKey: ['grievance-clusters'],
    queryFn: () => apiGet(`${API.grievance}/grievances/clustered`),
  });

  const trendData = worker.data?.earnings_trend || [];
  const hourlyRate = useMemo(() => {
    if (!trendData.length) return 0;
    const sum = trendData.reduce((acc: number, row: { hourly_rate: number }) => acc + Number(row.hourly_rate || 0), 0);
    return (sum / trendData.length).toFixed(2);
  }, [trendData]);

  async function submitShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return toast.error('Please login first');
    try {
      await apiPost(`${API.earnings}/shifts`, { ...shiftForm, hours: Number(shiftForm.hours), gross: Number(shiftForm.gross), deductions: Number(shiftForm.deductions), net: Number(shiftForm.net) }, token);
      toast.success('Shift logged successfully');
      myShifts.refetch();
      worker.refetch();
    } catch {
      toast.error('Failed to log shift');
    }
  }

  async function uploadCsv(file: File) {
    if (!token) return toast.error('Please login first');
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await apiPostForm(`${API.earnings}/shifts/import-csv`, form, token);
      toast.success(`Imported ${result.inserted} shifts`);
      myShifts.refetch();
      worker.refetch();
    } catch {
      toast.error('CSV import failed');
    }
  }

  function saveBlob(blob: Blob, fallbackName: string, contentDisposition?: string) {
    const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadShiftLogsCsv() {
    if (!token) return toast.error('Please login first');
    try {
      const result = await apiGetBlob(`${API.earnings}/shifts/export-csv`, token);
      saveBlob(result.blob, 'worker-shifts.csv', result.contentDisposition);
      toast.success('Shift logs downloaded');
    } catch {
      toast.error('Could not download shift logs CSV');
    }
  }

  async function downloadCsvTemplate() {
    if (!token) return toast.error('Please login first');
    try {
      const result = await apiGetBlob(`${API.earnings}/shifts/csv-template`, token);
      saveBlob(result.blob, 'shift-import-template.csv', result.contentDisposition);
      toast.success('CSV template downloaded');
    } catch {
      toast.error('Could not download CSV template');
    }
  }

  async function uploadScreenshot(file: File) {
    if (!token) return toast.error('Please login first');
    const form = new FormData();
    form.append('screenshot', file);
    if (screenshotShiftId.trim()) {
      form.append('shift_id', screenshotShiftId.trim());
    }
    try {
      await apiPostForm(`${API.earnings}/screenshots/upload`, form, token);
      toast.success('Screenshot uploaded for verification');
      myScreenshots.refetch();
      verifierQueue.refetch();
    } catch {
      toast.error('Screenshot upload failed');
    }
  }

  async function runAnomalyCheck() {
    if (!token) return toast.error('Please login first');
    if (!myShifts.data?.length) return toast.error('Need at least one shift record');
    try {
      const history = myShifts.data.slice(0, 20).map((row: any) => ({ date: row.shift_date, platform: row.platform, gross: row.gross, deductions: row.deductions, net: row.net, hours: row.hours }));
      const result = await apiPost(`${API.anomaly}/detect-anomalies`, { worker_id: userId || 'unknown', history });
      if (!result.flags?.length) return toast.success(result.summary || 'No major anomalies found');
      toast.warning(`${result.flags.length} anomaly flags detected`);
    } catch {
      toast.error('Could not run anomaly scan');
    }
  }

  async function submitReview(id: string) {
    if (!token) return toast.error('Please login first');
    const status = reviewState[id] || 'approved';
    setReviewedQueueItems((current) => ({ ...current, [id]: status }));
    try {
      await apiPost(`${API.earnings}/verifier/review`, { screenshot_id: id, status }, token);
      queryClient.setQueryData(['verifier-pending', token], (current: any) => {
        if (!Array.isArray(current)) return current;
        return current.filter((item) => item.id !== id);
      });
      await queryClient.invalidateQueries({ queryKey: ['verifier-pending', token] });
      toast.success('Review submitted');
      verifierQueue.refetch();
    } catch {
      setReviewedQueueItems((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.error('Review failed');
    }
  }

  function updateReviewSelection(id: string, status: string) {
    setReviewState((current) => ({ ...current, [id]: status }));
    queryClient.setQueryData(['verifier-pending', token], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.map((item) => (item.id === id ? { ...item, status } : item));
    });
  }

  async function submitGrievance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiPost(`${API.grievance}/grievances`, { user_id: userId, ...grievanceForm, anonymous: true, tags: [] });
      toast.success('Grievance posted');
      setGrievanceForm({ title: '', description: '', city: 'Lahore', platform: 'Careem' });
      grievances.refetch();
      grievanceClusters.refetch();
    } catch {
      toast.error('Could not post grievance');
    }
  }

  async function moderateGrievance(id: string, status: string) {
    if (!canModerateGrievances) {
      toast.error('Only advocate accounts can moderate grievances');
      return;
    }

    const previousStatus = grievanceStatusOverrides[id];
    setGrievanceStatusOverrides((current) => ({ ...current, [id]: status }));
    try {
      await apiPatch(`${API.grievance}/grievances/${id}/moderate`, { status });
      toast.success('Updated grievance status');
      grievances.refetch();
      grievanceClusters.refetch();
    } catch {
      setGrievanceStatusOverrides((current) => {
        const next = { ...current };
        if (previousStatus) {
          next[id] = previousStatus;
        } else {
          delete next[id];
        }
        return next;
      });
      toast.error('Failed to update grievance');
    }
  }

  async function tagGrievance(id: string, tagsCsv: string) {
    if (!canModerateGrievances) {
      toast.error('Only advocate accounts can tag grievances');
      return;
    }

    try {
      const tags = tagsCsv.split(',').map((t) => t.trim()).filter(Boolean);
      await apiPatch(`${API.grievance}/grievances/${id}/tag`, { tags });
      grievances.refetch();
      toast.success('Tags updated');
    } catch {
      toast.error('Tag update failed');
    }
  }

  async function refreshAuthToken() {
    if (!refreshToken || !role || !userId) return toast.error('No refresh token available');
    try {
      const refreshed = await apiPost(`${API.auth}/auth/refresh`, { refresh_token: refreshToken });
      setSession(refreshed.access_token, refreshed.refresh_token, role, userId);
      toast.success('Token refreshed');
    } catch {
      toast.error('Refresh failed, login again');
      clearSession();
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-lg font-semibold">Please login to continue</p>
        <p className="mt-1 text-sm text-slate-300">Use the dedicated authentication pages to access the dashboard.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link href="/login" className="rounded-xl bg-teal px-4 py-2 font-semibold text-slate-950">Login</Link>
          <Link href="/signup" className="rounded-xl bg-violet px-4 py-2 font-semibold text-slate-950">Signup</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h3 className="text-lg font-semibold">Session</h3>
        <p className="mt-1 text-sm text-slate-300">Logged in as <span className="font-semibold">{role}</span>. User ID: {userId}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={refreshAuthToken} className={proBtnClass}>Refresh token</button>
          <button type="button" onClick={clearSession} className={proBtnClass}>Logout</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Worker 30d Net" value={`PKR ${worker.data?.worker_30d_net || 0}`} />
        <Card title="City Median 30d" value={`PKR ${worker.data?.city_wide_30d_median || 0}`} />
        <Card title="Effective Hourly" value={`PKR ${hourlyRate}`} />
        <Card title="Vulnerability Flags" value={String(vulnerability.data?.count || 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('worker')} className={`rounded-xl px-4 py-2 font-semibold transition ${activeTab === 'worker' ? 'bg-teal text-slate-950 shadow-lg shadow-teal/30' : 'glass hover:-translate-y-0.5'}`}>Worker view</button>
        <button onClick={() => setActiveTab('verifier')} className={`rounded-xl px-4 py-2 font-semibold transition ${activeTab === 'verifier' ? 'bg-orange text-slate-950 shadow-lg shadow-orange/30' : 'glass hover:-translate-y-0.5'}`}>Verifier queue</button>
        <button onClick={() => setActiveTab('advocate')} className={`rounded-xl px-4 py-2 font-semibold transition ${activeTab === 'advocate' ? 'bg-violet text-slate-950 shadow-lg shadow-violet/30' : 'glass hover:-translate-y-0.5'}`}>Advocate panel</button>
        <button onClick={() => setActiveTab('community')} className={`rounded-xl px-4 py-2 font-semibold transition ${activeTab === 'community' ? 'bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/30' : 'glass hover:-translate-y-0.5'}`}>Grievance board</button>
      </div>

      {activeTab === 'worker' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Worker analytics and certificate</h3>
            <input className={proInputClass} placeholder="Worker UUID from seeded data" value={workerIdInput} onChange={(e) => setWorkerIdInput(e.target.value)} />
            <div className="mt-4 rounded-xl border border-white/10 p-3 text-sm">
              <p className="mb-2 font-semibold">Recent earnings trend</p>
              {(trendData || []).slice(-6).map((row: any) => (
                <div key={row.date} className="flex justify-between border-b border-white/5 py-1 last:border-0">
                  <span>{row.date}</span>
                  <span>PKR {row.daily_net}</span>
                </div>
              ))}
              {!trendData.length && <p className="text-slate-300">No trend data yet.</p>}
            </div>
            <a href={`${API.certificate}/certificate/${effectiveWorkerId}`} target="_blank" className="mt-3 block rounded-xl border border-white/15 p-3 text-sm hover:border-violet">Open printable income certificate</a>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Log shifts and upload evidence</h3>
            <form onSubmit={submitShift} className="grid grid-cols-2 gap-3 text-sm">
              <input className={proInputCompactClass} placeholder="Platform" value={shiftForm.platform} onChange={(e) => setShiftForm((p) => ({ ...p, platform: e.target.value }))} />
              <input className={proInputCompactClass} type="date" value={shiftForm.shift_date} onChange={(e) => setShiftForm((p) => ({ ...p, shift_date: e.target.value }))} />
              <input className={proInputCompactClass} placeholder="Hours" value={shiftForm.hours} onChange={(e) => setShiftForm((p) => ({ ...p, hours: e.target.value }))} />
              <input className={proInputCompactClass} placeholder="Gross" value={shiftForm.gross} onChange={(e) => setShiftForm((p) => ({ ...p, gross: e.target.value }))} />
              <input className={proInputCompactClass} placeholder="Deductions" value={shiftForm.deductions} onChange={(e) => setShiftForm((p) => ({ ...p, deductions: e.target.value }))} />
              <input className={proInputCompactClass} placeholder="Net" value={shiftForm.net} onChange={(e) => setShiftForm((p) => ({ ...p, net: e.target.value }))} />
              <button type="submit" className={`col-span-2 ${proPrimaryClass}`}>Log shift</button>
            </form>
            <div className="mt-4 space-y-2">
              <label className="block text-xs text-slate-300">Bulk CSV import (headers: platform, shift_date, hours, gross, deductions, net, city_zone)</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadCsvTemplate} className={proBtnSmallClass}>Download CSV template</button>
                <button type="button" onClick={downloadShiftLogsCsv} className={proBtnSmallClass}>Download my logs CSV ({myShifts.data?.length || 0})</button>
              </div>
              <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && uploadCsv(e.target.files[0])} className={proInputClass} />
              <label className="block text-xs text-slate-300">Optional shift ID for screenshot linkage</label>
              <input className={proInputClass} placeholder="Shift ID (optional)" value={screenshotShiftId} onChange={(e) => setScreenshotShiftId(e.target.value)} />
              <label className="block text-xs text-slate-300">Upload earnings screenshot for verifier review (status starts as pending)</label>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadScreenshot(e.target.files[0])} className={proInputClass} />
              <button onClick={runAnomalyCheck} className={proBtnClass}>Run anomaly detection service</button>

              <div className="mt-3 rounded-xl border border-white/10 p-3 text-sm">
                <p className="mb-2 font-semibold">My uploaded screenshots</p>
                {(myScreenshots.data || []).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-white/5 py-1 last:border-0">
                    <span className="truncate pr-2 text-slate-300">{item.id.slice(0, 8)}... ({item.shift_id ? item.shift_id.slice(0, 8) : 'no shift'})</span>
                    <span className="font-semibold">{item.status}</span>
                  </div>
                ))}
                {!myScreenshots.data?.length && <p className="text-slate-300">No screenshots uploaded yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verifier' && (
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-semibold">Verifier review queue</h3>
          {role !== 'verifier' && (
            <p className="mb-3 text-sm text-slate-300">This queue is only visible for verifier accounts. Login as <span className="font-semibold">verifier1@fairgig.pk</span> to review pending screenshots.</p>
          )}
          <div className="space-y-3">
            {(verifierQueue.data || []).map((item: any) => (
              <div key={item.id} className="rounded-xl border border-white/10 p-3">
                <div className="text-xs text-slate-400">Screenshot ID: {item.id}</div>
                <div className="text-sm">Status: {reviewedQueueItems[item.id] || reviewState[item.id] || item.status}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select className={proInputCompactClass} value={reviewState[item.id] || item.status || 'approved'} onChange={(e) => updateReviewSelection(item.id, e.target.value)}>
                    <option value="approved">approved</option>
                    <option value="disputed">disputed</option>
                    <option value="unverifiable">unverifiable</option>
                  </select>
                  <button onClick={() => submitReview(item.id)} className={proBtnClass}>Submit review</button>
                </div>
              </div>
            ))}
            {!verifierQueue.data?.length && <p className="text-sm text-slate-300">No pending screenshots right now.</p>}
          </div>
        </div>
      )}

      {activeTab === 'advocate' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Advocate analytics panel</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Avg Commission %" value={String(advocateKpis.data?.avg_commission_pct || 0)} />
              <Card title="Income Volatility" value={String(advocateKpis.data?.income_volatility || 0)} />
              <Card title="Avg Net" value={`PKR ${advocateKpis.data?.avg_net || 0}`} />
              <Card title="Total Shifts 30d" value={String(advocateKpis.data?.total_shifts || 0)} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Top complaint clusters</p>
              {(advocateKpis.data?.top_complaints || []).map((row: any) => (
                <div key={row.cluster_key} className="mb-2 rounded-xl border border-white/10 p-2 text-sm">{row.cluster_key}: {row.count}</div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Workers with {'>'}20% MoM income drop</h3>
            <div className="space-y-2">
              {(vulnerability.data?.flags || []).map((flag: any) => (
                <div key={flag.worker_id} className="rounded-xl border border-red-400/30 p-3 text-sm">
                  <div>{flag.full_name} ({flag.city})</div>
                  <div>Change: {flag.change_pct}%</div>
                  <div>Previous: PKR {flag.previous_month} | Current: PKR {flag.current_month}</div>
                </div>
              ))}
              {!vulnerability.data?.flags?.length && <p className="text-sm text-slate-300">No vulnerability flags currently.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Anonymous grievance board</h3>
            <form onSubmit={submitGrievance} className="space-y-3">
              <input className={proInputClass} placeholder="Complaint title" value={grievanceForm.title} onChange={(e) => setGrievanceForm((p) => ({ ...p, title: e.target.value }))} />
              <textarea className={`${proInputClass} h-24`} placeholder="Description" value={grievanceForm.description} onChange={(e) => setGrievanceForm((p) => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className={proInputCompactClass} placeholder="City" value={grievanceForm.city} onChange={(e) => setGrievanceForm((p) => ({ ...p, city: e.target.value }))} />
                <input className={proInputCompactClass} placeholder="Platform" value={grievanceForm.platform} onChange={(e) => setGrievanceForm((p) => ({ ...p, platform: e.target.value }))} />
              </div>
              <button type="submit" className={proPrimaryClass}>Post grievance</button>
            </form>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-lg font-semibold">Moderation and clustering</h3>
            {!canModerateGrievances && (
              <p className="mb-3 text-sm text-slate-300">Only advocate accounts can select moderation states or apply grievance tags.</p>
            )}
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold">Cluster summary</p>
              {(grievanceClusters.data || []).map((cluster: any) => (
                <div key={cluster.cluster_key} className="rounded-xl border border-white/10 p-2 text-sm">{cluster.cluster_key}: {cluster.count} complaints</div>
              ))}
            </div>
            <div className="space-y-2">
              {(grievances.data || []).slice(0, 8).map((item: any) => (
                <div key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
                  {(() => {
                    const effectiveStatus = grievanceStatusOverrides[item.id] || item.status;
                    const hasQuickTags = Array.isArray(item.tags) && item.tags.includes('rates') && item.tags.includes('commission');
                    return (
                      <>
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-slate-300">{item.platform} - {item.city}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => moderateGrievance(item.id, 'in_review')}
                      disabled={!canModerateGrievances}
                      className={`rounded-lg px-2 py-1 transition ${effectiveStatus === 'in_review' ? 'border border-amber-300/80 bg-amber-400/20 font-semibold text-amber-100' : 'border border-white/20'} ${!canModerateGrievances ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      in_review
                    </button>
                    <button
                      onClick={() => moderateGrievance(item.id, 'resolved')}
                      disabled={!canModerateGrievances}
                      className={`rounded-lg px-2 py-1 transition ${effectiveStatus === 'resolved' ? 'border border-green-300/80 bg-green-400/20 font-semibold text-green-100' : 'border border-green-400/30'} ${!canModerateGrievances ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      resolved
                    </button>
                    <button
                      onClick={() => moderateGrievance(item.id, 'rejected')}
                      disabled={!canModerateGrievances}
                      className={`rounded-lg px-2 py-1 transition ${effectiveStatus === 'rejected' ? 'border border-red-300/80 bg-red-400/20 font-semibold text-red-100' : 'border border-red-400/30'} ${!canModerateGrievances ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      rejected
                    </button>
                    <button
                      onClick={() => tagGrievance(item.id, 'rates,commission')}
                      disabled={!canModerateGrievances}
                      className={`rounded-lg px-2 py-1 transition ${hasQuickTags ? 'border border-violet-300/80 bg-violet-400/20 font-semibold text-violet-100' : 'border border-violet/40'} ${!canModerateGrievances ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      tag quick labels
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
