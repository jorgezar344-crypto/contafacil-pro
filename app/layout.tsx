import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRO24 Contable",
  description: "Recepción y revisión documental para despachos contables.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
