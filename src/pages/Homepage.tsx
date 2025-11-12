import { useNavigate } from 'react-router-dom';
import { BarChart3, BellRing, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const FEATURES = [
  {
    icon: BellRing,
    title: 'Proactive alerts',
    description: 'Instant notifications when retailers drop prices on tracked purchases.',
  },
  {
    icon: ShieldCheck,
    title: 'Automated claims',
    description: 'End-to-end claim filing with retailers and card issuers, handled for you.',
  },
  {
    icon: BarChart3,
    title: 'Actionable insights',
    description: 'A savings dashboard that surfaces recovered revenue and trends.',
  },
];

export function Homepage() {
  const navigate = useNavigate();

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center rounded-full bg-[#E91E8C]/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#E91E8C]">
              Price protection for modern retailers
            </span>
            <h1 className="text-balance text-3xl font-semibold text-[#111827] sm:text-4xl">
              Stop leaving money on the table. Automate your price protection workflow.
            </h1>
            <p className="text-lg text-[#4B5563]">
              PriceGuard monitors receipts, detects price drops, and files claims on your behalf—so your team can focus
              on growth, not busywork.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={() => navigate('/login')}>Get started</Button>
              <Button variant="outline" className="min-w-0" onClick={() => navigate('/login')}>
                View plans
              </Button>
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">Total claims filed</p>
                <p className="mt-2 text-2xl font-semibold text-[#111827]">2,481</p>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">Average payback</p>
                <p className="mt-2 text-2xl font-semibold text-[#111827]">$143</p>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-white p-4 shadow-sm sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">Top retailers monitored</p>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm text-[#4B5563]">
                  <li className="rounded bg-[#E91E8C]/10 px-2 py-1 text-[#E91E8C]">Target</li>
                  <li className="rounded bg-[#E91E8C]/10 px-2 py-1 text-[#E91E8C]">Best Buy</li>
                  <li className="rounded bg-[#E91E8C]/10 px-2 py-1 text-[#E91E8C]">Amazon</li>
                  <li className="rounded bg-[#E91E8C]/10 px-2 py-1 text-[#E91E8C]">Costco</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
          <header className="space-y-2 text-center">
            <h2>Everything you need to protect your spend</h2>
            <p className="text-sm text-[#4B5563]">
              Purpose-built workflows for shoppers, operations teams, and finance leaders.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="h-full space-y-3 border-[#E5E7EB] p-6 transition-all duration-150 ease-in-out hover:border-[#D1D5DB] hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#E91E8C]/10">
                  <Icon className="h-6 w-6 text-[#E91E8C]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-[#374151]">{title}</h3>
                <p className="text-sm text-[#4B5563]">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111827]">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">For operations teams</span>
            <h2 className="text-2xl font-semibold text-white">Launch automated price protection in days, not months.</h2>
            <p className="text-sm text-[#D1D5DB]">
              Connect your retailers, invite collaborators, and monitor your savings from one unified dashboard.
            </p>
          </div>
          <Button
            variant="outline"
            className="min-w-0 border-transparent bg-white text-[#E91E8C] hover:bg-[#F9FAFB]"
            onClick={() => navigate('/login')}
          >
            Create your account
          </Button>
        </div>
      </section>
    </>
  );
}
