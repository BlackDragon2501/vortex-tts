// Vortex TTS - Lee en voz alta tus textos, notas y PDFs con la Web Speech API.
// El lector de PDF vive en public/pdfjs (UMD local); todo corre en tu navegador.

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
}

/** voces disponibles ordenando primero las españolas */
export function listVoices(): VoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  const all = window.speechSynthesis.getVoices()
  return all
    .map((v) => ({ name: v.name, lang: v.lang, localService: v.localService }))
    .sort((a, b) => {
      const esA = a.lang.toLowerCase().startsWith('es') ? 0 : 1
      const esB = b.lang.toLowerCase().startsWith('es') ? 0 : 1
      if (esA !== esB) return esA - esB
      if (a.localService !== b.localService) return a.localService ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

/** divide un texto en fragmentos hablables (frases de hasta ~220 caracteres) */
export function chunkText(text: string, max = 220): string[] {
  const clean = text.replace(/\r\n?/g, '\n').replace(/\u00ad/g, '').trim()
  if (!clean) return []
  const pieces: string[] = []
  for (const paragraph of clean.split(/\n{2,}/)) {
    const sentences = paragraph
      .replace(/([.!?…])\s+/g, '$1\u0000')
      .split('\n')
      .flatMap((l) => l.replace(/\u0000/g, ' ').split(/(?<=[.!?…])\s+/))
    let buf = ''
    const push = () => {
      const t = buf.trim()
      if (t) pieces.push(t)
      buf = ''
    }
    for (let s of sentences) {
      s = s.trim()
      if (!s) continue
      while (s.length > max) {
        // fragmento demasiado largo: corta por espacio cercano al límite
        let cut = s.lastIndexOf(' ', max)
        if (cut < max * 0.5) cut = max
        buf += s.slice(0, cut)
        push()
        s = s.slice(cut).trim()
      }
      if ((buf + ' ' + s).trim().length > max) push()
      buf = buf ? buf + ' ' + s : s
    }
    push()
  }
  return pieces
}

/** estima la duración hablada en minutos a ~150 palabras por minuto */
export function estimateMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return words / 150
}

// ---------- lector de PDF (UMD en public/pdfjs) ----------

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument(src: { data: Uint8Array }): {
        promise: Promise<PdfDocLike>
      }
    }
  }
}

interface PdfDocLike {
  numPages: number
  getPage(n: number): Promise<PdfPageLike>
  destroy(): Promise<void>
}

interface PdfPageLike {
  getTextContent(): Promise<{
    items: { str?: string; hasEOL?: boolean }[]
  }>
}

let pdfScriptLoading: Promise<void> | null = null

/** carga el UMD de pdf.js servido por la propia app */
async function ensurePdfJs(): Promise<void> {
  if (typeof window === 'undefined') return
  if (window.pdfjsLib) return
  if (!pdfScriptLoading) {
    pdfScriptLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = '/pdfjs/pdf.min.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('No pude cargar el lector de PDF local'))
      document.head.appendChild(s)
    })
  }
  await pdfScriptLoading
  if (!window.pdfjsLib) throw new Error('El lector de PDF no quedó disponible')
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
}

/** extrae el texto de un PDF página por página, 100% local */
export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<string> {
  await ensurePdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await window.pdfjsLib!.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      text += item.str ?? ''
      if (item.hasEOL) text += '\n'
      else text += ' '
    }
    pages.push(text.trim())
    onProgress?.(i, pdf.numPages)
  }
  await pdf.destroy()
  return pages
    .map((t, i) => (t ? `— Página ${i + 1} —\n${t}` : `— Página ${i + 1} (sin texto) —`))
    .join('\n\n')
}

// ---------- guardado local de textos ----------

const STORE_KEY = 'vortex-tts-texts'

export interface SavedText {
  id: string
  title: string
  text: string
  savedAt: number
}

export function loadSavedTexts(): SavedText[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as SavedText[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveText(title: string, text: string): SavedText[] {
  const item: SavedText = {
    id: Math.random().toString(36).slice(2, 10),
    title: title.trim() || 'Texto sin título',
    text,
    savedAt: Date.now(),
  }
  const list = [item, ...loadSavedTexts()].slice(0, 60)
  localStorage.setItem(STORE_KEY, JSON.stringify(list))
  return list
}

export function deleteSavedText(id: string): SavedText[] {
  const list = loadSavedTexts().filter((t) => t.id !== id)
  localStorage.setItem(STORE_KEY, JSON.stringify(list))
  return list
}

export function fmtSavedAt(ts: number): string {
  return new Date(ts).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}
