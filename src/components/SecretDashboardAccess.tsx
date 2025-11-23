import { useSecretDashboardAccess } from "@/hooks/useSecretDashboardAccess";

/**
 * Secret Dashboard Access Component
 * 
 * This component provides hidden access methods to the dashboard:
 * 1. Invisible click zone (5 clicks within 3 seconds)
 * 2. Keyboard shortcut (Shift + D)
 * 3. Mobile triple-tap (top-left corner)
 * 
 * No visible UI - purely functional for secret access.
 */
export const SecretDashboardAccess = () => {
  useSecretDashboardAccess();

  return (
    <>
      {/* Invisible full-screen click zone for secret access */}
      <div
        data-secret-zone
        className="fixed inset-0 opacity-0 pointer-events-auto z-[9999]"
        style={{
          cursor: "default",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-hidden="true"
      />
    </>
  );
};

