import type { Metadata } from "next";
import { es } from "@/messages/es";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: es.app.name,
    template: `%s | ${es.app.name}`,
  },
  description: es.app.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
