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

// Operational Status (DeliveryOperationalStatus enum: 1..5)
export const DeliveryStatus = [
  {
    label: "1. En Attente / Préparé (Pending)",
    shortLabel: "En Attente (Pending)",
    step: 1,
    value: 1,
    bg: "#f1f5f9",
    color: "#334155",
    dot: "#64748b",
  },
  {
    label: "2. Ramassé en Boutique (PickedUp)",
    shortLabel: "Ramassé (PickedUp)",
    step: 2,
    value: 2,
    bg: "#e0f2fe",
    color: "#0369a1",
    dot: "#0ea5e9",
  },
  {
    label: "3. Reçu au Dépôt (AtDepot)",
    shortLabel: "Au Dépôt (AtDepot)",
    step: 3,
    value: 3,
    bg: "#fef3c7",
    color: "#92400e",
    dot: "#f59e0b",
  },
  {
    label: "4. En Cours de Livraison (InDelivery)",
    shortLabel: "En Livraison (InDelivery)",
    step: 4,
    value: 4,
    bg: "#e0e7ff",
    color: "#4338ca",
    dot: "#6366f1",
  },
  {
    label: "5. Terminé / Clôturé (Completed)",
    shortLabel: "Clôturé (Completed)",
    step: 5,
    value: 5,
    bg: "#dcfce7",
    color: "#15803d",
    dot: "#22c55e",
  },
];

// Delivery Outcome / Result (DeliveryResult enum: 0..7)
export const DeliveryResultOptions = [
  { label: "En attente (None)", shortLabel: "En attente", value: 0, bg: "#f8fafc", color: "#64748b", dot: "#94a3b8" },
  { label: "Livré (Delivered)", shortLabel: "Livré", value: 1, bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  { label: "Pas de réponse (NoAnswer)", shortLabel: "Pas de réponse", value: 2, bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  { label: "Refusé (Refused)", shortLabel: "Refusé", value: 3, bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  { label: "Annulé (Canceled)", shortLabel: "Annulé", value: 4, bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
  { label: "Retourné au Dépôt (ReturnedToDepot)", shortLabel: "Retourné Dépôt", value: 5, bg: "#e0e7ff", color: "#3730a3", dot: "#6366f1" },
  { label: "Retourné à l'Expéditeur (ReturnedToSender)", shortLabel: "Retourné Expéditeur", value: 6, bg: "#f3e8ff", color: "#6b21a8", dot: "#a855f7" },
  { label: "Remboursé (Refunded)", shortLabel: "Remboursé", value: 7, bg: "#fce7f3", color: "#9d174d", dot: "#ec4899" },
];

// Refund Cause (Core.Entities.RefundCause enum: None = 0, DeliveryIssue = 1, ProductIssue = 2, Other = 4)
export const RefundCauseOptions = [
  { label: "Aucun (None)", value: 0 },
  { label: "Problème Livraison", value: 1 },
  { label: "Problème Produit", value: 2 },
  { label: "Autre", value: 4 },
];

// Helpers to normalize new Core.Entities.Delivery schema fields
export const getDeliveryResult = (row) => {
  if (!row) return 0;
  const raw = row.result ?? row.Result;
  if (typeof raw === "string") {
    const map = {
      None: 0,
      Delivered: 1,
      NoAnswer: 2,
      Refused: 3,
      Canceled: 4,
      ReturnedToDepot: 5,
      ReturnedToSender: 6,
      Refunded: 7,
    };
    if (map[raw] !== undefined) return map[raw];
  }
  if (raw !== undefined && raw !== null && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  if (row.isRefunded || row.IsRefunded) return 7;
  return 0;
};

export const getOperationalStatus = (row) => {
  if (!row) return 1;
  const rawOp = row.operationalStatus ?? row.OperationalStatus ?? row.status;
  if (typeof rawOp === "string") {
    const map = {
      Pending: 1,
      Pickup: 2,
      PickedUp: 2,
      AtDepot: 3,
      InDelivery: 4,
      OutForDelivery: 4,
      Completed: 5,
      Closed: 5,
      Delivered: 5,
    };
    if (map[rawOp] !== undefined) return map[rawOp];
  }
  const numOp = rawOp !== undefined && rawOp !== null ? Number(rawOp) : 0;
  const resVal = getDeliveryResult(row);
  const isAtDepot = Boolean(
    row.isAtDepot ?? row.IsAtDepot ?? row.atDepotConfirmedDate ?? row.AtDepotConfirmedDate
  );
  const isPickedUp = Boolean(row.isPickedUp ?? row.IsPickedUp);

  if (numOp >= 5 || resVal > 0 || row.deliveredDate || row.DeliveredDate || row.isRefunded || row.IsRefunded) {
    return 5;
  }
  if (numOp === 4) return 4;
  if (isAtDepot || numOp === 3) return 3;
  if (isPickedUp || numOp === 2) return 2;
  return 1;
};

export const getDeliveryDriver = (row) => {
  if (!row) return null;
  return row.deliveryDriver || row.DeliveryDriver || null;
};

export const getDeliveryDriverId = (row) => {
  if (!row) return null;
  return (
    row.deliveryDriverId ||
    row.DeliveryDriverId ||
    row.deliveryDriver?.id ||
    row.DeliveryDriver?.id ||
    null
  );
};

export const getPickupDriver = (row) => {
  if (!row) return null;
  return row.pickupDriver || row.PickupDriver || null;
};

export const getPickupDriverId = (row) => {
  if (!row) return null;
  return row.pickupDriverId || row.PickupDriverId || row.pickupDriver?.id || row.PickupDriver?.id || null;
};

export const getActiveDeliveryDriver = (row) => {
  if (!row) return null;
  return (
    row.deliveryDriver ||
    row.DeliveryDriver ||
    row.driver ||
    row.pickupDriver ||
    row.PickupDriver ||
    null
  );
};

export const getActiveDeliveryDriverId = (row) => {
  if (!row) return null;
  return (
    row.deliveryDriverId ||
    row.DeliveryDriverId ||
    row.deliveryDriver?.id ||
    row.DeliveryDriver?.id ||
    row.driverId ||
    row.driver?.id ||
    row.pickupDriverId ||
    row.PickupDriverId ||
    row.pickupDriver?.id ||
    row.PickupDriver?.id ||
    null
  );
};

export const getDeliveryTotalPrice = (row) => {
  if (!row) return 0;
  const items = row.coliItems || row.ColiItems || [];
  if (items.length > 0) {
    const sum = items.reduce(
      (acc, it) => acc + (Number(it.qty ?? it.Qty) || 1) * (Number(it.unitPrice ?? it.UnitPrice) || 0),
      0
    );
    if (sum > 0) return sum;
  }
  return Number(row.totalPrice ?? row.TotalPrice ?? row.cost ?? 0);
};

