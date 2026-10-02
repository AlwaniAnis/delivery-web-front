import { atom } from "recoil";

export const DEFAULT_TARIFS = [
  {
    id: 1,
    name: "Tarif Standard (Grand Tunis)",
    tarifDelivery: 7.0,
    commissionDriver: 2.5,
    remark: "Livraison standard 24h à 48h sur le Grand Tunis",
  },
  {
    id: 2,
    name: "Tarif Express / Même Jour",
    tarifDelivery: 10.0,
    commissionDriver: 4.0,
    remark: "Livraison prioritaire en moins de 4 heures",
  },
  {
    id: 3,
    name: "Tarif National / Inter-villes",
    tarifDelivery: 9.5,
    commissionDriver: 3.5,
    remark: "Livraison toutes régions hors Grand Tunis (Sahel, Sfax, Sud...)",
  },
  {
    id: 4,
    name: "Tarif Spécial Colis Lourd / Fragile",
    tarifDelivery: 14.0,
    commissionDriver: 5.0,
    remark: "Colis de plus de 10kg ou nécessitant manipulation délicate",
  },
  {
    id: 5,
    name: "Tarif Ramassage Boutique (Pickup)",
    tarifDelivery: 3.5,
    commissionDriver: 3.5,
    remark: "Ramassage colis depuis le magasin expéditeur vers le dépôt",
  },
];

export const tarifsState = atom({
  key: "tarifsState",
  default: DEFAULT_TARIFS,
});
