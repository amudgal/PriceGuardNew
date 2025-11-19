import { PayPalButton } from "../components/PayPalButton";
import { useState } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { API_ENDPOINTS } from "../config/api";

export function PayPalTestPage() {
  const [email, setEmail] = useState("test@example.com");
  const [amount, setAmount] = useState("9.99");
  const [planId, setPlanId] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if account exists
  const checkAccount = async () => {
    if (!email) {
      setTestResult("❌ Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      // Try to login to check if account exists
      const response = await fetch(API_ENDPOINTS.auth.login(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "dummy", // We're just checking if account exists
        }),
      });

      if (response.status === 401) {
        // Account exists but wrong password - that's fine for our test
        setTestResult("✅ Account exists in database");
      } else if (response.status === 404) {
        setTestResult("❌ Account not found. Please register first!");
      } else {
        const data = await response.json();
        setTestResult(`✅ Account found: ${data.email}`);
      }
    } catch (error) {
      setTestResult("⚠️ Could not check account. Make sure backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PayPal Integration Test Page</CardTitle>
          <CardDescription>
            Test PayPal one-time payments and subscriptions. Make sure you've registered an account first!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Check Section */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="email">Email Address (must be registered account)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button onClick={checkAccount} disabled={isLoading} variant="outline">
                  {isLoading ? "Checking..." : "Check Account"}
                </Button>
              </div>
              {testResult && (
                <Alert className="mt-2">
                  <AlertDescription>{testResult}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* One-Time Payment Test */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">One-Time Payment Test</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test a single payment. The account must exist in your database first.
              </p>
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="9.99"
                className="mt-2"
              />
            </div>

            {email && parseFloat(amount) > 0 && (
              <div className="p-4 border rounded-lg bg-white">
                <PayPalButton
                  email={email}
                  amount={parseFloat(amount)}
                  currency="USD"
                  description={`PriceGuard test payment - $${amount}`}
                  onCompleted={() => {
                    alert("✅ Payment successful! Check your database and PayPal dashboard.");
                    console.log("✅ PayPal payment completed");
                    setTestResult("✅ Payment completed successfully!");
                  }}
                  onError={(error) => {
                    alert(`❌ Payment failed: ${error}`);
                    console.error("❌ PayPal payment error:", error);
                    setTestResult(`❌ Payment failed: ${error}`);
                  }}
                />
              </div>
            )}
          </div>

          {/* Subscription Test */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Subscription Test (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test a subscription. You need to create a PayPal Plan first and add the Plan ID below.
              </p>
            </div>

            <div>
              <Label htmlFor="planId">PayPal Plan ID (starts with P-)</Label>
              <Input
                id="planId"
                type="text"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                placeholder="P-5ML427713U1234567"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from PayPal Dashboard → Products → Subscriptions → Plans
              </p>
            </div>

            {email && planId && planId.startsWith("P-") && (
              <div className="p-4 border rounded-lg bg-white">
                <PayPalButton
                  email={email}
                  planId={planId}
                  onCompleted={() => {
                    alert("✅ Subscription created! Check your database and PayPal dashboard.");
                    console.log("✅ PayPal subscription completed");
                    setTestResult("✅ Subscription created successfully!");
                  }}
                  onError={(error) => {
                    alert(`❌ Subscription failed: ${error}`);
                    console.error("❌ PayPal subscription error:", error);
                    setTestResult(`❌ Subscription failed: ${error}`);
                  }}
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="border-t pt-6 space-y-2">
            <h4 className="font-semibold">Testing Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Make sure backend is running on port 4000</li>
              <li>Register an account first (use the signup page)</li>
              <li>Enter the registered email above</li>
              <li>Click "Check Account" to verify it exists</li>
              <li>Enter payment amount and click PayPal button</li>
              <li>Log in with PayPal Sandbox test account</li>
              <li>Complete the payment</li>
              <li>Check browser console and backend logs for confirmation</li>
            </ol>
          </div>

          {/* Debug Info */}
          <div className="border-t pt-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Debug Information
              </summary>
              <div className="mt-2 space-y-1 text-xs text-gray-600 font-mono bg-gray-50 p-3 rounded">
                <div>Email: {email || "Not set"}</div>
                <div>Amount: ${amount || "0.00"}</div>
                <div>Plan ID: {planId || "Not set"}</div>
                <div>PayPal Client ID: {import.meta.env.VITE_PAYPAL_CLIENT_ID ? "✅ Set" : "❌ Not set"}</div>
                <div>API Base URL: {import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}</div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

