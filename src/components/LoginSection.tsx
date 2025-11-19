import type { FormEvent, ReactNode } from 'react';
import { CreditCard, Info, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { PaymentLogos } from './PaymentLogos';

interface LoginSectionProps {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
}

export function LoginSection({ onSubmit, submitLabel = 'Start 14-day trial' }: LoginSectionProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return (
    <section aria-labelledby="join-priceguard" className="self-start">
      <Card className="h-full w-full border-[#E5E7EB] shadow-sm">
        <CardHeader className="flex-col items-stretch gap-6">
          <div className="space-y-3">
            <h1 id="join-priceguard">Join PriceGuard</h1>
            <p className="text-base text-[#4B5563]">
              Create your account to start protecting every purchase across your favorite retailers.
            </p>
          </div>
          <div className="flex gap-3 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] p-3">
            <Info className="h-4 w-4 flex-none text-[#2563EB]" aria-hidden="true" />
            <p className="text-xs text-[#1E3A8A]">
              PriceGuard scans your receipts twice daily and files eligible claims automatically. You can pause at any
              time from your dashboard.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form className="space-y-4" id="join-priceguard-form" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="full-name" label="Full name">
                <Input id="full-name" name="fullName" placeholder="Taylor Price" autoComplete="name" required />
              </FormField>
              <FormField id="email" label="Work email">
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="taylor@example.com"
                    autoComplete="email"
                    required
                  />
                  <Mail
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]"
                  />
                </div>
              </FormField>
            </div>

            <FormField id="password" label="Password" helper="Use at least 8 characters.">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <Lock aria-hidden="true" className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
            </FormField>

            <FormField id="company" label="Company or household">
              <Input id="company" name="company" placeholder="Blue Canyon Retail" autoComplete="organization" />
            </FormField>

            <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-medium text-[#374151]">Payment information</h3>
                  <p className="text-xs text-[#6B7280]">Securely processed with bank-grade encryption.</p>
                </div>
                <PaymentLogos />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-900">
                  <strong>Credit Card Processing Fee:</strong> We charge a processing fee of 30¢ + 2.9% of the transaction amount for credit card payments.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    id="card-number"
                    name="cardNumber"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    aria-describedby="card-help"
                    maxLength={19}
                    required
                  />
                  <CreditCard
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="expiry" name="expiry" placeholder="MM/YY" maxLength={5} required />
                  <Input id="cvv" name="cvv" type="password" placeholder="123" maxLength={4} required />
                </div>
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <Button className="w-full min-w-0" type="submit" form="join-priceguard-form">
            {submitLabel}
          </Button>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <ShieldCheck className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
            <span>No hidden fees. Cancel in one click.</span>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-4 space-y-2 text-xs text-[#6B7280]">
        <p>
          By continuing, you agree to our{' '}
          <a className="font-medium text-[#E91E8C]" href="#terms">
            Terms of Service
          </a>{' '}
          and{' '}
          <a className="font-medium text-[#E91E8C]" href="#privacy">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
          <span>
            Already a member?{' '}
            <a className="font-medium text-[#E91E8C]" href="#signin">
              Sign in
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  helper?: string;
  children: ReactNode;
}

function FormField({ id, label, helper, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#374151]" htmlFor={id}>
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-[#6B7280]">{helper}</p> : null}
    </div>
  );
}

