import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendário Editorial",
  description: "Organize suas ideias de conteúdo e seu calendário editorial",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
