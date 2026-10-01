import { atom } from "recoil";

// Helper to safely load auth data from localStorage
const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    return JSON.parse(raw);
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
  default:
    initialAuth?.role === "driver"
      ? "driver"
      : initialAuth?.role === "B2Bclient"
      ? "B2Bclient"
      : "admin",
});

// When in driver mode or inspecting a driver, store the selected driverId
export const currentDriverIdState = atom({
  key: "currentDriverIdState",
  default: initialAuth?.driverId || null,
});
