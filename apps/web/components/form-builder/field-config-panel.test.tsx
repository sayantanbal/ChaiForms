import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FieldConfigPanel } from "./field-config-panel";

describe("FieldConfigPanel", () => {
  it("should render field properties", () => {
    const field = {
      id: "field-1",
      type: "short_text",
      label: "Your Name",
      required: true,
    } as any;

    render(<FieldConfigPanel field={field} allFields={[field]} onChange={() => {}} />);

    expect(screen.getByDisplayValue("Your Name")).toBeDefined();
    expect(screen.getByLabelText("Required field")).toBeDefined();
  });

  it("should update field label", () => {
    const onChange = vi.fn();
    const field = {
      id: "field-1",
      type: "short_text",
      label: "Your Name",
      required: false,
    } as any;

    render(<FieldConfigPanel field={field} allFields={[field]} onChange={onChange} />);

    const labelInput = screen.getByDisplayValue("Your Name");
    fireEvent.change(labelInput, { target: { value: "Full Name" } });

    expect(onChange).toHaveBeenCalledWith({
      ...field,
      label: "Full Name",
    });
  });

  it("should show type-specific options", () => {
    const field = {
      id: "field-1",
      type: "number",
      label: "Age",
      min: 0,
      max: 120,
    } as any;

    render(<FieldConfigPanel field={field} allFields={[field]} onChange={() => {}} />);

    const minInput = screen.getByDisplayValue("0");
    const maxInput = screen.getByDisplayValue("120");
    expect(minInput).toBeDefined();
    expect(maxInput).toBeDefined();
  });
});
