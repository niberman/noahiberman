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
  setStorageValue(window.sessionStorage);
  setStorageValue(window.localStorage);
  window.dispatchEvent(new Event(SECRET_ACCESS_EVENT));
};

export const hasSecretAccess = () => {
  if (typeof window === "undefined") return false;
  return (
    checkStorageValue(window.sessionStorage) ||
    checkStorageValue(window.localStorage)
  );
};

