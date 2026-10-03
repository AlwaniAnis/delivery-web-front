import { atom } from "recoil";

const getStoredReclamations = () => {
  try {
    const raw = localStorage.getItem("tawsil_reclamations");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const reclamationsState = atom({
  key: "reclamationsState",
  default: getStoredReclamations(),
});
