const SECRET_ACCESS_KEY = "secret-dashboard-access";
export const SECRET_ACCESS_EVENT = "secret-dashboard-access-granted";

const setStorageValue = (storage: Storage | null | undefined) => {
  try {
    storage?.setItem(SECRET_ACCESS_KEY, "granted");
  } catch {
    /* ignore write errors (private mode, etc.) */
  }
};

const checkStorageValue = (storage: Storage | null | undefined) => {
  try {
    return storage?.getItem(SECRET_ACCESS_KEY) === "granted";
  } catch {
    return false;
  }
};

export const markSecretAccessGranted = () => {
  if (typeof window === "undefined") return;
  console.log("markSecretAccessGranted: Setting secret access in storage");
  setStorageValue(window.sessionStorage);
  setStorageValue(window.localStorage);
  console.log("markSecretAccessGranted: Dispatching event", SECRET_ACCESS_EVENT);
  window.dispatchEvent(new Event(SECRET_ACCESS_EVENT));
  console.log("markSecretAccessGranted: Complete. hasSecretAccess:", hasSecretAccess());
};

export const hasSecretAccess = () => {
  if (typeof window === "undefined") return false;
  const sessionHasAccess = checkStorageValue(window.sessionStorage);
  const localHasAccess = checkStorageValue(window.localStorage);
  const result = sessionHasAccess || localHasAccess;
  console.log("hasSecretAccess check: session:", sessionHasAccess, "local:", localHasAccess, "result:", result);
  return result;
};

