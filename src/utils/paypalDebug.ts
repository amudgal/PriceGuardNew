/**
 * PayPal Debug Utilities
 * 
 * These functions can be called from the browser console to debug PayPal integration.
 * 
 * Usage in browser console:
 *   window.paypalDebug.checkClientId()
 *   window.paypalDebug.testSDK()
 */

export function setupPayPalDebug() {
  if (typeof window !== 'undefined') {
    (window as any).paypalDebug = {
      checkClientId: () => {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        console.log("=== PayPal Client ID Check ===");
        console.log("Client ID:", clientId || "NOT SET");
        console.log("Length:", clientId?.length || 0);
        console.log("Starts with:", clientId?.substring(0, 3) || "N/A");
        return clientId;
      },
      
      testSDK: () => {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!clientId) {
          console.error("❌ Client ID is not set!");
          return;
        }
        
        console.log("=== Testing PayPal SDK Load ===");
        console.log("Client ID:", clientId.substring(0, 30) + "...");
        
        // Remove any existing scripts
        document.querySelectorAll('script[src*="paypal.com/sdk"]').forEach(s => s.remove());
        
        const script = document.createElement("script");
        const encodedClientId = encodeURIComponent(clientId);
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodedClientId}&currency=USD`;
        script.async = true;
        
        console.log("Loading from:", script.src.substring(0, 80) + "...");
        
        script.onload = () => {
          console.log("✅ Script loaded!");
          setTimeout(() => {
            if (window.paypal) {
              console.log("✅ window.paypal is available!");
              console.log("PayPal SDK loaded successfully!");
            } else {
              console.error("❌ Script loaded but window.paypal is NOT available");
              console.error("This usually means the Client ID is invalid");
            }
          }, 1000);
        };
        
        script.onerror = (err) => {
          console.error("❌ Script failed to load:", err);
          console.error("Possible causes:");
          console.error("1. Invalid Client ID");
          console.error("2. Network/firewall blocking");
          console.error("3. CORS issue");
        };
        
        document.body.appendChild(script);
      },
      
      checkNetwork: async () => {
        console.log("=== Testing Network Connectivity ===");
        try {
          const response = await fetch("https://www.paypal.com/sdk/js", { 
            method: "HEAD", 
            mode: "no-cors" 
          });
          console.log("✅ Can reach PayPal domain");
        } catch (error) {
          console.error("❌ Cannot reach PayPal:", error);
        }
      }
    };
    
    console.log("✅ PayPal debug utilities loaded!");
    console.log("Available commands:");
    console.log("  window.paypalDebug.checkClientId() - Check if Client ID is loaded");
    console.log("  window.paypalDebug.testSDK() - Test loading PayPal SDK");
    console.log("  window.paypalDebug.checkNetwork() - Test network connectivity");
  }
}

