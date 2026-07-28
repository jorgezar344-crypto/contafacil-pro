import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ContaFácil Pro | Demo", description: "Demo móvil de despacho contable digital" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
