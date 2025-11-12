import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginSection } from '../components/LoginSection';
import { MembershipPlans } from '../components/MembershipPlans';
import type { PlanId } from '../components/MembershipPlans';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const defaultPlan: PlanId = 'pro';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
    navigate('/dashboard', { replace: true });
  };

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
        <LoginSection onSubmit={handleSubmit} submitLabel="Create account" />
        <div className="self-start">
          <MembershipPlans selectedPlan={defaultPlan} />
        </div>
      </div>
    </section>
  );
}
