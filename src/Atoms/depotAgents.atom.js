import { atom } from "recoil";

export const DEFAULT_DEPOT_AGENTS = [];

export const DepotAgentsList = atom({
  key: "DepotAgentsList",
  default: [],
});
