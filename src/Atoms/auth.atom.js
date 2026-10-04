import { atom } from "recoil";

// Helper to normalize any incoming role string or value
export const normalizeRole = (role) => {
  if (!role) return "admin";
  const str = String(role).trim().toLowerCase();
  if (
    str === "depotagent" ||
    str === "agentdepot" ||
    str === "agent_depot" ||
    str.includes("depot") ||
    str.includes("agent")
  ) {
    return "depotAgent";
  }
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
      parsed.role = normalizeRole(parsed.role || parsed.position);
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

// Controls the current active view mode: "admin" | "driver" | "B2Bclient" | "depotAgent"
export const activeRoleState = atom({
  key: "activeRoleState",
  default: normalizeRole(initialAuth?.role || initialAuth?.position),
});

// When in driver mode or inspecting a driver, store the selected driverId
export const currentDriverIdState = atom({
  key: "currentDriverIdState",
  default: initialAuth?.driverId || null,
});

// When in depotAgent mode, store the assigned depot / preparationPlaceId
export const currentDepotIdState = atom({
  key: "currentDepotIdState",
  default: initialAuth?.preparationPlaceId || initialAuth?.depotId || 1,
});

// Controls which of the 2 Admin modules is active when logged in as Admin:
// "administration" = Module 1: Global Administration (Accounts, Tarifs, Global Dashboard, All Deliveries, All Recaps, All Reclamations)
// "store" = Module 2: Notre Boutique (Behaves like a normal store: its own deliveries, add/manage them, its own dashboard, its own reclamations, its own recap)
export const adminModuleState = atom({
  key: "adminModuleState",
  default: localStorage.getItem("tawsil_admin_module") || "administration",
});

