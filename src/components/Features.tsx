import { Card, CardContent } from "./ui/card";
import { 
  Shield, 
  Zap, 
  Clock, 
  TrendingUp, 
  Bell, 
  CreditCard,
  Smartphone,
  BarChart3 
} from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-[#E91E8C]" />,
      title: "Automatic Price Monitoring",
      description: "Our AI continuously scans Costco's pricing for 30 days after your purchase, ensuring you never miss a price adjustment opportunity."
    },
    {
      icon: <Zap className="h-8 w-8 text-[#E91E8C]" />,
      title: "Instant Reimbursement Claims",
      description: "When we detect a price drop, we automatically file your reimbursement claim with Costco - no paperwork or hassle required."
    },
    {
      icon: <Clock className="h-8 w-8 text-[#E91E8C]" />,
      title: "30-Day Price Protection",
      description: "Full coverage for Costco's 30-day price adjustment policy. We track every eligible purchase from day one."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-[#E91E8C]" />,
      title: "Smart Analytics",
      description: "Get insights into your shopping patterns, potential savings, and trending products to maximize your Costco benefits."
    },
    {
      icon: <Bell className="h-8 w-8 text-[#E91E8C]" />,
      title: "Real-Time Notifications",
      description: "Receive instant alerts when price drops are detected and when reimbursements are processed."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-[#E91E8C]" />,
      title: "Secure Payment Processing",
      description: "Bank-level security ensures your financial information and purchase data are always protected."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-[#E91E8C]" />,
      title: "Mobile App Integration",
      description: "Snap photos of receipts or connect your Costco account for seamless purchase tracking on the go."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-[#E91E8C]" />,
      title: "Savings Dashboard",
      description: "Track your total savings, active monitors, and reimbursement history in one comprehensive dashboard."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl text-gray-700">
            Everything You Need to Save More
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform handles every aspect of Costco's price adjustment process, 
            so you can focus on shopping while we ensure you get the best deals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-50 rounded-lg mx-auto">
                  {feature.icon}
                </div>
                <h3 className="text-center text-gray-700">
                  {feature.title}
                </h3>
                <p className="text-center text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Costco Integration Highlight */}
        <div className="mt-16 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white">
                  <span className="text-xl">C</span>
                </div>
                <h3 className="text-2xl text-gray-700">Official Costco Integration</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                We work with Costco, giving us direct access to their 
                price adjustment systems for faster, more reliable reimbursements.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>✓ API Integration</span>
                <span>✓ Real-time Data</span>
                <span>✓ Secure Connection</span>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block bg-white rounded-lg p-6 shadow-lg">
                <div className="text-3xl text-[#E91E8C] mb-2">$2.3M+</div>
                <div className="text-gray-600">Total Reimbursements Processed</div>
                <div className="text-sm text-gray-500 mt-2">Since 2023</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}