/**
 * Prompt-injection defences for user text sent to the model. User text is
 * wrapped in clearly delimited tags and escaped so it cannot close the tag;
 * the system prompt tells the model to treat tag contents as data only.
 */
import { cleanText } from "./sanitize";

const TAG_NAME = /^[a-z][a-z0-9_]{0,31}$/;

/** Escapes characters that could open or close a delimiter tag. */
export function escapeForTag(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Wraps cleaned, length-capped user text in `<user_data name="...">` tags.
 * The name is restricted to a fixed pattern because it is ours, not the user's.
 */
export function wrapUserData(name: string, text: string, maxLength = 500): string {
  if (!TAG_NAME.test(name)) throw new Error(`Invalid user_data name: ${name}`);
  const body = escapeForTag(cleanText(text, maxLength));
  return `<user_data name="${name}">${body}</user_data>`;
}

const SUSPICIOUS: { id: string; pattern: RegExp }[] = [
  {
    id: "ignore-instructions",
    pattern: /\b(ignore|disregard|forget)\b.{0,40}\b(instructions?|rules|prompt)\b/i,
  },
  { id: "role-override", pattern: /\b(you are now|act as|pretend to be|new persona)\b/i },
  {
    id: "system-prompt",
    pattern: /\b(system prompt|developer message|hidden instructions?)\b/i,
  },
  { id: "tag-escape", pattern: /<\/?\s*(user_data|system|assistant|instructions?)\b/i },
  { id: "exfiltration", pattern: /\b(api[_ ]?key|secret|password|token)\b/i },
];

/**
 * Flags text that looks like an injection attempt. Used for logging and
 * monitoring only: blocking would reject legitimate notes like "please ignore
 * the old guest list". The structural defences above do the real work.
 */
export function detectInjection(text: string): string[] {
  return SUSPICIOUS.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
}
