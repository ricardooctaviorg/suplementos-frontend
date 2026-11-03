import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Suplementos",
    template: "%s | Suplementos",
  },
  description: "Gestión de inventario y catálogo de suplementos para negocios locales.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
