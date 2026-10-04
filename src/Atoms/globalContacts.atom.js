import { atom } from "recoil";

const getStoredGlobalContacts = () => {
  try {
    const raw = localStorage.getItem("tawsil_global_contacts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const globalContactsState = atom({
  key: "globalContactsState",
  default: getStoredGlobalContacts(),
});
