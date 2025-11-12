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

function App() {
  const [currentPage, setCurrentPage] = React.useState<PageType>("home");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  const handleLogin = React.useCallback(() => {
    setCurrentPage("login");
  }, []);

  const handleBack = React.useCallback(() => {
    setCurrentPage("home");
  }, []);

  const handleLoginSuccess = React.useCallback(() => {
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  }, []);

  const handleLogout = React.useCallback(() => {
    setIsLoggedIn(false);
    setCurrentPage("home");
  }, []);

  // Show Dashboard if logged in
  if (isLoggedIn && currentPage === "dashboard") {
    return <Dashboard onLogout={handleLogout} />;
  }

  // Show Login page
  if (currentPage === "login") {
    return <Login onBack={handleBack} onLoginSuccess={handleLoginSuccess} />;
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
