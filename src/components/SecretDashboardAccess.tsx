import { useSecretDashboardAccess } from "@/hooks/useSecretDashboardAccess";

/**
 * Secret Dashboard Access Component
 *
 * Hidden access methods to the dashboard, all handled by document-level
 * listeners in the hook:
 * 1. Top-left corner clicks (5 within 3 seconds)
 * 2. Keyboard shortcut (Shift + D, outside of text fields)
 * 3. Mobile triple-tap (top-left corner)
 *
 * Renders nothing. An earlier version mounted an invisible 96px hit box over
 * the corner at z-9999, which swallowed every click on the nav logo and on the
 * map's Exit button underneath it.
 */
export const SecretDashboardAccess = () => {
  useSecretDashboardAccess();
  return null;
};
