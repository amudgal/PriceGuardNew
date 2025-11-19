import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";

export function PayPalDiagnostic() {
  const [results, setResults] = useState<Array<{ test: string; status: "pass" | "fail" | "pending"; message: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: "pass" | "fail" | "pending", message: string) => {
    setResults((prev) => [...prev, { test, status, message }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

    // Test 1: Check if Client ID is set
    addResult("Client ID Check", clientId ? "pass" : "fail", clientId ? `Client ID found: ${clientId.substring(0, 20)}...` : "VITE_PAYPAL_CLIENT_ID is not set");

    if (!clientId) {
      setIsRunning(false);
      return;
    }

    // Test 2: Check network connectivity
    try {
      const response = await fetch("https://www.paypal.com/sdk/js", { method: "HEAD", mode: "no-cors" });
      addResult("Network Connectivity", "pass", "Can reach PayPal domain");
    } catch (error) {
      addResult("Network Connectivity", "fail", `Cannot reach PayPal: ${error}`);
    }

    // Test 3: Test simple SDK URL
    try {
      const testUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
      const response = await fetch(testUrl, { method: "HEAD", mode: "no-cors" });
      addResult("SDK URL Test", "pass", "SDK URL is accessible");
    } catch (error) {
      addResult("SDK URL Test", "fail", `SDK URL failed: ${error}`);
    }

    // Test 4: Try loading script manually
    addResult("Manual Script Load", "pending", "Testing...");
    return new Promise<void>((resolve) => {
      const script = document.createElement("script");
      const encodedClientId = encodeURIComponent(clientId);
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodedClientId}&currency=USD`;
      script.async = true;
      script.crossOrigin = "anonymous";

      const timeout = setTimeout(() => {
        addResult("Manual Script Load", "fail", "Script load timed out after 10 seconds");
        document.body.removeChild(script);
        setIsRunning(false);
        resolve();
      }, 10000);

      script.onload = () => {
        clearTimeout(timeout);
        setTimeout(() => {
          if (window.paypal) {
            addResult("Manual Script Load", "pass", "Script loaded and window.paypal is available");
            addResult("PayPal Object", "pass", `PayPal SDK version: ${window.paypal?.version || "unknown"}`);
          } else {
            addResult("Manual Script Load", "fail", "Script loaded but window.paypal is not available");
          }
          document.body.removeChild(script);
          setIsRunning(false);
          resolve();
        }, 500);
      };

      script.onerror = (err) => {
        clearTimeout(timeout);
        addResult("Manual Script Load", "fail", `Script failed to load: ${err}`);
        setIsRunning(false);
        resolve();
      };

      document.body.appendChild(script);
    });
  };

  return (
    <div className="container mx-auto max-w-3xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>PayPal SDK Diagnostic Tool</CardTitle>
          <CardDescription>
            This tool will test your PayPal integration and identify any issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
            {isRunning ? "Running Diagnostics..." : "Run Diagnostics"}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {results.map((result, index) => (
                <Alert
                  key={index}
                  variant={result.status === "pass" ? "default" : result.status === "fail" ? "destructive" : "default"}
                  className={result.status === "pass" ? "bg-green-50 border-green-200" : result.status === "fail" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}
                >
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.test}</span>
                      <span className="text-xs">
                        {result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⏳"}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Environment Info:</h4>
            <div className="text-sm space-y-1 font-mono bg-gray-50 p-3 rounded">
              <div>Client ID: {import.meta.env.VITE_PAYPAL_CLIENT_ID ? `${import.meta.env.VITE_PAYPAL_CLIENT_ID.substring(0, 30)}...` : "NOT SET"}</div>
              <div>User Agent: {navigator.userAgent.substring(0, 50)}...</div>
              <div>Online: {navigator.onLine ? "Yes" : "No"}</div>
              <div>Protocol: {window.location.protocol}</div>
              <div>Host: {window.location.host}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

