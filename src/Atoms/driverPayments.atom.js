import { atom } from "recoil";

export const DEFAULT_DRIVER_PAYMENTS = [
  {
    id: 1,
    driverId: 1,
    amount: 120.0,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    comment: "Règlement hebdomadaire commissions tournées Grand Tunis",
    deliveryId: null,
  },
  {
    id: 2,
    driverId: 2,
    amount: 85.5,
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    comment: "Avance sur commissions Sahel & Sousse",
    deliveryId: null,
  },
  {
    id: 3,
    driverId: 1,
    amount: 45.0,
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    comment: "Prime rapidité livraison express",
    deliveryId: null,
  },
];

export const driverPaymentsState = atom({
  key: "driverPaymentsState",
  default: DEFAULT_DRIVER_PAYMENTS,
});
