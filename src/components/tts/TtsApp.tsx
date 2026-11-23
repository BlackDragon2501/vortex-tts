'use client'

// Vortex TTS - Texto a voz con la Web Speech API del navegador.
// Carga .txt/.md o PDF (lector local), controla voces, velocidad y fragmento.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Square,
  Volume2,
  FileText,
  Upload,
  Save,
  Trash2,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  ListMusic,
} from 'lucide-react'
import {
  chunkText,
  deleteSavedText,
  estimateMinutes,
  extractPdfText,
  fmtBytes,
  fmtSavedAt,
  listVoices,
  loadSavedTexts,
  saveText,
  type VoiceInfo,
} from '@/lib/tts'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#fb923c'
const ACCENT2 = '#fdba74'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M20 21v6M24 18v12M28 20v8" stroke={ACCENT2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex TTS · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fdba74] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#fb923c] hover:bg-[#fdba74]'

type Source = 'paste' | 'file'

export default function TtsApp() {
  const [source, setSource] = useState<Source>('paste')
  const [text, setText] = useState('')
  const [docName, setDocName] = useState('')
  const [title, setTitle] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfPage, setPdfPage] = useState<{ page: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [idx, setIdx] = useState(0)
  const [saved, setSaved] = useState<{ id: string; title: string; text: string; savedAt: number }[]>([])
  const [mounted, setMounted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const chunksRef = useRef<string[]>([])

  // voces: cargan asíncronas en la mayoría de navegadores
  useEffect(() => {
    const refresh = () => setVoices(listVoices())
    refresh()
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh)
  }, [])

  useEffect(() => { setMounted(true); setSaved(loadSavedTexts()) }, [])

  const chunks = useMemo(() => chunkText(text), [text])
  chunksRef.current = chunks

  useEffect(() => {
    if (!voiceName && voices.length) {
      const es = voices.find((v) => v.lang.toLowerCase().startsWith('es'))
      setVoiceName((es ?? voices[0]).name)
    }
  }, [voices, voiceName])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setPlaying(false)
    setPaused(false)
    setIdx(0)
  }, [])

  // desmontar: silenciar siempre
  useEffect(() => () => { try { window.speechSynthesis.cancel() } catch {} }, [])

  const speakFrom = useCallback(
    (start: number) => {
      if (!('speechSynthesis' in window)) return
      const list = chunksRef.current
      if (!list.length) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(list[Math.min(start, list.length - 1)])
      const v = window.speechSynthesis.getVoices().find((x) => x.name === voiceName)
      if (v) utter.voice = v
      utter.rate = rate
      utter.pitch = pitch
      utter.onend = () => {
        setIdx((i) => {
          const next = Math.min(start + 1, list.length - 1)
          if (start + 1 < list.length && !window.speechSynthesis.paused) {
            window.setTimeout(() => speakFromRef.current?.(next), 30)
          } else {
            setPlaying(false)
            setPaused(false)
            return list.length - 1
          }
          return next
        })
      }
      utter.onerror = () => {
        setPlaying(false)
        setPaused(false)
      }
      window.speechSynthesis.speak(utter)
      setPlaying(true)
      setPaused(false)
      setIdx(start)
    },
    [voiceName, rate, pitch]
  )

  const speakFromRef = useRef(speakFrom)
  speakFromRef.current = speakFrom

  const play = () => {
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      return
    }
    speakFrom(idx >= chunks.length ? 0 : idx)
  }

  const pause = () => {
    window.speechSynthesis.pause()
    setPaused(true)
  }

  // desplazar el panel de lectura al fragmento activo
  useEffect(() => {
    const el = paneRef.current?.querySelector<HTMLElement>(`[data-chunk="${idx}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [idx])

  const onFile = useCallback(async (f: File | null) => {
    if (!f) return
    setError('')
    setPdfPage(null)
    const lower = f.name.toLowerCase()
    try {
      if (lower.endsWith('.pdf')) {
        setPdfBusy(true)
        const extracted = await extractPdfText(f, (page, total) => setPdfPage({ page, total }))
        setText(extracted)
        setDocName(f.name)
        if (!extracted.trim()) setError('El PDF no contiene texto seleccionable (parece escaneado): las voces necesitan texto real.')
      } else if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json') || f.type.startsWith('text/')) {
        const raw = await f.text()
        setText(raw)
        setDocName(f.name)
      } else {
        setError('Formato no soportado: usa .txt, .md o .pdf')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude leer el archivo')
    } finally {
      setPdfBusy(false)
    }
  }, [])

  const doSave = () => {
    setSaved(saveText(title || docName || 'Texto pegado', text))
    setTitle('')
  }

  const minutes = estimateMinutes(text)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex TTS <span className="font-normal text-[#9b9ba4]">· Escucha tus textos, sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">Lee notas y PDFs en voz alta con las voces de tu equipo · nada se sube a internet</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
        {mounted && !('speechSynthesis' in window) && (
          <div className="flex items-center gap-2 rounded-xl border border-[#7f1d1d] bg-[#1a1214] px-4 py-3 text-xs text-[#f87171]">
            <AlertTriangle className="h-4 w-4" /> Tu navegador no trae síntesis de voz (Web Speech API). Prueba con Chrome, Edge o Safari.
          </div>
        )}

        {/* fuente */}
        <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
              <FileText className="h-3.5 w-3.5" /> Fuente del texto
            </p>
            <div className="flex gap-1 rounded-lg border border-[#2b2b31] bg-[#0f0f10] p-1">
              {(
                [
                  { id: 'paste', label: 'Pegar' },
                  { id: 'file', label: 'Archivo (.txt/.md/.pdf)' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${source === s.id ? 'bg-[#26262b] text-[#ececf1]' : 'text-[#9b9ba4] hover:text-[#ececf1]'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {source === 'paste' ? (
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setDocName('') }}
              rows={7}
              placeholder="Pega aquí el texto que quieres escuchar…"
              className="w-full resize-y rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2.5 text-sm outline-none focus:border-[#fb923c]"
            />
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,text/*"
                hidden
                onChange={(e) => { void onFile(e.target.files?.[0] ?? null); e.currentTarget.value = '' }}
              />
              <button className={btnAccent} onClick={() => fileRef.current?.click()} disabled={pdfBusy}>
                <Upload className="h-3.5 w-3.5" /> {pdfBusy ? `Leyendo PDF ${pdfPage ? `${pdfPage.page}/${pdfPage.total}` : '…'}` : 'Elegir archivo'}
              </button>
              {docName && (
                <p className="mt-3 text-xs text-[#9b9ba4]">
                  {docName} · {fmtBytes(text.length)}
                </p>
              )}
            </div>
          )}

          {text && (
            <p className="mt-3 text-[11px] text-[#9b9ba4]">
              {chunks.length} fragmentos · ≈ {minutes < 1 ? '<1' : Math.round(minutes)} min de lectura · {text.length.toLocaleString('es')} caracteres
            </p>
          )}
        </div>

        {/* controles */}
        {chunks.length > 0 && (
          <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
              <Volume2 className="h-3.5 w-3.5" /> Voz y reproducción
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-[#9b9ba4]">
                Voz del sistema
                <select
                  value={voiceName}
                  onChange={(e) => { setVoiceName(e.target.value); if (playing || paused) speakFrom(idx) }}
                  className="mt-1.5 w-full rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2 text-sm text-[#ececf1] outline-none focus:border-[#fb923c]"
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[#9b9ba4]">
                Velocidad: <span className="font-mono text-[#ececf1]">{rate.toFixed(1)}×</span>
                <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="mt-2.5 w-full" />
              </label>
              <label className="text-xs text-[#9b9ba4]">
                Tono: <span className="font-mono text-[#ececf1]">{pitch.toFixed(1)}</span>
                <input type="range" min={0.5} max={2} step={0.1} value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="mt-2.5 w-full" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className={btnAccent} onClick={play} disabled={!('speechSynthesis' in window)}>
                {paused ? <Play className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {paused ? 'Continuar' : playing ? 'Reproduciendo…' : 'Reproducir'}
              </button>
              <button className={btn} onClick={pause} disabled={!playing || paused}>
                <Pause className="h-3.5 w-3.5" /> Pausa
              </button>
              <button className={btn} onClick={stop} disabled={!playing && !paused}>
                <Square className="h-3.5 w-3.5" /> Detener
              </button>
              <button className={btn} onClick={() => { if (paused) window.speechSynthesis.resume().catch?.(() => undefined); speakFrom(Math.max(0, idx - 1)) }} disabled={idx <= 0}>
                <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Anterior
              </button>
              <button className={btn} onClick={() => speakFrom(Math.min(chunks.length - 1, idx + 1))} disabled={idx >= chunks.length - 1}>
                <ChevronRight className="h-3.5 w-3.5" /> Siguiente
              </button>
              <button className={btn} onClick={doSave}>
                <Save className="h-3.5 w-3.5" /> Guardar texto
              </button>
            </div>
            {paused && <p className="mt-2 text-[11px] text-[#fdba74]">En pausa desde el fragmento {idx + 1}. Pulsa Continuar.</p>}

            {/* panel de lectura con fragmento resaltado */}
            <div ref={paneRef} className="mt-4 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-[#2b2b31] bg-[#0f0f10] p-3">
              {chunks.map((c, i) => (
                <p
                  key={i}
                  data-chunk={i}
                  className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-sm leading-relaxed transition-colors ${
                    i === idx ? 'bg-[#3a2415] text-[#fdba74]' : 'text-[#9b9ba4] hover:bg-[#1e1e22]'
                  }`}
                  onClick={() => speakFrom(i)}
                >
                  {c}
                </p>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#9b9ba4]">
              Haz clic en cualquier párrafo para leer desde ahí. Fragmento actual: {Math.min(idx + 1, chunks.length)}/{chunks.length}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-[#7f1d1d] bg-[#1a1214] px-4 py-3 text-xs text-[#f87171]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* textos guardados */}
        <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
            <ListMusic className="h-3.5 w-3.5" /> Textos guardados en tu equipo ({saved.length})
          </p>
          {saved.length === 0 ? (
            <p className="text-xs text-[#9b9ba4]">Guarda textos para volver a escucharlos luego: se quedan solo en este navegador.</p>
          ) : (
            <div className="space-y-1.5">
              {saved.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#fdba74]" />
                  <button
                    className="min-w-0 flex-1 truncate text-left text-xs hover:underline"
                    title={`${s.title} · ${fmtSavedAt(s.savedAt)}`}
                    onClick={() => { setText(s.text); setDocName(''); setSource('paste'); setIdx(0); stop() }}
                  >
                    {s.title}
                  </button>
                  <span className="shrink-0 text-[10px] text-[#9b9ba4]">{fmtSavedAt(s.savedAt)}</span>
                  <button className="shrink-0 text-[#9b9ba4] hover:text-[#f87171]" title="Borrar" onClick={() => setSaved(deleteSavedText(s.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
