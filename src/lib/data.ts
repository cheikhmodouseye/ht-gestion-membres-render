import { apiRequest } from "./api";

export type AppData = { members: any[]; renewals: any[]; activities: any[]; attendance: any[]; contributions: any[]; socialEvents: any[]; cashMovements: any[] };

export function loadData(): Promise<AppData> {
  return apiRequest<AppData>("/api/data");
}

export async function mutateData(body: any, _userId?: string) {
  await apiRequest("/api/mutate", { method: "POST", body: JSON.stringify(body) });
}
