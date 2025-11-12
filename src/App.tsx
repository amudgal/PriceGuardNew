import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Homepage } from './pages/Homepage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] text-[#374151]">
      <Header />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollManager />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Homepage />} />
            <Route path="login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return null;
}

export default App;
