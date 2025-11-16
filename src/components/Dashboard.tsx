import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { 
  ShoppingCart, 
  LogOut, 
  TrendingUp, 
  Bell, 
  CreditCard, 
  Eye,
  Plus,
  Trash2,
  Mail,
  MessageSquare,
  DollarSign as DollarSignIcon,
  HelpCircle,
  Info,
  Play,
  CheckCircle2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell 
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { BillingCardForm } from "./BillingCardForm";
import { API_ENDPOINTS } from "../config/api";

interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  plan: string;
  pastDue: boolean;
  cardLast4: string | null;
}

interface DashboardProps {
  onLogout: () => void;
  userData: UserData | null;
}

// Mock data for charts
const savingsData = [
  { month: "Jan", savings: 45 },
  { month: "Feb", savings: 67 },
  { month: "Mar", savings: 89 },
  { month: "Apr", savings: 123 },
  { month: "May", savings: 98 },
  { month: "Jun", savings: 156 },
];

const categoryData = [
  { name: "Electronics", value: 450, color: "#E91E8C" },
  { name: "Groceries", value: 230, color: "#D11A7C" },
  { name: "Home & Garden", value: 180, color: "#B3166B" },
  { name: "Clothing", value: 140, color: "#95135A" },
];

const monitoredProducts = [
  {
    id: 1,
    name: "Samsung 65 inch 4K Smart TV",
    currentPrice: 799.99,
    originalPrice: 899.99,
    purchaseDate: "2024-10-01",
    daysRemaining: 15,
    status: "monitoring",
    potentialSavings: 0,
    lastChecked: "2 mins ago",
  },
  {
    id: 2,
    name: "Dyson V15 Vacuum Cleaner",
    currentPrice: 549.99,
    originalPrice: 599.99,
    purchaseDate: "2024-10-05",
    daysRemaining: 19,
    status: "price-drop",
    potentialSavings: 50,
    lastChecked: "5 mins ago",
  },
  {
    id: 3,
    name: "Kirkland Organic Olive Oil 2L",
    currentPrice: 19.99,
    originalPrice: 19.99,
    purchaseDate: "2024-09-28",
    daysRemaining: 8,
    status: "monitoring",
    potentialSavings: 0,
    lastChecked: "1 min ago",
  },
];

