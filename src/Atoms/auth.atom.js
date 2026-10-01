import { atom } from "recoil";

// Helper to normalize any incoming role string or value
export const normalizeRole = (role) => {
  if (!role) return "admin";
  const str = String(role).trim().toLowerCase();
  if (str === "driver" || str.includes("driver") || str.includes("livreur")) {
    return "driver";
  }
  if (
    str === "b2bclient" ||
    str === "b2b" ||
    str.includes("b2b") ||
    str.includes("boutique")
  ) {
    return "B2Bclient";
  }
  return "admin";
};

// Helper to safely load auth data from localStorage
const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed) {
      parsed.role = normalizeRole(parsed.role);
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

const initialAuth = getStoredAuth();

export const isLogged = atom({
  key: "isLogged",
  default: initialAuth && initialAuth.token ? true : false,
});

export const currentUserState = atom({
  key: "currentUserState",
  default: initialAuth || null,
});

// Controls the current active view mode: "admin" | "driver" | "B2Bclient"
export const activeRoleState = atom({
  key: "activeRoleState",
  default: normalizeRole(initialAuth?.role),
});

// When in driver mode or inspecting a driver, store the selected driverId
export const currentDriverIdState = atom({
  key: "currentDriverIdState",
  default: initialAuth?.driverId || null,
});
