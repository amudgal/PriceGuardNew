import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Check, ShoppingCart, ArrowLeft, Shield, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface LoginProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$0.45",
    period: "/Year",
    description: "Perfect for casual shoppers",
    features: [
      "Track all online purchase prices",
      "Automatic price adjustment submissions",
      "Email notifications for savings",
      "Basic customer support"
    ],
    popular: false
  },
  {
    id: "intermediate",
    name: "Intermediate",
    price: "$1.99",
    period: "/Year",
    description: "For regular Costco shoppers",
    features: [
      "Everything in Basic",
      "Track warehouse purchase items",
      "Receipt scanning & auto-matching",
      "Priority customer support",
      "Advanced notifications"
    ],
    popular: true
  },
  {
    id: "premium",
    name: "Premium",
    price: "$2.99",
    period: "/Year",
    description: "For power users and deal hunters",
    features: [
      "Everything in Intermediate",
      "Detailed analytics & stats dashboard",
      "Watchlist for favorite items",
      "Price drop predictions",
      "Bulk purchase optimization",
      "Dedicated account manager"
    ],
    popular: false
  }
];

export function Login({ onBack, onLoginSuccess }: LoginProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<string>("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [cardNumber, setCardNumber] = React.useState("");

  const handlePlanSelect = React.useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handleCardNumberChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    let value = e.target.value.replace(/\D/g, "");
    // Limit to 16 digits
    value = value.slice(0, 16);
    // Add spaces every 4 digits
    value = value.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(value);
  }, []);

  const handleSignup = React.useCallback(() => {
    // In a real app, this would make an API call
    // For now, we'll just simulate a successful signup
    if (termsAccepted && selectedPlan) {
      onLoginSuccess();
    }
  }, [onLoginSuccess, termsAccepted, selectedPlan]);

  const handleLogin = React.useCallback(() => {
    // In a real app, this would make an API call
    // For now, we'll just simulate a successful login
    onLoginSuccess();
  }, [onLoginSuccess]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#3D3D3D] border-b border-[#2D2D2D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="p-2 text-gray-300 hover:text-white hover:bg-[#2D2D2D]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-8 w-8 text-[#E91E8C]" />
                <span className="text-xl text-white">PriceGuard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <Tabs defaultValue="signup" className="w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl mb-2">Join PriceGuard</h1>
              <p className="text-gray-600">Start saving money on your Costco purchases today</p>
            </div>

            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="login">Log In</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Signup Form */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Your Account</CardTitle>
                      <CardDescription>
                        Get started with your chosen membership plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" placeholder="John" />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" placeholder="Doe" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" />
                      </div>
                      
                      {/* Payment Information Section */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-base">Payment Information</Label>
                          <div className="flex items-center gap-2">
                            {/* Visa Logo */}
                            <div className="h-8 w-12 bg-white border border-gray-200 rounded flex items-center justify-center">
                              <svg viewBox="0 0 48 32" className="h-5 w-8">
                                <rect width="48" height="32" rx="4" fill="#fff"/>
                                <path d="M20.5 11.5l-2.5 9h-2l-2.5-9h2l1.5 6.5 1.5-6.5h2zm3 0h1.5l-1.5 9h-1.5l1.5-9zm5.5 0l-1 9h-1.5l1-9h1.5zm3 0h1.5l.5 6.5 1-6.5h1.5l-1.5 9h-2l-.5-6.5-1 6.5h-1.5l1.5-9z" fill="#1434CB"/>
                              </svg>
                            </div>
                            {/* Mastercard Logo */}
                            <div className="h-8 w-12 bg-white border border-gray-200 rounded flex items-center justify-center">
                              <svg viewBox="0 0 48 32" className="h-5 w-8">
                                <circle cx="18" cy="16" r="8" fill="#EB001B"/>
                                <circle cx="30" cy="16" r="8" fill="#F79E1B"/>
                                <path d="M24 10.5a8 8 0 000 11 8 8 0 000-11z" fill="#FF5F00"/>
                              </svg>
                            </div>
                            {/* Amex Logo */}
                            <div className="h-8 w-12 bg-[#006FCF] border border-gray-200 rounded flex items-center justify-center px-1">
                              <span className="text-white text-[8px] font-bold tracking-tight">AMEX</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <div className="relative">
                            <Input 
                              id="cardNumber" 
                              placeholder="1234 5678 9012 3456"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              maxLength={19}
                            />
                            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label htmlFor="expiry">Expiration Date</Label>
                            <Input 
                              id="expiry" 
                              placeholder="MM/YY"
                              maxLength={5}
                            />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input 
                              id="cvv" 
                              placeholder="123"
                              maxLength={4}
                              type="password"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-xs text-blue-900">
                          <strong>Important:</strong> PriceGuard is not intended for collecting Personally Identifiable Information (PII) 
                          or securing highly sensitive data. By creating an account, you acknowledge that:
                          <ul className="list-disc ml-4 mt-2 space-y-1">
                            <li>We use industry-standard encryption for your data</li>
                            <li>Your information is used solely for price monitoring</li>
                            <li>You should not share sensitive financial details beyond payment methods</li>
                            <li>We comply with applicable privacy regulations</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <div className="flex items-start space-x-2">
                        <input 
                          type="checkbox" 
                          id="termsAccept" 
                          className="mt-1 rounded border-gray-300"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          required
                        />
                        <Label htmlFor="termsAccept" className="text-sm text-gray-600">
                          I agree to the <a href="#" className="text-[#E91E8C] hover:underline">Terms of Service</a> and{" "}
                          <a href="#" className="text-[#E91E8C] hover:underline">Privacy Policy</a>, and I understand 
                          the data security practices outlined above.
                        </Label>
                      </div>

                      <Button 
                        className="w-full bg-[#E91E8C] hover:bg-[#D11A7C]" 
                        disabled={!selectedPlan || !termsAccepted}
                        onClick={handleSignup}
                      >
                        Create Account & Start Saving
                      </Button>
                      {!selectedPlan && (
                        <p className="text-sm text-gray-500 text-center">
                          Please select a membership plan to continue
                        </p>
                      )}
                      {!termsAccepted && selectedPlan && (
                        <p className="text-sm text-gray-500 text-center">
                          Please accept the terms and conditions to continue
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Membership Plans */}
                <div className="space-y-6">
                  <h2 className="text-xl text-center">Choose Your Membership</h2>
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? "ring-2 ring-[#E91E8C] border-[#E91E8C]"
                            : "hover:border-gray-300"
                        } ${plan.popular ? "border-[#E91E8C]" : ""}`}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                {plan.popular && (
                                  <Badge className="bg-[#E91E8C] text-white">Most Popular</Badge>
                                )}
                              </div>
                              <CardDescription>{plan.description}</CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl">{plan.price}</div>
                              <div className="text-sm text-gray-500">{plan.period}</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {plan.features.map((feature, index) => (
                              <li key={`${plan.id}-feature-${index}`} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-[#E91E8C] flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="login">
              <div className="max-w-md mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>
                      Sign in to your PriceGuard account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="loginEmail">Email</Label>
                      <Input id="loginEmail" type="email" placeholder="john@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="loginPassword">Password</Label>
                      <Input id="loginPassword" type="password" placeholder="••••••••" />
                    </div>
                    <Button 
                      className="w-full bg-[#E91E8C] hover:bg-[#D11A7C]"
                      onClick={handleLogin}
                    >
                      Sign In
                    </Button>
                    <div className="text-center">
                      <a href="#" className="text-sm text-[#E91E8C] hover:underline">
                        Forgot your password?
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}