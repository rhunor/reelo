// One password rule for every place a password is set (signup, change password, new staff
// accounts) — checked live in the browser and enforced again on the server.
export const PASSWORD_RULES: { id: string; label: string; test: (pw: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "A number (0–9)", test: (pw) => /\d/.test(pw) },
  { id: "symbol", label: "A symbol (e.g. ! @ # ?)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export const PASSWORD_POLICY_MESSAGE =
  "Use a stronger password: at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.";

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(pw));
}
