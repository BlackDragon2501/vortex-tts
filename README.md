# Vórtex TTS

Vórtex TTS, de Vortex Company: pega un texto, carga una nota `.txt`/`.md` o un PDF y escúchalo en voz alta con las voces de tu propio sistema (Web Speech API), controlando velocidad, tono, voz y el fragmento actual con panel de lectura resaltado. El lector de PDF corre localmente (`public/pdfjs`). Tus archivos nunca salen de tu equipo. Gratis, sin anuncios y 100% local.

## Stack

- Next.js 16 + React 19 + Tailwind 4 + TypeScript
- Web Speech API del navegador + pdf.js UMD servido desde `public/pdfjs/`
- 100% local en el navegador, sin backend y sin variables de entorno

## Desarrollo

```bash
bun install
bun run dev
```

## Producción

```bash
bun run build
```

Vórtex TTS · Derechos Reservados © 2026 Vortex Company
