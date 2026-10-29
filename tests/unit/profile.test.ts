// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  PROFILE_LIMITS,
  firstName,
  initials,
  sanitizePersistedProfile,
  validateProfile,
} from "@/lib/profile/profile";
import { PROFILE_KEY, useProfileStore } from "@/lib/store/profileStore";

const now = new Date("2026-10-29T10:00:00Z");

describe("validateProfile", () => {
  it("accepts a name alone and stamps the creation time", () => {
    expect(validateProfile({ name: "Priya Sharma", email: "" }, now)).toEqual({
      ok: true,
      profile: { name: "Priya Sharma", email: "", createdAt: "2026-10-29T10:00:00.000Z" },
    });
  });

  it("cleans the name and lower-cases the email", () => {
    const result = validateProfile(
      { name: "  Priya\u200B   Sharma ", email: " Priya@Example.COM " },
      now,
    );
    expect(result).toMatchObject({
      ok: true,
      profile: { name: "Priya Sharma", email: "priya@example.com" },
    });
  });

  it("asks for a name when it is empty or only invisible characters", () => {
    for (const name of ["", "   ", "\u200B\u0007"]) {
      expect(validateProfile({ name, email: "" }, now)).toEqual({
        ok: false,
        errors: { name: "Tell us your name." },
      });
    }
  });

  it("caps the name length", () => {
    const result = validateProfile(
      { name: "a".repeat(PROFILE_LIMITS.nameMax + 1), email: "" },
      now,
    );
    expect(result).toEqual({
      ok: false,
      errors: { name: `Keep your name under ${PROFILE_LIMITS.nameMax} characters.` },
    });
    expect(
      validateProfile({ name: "a".repeat(PROFILE_LIMITS.nameMax), email: "" }, now).ok,
    ).toBe(true);
  });

  it("rejects a malformed email but allows leaving it out", () => {
    expect(validateProfile({ name: "Priya", email: "priya@" }, now)).toEqual({
      ok: false,
      errors: { email: "Use an email like priya@example.com, or leave it empty." },
    });
  });

  it("reports both fields at once", () => {
    const result = validateProfile({ name: "", email: "nope" }, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(["name", "email"]);
  });
});

describe("firstName and initials", () => {
  it("greets by the first word", () => {
    expect(firstName("Priya Sharma")).toBe("Priya");
    expect(firstName("  Meera  ")).toBe("Meera");
  });

  it("uses the first and last word for initials", () => {
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("Anna Maria de la Cruz")).toBe("AC");
    expect(initials("meera")).toBe("M");
    expect(initials("Élodie ørsted")).toBe("ÉØ");
  });
});

describe("sanitizePersistedProfile", () => {
  const valid = { name: "Priya", email: "", createdAt: "2026-10-29T10:00:00.000Z" };

  it("keeps a valid profile", () => {
    expect(sanitizePersistedProfile({ profile: valid })).toEqual(valid);
  });

  it("drops anything malformed", () => {
    for (const value of [
      null,
      "x",
      {},
      { profile: { ...valid, name: "" } },
      { profile: { ...valid, email: "not-an-email" } },
      { profile: { ...valid, createdAt: "yesterday" } },
      { profile: { ...valid, isAdmin: true, name: 5 } },
    ]) {
      expect(sanitizePersistedProfile(value)).toBeNull();
    }
  });
});

describe("useProfileStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profile: null });
  });

  it("signs up, persists, and signs out", () => {
    const profile = { name: "Priya", email: "", createdAt: now.toISOString() };
    useProfileStore.getState().signUp(profile);
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}").state).toEqual({
      profile,
    });
    useProfileStore.getState().signOut();
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it("ignores a tampered entry on load", async () => {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ state: { profile: { name: "" } }, version: 1 }),
    );
    await useProfileStore.persist.rehydrate();
    expect(useProfileStore.getState().profile).toBeNull();
  });
});
