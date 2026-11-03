import { es } from "@/messages/es";

export type StockStatus = "available" | "low" | "out";

interface StockBadgeProps {
  status: StockStatus;
  /** Only shown if the business chose to expose the exact stock quantity. */
  quantity?: number;
}

export function StockBadge({ status, quantity }: StockBadgeProps) {
  return (
    <span data-status={status}>
      {es.stock[status]}
      {quantity !== undefined && status !== "out" ? ` (${quantity})` : ""}
    </span>
  );
}
