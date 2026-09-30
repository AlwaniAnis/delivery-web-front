import { atom } from "recoil";
export const DriversList = atom({
  key: "DriversList", // unique ID (with respect to other atoms/selectors)
  default: [], // default value (aka initial value)
});
