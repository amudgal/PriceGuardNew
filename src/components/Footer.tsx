import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-[#2D2D2D] bg-[#3D3D3D] text-[#D1D5DB]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-semibold text-[#E91E8C]">
              PG
            </div>
            <span className="text-lg font-semibold text-white">PriceGuard</span>
          </Link>
          <p className="text-sm text-[#9CA3AF]">
            Comprehensive pricing intelligence to protect your margins and unlock smarter promotions.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Product</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="transition hover:text-white" to="/">
                Homepage
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" to="/login">
                Login / Signup
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" to="/dashboard">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a className="transition hover:text-white" href="mailto:sales@priceguard.com">
                sales@priceguard.com
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="tel:+18005551234">
                +1 (800) 555-1234
              </a>
            </li>
            <li>
              <span>123 Market Street, San Francisco, CA</span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

