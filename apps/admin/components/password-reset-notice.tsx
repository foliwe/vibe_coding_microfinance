import type { PasswordResetFlash } from "../lib/password-reset";

export function PasswordResetNotice({
  fullName,
  loginIdentifier,
  loginLabel,
  temporaryPassword,
}: PasswordResetFlash) {
  return (
    <div className="notice notice-success">
      <strong>Temporary login credentials for {fullName}:</strong>
      <br />
      {loginLabel}: {loginIdentifier}
      <br />
      Temporary password: {temporaryPassword}
      <br />
      This password must be changed at the next login. Transaction PIN remains unchanged.
    </div>
  );
}
