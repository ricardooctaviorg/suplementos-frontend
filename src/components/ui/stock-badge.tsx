export type StockStatus = "available" | "low" | "out";

const LABELS: Record<StockStatus, string> = {
  available: "Disponible",
  low: "Pocas piezas",
  out: "Agotado",
};

interface StockBadgeProps {
  status: StockStatus;
  /** Solo se muestra si el negocio decidió exponer la existencia exacta. */
  quantity?: number;
}

export function StockBadge({ status, quantity }: StockBadgeProps) {
  return (
    <span data-status={status}>
      {LABELS[status]}
      {quantity !== undefined && status !== "out" ? ` (${quantity})` : ""}
    </span>
  );
}
