'use client';

export default function Hero() {
  return (
    <section className="hero-shell relative overflow-hidden rounded-3xl p-6 md:p-10">
      <div className="hero-orb hero-orb-left" />
      <div className="hero-orb hero-orb-right" />
      <div className="relative z-10 grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <span className="hero-kicker inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
            Worker Rights Platform
          </span>
          <h1 className="hero-title mt-4 text-4xl font-black tracking-tight md:text-6xl">FairGig</h1>
          <p className="hero-copy mt-4 max-w-2xl text-base md:text-lg">
            Transparent earnings. Verified records. Collective worker voice. Built for Pakistan&apos;s gig riders and freelancers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="hero-chip hero-chip-teal rounded-xl px-3 py-1.5">Certified Earnings</span>
            <span className="hero-chip hero-chip-cyan rounded-xl px-3 py-1.5">Anomaly Alerts</span>
            <span className="hero-chip hero-chip-violet rounded-xl px-3 py-1.5">Community Grievances</span>
          </div>
        </div>
        <div className="hero-metrics grid gap-3 sm:grid-cols-3 md:grid-cols-1 md:justify-items-end">
          <div className="hero-metric-card w-full rounded-2xl p-4 md:max-w-xs">
            <div className="hero-metric-label text-xs uppercase tracking-wide">Verification</div>
            <div className="hero-metric-value mt-1 text-xl font-semibold">Identity + Earnings</div>
          </div>
          <div className="hero-metric-card w-full rounded-2xl p-4 md:max-w-xs">
            <div className="hero-metric-label text-xs uppercase tracking-wide">Advocacy</div>
            <div className="hero-metric-value mt-1 text-xl font-semibold">Clustered Complaints</div>
          </div>
          <div className="hero-metric-card w-full rounded-2xl p-4 md:max-w-xs">
            <div className="hero-metric-label text-xs uppercase tracking-wide">Compliance</div>
            <div className="hero-metric-value mt-1 text-xl font-semibold">Downloadable Proof</div>
          </div>
        </div>
      </div>
    </section>
  );
}
