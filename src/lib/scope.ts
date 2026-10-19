import type { UserRole } from "./roles";

export type AccessScope = { role: UserRole; zone: string; kourel: string };
export const ALL_ZONES = "Toutes les zones";
export const ALL_CULTURAL_SPACES = "Tous les espaces";

export function canSeeMember(user: AccessScope, member: { zone?: string; kourel?: string }) {
  if (user.role === "admin" || user.role === "social" || user.role === "administratif") return true;
  if (user.role === "surveillant_kourel") return Boolean(user.kourel?.trim()) && member.kourel === user.kourel;
  return false;
}

export function canSeeActivity(user: AccessScope, activity: { scope: string; zone?: string; kourel?: string }) {
  if (user.role === "admin") return true;
  if (user.role === "administratif") return activity.scope === "general";
  if (user.role === "surveillant_kourel") return Boolean(user.kourel?.trim()) && activity.scope === "kourel" && activity.kourel === user.kourel;
  return false;
}

// Build from the current roster only: a changed selection must not submit stale IDs.
export function attendanceForRoster(members: { id: string }[], statuses: Record<string, string>) {
  return Object.fromEntries(members.map(member => [member.id, statuses[member.id] || "present"]));
}

export function membersForDaaraActivity<T extends { zone?: string; culturalSpace?: string }>(members: T[], zone: string, culturalSpace: string) {
  if (!zone || !culturalSpace) return [];
  return members.filter(member =>
    (zone === ALL_ZONES || member.zone === zone) &&
    (culturalSpace === ALL_CULTURAL_SPACES || member.culturalSpace === culturalSpace),
  );
}
