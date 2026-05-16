import type { PasswordResetFlash } from "../lib/password-reset";
import { Notice } from "./notice";

export function PasswordResetNotice({
  fullName,
  loginIdentifier,
  loginLabel,
  temporaryPassword,
}: PasswordResetFlash) {
  return (
    <Notice title={`Temporary login credentials for ${fullName}`} tone="success">
      <p>
        {loginLabel}: {loginIdentifier}
      </p>
      <p>Temporary password: {temporaryPassword}</p>
      <p>This password must be changed at the next login. Transaction PIN remains unchanged.</p>
    </Notice>
  );
}
