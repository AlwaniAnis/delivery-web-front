import { atom } from "recoil";

export const DEFAULT_TARIFS = [];

export const tarifsState = atom({
  key: "tarifsState",
  default: [],
});
