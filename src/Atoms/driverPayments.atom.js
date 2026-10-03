import { atom } from "recoil";

export const DEFAULT_DRIVER_PAYMENTS = [];

export const driverPaymentsState = atom({
  key: "driverPaymentsState",
  default: [],
});
