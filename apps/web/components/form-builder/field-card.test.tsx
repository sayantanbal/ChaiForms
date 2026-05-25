import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldCard } from "./field-card";
import { describe, it, expect, vi } from "vitest";

// Mock @dnd-kit/sortable to avoid complex DOM setup for drag and drop
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

describe("FieldCard", () => {
  const mockField = {
    id: "field-1",
    type: "short_text" as const,
    label: "Your Name",
    required: true,
  };

  it("renders the field label and type", () => {
    render(
      <FieldCard field={mockField} isSelected={false} onSelect={() => {}} onDelete={() => {}} />,
    );

    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("short text")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument(); // Required indicator
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <FieldCard field={mockField} isSelected={false} onSelect={onSelect} onDelete={() => {}} />,
    );

    fireEvent.click(screen.getByText("Your Name"));
    expect(onSelect).toHaveBeenCalledWith("field-1");
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <FieldCard field={mockField} isSelected={false} onSelect={() => {}} onDelete={onDelete} />,
    );

    const deleteButton = screen.getByLabelText("Delete field");
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith("field-1");
  });
});
