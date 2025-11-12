import { Check } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { cn } from '../lib/utils';

export type PlanId = 'standard' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Perfect for individual shoppers who want automated price protection.',
    price: '$12',
    period: 'per month',
    features: ['Track up to 50 products', 'Real-time price drop alerts', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Built for power users and families with higher order volumes.',
    price: '$24',
    period: 'per month',
    popular: true,
    features: ['Unlimited product tracking', 'Automated retailer claims', 'Priority chat support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For merchant teams managing large catalogs and revenue commitments.',
    price: 'Let’s talk',
    period: 'custom',
    features: ['Dedicated success manager', 'Custom compliance workflows', 'Premium analytics suite'],
  },
];

interface MembershipPlansProps {
  selectedPlan: PlanId;
  onSelect?: (plan: PlanId) => void;
}

export function MembershipPlans({ selectedPlan, onSelect }: MembershipPlansProps) {
  return (
    <div className="space-y-6" id="membership">
      <header className="space-y-2">
        <h2>Choose your membership</h2>
        <p className="text-sm text-[#4B5563]">
          Switch anytime. Every plan comes with automated price monitoring and proactive dispute management.
        </p>
      </header>

      <div className="space-y-4">
        {PLANS.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          return (
            <Card
              key={plan.id}
              className={cn(
                'space-y-4 border transition-all duration-150 ease-in-out hover:border-[#D1D5DB]',
                isSelected
                  ? 'border-2 border-[#E91E8C] ring-2 ring-[#E91E8C]/30 shadow-md'
                  : 'border-[#E5E7EB]',
              )}
            >
              <CardHeader className="items-start gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#374151]">{plan.name}</h3>
                    {plan.popular ? (
                      <Badge className="rounded bg-[#E91E8C] text-white">Popular</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-[#4B5563]">{plan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-[#111827]">{plan.price}</p>
                  <p className="text-xs uppercase tracking-wide text-[#6B7280]">{plan.period}</p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#4B5563]">
                      <Check className="mt-[2px] h-4 w-4 text-[#E91E8C]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="flex items-center justify-between pt-2">
                <Button
                  onClick={() => onSelect?.(plan.id)}
                  variant={isSelected ? 'primary' : 'outline'}
                  className={cn(!isSelected && 'text-[#374151]')}
                >
                  {isSelected ? 'Selected' : 'Choose plan'}
                </Button>
                {plan.id === 'enterprise' ? (
                  <span className="text-xs text-[#6B7280]">Volume pricing and SLAs available.</span>
                ) : (
                  <span className="text-xs text-[#6B7280]">Cancel anytime.</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

