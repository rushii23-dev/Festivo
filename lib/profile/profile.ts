/**
 * The planner's profile: a name (and optionally an email) kept on this device
 * only. There is no password and no server account; the profile personalises
 * the wizard and the dashboard. Persisted data is re-validated on load.
 */
import { z } from "zod";
import { cleanText } from "@/lib/security/sanitize";

export const PROFILE_LIMITS = { nameMax: 60, emailMax: 254 } as const;

export const ProfileSchema = z.object({
  name: z.string().min(1).max(PROFILE_LIMITS.nameMax),
  email: z.email().max(PROFILE_LIMITS.emailMax).or(z.literal("")),
  createdAt: z.iso.datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export interface ProfileInput {
  name: string;
  email: string;
}
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

/** Validates the sign-up form; field errors are in on-screen order. */
export function validateProfile(
  input: ProfileInput,
  now: Date = new Date(),
): { ok: true; profile: Profile } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const name = cleanText(input.name, PROFILE_LIMITS.nameMax + 1);
  const email = input.email.trim().toLowerCase();

  if (!name) errors.name = "Tell us your name.";
  else if ([...name].length > PROFILE_LIMITS.nameMax)
    errors.name = `Keep your name under ${PROFILE_LIMITS.nameMax} characters.`;

  if (email && !z.email().max(PROFILE_LIMITS.emailMax).safeParse(email).success)
    errors.email = "Use an email like priya@example.com, or leave it empty.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, profile: { name, email, createdAt: now.toISOString() } };
}

/** The first word of the name, for greetings ("Welcome, Priya"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Up to two initials for the account badge ("Priya Sharma" → "PS"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = [words[0], words.length > 1 ? words.at(-1) : undefined]
    .map((word) => (word ? [...word][0] : ""))
    .join("");
  return letters.toLocaleUpperCase();
}

/** Keeps a persisted profile only if it is still valid. */
export function sanitizePersistedProfile(value: unknown): Profile | null {
  const data =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const parsed = ProfileSchema.safeParse(data.profile);
  return parsed.success ? parsed.data : null;
}
