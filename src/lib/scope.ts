import type { UserRole } from "./roles";

export type AccessLevel = "all" | "zone" | "cultural_space" | "kourel";
export type AccessScope = {
  role: UserRole;
  accessScope?: AccessLevel;
  zone: string;
  culturalSpace?: string;
  kourel: string;
};
export const ALL_ZONES = "Toutes les zones";
export const ALL_CULTURAL_SPACES = "Tous les espaces";

function effectiveAccessScope(user: AccessScope): AccessLevel {
  if (user.role === "admin") return "all";
  return user.accessScope || (user.role === "surveillant_kourel" ? "kourel" : "all");
}

export function canSeeMember(user: AccessScope, member: { zone?: string; culturalSpace?: string; cultural_space?: string; kourel?: string }) {
  const accessScope = effectiveAccessScope(user);
  if (accessScope === "all") return true;
  if (accessScope === "zone") return Boolean(user.zone?.trim()) && member.zone === user.zone;
  if (accessScope === "cultural_space") {
    const memberSpace = member.culturalSpace ?? member.cultural_space;
    return Boolean(user.culturalSpace?.trim()) && memberSpace === user.culturalSpace;
  }
  if (accessScope === "kourel") return Boolean(user.kourel?.trim()) && member.kourel === user.kourel;
  return false;
}

export function canSeeActivity(user: AccessScope, activity: { scope: string; zone?: string; culturalSpace?: string; cultural_space?: string; kourel?: string }) {
  if (user.role === "admin") return true;
  const accessScope = effectiveAccessScope(user);
  if (user.role === "administratif" && activity.scope === "general") {
    if (accessScope === "all") return true;
    if (accessScope === "zone") return Boolean(user.zone?.trim()) && (activity.zone === user.zone || activity.zone === ALL_ZONES);
    if (accessScope === "cultural_space") {
      const activitySpace = activity.culturalSpace ?? activity.cultural_space;
      return Boolean(user.culturalSpace?.trim()) && (activitySpace === user.culturalSpace || activitySpace === ALL_CULTURAL_SPACES);
    }
  }
  if (user.role === "surveillant_kourel" && activity.scope === "kourel") {
    return accessScope === "all" || (accessScope === "kourel" && Boolean(user.kourel?.trim()) && activity.kourel === user.kourel);
  }
  return false;
}

export function accessScopeLabel(user: AccessScope) {
  const accessScope = effectiveAccessScope(user);
  if (accessScope === "zone") return `Zone : ${user.zone || "non attribuée"}`;
  if (accessScope === "cultural_space") return `Espace culturel : ${user.culturalSpace || "non attribué"}`;
  if (accessScope === "kourel") return `Kourel : ${user.kourel || "non attribué"}`;
  return "Accès complet";
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
