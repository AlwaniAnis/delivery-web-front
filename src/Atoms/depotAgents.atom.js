import { atom } from "recoil";

export const DEFAULT_DEPOT_AGENTS = [
  {
    id: 1,
    firstName: "Karim",
    lastName: "Ben Salem",
    cin: "09812345",
    phone1: "55 123 456",
    phone2: "71 800 100",
    email: "karim.depot@tawsil.tn",
    address: "Z.I. La Charguia II, Tunis",
    preparationPlaceId: 1,
    depotId: 1,
    isActive: true,
    userName: "karim_depot",
  },
  {
    id: 2,
    firstName: "Sami",
    lastName: "Trabelsi",
    cin: "08765432",
    phone1: "22 987 654",
    phone2: "73 200 300",
    email: "sami.sousse@tawsil.tn",
    address: "Route de Ceinture Sahloul, Sousse",
    preparationPlaceId: 2,
    depotId: 2,
    isActive: true,
    userName: "sami_depot",
  },
  {
    id: 3,
    firstName: "Nabil",
    lastName: "Kammoun",
    cin: "05432198",
    phone1: "98 333 444",
    phone2: "74 400 500",
    email: "nabil.sfax@tawsil.tn",
    address: "Z.I. Poudrière I, Sfax",
    preparationPlaceId: 3,
    depotId: 3,
    isActive: true,
    userName: "nabil_depot",
  },
];

const getInitialDepotAgents = () => {
  try {
    const saved = localStorage.getItem("tawsil_depot_agents");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_DEPOT_AGENTS;
};

export const DepotAgentsList = atom({
  key: "DepotAgentsList",
  default: getInitialDepotAgents(),
});
