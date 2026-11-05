import type { UserRole } from "@/types/user-role"

export function normalizeUserEmail(email: string | null | undefined): string {
  return (email || "").trim().toLocaleLowerCase("en-US")
}

/** Collapse legacy email-keyed and Firebase-UID-keyed role documents for the same account. */
export function deduplicateUserRoles(users: UserRole[]): UserRole[] {
  const groups = new Map<string, UserRole[]>()
  for (const user of users) {
    const email = normalizeUserEmail(user.email)
    const key = email || `uid:${user.uid}`
    groups.set(key, [...(groups.get(key) || []), user])
  }

  return Array.from(groups.values()).map((group) => {
    const email = normalizeUserEmail(group[0]?.email)
    const ordered = [...group].sort((a, b) => {
      const aIsFirebaseUid = Boolean(a.uid) && normalizeUserEmail(a.uid) !== email
      const bIsFirebaseUid = Boolean(b.uid) && normalizeUserEmail(b.uid) !== email
      return Number(bIsFirebaseUid) - Number(aIsFirebaseUid)
    })
    const primary = ordered[0]
    const preventionZonesAccess = group.some((user) => user.preventionZonesAccess === "write")
      ? "write"
      : group.some((user) => user.preventionZonesAccess === "read")
        ? "read"
        : "none"

    return {
      ...primary,
      email: (primary.email || "").trim(),
      fullAccess: group.some((user) => user.fullAccess === true),
      allowedTabs: Array.from(new Set(group.flatMap((user) => user.allowedTabs || []))),
      preventionZonesAccess,
      addedAt: Math.min(...group.map((user) => user.addedAt).filter((addedAt) => addedAt > 0)) || primary.addedAt || 0,
    }
  })
}

export function findUserRoleForAuthUser(
  users: UserRole[],
  authUser: { uid: string; email: string | null },
): UserRole | undefined {
  return (
    users.find((user) => user.uid === authUser.uid) ||
    users.find((user) => normalizeUserEmail(user.email) === normalizeUserEmail(authUser.email))
  )
}
