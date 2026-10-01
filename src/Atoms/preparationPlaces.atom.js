import { atom } from "recoil";

export const REAL_DEFAULT_DEPOTS = [
  {
    id: 1,
    name: "Dépôt Tunis",
    code: "DEP-TUNIS",
    address: "Zone Industrielle Charguia 1, 2035 Tunis",
    phone: "+216 71 800 100",
    isActive: true,
    remark: "Centre principal de tri et de stockage - Grand Tunis",
  },
  {
    id: 2,
    name: "Dépôt Sousse",
    code: "DEP-SOUSSE",
    address: "Route de Ceinture, Z.I Akouda, 4022 Sousse",
    phone: "+216 73 500 200",
    isActive: true,
    remark: "Centre régional de stockage et distribution Sahel",
  },
];

export const preparationPlacesState = atom({
  key: "preparationPlacesState",
  default: REAL_DEFAULT_DEPOTS,
});
