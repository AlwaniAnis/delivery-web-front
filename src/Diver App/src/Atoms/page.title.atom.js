import { atom } from "recoil";
export const PageTitle = atom({
  key: "PageTitle", // unique ID (with respect to other atoms/selectors)
  default: "Mes Livraisons", // default value (aka initial value)
});
