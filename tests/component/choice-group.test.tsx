import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CheckboxGroup, RadioGroup, toggleValue } from "@/components/ui/choice-group";

const FRUITS = ["mango", "guava", "chikoo"] as const;
type Fruit = (typeof FRUITS)[number];
const LABELS: Record<Fruit, string> = {
  mango: "Mango",
  guava: "Guava",
  chikoo: "Chikoo",
};

describe("toggleValue", () => {
  it("adds a missing value and removes a present one", () => {
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
  });
});

describe("CheckboxGroup", () => {
  function Picker() {
    const [selected, setSelected] = useState<Fruit[]>(["guava"]);
    return (
      <>
        <CheckboxGroup
          id="fruit"
          name="fruit"
          legend="Fruit"
          hint="Pick any."
          error="Pick at most two."
          options={FRUITS}
          labels={LABELS}
          selected={selected}
          onChange={setSelected}
        />
        <output>{selected.join(",")}</output>
      </>
    );
  }

  it("is a described group of named checkboxes that toggle the selection", async () => {
    const user = userEvent.setup();
    render(<Picker />);
    const group = screen.getByRole("group", { name: "Fruit" });
    expect(group).toHaveAccessibleDescription(/^Pick any\. Error:\s*Pick at most two\.$/);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.map((box) => box.getAttribute("name"))).toEqual([
      "fruit",
      "fruit",
      "fruit",
    ]);
    expect(screen.getByRole("checkbox", { name: "Guava" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Mango" }));
    await user.click(screen.getByRole("checkbox", { name: "Guava" }));
    expect(screen.getByRole("status")).toHaveTextContent("mango");
    expect(screen.getByRole("checkbox", { name: "Guava" })).not.toBeChecked();
  });
});

describe("RadioGroup", () => {
  function Picker() {
    const [value, setValue] = useState<Fruit>("mango");
    return (
      <RadioGroup
        id="favourite"
        name="favourite"
        legend="Favourite"
        required
        options={FRUITS}
        labels={LABELS}
        value={value}
        onChange={setValue}
      >
        <p>Chosen: {LABELS[value]}</p>
      </RadioGroup>
    );
  }

  it("checks exactly one option and shows what follows the options", async () => {
    const user = userEvent.setup();
    render(<Picker />);
    expect(screen.getByRole("group", { name: /Favourite/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mango" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Chikoo" }));
    expect(screen.getByRole("radio", { name: "Chikoo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mango" })).not.toBeChecked();
    expect(screen.getByText("Chosen: Chikoo")).toBeInTheDocument();
  });
});
