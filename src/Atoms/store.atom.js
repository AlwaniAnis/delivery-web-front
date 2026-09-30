import { atom } from "recoil";
export const MyStore = atom({
  key: "MyStore", // unique ID (with respect to other atoms/selectors)
  default: {}, // default value (aka initial value)
});
