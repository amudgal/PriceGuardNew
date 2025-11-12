import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      logout();
      navigate('/', { replace: true });
    } else {
      navigate('/login');
    }
  };

  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <header className="border-b border-[#2D2D2D] bg-[#3D3D3D]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-semibold text-[#E91E8C]">
            PG
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white">PriceGuard</span>
            <span className="hidden text-xs text-gray-300 sm:block">Price protection made simple</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
          <Link className="transition hover:text-white" to="/">
            Home
          </Link>
          <Link className="transition hover:text-white" to="/#features">
            Features
          </Link>
          <Link className="transition hover:text-white" to="/login">
            Plans
          </Link>
          {isAuthenticated ? (
            <Link
              className={`transition hover:text-white ${isDashboard ? 'text-white' : ''}`}
              to="/dashboard"
            >
              Dashboard
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          <Button
            className="hidden min-w-0 px-4 md:inline-flex"
            variant="ghost"
            onClick={() => (window.location.href = 'mailto:sales@priceguard.com')}
          >
            Contact sales
          </Button>
          <Button className="min-w-0 px-4" onClick={handlePrimaryAction}>
            {isAuthenticated ? 'Sign out' : 'Sign in'}
          </Button>
        </div>
      </div>
    </header>
  );
}

