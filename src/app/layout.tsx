import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'leaflet/dist/leaflet.css'; // Importa o CSS global do Leaflet para o mapa
import "./globals.css"; // Importa o CSS global da aplicação
import { cn } from "@/lib/utils"; // Função utilitária para concatenar classes CSS

// Carrega a fonte Inter do Google Fonts e define a variável CSS para fonte sans-serif
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Metadados globais da aplicação (usados pelo Next.js para SEO e cabeçalho)
export const metadata: Metadata = {
  title: "Previsão do Tempo (INPE)",
  description: "Sistema de visualização de dados de previsão do tempo do CPTEC/INPE",
};

// Componente de layout raiz da aplicação Next.js
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Define o idioma da página como português do Brasil
    // suppressHydrationWarning: ignora avisos de hidratação do React em SSR/CSR
    <html lang="pt-br" suppressHydrationWarning>
      {/* Aplica classes utilitárias do Tailwind e a fonte Inter ao body */}
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {/* Renderiza o conteúdo da aplicação */}
        {children}
      </body>
    </html>
  );
}