export function Dashboard({ onLogout, userData }: DashboardProps) {
  console.log("Dashboard userData:", userData); // Debug: Check what Dashboard receives
  console.log("Dashboard firstName:", userData?.firstName); // Debug: Check firstName specifically
  const [notifications, setNotifications] = React.useState({
    email: true,
    sms: false,
    push: true,
  });

  const [selectedChannel, setSelectedChannel] = React.useState("email");
  const userEmail = userData?.email ?? "";
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);
  const [showProductIdHelp, setShowProductIdHelp] = React.useState(false);
  const [showClaimHelp, setShowClaimHelp] = React.useState(false);
  
  // Subscription state
  const [subscriptionData, setSubscriptionData] = React.useState<{
    plan: string;
    pastDue: boolean;
    cardLast4: string | null;
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
    stripePriceId: string | null;
  } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = React.useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  
  // Billing history state
  const [billingHistory, setBillingHistory] = React.useState<{
    transactions: Array<{
      id: string;
      type: 'invoice' | 'payment_intent' | 'charge';
      transactionNumber: string | null;
      amount: number;
      currency: string;
      status: string;
      date: string;
      periodStart: string | null;
      periodEnd: string | null;
      hostedInvoiceUrl: string | null;
      invoicePdf: string | null;
      description: string;
      isProcessed: boolean;
      isProcessing: boolean;
    }>;
    invoices: Array<any>;
    paymentIntents: Array<any>;
    charges: Array<any>;
    totalAmount: number;
    count: number;
    processedCount: number;
    processingCount: number;
  } | null>(null);
  const [isLoadingBillingHistory, setIsLoadingBillingHistory] = React.useState(false);

  const handleNotificationChange = React.useCallback((key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  }, []);

  // Fetch subscription data
  const fetchSubscriptionData = React.useCallback(async () => {
    if (!userEmail) return;
    
    setIsLoadingSubscription(true);
    try {
      const response = await fetch(API_ENDPOINTS.billing.subscription(userEmail));
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      } else {
        console.error("Failed to fetch subscription data");
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [userEmail]);

  // Fetch billing history
  const fetchBillingHistory = React.useCallback(async () => {
    if (!userEmail) return;
    
    setIsLoadingBillingHistory(true);
    try {
      const response = await fetch(API_ENDPOINTS.billing.billingHistory(userEmail));
      if (response.ok) {
        const data = await response.json();
        setBillingHistory(data);
      } else {
        console.error("Failed to fetch billing history");
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
    } finally {
      setIsLoadingBillingHistory(false);
    }
  }, [userEmail]);

  // Fetch subscription data on mount and when userData changes
  React.useEffect(() => {
    fetchSubscriptionData();
    fetchBillingHistory();
  }, [fetchSubscriptionData, fetchBillingHistory]);

  // Handle cancel subscription
  const handleCancelSubscription = React.useCallback(async (cancelImmediately: boolean = false) => {
    if (!userEmail) return;
    
    setIsCancelling(true);
    setCancelError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.billing.cancelSubscription(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, cancelImmediately }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh subscription data
        await fetchSubscriptionData();
        setIsCancelDialogOpen(false);
        alert(cancelImmediately 
          ? "Your subscription has been cancelled immediately." 
          : "Your subscription will be cancelled at the end of the billing period. You'll continue to have access until then.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setCancelError(errorData.error || "Failed to cancel subscription");
      }
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsCancelling(false);
    }
  }, [userEmail, fetchSubscriptionData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#3D3D3D] border-b border-[#2D2D2D] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-8 w-8 text-[#E91E8C]" />
              <span className="text-xl text-white">PriceGuard</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-300 hidden md:block">
                Welcome back {userData?.firstName || "User"}!
              </span>
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white hover:bg-[#2D2D2D]"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <Card className="mb-8 border-[#E91E8C] bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl text-gray-700">
                  Welcome to Your PriceGuard Dashboard{userData?.firstName ? `, ${userData.firstName}` : ""}!
                </h2>
                <p className="text-gray-600">
                  Start by adding products to monitor, and we'll automatically track price changes for the next 30 days.
                </p>
              </div>
              <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#E91E8C] hover:bg-[#D11A7C] whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Product to Monitor</DialogTitle>
                    <DialogDescription>
                      Enter the details of the product you want to track for price changes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Help Section - Finding Product ID */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-900">
                        <div className="space-y-2">
                          <p className="font-medium">How to find your Product ID on Costco.com:</p>
                          <Button
                            variant="link"
                            className="text-blue-600 p-0 h-auto"
                            onClick={() => setShowProductIdHelp(!showProductIdHelp)}
                          >
                            {showProductIdHelp ? "Hide" : "Show"} step-by-step guide
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {showProductIdHelp && (
                      <Card className="bg-gray-50">
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                1
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">Go to Costco.com and find your product</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                2
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">Look at the URL in your browser. The Product ID is the number after "product/"</p>
                                <p className="text-xs text-gray-600 mt-1">Example: costco.com/product/123456 → Product ID is 123456</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                3
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">Or scroll down on the product page to find the Item Number</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Screenshot Placeholder */}
                          <div className="mt-4 border rounded-lg overflow-hidden">
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1636247499742-acfa31ac2b12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3N0Y28lMjB3ZWJzaXRlJTIwc2NyZWVuc2hvdHxlbnwxfHx8fDE3NjAzODgxNzh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                              alt="How to find product ID on Costco.com"
                              className="w-full h-48 object-cover"
                            />
                            <div className="bg-gray-100 p-2 text-center text-xs text-gray-600">
                              Screenshot: Product ID location on Costco.com
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div>
                      <Label htmlFor="productNameWelcome">Product Name</Label>
                      <Input id="productNameWelcome" placeholder="e.g., Samsung 65 inch TV" />
                      <p className="text-xs text-gray-500 mt-1">Enter the exact name as shown on Costco.com</p>
                    </div>

                    <div>
                      <Label htmlFor="productId">
                        Product ID (Item Number)
                        <HelpCircle 
                          className="inline h-3 w-3 ml-1 text-gray-400 cursor-pointer" 
                          onClick={() => setShowProductIdHelp(!showProductIdHelp)}
                        />
                      </Label>
                      <Input id="productId" placeholder="e.g., 123456" />
                      <p className="text-xs text-gray-500 mt-1">This helps us track the exact product you purchased</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="purchasePriceWelcome">Purchase Price</Label>
                        <Input id="purchasePriceWelcome" type="number" placeholder="899.99" step="0.01" />
                        <p className="text-xs text-gray-500 mt-1">The price you paid (check your receipt)</p>
                      </div>
                      <div>
                        <Label htmlFor="purchaseDateWelcome">Purchase Date</Label>
                        <Input id="purchaseDateWelcome" type="date" />
                        <p className="text-xs text-gray-500 mt-1">When you bought the item</p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="categoryWelcome">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="groceries">Groceries</SelectItem>
                          <SelectItem value="home">Home & Garden</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">This helps organize your products</p>
                    </div>
                    <div>
                      <Label htmlFor="receiptUploadWelcome">Upload Receipt (Optional)</Label>
                      <Input id="receiptUploadWelcome" type="file" accept="image/*" />
                      <p className="text-xs text-gray-500 mt-1">Take a clear photo of your receipt - we'll extract the details automatically</p>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <Button 
                        className="flex-1 bg-[#E91E8C] hover:bg-[#D11A7C]"
                        onClick={() => setIsAddProductOpen(false)}
                      >
                        Start Monitoring
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setIsAddProductOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Savings</p>
                  <p className="text-2xl text-[#E91E8C] mt-1">$1,247</p>
                  <p className="text-xs text-gray-500 mt-1">Money you got back</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#E91E8C]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Monitors</p>
                  <p className="text-2xl text-gray-700 mt-1">23</p>
                  <p className="text-xs text-gray-500 mt-1">Products being tracked</p>
                </div>
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Price Drops Found</p>
                  <p className="text-2xl text-green-600 mt-1">7</p>
                  <p className="text-xs text-gray-500 mt-1">Products with lower prices</p>
                </div>
                <Bell className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Pending Savings</p>
                  <p className="text-2xl text-green-600 mt-1">$50</p>
                  <p className="text-xs text-green-600 mt-1">Ready to claim!</p>
                </div>
                <Bell className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monitoring">Price Monitoring</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Simple Explanation */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>What is this page?</strong> This is your dashboard where you can see how much money you've saved, 
                which products are being tracked, and when the next price checks will happen.
              </AlertDescription>
            </Alert>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Savings Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Savings Over Time</CardTitle>
                  <CardDescription>This graph shows how much money you saved each month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={savingsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="savings" 
                        stroke="#E91E8C" 
                        strokeWidth={3}
                        dot={{ fill: '#E91E8C', r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    💡 Tip: The higher the line, the more you saved that month!
                  </p>
                </CardContent>
              </Card>

              {/* Savings by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Savings by Category</CardTitle>
                  <CardDescription>See which types of products saved you the most money</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    💡 Tip: Larger slices = more savings in that category!
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Money you recently got back from price drops</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { product: "Dyson V15 Vacuum", amount: 50, date: "2 days ago" },
                      { product: "AirPods Pro", amount: 30, date: "5 days ago" },
                      { product: "Kirkland Paper Towels", amount: 5, date: "1 week ago" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="text-gray-700">{item.product}</p>
                          <p className="text-sm text-gray-500">{item.date}</p>
                        </div>
                        <div className="text-green-600">+${item.amount}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Price Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Price Checks</CardTitle>
                  <CardDescription>When we'll check prices for your products next</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { product: "Samsung TV", time: "In 15 minutes", checked: "2 mins ago" },
                      { product: "Dyson Vacuum", time: "In 1 hour", checked: "5 mins ago" },
                      { product: "Olive Oil", time: "In 2 hours", checked: "1 min ago" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="text-gray-700">{item.product}</p>
                          <p className="text-sm text-gray-500">Last checked: {item.checked}</p>
                        </div>
                        <div className="text-[#E91E8C] text-sm">{item.time}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Price Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            {/* Simple Explanation */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>What is this page?</strong> Here you can see all products we're watching for you. 
                When a price drops, you'll see a green "Claim" button - click it to get your money back!
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Price Monitors</CardTitle>
                    <CardDescription>All products we're tracking for price changes (we check every hour!)</CardDescription>
                  </div>
                  <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#E91E8C] hover:bg-[#D11A7C]">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Product to Monitor</DialogTitle>
                        <DialogDescription>
                          Enter the details of the product you want to track for price changes
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Help Section */}
                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-900">
                            <div className="space-y-2">
                              <p className="font-medium">How to find your Product ID on Costco.com:</p>
                              <Button
                                variant="link"
                                className="text-blue-600 p-0 h-auto"
                                onClick={() => setShowProductIdHelp(!showProductIdHelp)}
                              >
                                {showProductIdHelp ? "Hide" : "Show"} step-by-step guide
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>

                        {showProductIdHelp && (
                          <Card className="bg-gray-50">
                            <CardContent className="p-4 space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                    1
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm">Go to Costco.com and find your product</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                    2
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm">Look at the URL in your browser. The Product ID is the number after "product/"</p>
                                    <p className="text-xs text-gray-600 mt-1">Example: costco.com/product/123456 → Product ID is 123456</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                    3
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm">Or scroll down on the product page to find the Item Number</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-4 border rounded-lg overflow-hidden">
                                <ImageWithFallback
                                  src="https://images.unsplash.com/photo-1636247499742-acfa31ac2b12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3N0Y28lMjB3ZWJzaXRlJTIwc2NyZWVuc2hvdHxlbnwxfHx8fDE3NjAzODgxNzh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                                  alt="How to find product ID on Costco.com"
                                  className="w-full h-48 object-cover"
                                />
                                <div className="bg-gray-100 p-2 text-center text-xs text-gray-600">
                                  Screenshot: Product ID location on Costco.com
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <div>
                          <Label htmlFor="productName">Product Name</Label>
                          <Input id="productName" placeholder="e.g., Samsung 65 inch TV" />
                          <p className="text-xs text-gray-500 mt-1">Enter the exact name as shown on Costco.com</p>
                        </div>

                        <div>
                          <Label htmlFor="productId">
                            Product ID (Item Number)
                            <HelpCircle 
                              className="inline h-3 w-3 ml-1 text-gray-400 cursor-pointer" 
                              onClick={() => setShowProductIdHelp(!showProductIdHelp)}
                            />
                          </Label>
                          <Input id="productId" placeholder="e.g., 123456" />
                          <p className="text-xs text-gray-500 mt-1">This helps us track the exact product you purchased</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="purchasePrice">Purchase Price</Label>
                            <Input id="purchasePrice" type="number" placeholder="899.99" step="0.01" />
                            <p className="text-xs text-gray-500 mt-1">The price you paid (check your receipt)</p>
                          </div>
                          <div>
                            <Label htmlFor="purchaseDate">Purchase Date</Label>
                            <Input id="purchaseDate" type="date" />
                            <p className="text-xs text-gray-500 mt-1">When you bought the item</p>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="electronics">Electronics</SelectItem>
                              <SelectItem value="groceries">Groceries</SelectItem>
                              <SelectItem value="home">Home & Garden</SelectItem>
                              <SelectItem value="clothing">Clothing</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">This helps organize your products</p>
                        </div>
                        <div>
                          <Label htmlFor="receiptUpload">Upload Receipt (Optional)</Label>
                          <Input id="receiptUpload" type="file" accept="image/*" />
                          <p className="text-xs text-gray-500 mt-1">Take a clear photo of your receipt - we'll extract the details automatically</p>
                        </div>
                        <div className="flex space-x-3 pt-4">
                          <Button 
                            className="flex-1 bg-[#E91E8C] hover:bg-[#D11A7C]"
                            onClick={() => setIsAddProductOpen(false)}
                          >
                            Start Monitoring
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setIsAddProductOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Understanding the Table */}
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">📋 Understanding This Table:</h4>
                    <div className="grid md:grid-cols-2 gap-2 text-xs text-yellow-800">
                      <div>• <strong>Original Price:</strong> What you paid</div>
                      <div>• <strong>Current Price:</strong> Today's price on Costco.com</div>
                      <div>• <strong>Days Left:</strong> How many days until we stop checking</div>
                      <div>• <strong>Status:</strong> Monitoring or Price Drop found!</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Original Price</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Checked</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="text-gray-700">{product.name}</p>
                              <p className="text-sm text-gray-500">Purchased {product.purchaseDate}</p>
                            </div>
                          </TableCell>
                          <TableCell>${product.originalPrice}</TableCell>
                          <TableCell>
                            <span className={product.currentPrice < product.originalPrice ? "text-green-600 font-medium" : ""}>
                              ${product.currentPrice}
                              {product.currentPrice < product.originalPrice && (
                                <span className="text-xs block">↓ Lower!</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.daysRemaining < 10 ? "destructive" : "outline"}>
                              {product.daysRemaining} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.status === "price-drop" ? (
                              <Badge className="bg-green-600">
                                💰 Price Drop! ${product.potentialSavings}
                              </Badge>
                            ) : (
                              <Badge variant="outline">👀 Monitoring</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">{product.lastChecked}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {product.status === "price-drop" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <DollarSignIcon className="h-4 w-4 mr-1" />
                                      Claim
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>How to Claim Your ${product.potentialSavings} Refund</DialogTitle>
                                      <DialogDescription>
                                        Follow these simple steps to get your money back from Costco
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-6 py-4">
                                      {/* Video Placeholder */}
                                      <div className="relative border rounded-lg overflow-hidden bg-gray-100">
                                        <ImageWithFallback
                                          src="https://images.unsplash.com/photo-1551817958-c5b51e7b4a33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWRlbyUyMHBsYXklMjB0dXRvcmlhbHxlbnwxfHx8fDE3NjAzODgxNzl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                                          alt="Video tutorial"
                                          className="w-full h-64 object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                          <div className="text-center">
                                            <Play className="h-16 w-16 text-white mx-auto mb-2" />
                                            <p className="text-white text-sm">Watch Tutorial (2:30)</p>
                                          </div>
                                        </div>
                                      </div>

                                      <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-sm text-green-900">
                                          <strong>Good news!</strong> We found that {product.name} dropped from ${product.originalPrice} to ${product.currentPrice}. 
                                          You can get ${product.potentialSavings} back!
                                        </AlertDescription>
                                      </Alert>

                                      {/* Step by Step Guide */}
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Step-by-Step Instructions</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                          <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                              1
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Go to Costco.com or your local warehouse</p>
                                              <p className="text-xs text-gray-600 mt-1">You can claim refunds online or in person at customer service</p>
                                            </div>
                                          </div>

                                          <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                              2
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Have your receipt ready</p>
                                              <p className="text-xs text-gray-600 mt-1">You'll need to show proof of purchase (original receipt or order number)</p>
                                            </div>
                                          </div>

                                          <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                              3
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Tell them you want a price adjustment</p>
                                              <p className="text-xs text-gray-600 mt-1">Say: "I'd like to request a price adjustment for this item that dropped in price"</p>
                                            </div>
                                          </div>

                                          <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#E91E8C] text-white rounded-full flex items-center justify-center">
                                              4
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">Get your money back!</p>
                                              <p className="text-xs text-gray-600 mt-1">
                                                Costco will refund the difference (${product.potentialSavings}) to your original payment method
                                              </p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {/* Screenshot Examples */}
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">What to Bring</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div className="border rounded-lg overflow-hidden">
                                              <ImageWithFallback
                                                src="https://images.unsplash.com/photo-1624641454171-586000f5cbe0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwYmFyY29kZSUyMG51bWJlcnxlbnwxfHx8fDE3NjAzODgxNzh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                                                alt="Receipt example"
                                                className="w-full h-32 object-cover"
                                              />
                                              <div className="bg-gray-100 p-2 text-center text-xs">
                                                Your original receipt
                                              </div>
                                            </div>
                                            <div className="border rounded-lg overflow-hidden">
                                              <ImageWithFallback
                                                src="https://images.unsplash.com/photo-1600492515568-8868f609511e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGVwJTIwYnklMjBzdGVwJTIwZ3VpZGV8ZW58MXx8fHwxNzYwMzQ3ODY2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                                                alt="Product details"
                                                className="w-full h-32 object-cover"
                                              />
                                              <div className="bg-gray-100 p-2 text-center text-xs">
                                                Show the new lower price
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      <div className="flex space-x-3 pt-4">
                                        <Button 
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                          onClick={() => alert(`Great! Mark as claimed for ${product.name}`)}
                                        >
                                          I've Claimed This Refund
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          className="flex-1"
                                        >
                                          Remind Me Later
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Button variant="ghost" size="icon" title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Stop tracking this product">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Simple Explanation */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>What is this page?</strong> Choose how you want us to tell you when a price drops. 
                You can get emails, text messages, or phone notifications. Turn each one on or off!
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified when we find price drops</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">How should we notify you?</h3>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-[#E91E8C]" />
                      <div>
                        <p className="text-gray-700">📧 Email Notifications</p>
                        <p className="text-sm text-gray-500">We'll send you an email when prices drop</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-[#E91E8C]" />
                      <div>
                        <p className="text-gray-700">💬 Text Messages (SMS)</p>
                        <p className="text-sm text-gray-500">Get instant text alerts on your phone</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-[#E91E8C]" />
                      <div>
                        <p className="text-gray-700">🔔 Push Notifications</p>
                        <p className="text-sm text-gray-500">Pop-up alerts on your phone or computer</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>
                </div>

                {/* Primary Channel */}
                <div className="space-y-3">
                  <Label>Which one is most important to you?</Label>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="sms">💬 Text Message</SelectItem>
                      <SelectItem value="push">🔔 Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    We'll always use this method for important updates
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Your Contact Information</h3>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="john@example.com" />
                    <p className="text-xs text-gray-500 mt-1">We'll send price drop alerts here</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (for texts)</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                    <p className="text-xs text-gray-500 mt-1">Include your area code</p>
                  </div>
                </div>

                <Button className="bg-[#E91E8C] hover:bg-[#D11A7C]">
                  Save My Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Settings Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Simple Explanation */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>What is this page?</strong> Manage your payment cards, update your personal information, 
                and change your subscription plan. This is where you control your PriceGuard account.
              </AlertDescription>
            </Alert>

            {/* Billing & Payment Methods - Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Payment Method Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Payment Method</CardTitle>
                  <CardDescription>Your saved card for subscription payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionData?.cardLast4 ? (
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-gray-700 font-medium">Card ending in {subscriptionData.cardLast4}</p>
                            <p className="text-sm text-gray-500">Stored securely with Stripe</p>
                          </div>
                        </div>
                        <Badge variant={subscriptionData.pastDue ? "destructive" : "secondary"}>
                          {subscriptionData.pastDue ? "Past Due" : "Active"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        💳 Your card information is securely encrypted and never shared with PriceGuard. All payments are processed by Stripe.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                      <p className="text-sm text-gray-700">
                        No payment method on file. Please add a card using the form on the right.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add/Update Card Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add or Update Card</CardTitle>
                  <CardDescription>Use Stripe to securely save your payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <BillingCardForm
                    email={userEmail}
                    plan={subscriptionData?.plan || userData?.plan}
                    onCompleted={() => {
                      // Refresh subscription data after card is saved
                      fetchSubscriptionData();
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your name, email, and Costco membership details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accountEmail">Email Address</Label>
                  <Input id="accountEmail" type="email" defaultValue="john@example.com" />
                  <p className="text-xs text-gray-500 mt-1">This is your login email</p>
                </div>
                <div>
                  <Label htmlFor="costcoMembership">Costco Membership Number</Label>
                  <Input id="costcoMembership" defaultValue="1234567890123456" placeholder="16-digit number" />
                  <p className="text-xs text-gray-500 mt-1">Found on the back of your Costco membership card</p>
                </div>
                <Button className="bg-[#E91E8C] hover:bg-[#D11A7C]">
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Costco Account Connection */}
            <Card>
              <CardHeader>
                <CardTitle>Costco Account Connection</CardTitle>
                <CardDescription>Link your Costco.com account for automatic purchase tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>Why connect your account?</strong> We can automatically track all your Costco.com purchases 
                    without you having to upload receipts manually. Your credentials are encrypted and secure.
                  </AlertDescription>
                </Alert>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <HelpCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-900">
                    <strong>Security Note:</strong> Your Costco credentials are stored with bank-level encryption. 
                    We only use read-only access to view your orders - we cannot make purchases or changes to your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="costcoEmail">Costco.com Email</Label>
                    <Input id="costcoEmail" type="email" placeholder="your.email@example.com" />
                    <p className="text-xs text-gray-500 mt-1">The email you use to login to Costco.com</p>
                  </div>
                  <div>
                    <Label htmlFor="costcoPassword">Costco.com Password</Label>
                    <Input id="costcoPassword" type="password" placeholder="••••••••" />
                    <p className="text-xs text-gray-500 mt-1">Your password is encrypted and never stored in plain text</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-xs text-gray-600">
                    <p className="font-medium text-gray-700">🔒 Security Features:</p>
                    <p>• 256-bit AES encryption for all credentials</p>
                    <p>• Read-only access - we cannot make purchases</p>
                    <p>• Two-factor authentication supported</p>
                    <p>• You can disconnect at any time</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="costcoTerms" className="rounded border-gray-300" />
                    <Label htmlFor="costcoTerms" className="text-sm text-gray-600">
                      I authorize PriceGuard to access my Costco account for price monitoring purposes only
                    </Label>
                  </div>

                  <Button className="bg-[#E91E8C] hover:bg-[#D11A7C] w-full">
                    Connect Costco Account
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    💡 Don't have a Costco.com account? You can still use PriceGuard by uploading receipts manually
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader>
                <CardTitle>Your Subscription Plan</CardTitle>
                <CardDescription>Manage your PriceGuard membership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingSubscription ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Loading subscription information...</p>
                  </div>
                ) : subscriptionData ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                      <div>
                        <p className="text-gray-700 font-medium capitalize">{subscriptionData.plan} Plan</p>
                        <p className="text-sm text-gray-600">
                          {subscriptionData.subscriptionStatus === 'active' || subscriptionData.subscriptionStatus === 'trialing' 
                            ? '$29.99/month' 
                            : 'No active subscription'}
                        </p>
                        {subscriptionData.subscriptionStatus && (
                          <p className="text-xs text-gray-500 mt-1">
                            Status: <span className="capitalize">{subscriptionData.subscriptionStatus}</span>
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={
                          subscriptionData.subscriptionStatus === 'active' || subscriptionData.subscriptionStatus === 'trialing' 
                            ? 'default' 
                            : subscriptionData.subscriptionStatus === 'canceled' || subscriptionData.subscriptionStatus === 'past_due'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className={
                          subscriptionData.subscriptionStatus === 'active' || subscriptionData.subscriptionStatus === 'trialing'
                            ? 'bg-[#E91E8C]'
                            : ''
                        }
                      >
                        {subscriptionData.subscriptionStatus === 'active' || subscriptionData.subscriptionStatus === 'trialing' 
                          ? 'Active' 
                          : subscriptionData.subscriptionStatus === 'canceled'
                          ? 'Cancelled'
                          : subscriptionData.subscriptionStatus === 'past_due'
                          ? 'Past Due'
                          : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium text-gray-700 mb-2">What's included:</p>
                      <p>✅ Unlimited product monitoring</p>
                      <p>✅ Detailed savings dashboard & analytics</p>
                      <p>✅ Watchlist for favorite items</p>
                      <p>✅ Price drop predictions</p>
                      <p>✅ Priority customer support</p>
                    </div>
                    {subscriptionData.subscriptionStatus === 'active' || subscriptionData.subscriptionStatus === 'trialing' ? (
                      <div className="flex space-x-3">
                        <Button variant="outline" className="flex-1" disabled>Change Plan</Button>
                        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                              Cancel Subscription
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Cancel Subscription</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to cancel your subscription? You'll lose access to all premium features.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {cancelError && (
                                <Alert variant="destructive">
                                  <AlertDescription>{cancelError}</AlertDescription>
                                </Alert>
                              )}
                              <p className="text-sm text-gray-600">
                                Choose how you want to cancel:
                              </p>
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleCancelSubscription(false)}
                                  disabled={isCancelling}
                                >
                                  Cancel at Period End
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Keep access until end of billing period)
                                  </span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => handleCancelSubscription(true)}
                                  disabled={isCancelling}
                                >
                                  Cancel Immediately
                                  <span className="text-xs ml-2">
                                    (Access ends immediately)
                                  </span>
                                </Button>
                              </div>
                              {isCancelling && (
                                <p className="text-sm text-gray-500 text-center">
                                  Cancelling subscription...
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {subscriptionData.subscriptionStatus === 'canceled' 
                            ? 'Your subscription has been cancelled. Reactivate by adding a payment method and creating a new subscription.'
                            : 'No active subscription. Add a payment method above to start a subscription.'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No subscription information available.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your invoices and payments from the last 12 months</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingBillingHistory ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Loading billing history...</p>
                  </div>
                ) : billingHistory && billingHistory.transactions.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Total billed in last 12 months</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          ${billingHistory.totalAmount.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-gray-500">
                            {billingHistory.processedCount} {billingHistory.processedCount === 1 ? 'processed' : 'processed'}
                          </p>
                          {billingHistory.processingCount > 0 && (
                            <p className="text-xs text-orange-600 font-medium">
                              {billingHistory.processingCount} {billingHistory.processingCount === 1 ? 'processing' : 'processing'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Recent Transactions</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {billingHistory.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                              transaction.isProcessing ? 'bg-orange-50 border-orange-200' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.transactionNumber || `${transaction.type === 'invoice' ? 'Invoice' : transaction.type === 'payment_intent' ? 'Payment' : 'Charge'} ${transaction.id.slice(0, 8)}`}
                                </p>
                                <Badge
                                  variant={
                                    transaction.status === 'paid' || transaction.status === 'succeeded'
                                      ? 'default'
                                      : transaction.isProcessing
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                  className={
                                    transaction.status === 'paid' || transaction.status === 'succeeded'
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : transaction.isProcessing
                                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                                      : ''
                                  }
                                >
                                  {transaction.status === 'paid' || transaction.status === 'succeeded'
                                    ? 'Processed'
                                    : transaction.status === 'open' || transaction.status === 'processing' || transaction.status === 'pending'
                                    ? 'Processing'
                                    : transaction.status === 'requires_action' || transaction.status === 'requires_payment_method'
                                    ? 'Action Required'
                                    : transaction.status === 'void' || transaction.status === 'canceled'
                                    ? 'Cancelled'
                                    : transaction.status === 'failed'
                                    ? 'Failed'
                                    : transaction.status === 'refunded'
                                    ? 'Refunded'
                                    : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                </Badge>
                                {transaction.type !== 'invoice' && (
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.type === 'payment_intent' ? 'Payment' : 'Charge'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(transaction.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{transaction.description}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                  ${transaction.amount.toFixed(2)} {transaction.currency}
                                </p>
                                {transaction.isProcessing && (
                                  <p className="text-xs text-orange-600 mt-1">Processing...</p>
                                )}
                              </div>
                              {(transaction.hostedInvoiceUrl || transaction.invoicePdf) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(transaction.hostedInvoiceUrl || transaction.invoicePdf || '', '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No billing history found for the last 12 months.</p>
                  </div>
                )}
                {billingHistory && billingHistory.processingCount > 0 && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <Info className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm text-orange-900">
                      You have {billingHistory.processingCount} {billingHistory.processingCount === 1 ? 'transaction' : 'transactions'} currently processing. 
                      These will appear as processed once payment is completed.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
