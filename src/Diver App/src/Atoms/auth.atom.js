import { atom } from "recoil";
export const isLogged = atom({
  key: "isLogged", // unique ID (with respect to other atoms/selectors)
  default: false, // default value (aka initial value)
});
