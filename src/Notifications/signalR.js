import * as signalR from "@microsoft/signalr";
import { BASE_URL } from "../Config/api.config";

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("auth") || "{}");
  } catch {
    return {};
  }
};

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${BASE_URL.replace(/\/?$/, "/")}notificationHub`, {
    accessTokenFactory: () => getAuth().token || "",
  })
  .withAutomaticReconnect()
  .build();

export const startDriverNotifications = async (onNotification) => {
  const auth = getAuth();

  if (auth.role !== "driver" || !auth.driverId) return;

  connection.off("ReceiveNotification");
  connection.on("ReceiveNotification", onNotification);

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