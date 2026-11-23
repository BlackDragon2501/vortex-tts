import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex TTS - Lee tus textos y PDFs en voz alta, sin límites",
  description:
    "Vórtex TTS, de Vortex Company: pega un texto, carga una nota .txt/.md o un PDF y escúchalo en voz alta con las voces de tu sistema, controlando velocidad, tono y fragmento actual. Todo corre en tu navegador, tus archivos nunca salen de tu equipo. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex TTS",
    "texto a voz",
    "leer PDF en voz alta",
    "lector de textos online",
    "Web Speech API",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#fb923c" stroke-width="3.5"/><path d="M18 20v8M24 16v16M30 19v10" stroke="#fdba74" stroke-width="3.5" strokeLinecap="round"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex TTS - Lee tus textos y PDFs en voz alta, sin límites",
    description:
      "Vórtex TTS, de Vortex Company: pega un texto, carga una nota o un PDF y escúchalo en voz alta con las voces de tu sistema. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex TTS - Lee tus textos y PDFs en voz alta, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
