import React from "react";
import { Button } from "./ui/button";
import { ShoppingCart, Menu, X } from "lucide-react";

interface HeaderProps {
  onLogin: () => void;
}

export function Header({ onLogin }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleLogin = React.useCallback(() => {
    setIsMenuOpen(false);
    onLogin();
  }, [onLogin]);

  return (
    <header className="bg-[#3D3D3D] border-b border-[#2D2D2D] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-8 w-8 text-[#E91E8C]" />
            <span className="text-xl text-white">PriceGuard</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-[#E91E8C] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-300 hover:text-[#E91E8C] transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-[#E91E8C] transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-gray-300 hover:text-[#E91E8C] transition-colors">
              About
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-gray-300 hover:text-white hover:bg-[#2D2D2D]"
              onClick={onLogin}
            >
              Log In
            </Button>
            <Button 
              className="bg-[#E91E8C] hover:bg-[#D11A7C] text-white"
              onClick={onLogin}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-300" />
            ) : (
              <Menu className="h-6 w-6 text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[#3D3D3D] border-t border-[#2D2D2D]">
              <a
                href="#features"
                className="block px-3 py-2 text-gray-300 hover:text-[#E91E8C] transition-colors"
                onClick={closeMenu}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block px-3 py-2 text-gray-300 hover:text-[#E91E8C] transition-colors"
                onClick={closeMenu}
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-gray-300 hover:text-[#E91E8C] transition-colors"
                onClick={closeMenu}
              >
                Pricing
              </a>
              <a
                href="#about"
                className="block px-3 py-2 text-gray-300 hover:text-[#E91E8C] transition-colors"
                onClick={closeMenu}
              >
                About
              </a>
              <div className="pt-3 border-t border-[#2D2D2D]">
                <Button 
                  variant="ghost" 
                  className="w-full mb-2 text-gray-300 hover:text-white hover:bg-[#2D2D2D]"
                  onClick={handleLogin}
                >
                  Log In
                </Button>
                <Button 
                  className="w-full bg-[#E91E8C] hover:bg-[#D11A7C] text-white"
                  onClick={handleLogin}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
