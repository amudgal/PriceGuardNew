import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Star } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      name: "Michael Rodriguez",
      role: "Small Business Owner",
      image: "https://images.unsplash.com/photo-1758611970779-eaffe9fb56e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxtYW4lMjB1c2luZyUyMHBob25lJTIwc2hvcHBpbmd8ZW58MXx8fHwxNzU5ODAxMzQ1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      quote: "PriceGuard has saved my business over $1,200 this year on office supplies and equipment from Costco. The automatic monitoring is incredible - I don't have to think about it at all.",
      savings: "$1,247",
      timeUsing: "8 months"
    },
    {
      name: "Jennifer Chen",
      role: "Working Mother",
      image: "https://images.unsplash.com/photo-1758518727888-ffa196002e59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHdvbWFuJTIwc21pbGluZ3xlbnwxfHx8fDE3NTk3MzUyNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      quote: "As a busy mom, I shop at Costco weekly but never had time to track price changes. PriceGuard does it all for me and the money just appears back in my account. It's like magic!",
      savings: "$389",
      timeUsing: "6 months"
    },
    {
      name: "David Park",
      role: "Retiree",
      image: "https://images.unsplash.com/photo-1758275557449-8cfbeec1a3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcGVvcGxlJTIwdGVjaG5vbG9neSUyMHNtYXJ0cGhvbmVzfGVufDF8fHx8MTc1OTgwMTM0NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      quote: "I was skeptical at first, but PriceGuard has consistently found savings I would have missed. The peace of mind knowing I'm always getting the best price is priceless.",
      savings: "$567",
      timeUsing: "1 year"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl text-gray-700">
            What Our Users Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of smart shoppers who are already saving money effortlessly with PriceGuard.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
              <CardContent className="p-6 space-y-6">
                {/* Rating */}
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl text-[#E91E8C]">{testimonial.savings}</div>
                    <div className="text-sm text-gray-500">Total Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl text-[#E91E8C]">{testimonial.timeUsing}</div>
                    <div className="text-sm text-gray-500">Using PriceGuard</div>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center space-x-3 pt-4">
                  <ImageWithFallback
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-gray-700">{testimonial.name}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Proof Stats */}
        <div className="bg-gradient-to-r from-[#E91E8C] to-[#D11A7C] rounded-2xl p-8 text-white">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl">50,000+</div>
              <div className="text-pink-100">Active Users</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">$2.3M+</div>
              <div className="text-pink-100">Money Saved</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">4.9★</div>
              <div className="text-pink-100">User Rating</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">99.2%</div>
              <div className="text-pink-100">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Press Mentions */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-8">As featured in:</p>
          <div className="flex flex-wrap justify-center items-center space-x-8 opacity-60">
            <div className="text-gray-400 text-lg">TechCrunch</div>
            <div className="text-gray-400 text-lg">Forbes</div>
            <div className="text-gray-400 text-lg">Consumer Reports</div>
            <div className="text-gray-400 text-lg">The Wall Street Journal</div>
          </div>
        </div>
      </div>
    </section>
  );
}