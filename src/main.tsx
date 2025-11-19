
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { Elements } from "@stripe/react-stripe-js";
  import { loadStripe } from "@stripe/stripe-js";
  import { setupPayPalDebug } from "./utils/paypalDebug";

  // Setup PayPal debug utilities for browser console
  setupPayPalDebug();

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

  if (!publishableKey) {
    console.warn(
      "[stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe Elements will be disabled."
    );
  }

  const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element #root not found");
  }

  const root = createRoot(rootElement);

  if (stripePromise) {
    root.render(
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    );
  } else {
    root.render(<App />);
  }
  