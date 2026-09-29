export type UserRole = "admin" | "administratif" | "social" | "surveillant_kourel";

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrateur",
  administratif: "Administratif",
  social: "Social",
  surveillant_kourel: "Surveillant kourel",
};

export function canManageMembers(role: UserRole) {
  return role === "admin" || role === "administratif";
}

export function canManageDaara(role: UserRole) {
  return role === "admin" || role === "administratif";
}

export function canManageKourel(role: UserRole) {
  return role === "admin" || role === "surveillant_kourel";
}

export function canManageSocial(role: UserRole) {
  return role === "admin" || role === "social";
}
