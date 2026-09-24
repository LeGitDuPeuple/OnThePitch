import { appelApi } from "./api";
import type { Notification } from "../types/notification";

export const notificationService = {
  lister: (): Promise<Notification[]> => appelApi("/notifications"),
  marquerLue: (id: number): Promise<void> => appelApi(`/notifications/${id}/lue`, { methode: "POST" }),
};
