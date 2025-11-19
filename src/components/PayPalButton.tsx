import React from "react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { API_ENDPOINTS } from "../config/api";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: any) => void;
        onCancel: (data: any) => void;
      }) => {
        render: (container: string) => void;
      };
      Subscription: {
        render: (options: {
          planId: string;
          style: Record<string, any>;
          createSubscription: () => Promise<string>;
          onApprove: (data: { subscriptionID: string }) => Promise<void>;
          onError: (err: any) => void;
          onCancel: (data: any) => void;
        }, container: string) => void;
      };
    };
  }
}

interface PayPalButtonProps {
  email: string;
  amount?: number; // For one-time payments (micropayments)
  planId?: string; // For subscriptions
  currency?: string;
  description?: string;
  onCompleted?: () => void;
  onError?: (error: string) => void;
}

/**
 * PayPalButton Component
 * 
 * Supports both:
 * - One-time payments (micropayments) using PayPal Orders API
 * - Subscriptions using PayPal Subscriptions API
 * 
 * The component loads PayPal's JavaScript SDK and renders a PayPal button.
 * Payments are processed entirely through PayPal - no card data touches your backend.
 */
export const PayPalButton: React.FC<PayPalButtonProps> = ({
  email,
  amount,
  planId,
  currency = "USD",
  description,
  onCompleted,
  onError,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = React.useState(false);
  const buttonContainerRef = React.useRef<HTMLDivElement>(null);

  // Load PayPal SDK with Expanded Checkout enabled
  React.useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    
    // Check if Client ID is configured
    if (!clientId) {
      setError("PayPal Client ID is not configured. Please set VITE_PAYPAL_CLIENT_ID in your .env file.");
      setIsLoading(false);
      return;
    }

    // Validate Client ID format (should start with sb- for sandbox or live- for production)
    if (!clientId.startsWith("sb-") && !clientId.startsWith("live-") && !clientId.startsWith("A")) {
      console.warn("[paypal] Client ID format may be incorrect. Expected format: sb-... or live-...");
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="paypal.com/sdk"]`);
    if (existingScript) {
      // Script already loaded, check if PayPal is available
      if (window.paypal) {
        setPaypalLoaded(true);
        setIsLoading(false);
        return;
      }
    }

    // Remove any existing PayPal scripts first
    const existingScripts = document.querySelectorAll(`script[src*="paypal.com/sdk"]`);
    existingScripts.forEach((s) => s.remove());

    const script = document.createElement("script");
    // Start with minimal parameters to test if basic loading works
    // URL encode the client ID to handle special characters
    const encodedClientId = encodeURIComponent(clientId);
    
    // Try simpler URL first - if this works, we can add more parameters
    const scriptUrl = `https://www.paypal.com/sdk/js?client-id=${encodedClientId}&currency=${currency}`;
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = false;
    // Remove crossOrigin - it might be causing CORS issues
    // script.crossOrigin = "anonymous";
    
    console.log("[paypal] Loading SDK from:", scriptUrl);
    console.log("[paypal] Client ID (first 30 chars):", clientId.substring(0, 30));
    console.log("[paypal] Encoded Client ID (first 30 chars):", encodedClientId.substring(0, 30));
    
    script.onload = () => {
      console.log("[paypal] Script onload fired");
      // Wait a bit longer and check multiple times
      let attempts = 0;
      const checkPayPal = setInterval(() => {
        attempts++;
        if (window.paypal) {
          clearInterval(checkPayPal);
          setPaypalLoaded(true);
          setIsLoading(false);
          console.log("[paypal] SDK loaded successfully, window.paypal is available");
        } else if (attempts > 20) {
          // After 2 seconds (20 * 100ms), give up
          clearInterval(checkPayPal);
          setError("PayPal SDK script loaded but window.paypal is not available after 2 seconds. This might indicate a Client ID issue or PayPal SDK error.");
          setIsLoading(false);
          console.error("[paypal] window.paypal not available after script load");
        }
      }, 100);
    };
    
    script.onerror = (err) => {
      const errorDetails = {
        error: err,
        scriptUrl: scriptUrl,
        clientId: clientId ? `${clientId.substring(0, 20)}...` : "NOT SET",
        networkStatus: navigator.onLine ? "Online" : "Offline",
        userAgent: navigator.userAgent,
      };
      
      console.error("[paypal] Failed to load SDK - Full error details:", errorDetails);
      console.error("[paypal] Script element:", script);
      console.error("[paypal] Script src:", script.src);
      
      // Try a completely minimal test URL
      console.log("[paypal] Attempting diagnostic test...");
      const testUrl = `https://www.paypal.com/sdk/js?client-id=${encodedClientId}`;
      console.log("[paypal] Test URL:", testUrl);
      
      // Try fetching the URL to see what error we get
      fetch(testUrl, { method: "HEAD", mode: "no-cors" })
        .then(() => {
          console.log("[paypal] Diagnostic: URL is reachable via fetch");
        })
        .catch((fetchErr) => {
          console.error("[paypal] Diagnostic: Fetch failed:", fetchErr);
        });
      
      let errorMessage = "Failed to load PayPal SDK. ";
      
      if (!clientId) {
        errorMessage = "PayPal Client ID is not configured. Please set VITE_PAYPAL_CLIENT_ID in your .env file and restart the frontend server.";
      } else if (!navigator.onLine) {
        errorMessage = "No internet connection detected. Please check your network connection.";
      } else {
        errorMessage = `Failed to load PayPal SDK. 

Possible causes:
• Invalid Client ID (verify in PayPal Developer Dashboard)
• Network/firewall blocking PayPal
• Ad blocker blocking scripts
• Browser security settings

Quick fixes:
1. Restart frontend: npm run dev
2. Clear browser cache (Ctrl+Shift+R)
3. Try incognito/private mode
4. Disable ad blocker
5. Check browser console for detailed errors

Client ID: ${clientId.substring(0, 30)}...`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script when component unmounts
      const scriptToRemove = document.querySelector(`script[src*="paypal.com/sdk"]`);
      if (scriptToRemove && scriptToRemove === script) {
        document.body.removeChild(scriptToRemove);
      }
    };
  }, [currency]);

  // Render PayPal button
  React.useEffect(() => {
    if (!paypalLoaded || !window.paypal || !buttonContainerRef.current) {
      return;
    }

    // Clear any existing buttons
    buttonContainerRef.current.innerHTML = "";

    try {
      if (planId) {
        // Subscription flow
        window.paypal.Subscription.render(
          {
            planId: planId,
            style: {
              label: "subscribe",
              layout: "vertical",
              color: "gold",
              shape: "rect",
            },
            createSubscription: async () => {
              try {
                const response = await fetch(API_ENDPOINTS.paypal.createSubscription(), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, planId }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || "Failed to create subscription");
                }

                const data = await response.json();
                
                // Find approval link
                const approvalLink = data.links?.find(
                  (link: { rel: string; href: string }) => link.rel === "approve"
                );

                if (!approvalLink) {
                  throw new Error("No approval link found");
                }

                // Redirect to PayPal approval page
                window.location.href = approvalLink.href;

                // Return subscription ID (this might not be used if redirecting)
                return data.subscriptionId;
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to create subscription";
                setError(errorMessage);
                onError?.(errorMessage);
                throw err;
              }
            },
            onApprove: async (data) => {
              try {
                console.log("[paypal] Subscription approved:", data.subscriptionID);
                setError(null);
                onCompleted?.();
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to approve subscription";
                setError(errorMessage);
                onError?.(errorMessage);
              }
            },
            onError: (err) => {
              console.error("[paypal] Subscription error:", err);
              const errorMessage = err?.message || "An error occurred during PayPal subscription";
              setError(errorMessage);
              onError?.(errorMessage);
            },
            onCancel: (data) => {
              console.log("[paypal] Subscription cancelled:", data);
              setError(null); // Don't show error for user cancellation
            },
          },
          buttonContainerRef.current
        );
      } else if (amount) {
        // One-time payment flow (micropayments)
        window.paypal.Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
          },
          createOrder: async () => {
            try {
              const response = await fetch(API_ENDPOINTS.paypal.createOrder(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  amount,
                  currency,
                  description: description || "PriceGuard payment",
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to create order");
              }

              const data = await response.json();
              return data.orderId;
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Failed to create order";
              setError(errorMessage);
              onError?.(errorMessage);
              throw err;
            }
          },
          onApprove: async (data) => {
            try {
              // Capture the order
              const response = await fetch(API_ENDPOINTS.paypal.captureOrder(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderID,
                  email,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to capture payment");
              }

              const captureData = await response.json();
              console.log("[paypal] Payment captured:", captureData);
              setError(null);
              onCompleted?.();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Failed to capture payment";
              setError(errorMessage);
              onError?.(errorMessage);
            }
          },
          onError: (err) => {
            console.error("[paypal] Payment error:", err);
            const errorMessage = err?.message || "An error occurred during PayPal payment";
            setError(errorMessage);
            onError?.(errorMessage);
          },
          onCancel: (data) => {
            console.log("[paypal] Payment cancelled:", data);
            setError(null); // Don't show error for user cancellation
          },
        }).render(buttonContainerRef.current);
      }
    } catch (err) {
      console.error("[paypal] Error rendering PayPal button:", err);
      setError("Failed to initialize PayPal button");
      setIsLoading(false);
    }
  }, [paypalLoaded, email, amount, planId, currency, description, onCompleted, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Loading PayPal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) {
    return (
      <Alert>
        <AlertDescription>
          PayPal Client ID is not configured. Please set VITE_PAYPAL_CLIENT_ID environment variable.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full relative z-0">
      <div 
        ref={buttonContainerRef} 
        className="w-full relative z-0"
        style={{ 
          position: 'relative',
          zIndex: 0,
          isolation: 'isolate'
        }}
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        Secure payment powered by PayPal. {planId ? "You'll be redirected to PayPal to approve your subscription." : "Pay directly without leaving this page."}
      </p>
    </div>
  );
};

