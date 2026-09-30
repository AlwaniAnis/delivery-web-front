import { atom } from "recoil";
export const exportAddAtom = atom({
  key: "exportAddAtom", // unique ID (with respect to other atoms/selectors)
  default: { loading: false, error: "", open: false }, // default value (aka initial value)
});
