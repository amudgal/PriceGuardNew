import React from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Testimonials } from "./components/Testimonials";
import { Footer } from "./components/Footer";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

type PageType = "home" | "login" | "dashboard";

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

  const handleLoginSuccess = React.useCallback((user?: UserData) => {
    if (user) {
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
