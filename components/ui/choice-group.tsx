import type { ReactNode } from "react";
import { Choice, Fieldset, type FieldsetProps } from "./field";

/**
 * A question answered with chips: checkboxes for "pick any", radios for "pick
 * one". Both are a Fieldset of Choice inputs named after the field, so every
 * option list is labelled, described and keyboard-operable the same way.
 */
type GroupProps<T extends string> = Omit<FieldsetProps, "children"> & {
  options: readonly T[];
  labels: Readonly<Record<T, ReactNode>>;
  /** Shown after the options, such as a note on the current choice. */
  children?: ReactNode;
};

/** Adds the value if absent, removes it if present. */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Options({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

export function CheckboxGroup<T extends string>({
  options,
  labels,
  selected,
  onChange,
  children,
  ...fieldset
}: GroupProps<T> & { selected: readonly T[]; onChange: (selected: T[]) => void }) {
  return (
    <Fieldset {...fieldset}>
      <Options>
        {options.map((option) => (
          <Choice
            key={option}
            type="checkbox"
            name={fieldset.name}
            value={option}
            label={labels[option]}
            checked={selected.includes(option)}
            onChange={() => onChange(toggleValue(selected, option))}
          />
        ))}
      </Options>
      {children}
    </Fieldset>
  );
}

export function RadioGroup<T extends string>({
  options,
  labels,
  value,
  onChange,
  children,
  ...fieldset
}: GroupProps<T> & { value: T; onChange: (value: T) => void }) {
  return (
    <Fieldset {...fieldset}>
      <Options>
        {options.map((option) => (
          <Choice
            key={option}
            type="radio"
            name={fieldset.name}
            value={option}
            label={labels[option]}
            checked={value === option}
            onChange={() => onChange(option)}
          />
        ))}
      </Options>
      {children}
    </Fieldset>
  );
}
