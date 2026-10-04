// src/app/admin/(protected)/templates/cashfree-loader.ts
//
// Lazy-loads Cashfree Checkout.js on demand.
export default async function loadCashfree(): Promise<void> {
  if (window.Cashfree) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(script);
  });
}
