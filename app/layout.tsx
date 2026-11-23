import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTA 6 Content Manager",
  description: "Sistema de gerenciamento de conteúdo para página de fãs de GTA 6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
