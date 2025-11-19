import React from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Testimonials } from "./components/Testimonials";
import { Footer } from "./components/Footer";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { PayPalTestPage } from "./pages/PayPalTestPage";
import { PayPalDiagnostic } from "./pages/PayPalDiagnostic";

type PageType = "home" | "login" | "dashboard" | "paypal-test" | "paypal-diagnostic";

interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  plan: string;
  pastDue: boolean;
  cardLast4: string | null;
}

function App() {
  const [currentPage, setCurrentPage] = React.useState<PageType>("home");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userData, setUserData] = React.useState<UserData | null>(null);

  const handleLogin = React.useCallback(() => {
    setCurrentPage("login");
  }, []);

  const handleBack = React.useCallback(() => {
    setCurrentPage("home");
  }, []);

  // Add handler for PayPal test page (you can call this from browser console or add a button)
  React.useEffect(() => {
    // Allow accessing test page via URL hash or query param
    const hash = window.location.hash;
    if (hash === "#paypal-test" || window.location.search.includes("paypal-test")) {
      setCurrentPage("paypal-test");
    } else if (hash === "#paypal-diagnostic" || window.location.search.includes("paypal-diagnostic")) {
      setCurrentPage("paypal-diagnostic");
    }
  }, []);

  // Show PayPal Diagnostic page
  if (currentPage === "paypal-diagnostic") {
    return (
      <div className="min-h-screen bg-white">
        <Header onLogin={handleLogin} />
        <main>
          <PayPalDiagnostic />
        </main>
        <Footer />
      </div>
    );
  }

  const handleLoginSuccess = React.useCallback((user?: UserData) => {
    console.log("handleLoginSuccess called with:", user); // Debug: Check what we're storing
    if (user) {
      console.log("Setting userData with firstName:", user.firstName); // Debug: Check firstName
      setUserData(user);
    }
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  }, []);

  const handleLogout = React.useCallback(() => {
    setIsLoggedIn(false);
    setUserData(null);
    setCurrentPage("home");
  }, []);

  // Show Dashboard if logged in
  if (isLoggedIn && currentPage === "dashboard") {
    return <Dashboard onLogout={handleLogout} userData={userData} />;
  }

  // Show Login page
  if (currentPage === "login") {
    return <Login onBack={handleBack} onLoginSuccess={(user) => handleLoginSuccess(user)} />;
  }

  // Show PayPal Test page
  if (currentPage === "paypal-test") {
    return (
      <div className="min-h-screen bg-white">
        <Header onLogin={handleLogin} />
        <main>
          <PayPalTestPage />
        </main>
        <Footer />
      </div>
    );
  }

  // Show Home page
  return (
    <div className="min-h-screen bg-white">
      <Header onLogin={handleLogin} />
      <main>
        <Hero onGetStarted={handleLogin} />
        <Features />
        <HowItWorks onGetStarted={handleLogin} />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}

export default App;
