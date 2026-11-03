import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockBadge } from "@/components/ui/stock-badge";

describe("StockBadge", () => {
  it("muestra el estado en español", () => {
    render(<StockBadge status="available" />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("muestra la cantidad solo si se proporciona", () => {
    render(<StockBadge status="low" quantity={3} />);
    expect(screen.getByText("Pocas piezas (3)")).toBeInTheDocument();
  });

  it("no muestra cantidad cuando está agotado", () => {
    render(<StockBadge status="out" quantity={0} />);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });
});
