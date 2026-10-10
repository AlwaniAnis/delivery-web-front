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
// Note: Delivered parcels cannot be refunded. Only lost or damaged parcels in the logistics circuit can be refunded.
export const RefundCauseOptions = [
  { label: "Colis Perdu (Lost / Problème Livraison)", value: 1 },
  { label: "Colis Endommagé / Cassé (Damaged / Problème Produit)", value: 2 },
  { label: "Autre sinistre (Other)", value: 4 },
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

export const isDeliveryDelivered = (row) => {
  if (!row) return false;
  const resVal = getDeliveryResult(row);
  if (resVal === 1) return true;
  if (row.isPaid || row.IsPaid) return true;
  if (
    (row.deliveredDate || row.DeliveredDate) &&
    resVal !== 5 &&
    resVal !== 6 &&
    resVal !== 7 &&
    !row.isRefunded &&
    !row.IsRefunded
  ) {
    return true;
  }
  return false;
};

export const isDeliveryAtDepot = (row) => {
  if (!row) return false;
  if (isDeliveryDelivered(row)) return false;
  const resVal = getDeliveryResult(row);
  if (
    resVal === 6 ||
    row.finalReturnToStore ||
    resVal === 7 ||
    row.isRefunded ||
    row.IsRefunded
  ) {
    return false;
  }
  const op = getOperationalStatus(row);
  if (op === 3) return true;
  if (resVal === 5) return true;
  if (
    Boolean(
      row.isAtDepot ??
        row.IsAtDepot ??
        row.atDepotConfirmedDate ??
        row.AtDepotConfirmedDate
    ) &&
    op !== 4
  ) {
    return true;
  }
  return false;
};

// Delivered deliveries CANNOT be refunded; only undelivered parcels in the logistics circuit (lost or damaged) can be refunded
export const canRefundDelivery = (row) => {
  if (!row) return false;
  if (isDeliveryDelivered(row)) return false;
  const opStatus = getOperationalStatus(row);
  const resVal = getDeliveryResult(row);
  const isAlreadyRefunded = Boolean(row.isRefunded ?? row.IsRefunded) || resVal === 7;
  if (opStatus < 2) return false;
  if (isAlreadyRefunded) return false;
  if (resVal === 6 || row.finalReturnToStore) return false;
  return true;
};

// Return to Store is ONLY allowed when the delivery is at the depot AND iterations >= general config maxDeliveryAttempts
export const canReturnToStore = (row, maxAttemptsInput) => {
  if (!row) return false;
  if (!isDeliveryAtDepot(row)) return false;
  const maxAtt =
    Number(maxAttemptsInput) >= 1
      ? Number(maxAttemptsInput)
      : getStoredMaxDeliveryAttempts();
  const attempts = getDeliveryAttempts(row);
  return attempts >= maxAtt;
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

export const getDeliveryAttempts = (row) => {
  if (!row) return 0;
  let storedAttempts = 0;
  if (row.id !== undefined && row.id !== null) {
    try {
      const attemptsMap = JSON.parse(localStorage.getItem("tawsil_delivery_attempts") || "{}");
      if (attemptsMap[row.id] !== undefined && !Number.isNaN(Number(attemptsMap[row.id]))) {
        storedAttempts = Math.max(0, Number(attemptsMap[row.id]));
      }
    } catch {}
  }
  const raw =
    row.deliveryAttemptCount ??
    row.DeliveryAttemptCount ??
    row.deliveryAttempts ??
    row.DeliveryAttempts ??
    row.attempts ??
    row.Attempts ??
    row.attemptCount ??
    row.AttemptCount ??
    row.numberOfAttempts ??
    row.NumberOfAttempts;
  if (raw !== undefined && raw !== null && !Number.isNaN(Number(raw))) {
    return Math.max(0, Number(raw), storedAttempts);
  }
  if (storedAttempts > 0) return storedAttempts;
  const op = getOperationalStatus(row);
  if (op >= 4) return 1;
  return 0;
};

export const setStoredDeliveryAttempts = (deliveryId, count) => {
  if (deliveryId === undefined || deliveryId === null) return;
  try {
    const attemptsMap = JSON.parse(localStorage.getItem("tawsil_delivery_attempts") || "{}");
    attemptsMap[deliveryId] = Math.max(0, Number(count) || 0);
    localStorage.setItem("tawsil_delivery_attempts", JSON.stringify(attemptsMap));
  } catch {}
};

export const saveDeliveryLifecycleOverride = (deliveryId, patch) => {
  if (deliveryId === undefined || deliveryId === null || !patch) return;
  try {
    const map = JSON.parse(localStorage.getItem("tawsil_delivery_lifecycle_state") || "{}");
    map[deliveryId] = {
      ...(map[deliveryId] || {}),
      ...patch,
      updatedAt: Date.now(),
    };
    localStorage.setItem("tawsil_delivery_lifecycle_state", JSON.stringify(map));
  } catch {}
};

export const applyDeliveryLifecycleOverride = (row) => {
  if (!row || row.id === undefined || row.id === null) return row;
  let merged = { ...row };
  try {
    const map = JSON.parse(localStorage.getItem("tawsil_delivery_lifecycle_state") || "{}");
    if (map[row.id]) {
      merged = { ...merged, ...map[row.id] };
    }
  } catch {}
  const attempts = getDeliveryAttempts(merged);
  merged.deliveryAttemptCount = attempts;
  merged.DeliveryAttemptCount = attempts;
  merged.deliveryAttempts = attempts;
  merged.attempts = attempts;
  const logsLines = parseDeliveryLogs(merged);
  if (logsLines.length > 0) {
    merged.logs = logsLines.join("\n");
    merged.Logs = merged.logs;
  }
  return merged;
};

// Checks if a delivery has completed a delivery cycle without being delivered, returned to sender, or refunded
export const hasCompletedUndeliveredCycle = (row) => {
  if (!row) return false;
  if (isDeliveryDelivered(row)) return false;
  const resVal = getDeliveryResult(row);
  if (resVal === 6 || row.finalReturnToStore) return false;
  if (resVal === 7 || row.isRefunded || row.IsRefunded) return false;
  const opStatus = getOperationalStatus(row);
  if (opStatus === 5 || (resVal >= 2 && resVal <= 5)) {
    return true;
  }
  return false;
};

// A completed undelivered cycle can be resent if attempts < maxDeliveryAttempts
export const canResendDelivery = (row, maxAttemptsInput) => {
  if (!row) return false;
  if (!hasCompletedUndeliveredCycle(row)) return false;
  const maxAtt =
    Number(maxAttemptsInput) >= 1
      ? Number(maxAttemptsInput)
      : getStoredMaxDeliveryAttempts();
  const attempts = getDeliveryAttempts(row);
  return attempts < maxAtt;
};

// Resets old lifecycle fields, keeps only the log text from the old lifecycle, assigns the new driver, and increments deliveryAttemptCount
export const buildResentDeliveryState = (row, newDriverId, chosenDriver, maxAttemptsInput) => {
  const maxAtt =
    Number(maxAttemptsInput) >= 1
      ? Number(maxAttemptsInput)
      : getStoredMaxDeliveryAttempts();
  const prevAttempts = getDeliveryAttempts(row);
  const nextAttempts = prevAttempts + 1;

  const oldDriver = getActiveDeliveryDriver(row);
  const oldDriverName = oldDriver
    ? `${oldDriver.firstName || ""} ${oldDriver.lastName || ""}`.trim() ||
      oldDriver.name ||
      `#${oldDriver.id}`
    : getActiveDeliveryDriverId(row)
    ? `Livreur #${getActiveDeliveryDriverId(row)}`
    : "Non assigné";

  const oldResVal = getDeliveryResult(row);
  const oldResObj = DeliveryResultOptions.find((o) => o.value === oldResVal);
  const oldResLabel = oldResObj
    ? oldResObj.shortLabel || oldResObj.label
    : "Cycle terminé (Non livré)";

  const newDriverName = chosenDriver
    ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}`.trim() ||
      chosenDriver.name ||
      `Livreur #${newDriverId}`
    : newDriverId
    ? `Livreur #${newDriverId}`
    : "En attente d'affectation";

  // Ensure old lifecycle summary is preserved in logs before resetting old lifecycle fields
  const archiveText = `Fin Ancien Cycle (Cycle #${Math.max(
    1,
    prevAttempts
  )}) | Ancien Livreur: ${oldDriverName} | Résultat: ${oldResLabel}`;
  const resendText = newDriverId
    ? `🔄 Renvoi Livraison (Nouveau Cycle — Tentative N°${nextAttempts}/${maxAtt}) | Nouveau Livreur affecté: ${newDriverName} | Ancien cycle réinitialisé (seul l'historique logs est conservé)`
    : `🔄 Retour Dépôt pour Nouveau Cycle (Tentative N°${nextAttempts}/${maxAtt}) | Ancien cycle réinitialisé (seul l'historique logs est conservé)`;

  appendDeliveryLog(row, archiveText);
  const updatedLogs = appendDeliveryLog(row, resendText);

  setStoredDeliveryAttempts(row?.id, nextAttempts);

  const patch = {
    status: 3,
    operationalStatus: 3,
    OperationalStatus: 3,
    result: 0,
    Result: 0,
    isPickedUp: true,
    IsPickedUp: true,
    isAtDepot: true,
    IsAtDepot: true,
    driverId: newDriverId ? Number(newDriverId) : null,
    deliveryDriverId: newDriverId ? Number(newDriverId) : null,
    DeliveryDriverId: newDriverId ? Number(newDriverId) : null,
    driver: chosenDriver || null,
    deliveryDriver: chosenDriver || null,
    DeliveryDriver: chosenDriver || null,
    // Reset old lifecycle fields so only logs text is kept from old lifecycle
    deliveredDate: null,
    DeliveredDate: null,
    deliveryDate: null,
    waitToReturnToSenderDate: null,
    returnedToDepotByDriver: false,
    pendingDepotReturn: false,
    finalReturnToStore: false,
    isPaid: false,
    IsPaid: false,
    datePayment: null,
    isRefunded: false,
    IsRefunded: false,
    refundDate: null,
    refundAmount: 0,
    refundCause: 0,
    refundCauseDescription: "",
    rescheduledForDelivery: true,
    attemptIncrementedForCycle: true,
    deliveryAttemptCount: nextAttempts,
    DeliveryAttemptCount: nextAttempts,
    deliveryAttempts: nextAttempts,
    attempts: nextAttempts,
    logs: updatedLogs,
    Logs: updatedLogs,
  };

  saveDeliveryLifecycleOverride(row?.id, patch);

  return {
    ...row,
    ...patch,
  };
};

export const parseDeliveryLogs = (row) => {
  if (!row) return [];
  const rawLogs = row.logs ?? row.Logs ?? "";
  let localLogs = "";
  try {
    const map = JSON.parse(localStorage.getItem("tawsil_delivery_logs") || "{}");
    if (map[row.id]) localLogs = map[row.id];
  } catch {}

  const combined = [String(rawLogs || ""), String(localLogs || "")]
    .filter(Boolean)
    .join("\n");

  const lines = combined
    .split(/\r?\n|\|\|/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Deduplicate while preserving chronological order
  return Array.from(new Set(lines));
};

export const appendDeliveryLog = (row, actionText) => {
  const nowStr = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const entry = `[${nowStr}] ${actionText}`;
  const existingLines = parseDeliveryLogs(row);
  const nextLogs = [...existingLines, entry].join("\n");
  if (row?.id) {
    try {
      const map = JSON.parse(localStorage.getItem("tawsil_delivery_logs") || "{}");
      map[row.id] = nextLogs;
      localStorage.setItem("tawsil_delivery_logs", JSON.stringify(map));
    } catch {}
  }
  return nextLogs;
};

export const getStoredMaxDeliveryAttempts = () => {
  try {
    const raw = localStorage.getItem("tawsil_general_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = Number(parsed?.maxDeliveryAttempts ?? parsed?.MaxDeliveryAttempts);
      if (val >= 1) return val;
    }
  } catch (e) {}
  return 3;
};

export const parseDriverDocuments = (driverOrStr) => {
  const raw =
    typeof driverOrStr === "string"
      ? driverOrStr
      : driverOrStr?.documents ?? driverOrStr?.Documents ?? "";
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};


