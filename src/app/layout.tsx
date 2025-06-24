import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'leaflet/dist/leaflet.css'; // Import global do CSS do mapa
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Previsão do Tempo (INPE)",
  description: "Sistema de visualização de dados de previsão do tempo do CPTEC/INPE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {children}
      </body>
    </html>
  );
}