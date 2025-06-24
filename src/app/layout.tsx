import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Carrega a fonte Inter do Google Fonts e define a variável CSS para fonte sans-serif
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Metadados globais da aplicação (título e descrição)
export const metadata: Metadata = {
  title: "Previsão Subsazonal INPE",
  description: "Sistema para visualização de dados de previsão subsazonal do INPE",
};

// Componente de layout raiz da aplicação Next.js
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Define o idioma da página como português do Brasil
    // suppressHydrationWarning: ignora pequenos avisos de hidratação do React,
    // útil para evitar warnings em ambientes com extensões de navegador
    <html lang="pt-br" suppressHydrationWarning>
      {/* Aplica classes utilitárias do Tailwind e a fonte Inter ao body */}
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {/* Renderiza o conteúdo da aplicação */}
        {children}
      </body>
    </html>
  );
}