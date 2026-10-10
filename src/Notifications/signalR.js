import * as signalR from "@microsoft/signalr";
import { BASE_URL } from "../Config/api.config";

const NOTIF_STORAGE_KEY = "tawsil_driver_notifications";

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("auth") || "{}");
  } catch {
    return {};
  }
};

export const getStoredDriverNotifications = (driverId = null) => {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (driverId) {
      return list.filter(
        (n) => !n.driverId || Number(n.driverId) === Number(driverId)
      );
    }
    return list;
  } catch {
    return [];
  }
};

export const pushDriverNotification = ({
  driverId,
  title = "Nouvelle Affectation",
  message = "",
  type = "assignment",
  storeName = "",
  count = 0,
}) => {
  try {
    const current = getStoredDriverNotifications();
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      driverId: driverId ? Number(driverId) : null,
      title,
      message,
      type,
      storeName,
      count,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const next = [newItem, ...current].slice(0, 50);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("tawsil-driver-notification", { detail: newItem })
    );
    return newItem;
  } catch {
    return null;
  }
};

export const markDriverNotificationsRead = (driverId = null) => {
  try {
    const current = getStoredDriverNotifications();
    const next = current.map((n) =>
      !driverId || !n.driverId || Number(n.driverId) === Number(driverId)
        ? { ...n, read: true }
        : n
    );
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("tawsil-driver-notification-updated"));
  } catch {}
};

export const clearDriverNotifications = (driverId = null) => {
  try {
    const current = getStoredDriverNotifications();
    const next = driverId
      ? current.filter((n) => n.driverId && Number(n.driverId) !== Number(driverId))
      : [];
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("tawsil-driver-notification-updated"));
  } catch {}
};

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${BASE_URL.replace(/\/?$/, "/")}notificationHub`, {
    accessTokenFactory: () => getAuth().token || "",
  })
  .withAutomaticReconnect()
  .build();

export const startDriverNotifications = async (onNotification) => {
  const auth = getAuth();
  const roleStr = String(auth.role || "").toLowerCase();

  if (!roleStr.includes("driver") && !auth.driverId) return;

  connection.off("ReceiveNotification");
  connection.on("ReceiveNotification", (payload) => {
    const msgText =
      typeof payload === "string"
        ? payload
        : payload?.message ||
          payload?.title ||
          "Nouvelle affectation de colis disponible.";
    const created = pushDriverNotification({
      driverId: auth.driverId,
      title: payload?.title || "🔔 Nouvelle Notification d'Affectation",
      message: msgText,
      type: payload?.type || "signalr",
    });
    if (typeof onNotification === "function") {
      onNotification(payload, created);
    }
  });

  if (connection.state === signalR.HubConnectionState.Disconnected) {
    await connection.start();
  }
};

export const stopDriverNotifications = async (onNotification) => {
  connection.off("ReceiveNotification", onNotification);

  if (connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop();
  }
};
