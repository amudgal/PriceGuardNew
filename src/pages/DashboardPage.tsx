import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';

const METRICS = [
  { label: 'Active claims', value: '18', trend: '+4 this week' },
  { label: 'Recovered savings', value: '$4,920', trend: '+12% vs last month' },
  { label: 'Retailers monitored', value: '26', trend: 'All SLAs healthy' },
];

export function DashboardPage() {
  return (
    <section className="bg-[#F9FAFB] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <h1>Welcome back</h1>
          <p className="text-sm text-[#4B5563]">
            Track active claims, review recent savings, and explore opportunities to increase your reimbursements.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {METRICS.map((metric) => (
            <Card key={metric.label} className="border-[#E5E7EB] p-6">
              <CardHeader className="flex-col items-start gap-2">
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">{metric.label}</p>
                <p className="text-2xl font-semibold text-[#111827]">{metric.value}</p>
                <span className="text-xs text-[#10B981]">{metric.trend}</span>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="flex-col items-start gap-2">
            <h2 className="text-lg font-semibold text-[#374151]">Next best actions</h2>
            <p className="text-sm text-[#4B5563]">
              Focus on these opportunities to maximise reimbursements and keep claim SLAs on track.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-[#374151]">Audit Target orders placed in the last 7 days</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                34 receipts ready for validation. Average refund potential: <strong>$18 per order</strong>.
              </p>
              <Button className="mt-3 min-w-0" variant="outline">
                Review receipts
              </Button>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-[#374151]">Enable auto-claims with Amex Business Platinum</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Activate card-level protection to improve reimbursement approval speed by 2.4x.
              </p>
              <Button className="mt-3 min-w-0">Connect card</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
