import { atom } from "recoil";
export const StoresList = atom({
  key: "StoresList", // unique ID (with respect to other atoms/selectors)
  default: [], // default value (aka initial value)
});
