import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowRight, Upload, Eye, DollarSign, CheckCircle } from "lucide-react";

interface HowItWorksProps {
  onGetStarted?: () => void;
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  const steps = [
    {
      number: "01",
      icon: <Upload className="h-6 w-6 text-[#E91E8C]" />,
      title: "Upload Your Receipt",
      description: "Snap a photo of your Costco receipt or connect your Costco account for automatic tracking.",
      detail: "Our OCR technology instantly reads your receipt and adds all eligible items to your monitoring list."
    },
    {
      number: "02", 
      icon: <Eye className="h-6 w-6 text-[#E91E8C]" />,
      title: "We Monitor Prices",
      description: "Our AI tracks prices for all your purchases for the full 30-day adjustment period.",
      detail: "We check prices multiple times daily and compare against your original purchase price."
    },
    {
      number: "03",
      icon: <DollarSign className="h-6 w-6 text-[#E91E8C]" />,
      title: "Automatic Claims",
      description: "When prices drop, we automatically file reimbursement claims with Costco on your behalf.",
      detail: "No forms to fill out, no waiting in lines - we handle everything electronically."
    },
    {
      number: "04",
      icon: <CheckCircle className="h-6 w-6 text-[#E91E8C]" />,
      title: "Get Your Money",
      description: "Receive your reimbursement directly to your payment method within 3-5 business days.",
      detail: "Track all your savings in real-time through your personalized dashboard."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl text-gray-700">
            How PriceGuard Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our automated system makes saving money effortless. Here's how we turn 
            Costco's price adjustment policy into passive income for you.
          </p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                      {step.icon}
                    </div>
                    <span className="text-2xl text-gray-300">{step.number}</span>
                  </div>
                  
                  <h3 className="text-gray-700">
                    {step.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                  
                  <p className="text-gray-500 text-xs leading-relaxed border-t border-gray-100 pt-3">
                    {step.detail}
                  </p>
                </CardContent>
              </Card>
              
              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Example Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl text-gray-700">
                Real Example: Sarah's TV Purchase
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[#E91E8C] text-xs mt-1">
                    1
                  </div>
                  <div>
                    <p className="text-gray-700">Purchased 65" Samsung TV for $899</p>
                    <p className="text-gray-500 text-sm">January 15th at Costco Wholesale</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[#E91E8C] text-xs mt-1">
                    2
                  </div>
                  <div>
                    <p className="text-gray-700">Price dropped to $799 on January 28th</p>
                    <p className="text-gray-500 text-sm">PriceGuard detected the $100 difference</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[#E91E8C] text-xs mt-1">
                    3
                  </div>
                  <div>
                    <p className="text-gray-700">Automatically filed claim with Costco</p>
                    <p className="text-gray-500 text-sm">Claim processed within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[#E91E8C] text-xs mt-1">
                    4
                  </div>
                  <div>
                    <p className="text-gray-700">$100 refunded to original payment method</p>
                    <p className="text-gray-500 text-sm">Total time: 3 business days</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  <span className="text-lg">💰</span> Sarah saved $100 without lifting a finger!
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758518727888-ffa196002e59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHdvbWFuJTIwc21pbGluZ3xlbnwxfHx8fDE3NTk3MzUyNTZ8MA&ixlib=rb-4.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Professional business woman smiling"
                className="rounded-lg shadow-lg w-full h-auto"
              />
              <blockquote className="bg-gray-50 border-l-4 border-[#E91E8C] p-4 rounded">
                <p className="text-gray-700 italic">
                  "I've saved over $400 this year just by using PriceGuard. It's like having a personal 
                  assistant watching all my Costco purchases!"
                </p>
                <footer className="text-gray-600 text-sm mt-2">
                  — Sarah M., PriceGuard User
                </footer>
              </blockquote>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button 
            className="bg-[#E91E8C] hover:bg-[#D11A7C] text-white px-8 py-3"
            onClick={onGetStarted}
          >
            Start Your Free Trial
          </Button>
          <p className="text-gray-500 text-sm mt-3">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}