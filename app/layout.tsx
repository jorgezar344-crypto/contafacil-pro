import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { WorkspaceProvider } from "@/components/bro24/workspace-context";

export const metadata: Metadata = {
  title: "BRO24 Contable",
  description: "Recepción y revisión documental para despachos contables.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><Suspense fallback={null}><WorkspaceProvider>{children}</WorkspaceProvider></Suspense></body></html>;
}
