import { atom } from "recoil";

export const REAL_DEFAULT_DEPOTS = [];

export const preparationPlacesState = atom({
  key: "preparationPlacesState",
  default: [],
});
