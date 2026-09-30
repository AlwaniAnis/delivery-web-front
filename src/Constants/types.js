export const clientTypes = [
  { label: "B2B", value: 1 },
  { label: "B2C", value: 2 },
];
// _________________________________________________________________________

export const ConfirmationStatus = [
  { label: "En Attente", value: 1 },
  { label: "Non Confirmé Par Client", value: 2 },
  { label: "Confirmé", value: 3 },
  { label: "Refusé", value: 4 },
];

export const dateTypes = [
  { label: "Aujourd'hui", value: 1 },
  { label: "Hier", value: 2 },
  // { label: "Cette semaine", value: 3 },
  // { label: "la semaine dernière", value: 4 },
  { label: "Ce mois", value: 3 },
  { label: "Le mois dernier", value: 4 },
  { label: "Cette année", value: 5 },
  { label: "Personnalisé", value: 6 },
  { label: "Jour", value: 7 },
];

export const transactionEvents = [
  { label: "Vente", value: 1 },
  { label: "Recouvrement", value: 2 },
  { label: "Annulation", value: 3 },
  { label: "Remboursement", value: 4 },
  { label: "Service", value: 5 },
  { label: "Garaantie", value: 6 },
];
export const paymentType = [
  { label: "Chéque", value: 1 },
  { label: "Espèces ", value: 2 },
  { label: "Solde", value: 3 },
  // { label: "CCA", value: 4 },
  // { label: "Versement", value: 5 }, // chechout
  { label: "Virement Bancaire", value: 4 },
];

export const SaleStatus = [
  { label: "Non Payé", value: 1 },
  { label: "Payé en Partie", value: 2 },
  { label: "En Attente", value: 3 },
  { label: "Payé", value: 4 },
  { label: "Remboursé", value: 5 },
  { label: "Annulé", value: 6 },
  { label: "Confirmé", value: 7 },
];

// ---------------------------------------------------------------------------
export const dateFilter = [
  { label: "Aujourd'hui", value: 1 },
  { label: "Hier", value: 2 },
  { label: "Cette semaine", value: 3 },
  { label: "la semaine dernière", value: 4 },
  { label: "Ce mois", value: 5 },
  { label: "Le mois dernier", value: 6 },
  { label: "Cette année", value: 7 },
  { label: "Personnalisé", value: 8 },
  { label: "Jour", value: 9 },
];

//-----------------------------------

export const Gender = [
  { label: "Masculin", value: 1 },
  { label: "Féminin", value: 2 },
];
export const AgeType = [
  { label: "Adulte", value: 1 },
  { label: "Enfant", value: 2 },
];

export const MaritalStatus = [
  { label: "Célibataire", value: 1 },
  { label: "Marrié(e)", value: 2 },
  { label: "Divorcé(e)", value: 3 },
  { label: "Veuf / veuve", value: 4 },
];

export const Titles = [
  { value: 1, label: "السيد" },
  { value: 2, label: "السيدة" },
  { value: 3, label: "الآنسة" },
  { value: 7, label: "أخرى" },
];

export const DeliveryStatus = [
  { label: "En attente", value: 1 },
  { label: "Prêt pour la livraison ", value: 2 },
  { label: "En cours", value: 3 },
  { label: "Annulé", value: 4 },
  { label: "Livré", value: 5 },
  { label: "Pas de reponse", value: 6 },
  { label: "Colis refusé", value: 7 },
  { label: "Injoignable", value: 8 },
  { label: "Reporté à demain", value: 9 },
];
