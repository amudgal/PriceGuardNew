import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CheckCircle, TrendingDown, DollarSign } from "lucide-react";

interface HeroProps {
  onGetStarted?: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="bg-gradient-to-br from-pink-50 to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Costco Partnership Badge */}
            <div className="inline-flex items-center space-x-2 bg-red-50 border border-red-200 rounded-full px-4 py-2">
              <div className="w-6 h-6 bg-red-600 rounded text-white flex items-center justify-center text-xs">
                C
              </div>
              <span className="text-red-700">Official Costco Price Monitoring Partner</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl text-gray-700 leading-tight">
                Never Miss
                <span className="text-[#E91E8C] block">Price Drop</span>
                Savings Again
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Automatically track your Costco purchases and get money back when prices drop. 
                Our AI monitors price adjustments 24/7 and handles reimbursement claims for you.
              </p>

              {/* Key Benefits */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#E91E8C]" />
                  <span className="text-gray-700">Automatic 30-day price monitoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-[#E91E8C]" />
                  <span className="text-gray-700">Average savings of $247 per year</span>
                </div>
                <div className="flex items-center space-x-3">
                  <TrendingDown className="h-5 w-5 text-[#E91E8C]" />
                  <span className="text-gray-700">Instant reimbursement processing</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
                <Button 
                  className="bg-[#E91E8C] hover:bg-[#D11A7C] text-white px-8 py-3"
                  onClick={onGetStarted}
                >
                  Start Saving Today
                </Button>
                <Button variant="outline" className="px-8 py-3 border-[#E91E8C] text-[#E91E8C] hover:bg-[#E91E8C] hover:text-white">
                  See How It Works
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center space-x-6 text-sm text-gray-500 pt-4">
                <div className="flex items-center space-x-1">
                  <span>⭐⭐⭐⭐⭐</span>
                  <span>4.9/5 rating</span>
                </div>
                <div>50,000+ active users</div>
                <div>$2.3M+ saved collectively</div>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <div className="relative z-10">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665686307516-1915b9616526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHdvbWFuJTIwc2hvcHBpbmclMjBvbmxpbmUlMjBsYXB0b3B8ZW58MXx8fHwxNzU5ODAxMzQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Happy woman shopping online with laptop"
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
            {/* Floating Stats Cards */}
            <div className="absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-4 z-20">
              <div className="text-[#E91E8C] text-2xl">$89</div>
              <div className="text-sm text-gray-600">Saved this month</div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-4 z-20">
              <div className="text-[#E91E8C] text-2xl">47</div>
              <div className="text-sm text-gray-600">Price drops tracked</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}