/**
 * The site owner signs in with a username instead of an email address, so the
 * username is mapped to the owner's real (hidden) login email before it ever
 * reaches auth. Everyone else signs in with their own email.
 */
export const OWNER_USERNAME = "Iconvalt@123@";
export const OWNER_LOGIN_EMAIL = "iconvalt@iconvault.app";

export const isOwnerUsername = (input: string) =>
  input.trim().toLowerCase() === OWNER_USERNAME.toLowerCase();

/** Turns whatever was typed in the identifier field into an auth email. */
export const resolveLoginEmail = (input: string) =>
  isOwnerUsername(input) ? OWNER_LOGIN_EMAIL : input.trim();
