import React from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { API_ENDPOINTS } from "../config/api";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";

interface BillingCardFormProps {
  email: string;
  plan?: string;
  onCompleted?: () => void;
}

/**
 * BillingCardForm
 *
 * This component:
 * - NEVER sends raw card data (PAN/CVV/expiry) to your backend.
 * - Uses Stripe Elements in the browser so card data goes directly to Stripe.
 * - Calls your backend only to create a SetupIntent and to update metadata.
 */
export const BillingCardForm: React.FC<BillingCardFormProps> = ({
  email,
  plan,
  onCompleted,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please wait a moment and try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card input is not ready. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) Ask backend to create SetupIntent for this customer
      const response = await fetch(API_ENDPOINTS.billing.createSetupIntent(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan, priceId: undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create setup intent");
      }

      const { clientSecret } = (await response.json()) as { clientSecret: string };
      if (!clientSecret) {
        throw new Error("Setup intent client secret is missing");
      }

      // 2) Use Stripe.js to confirm card setup.
      //    Card details go directly from browser → Stripe over HTTPS.
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email,
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to confirm card setup");
      }

      if (result.setupIntent.status === "succeeded") {
        // Get the payment method ID from the confirmed SetupIntent
        // payment_method can be a string (ID) or a PaymentMethod object
        const paymentMethod = result.setupIntent.payment_method;
        const paymentMethodId = typeof paymentMethod === 'string' 
          ? paymentMethod 
          : paymentMethod?.id;
        
        if (!paymentMethodId || typeof paymentMethodId !== 'string') {
          throw new Error("Payment method ID not found in SetupIntent response");
        }

        // Save the payment method ID to the database synchronously
        // This ensures the payment method is available before creating a subscription
        try {
          const saveResponse = await fetch(API_ENDPOINTS.billing.savePaymentMethod(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, paymentMethodId }),
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to save payment method");
          }

          const saveData = await saveResponse.json();
          console.log("[billing] Payment method saved:", saveData);
          setSuccess("Your card has been securely saved with Stripe.");
        } catch (saveErr) {
          console.error("[billing] Error saving payment method:", saveErr);
          setError(`Card setup succeeded but failed to save: ${saveErr instanceof Error ? saveErr.message : "Unknown error"}`);
          setIsSubmitting(false);
          return;
        }
        
        // If a plan is provided, create a subscription after card is saved
        // This will create an actual payment/subscription in Stripe Dashboard
        if (plan && plan !== "free") {
          try {
            // Map plan names to Stripe Price IDs (you'll need to set these in Stripe Dashboard)
            const priceIdMap: Record<string, string> = {
              basic: import.meta.env.VITE_STRIPE_PRICE_BASIC || "",
              premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM || "",
              enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || "",
            };
            
            const priceId = priceIdMap[plan.toLowerCase()];
            console.log(`[billing] Attempting to create subscription for plan: ${plan}, priceId: ${priceId || "NOT SET"}`);
            
            if (priceId) {
              const subResponse = await fetch(API_ENDPOINTS.billing.createSubscription(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, priceId }),
              });
              
              if (subResponse.ok) {
                const subData = await subResponse.json();
                setSuccess("Your card has been saved and subscription created successfully! Payment processed.");
                console.log("[billing] Subscription created:", subData);
              } else {
                const errorData = await subResponse.json().catch(() => ({}));
                console.error("[billing] Subscription creation failed:", errorData);
                setError(`Card saved but subscription creation failed: ${errorData.error || "Unknown error"}`);
              }
            } else {
              console.warn(`[billing] No Price ID configured for plan: ${plan}. Set VITE_STRIPE_PRICE_${plan.toUpperCase()} environment variable.`);
              setSuccess("Your card has been saved. Subscription not created - Price ID not configured.");
            }
          } catch (subErr) {
            console.error("[billing] Error creating subscription:", subErr);
            setError(`Card saved but subscription creation failed: ${subErr instanceof Error ? subErr.message : "Unknown error"}`);
          }
        }
        
        if (onCompleted) {
          onCompleted();
        }
      } else {
        throw new Error(`Unexpected setup intent status: ${result.setupIntent.status}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while saving your card.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="card-element">Card details</Label>
        <div className="border rounded-md px-3 py-2 bg-white">
          <CardElement
            id="card-element"
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1f2933",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your card details are encrypted and sent directly to Stripe. We never see or store your full card number or CVV.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting || !stripe} className="w-full">
        {isSubmitting ? "Saving card securely..." : "Save Card"}
      </Button>
    </form>
  );
};


