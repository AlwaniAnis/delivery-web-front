import { atom } from "recoil";
import CustomerModel from "../Models/CustomerModel";

export const CustomerState = atom({
  key: "CustomerState", // unique ID (with respect to other atoms/selectors)
  default: new CustomerModel(), // default value (aka initial value)
});
