import { atom } from "recoil";
export const PageTitle = atom({
  key: "PageTitle", // unique ID (with respect to other atoms/selectors)
  default: "Dashboard", // default value (aka initial value)
});
