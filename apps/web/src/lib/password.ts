/** Shared password strength rules + helpers (used by signup and profile). */

export const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[a-z]/, text: "At least 1 lowercase letter" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[0-9]/, text: "At least 1 number" },
  { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, text: "At least 1 special character" },
];

/** Number of requirements the given password satisfies (0–5). */
export function passwordScore(password: string): number {
  return passwordRequirements.filter((r) => r.regex.test(password)).length;
}

export function strengthColor(score: number): string {
  if (score === 0) return "bg-border";
  if (score <= 1) return "bg-red-500";
  if (score <= 2) return "bg-orange-500";
  if (score <= 3) return "bg-amber-500";
  if (score === 4) return "bg-yellow-400";
  return "bg-green-500";
}

export function strengthText(score: number): string {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak password";
  if (score <= 3) return "Medium password";
  if (score === 4) return "Strong password";
  return "Very strong password";
}
