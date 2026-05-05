const PAGE_PERMISSION_CANDIDATES: Record<string, string[]> = {
  users: ["manage_memberships", "manage_users", "view_users"],
  permissions: ["manage_permissions", "manage_roles"],
  beneficiaries: ["view_beneficiaries", "manage_beneficiaries"],
  settings: ["view_settings", "manage_settings"],
  cases: ["view_cases", "create_case"],
};

export function getPagePermissionCandidates(pageKeyOrPermissionCode: string) {
  return PAGE_PERMISSION_CANDIDATES[pageKeyOrPermissionCode] || [pageKeyOrPermissionCode];
}

export function resolvePagePermissionCode(pageKeyOrPermissionCode: string, loadedPermissionCodes: string[]) {
  const candidates = getPagePermissionCandidates(pageKeyOrPermissionCode);
  const matchedCode = candidates.find((code) => loadedPermissionCodes.includes(code));

  return {
    requestedKey: pageKeyOrPermissionCode,
    candidates,
    matchedCode,
    requiredCode: matchedCode || candidates[0],
  };
}