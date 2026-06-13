// The Payload create-first-user screen only collects email and password, so
// the role field falls back to its default ("read-only"). The very first
// account must instead be the Owner, or George would be locked out of his own
// CMS. Later users keep whatever role was chosen for them.
export function resolveFirstUserRole({ isFirstUser, requestedRole }) {
  if (isFirstUser) {
    return "owner";
  }

  return requestedRole ?? "read-only";
}
