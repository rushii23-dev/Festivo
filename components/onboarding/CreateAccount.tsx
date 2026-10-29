"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { Field, controlClass, describedBy } from "@/components/ui/field";
import {
  PROFILE_LIMITS,
  validateProfile,
  type Profile,
  type ProfileErrors,
  type ProfileInput,
} from "@/lib/profile/profile";
import { ACCOUNT_PHOTO } from "./stagePhotos";
import { Stage } from "./Stage";
import { StageHeading } from "./StageHeading";

/** Sign-up before the wizard: a name, an optional email, nothing else. */
export function CreateAccount({ onCreate }: { onCreate: (profile: Profile) => void }) {
  const announce = useAnnounce();
  const [values, setValues] = useState<ProfileInput>({ name: "", email: "" });
  const [errors, setErrors] = useState<ProfileErrors>({});

  const update = (field: keyof ProfileInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateProfile(values);
    if (result.ok) return onCreate(result.profile);
    setErrors(result.errors);
    const count = Object.keys(result.errors).length;
    announce(
      `${count} ${count === 1 ? "answer needs" : "answers need"} attention.`,
      "assertive",
    );
    const first = result.errors.name ? "account-name" : "account-email";
    requestAnimationFrame(() => document.getElementById(first)?.focus());
  };

  return (
    <Stage
      photo={ACCOUNT_PHOTO}
      eyebrow="Before we begin"
      caption="Every plan deserves a name on the cover."
    >
      <StageHeading
        eyebrow="Your Festivo account"
        title="Create your account"
        intro="Just your name, so every plan feels like yours. No password, nothing to remember."
      />

      <form noValidate onSubmit={onSubmit} className="stage-rise grid gap-8">
        <Field
          id="account-name"
          name="name"
          label="Your name"
          required
          error={errors.name}
        >
          <input
            id="account-name"
            type="text"
            autoComplete="name"
            maxLength={PROFILE_LIMITS.nameMax}
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("account-name", { error: errors.name })}
            className={controlClass}
          />
        </Field>
        <Field
          id="account-email"
          name="email"
          label="Email"
          hint="Optional. Handy if you share a plan later."
          error={errors.email}
        >
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            maxLength={PROFILE_LIMITS.emailMax}
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("account-email", {
              hint: true,
              error: errors.email,
            })}
            className={controlClass}
          />
        </Field>

        <div className="grid gap-6 border-t border-hairline pt-8">
          <Button type="submit" size="lg" className="justify-self-start">
            Create my account
            <ArrowRight aria-hidden="true" />
          </Button>
          <p className="flex max-w-[46ch] items-start gap-3 text-sm text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-gold"
            />
            Your name and email stay in this browser. They are never sent anywhere.
          </p>
        </div>
      </form>
    </Stage>
  );
}
