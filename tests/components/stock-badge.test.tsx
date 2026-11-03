import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockBadge } from "@/components/ui/stock-badge";

describe("StockBadge", () => {
  it("shows the status in Spanish", () => {
    render(<StockBadge status="available" />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("shows the quantity only when provided", () => {
    render(<StockBadge status="low" quantity={3} />);
    expect(screen.getByText("Pocas piezas (3)")).toBeInTheDocument();
  });

  it("hides the quantity when out of stock", () => {
    render(<StockBadge status="out" quantity={0} />);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });
});
