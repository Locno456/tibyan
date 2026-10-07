"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Headphones, Image as ImageIcon, SkipBack, SkipForward } from "lucide-react"

interface QuranAudioTrack {
  ayah: number
  globalAyah: number
  audioUrl: string
  downloadUrl: string
}

interface QuranAudioCard {
  surahNumber: number
  surahName: string
  fromAyah: number
  toAyah: number
  reciter: { id: string; name: string; englishName: string; imageUrl?: string | null }
  tracks: QuranAudioTrack[]
  source: string
  sourceUrl: string
}

function safeImageUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    const host = url.hostname.toLowerCase()
    const trusted = ["islamhouse.com", "islamic-content.com", "tafsir.net", "alquran.cloud", "mp3quran.net"]
    return trusted.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url.toString() : null
  } catch {
    return null
  }
}

export default function QuranAudioPlayer({ card }: { card: QuranAudioCard }) {
  const [trackIndex, setTrackIndex] = useState(0)
  const [continuePlayback, setContinuePlayback] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrack = card.tracks[trackIndex]
  const imageUrl = safeImageUrl(card.reciter?.imageUrl)

  useEffect(() => {
    if (!continuePlayback) return
    const audio = audioRef.current
    if (!audio) return
    void audio.play().catch(() => undefined)
    setContinuePlayback(false)
  }, [trackIndex, continuePlayback])

  useEffect(() => {
    setTrackIndex(0)
    setContinuePlayback(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [card.surahNumber, card.reciter.id, card.fromAyah, card.toAyah])

  if (!card.tracks?.length || !currentTrack) return null

  const moveTrack = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(card.tracks.length - 1, trackIndex + direction))
    if (next === trackIndex) return
    setTrackIndex(next)
    setContinuePlayback(true)
  }

  const handleEnded = () => {
    if (trackIndex < card.tracks.length - 1) {
      setTrackIndex((index) => index + 1)
      setContinuePlayback(true)
    }
  }

  return (
    <section
      dir="rtl"
      aria-label="مشغل تلاوة القرآن"
      className="mt-4 overflow-hidden rounded-2xl border border-[#C9DFE1] bg-gradient-to-br from-white via-[#F7FCFB] to-[#EFF8F7] shadow-[0_5px_18px_rgba(10,42,51,0.06)]"
    >
      <div className="flex items-center gap-3 border-b border-[#DDEAEA] px-4 py-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`صورة القارئ ${card.reciter.name}`}
            className="h-11 w-11 shrink-0 rounded-full border border-[#C9DFE1] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9DFE1] bg-[#EAF7F5] text-[#0A8F94]">
            <Headphones size={19} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[13.5px] font-extrabold text-[#0A2A33]">
            سورة {card.surahName} · الآيات {card.fromAyah}–{card.toAyah}
          </h4>
          <p className="mt-0.5 truncate text-[11.5px] text-[#647C83]">
            القارئ: {card.reciter.name} <span dir="ltr">· {card.reciter.englishName}</span>
          </p>
        </div>
        {!imageUrl && (
          <span className="hidden items-center gap-1 text-[10px] text-[#8AA0A5] sm:inline-flex" title="لا تتوفر صورة موثقة للقارئ">
            <ImageIcon size={13} aria-hidden="true" />
            دون صورة موثقة
          </span>
        )}
      </div>

      <div className="space-y-3 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#536B73]">
          <span>الآية {currentTrack.ayah}</span>
          <span>{trackIndex + 1} من {card.tracks.length}</span>
        </div>
        <audio
          key={currentTrack.audioUrl}
          ref={audioRef}
          controls
          preload="none"
          src={currentTrack.audioUrl}
          onEnded={handleEnded}
          className="h-10 w-full accent-[#0A8F94]"
          aria-label={`تلاوة الآية ${currentTrack.ayah} بصوت ${card.reciter.name}`}
        >
          متصفحك لا يدعم تشغيل الصوت.
        </audio>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => moveTrack(-1)}
              disabled={trackIndex === 0}
              aria-label="الآية السابقة"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[11px] font-semibold text-[#45616A] transition-colors hover:border-[#0A8F94]/40 hover:text-[#0A8F94] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipBack size={15} aria-hidden="true" /> السابقة
            </button>
            <button
              type="button"
              onClick={() => moveTrack(1)}
              disabled={trackIndex === card.tracks.length - 1}
              aria-label="الآية التالية"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[11px] font-semibold text-[#45616A] transition-colors hover:border-[#0A8F94]/40 hover:text-[#0A8F94] disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالية <SkipForward size={15} aria-hidden="true" />
            </button>
          </div>
          <a
            href={currentTrack.downloadUrl}
            download
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A8F94] px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-[#05495A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]/35 focus-visible:ring-offset-2"
          >
            <Download size={14} aria-hidden="true" /> تنزيل الآية
          </a>
        </div>

        {card.tracks.length > 1 && (
          <details className="group border-t border-[#E2ECEC] pt-2.5">
            <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-[#0A8F94] hover:text-[#05495A]">
              تنزيل آية أخرى من المقطع
            </summary>
            <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
              {card.tracks.map((track, index) => (
                <a
                  key={track.ayah}
                  href={track.downloadUrl}
                  download
                  onClick={() => setTrackIndex(index)}
                  className="rounded-md border border-[#D7E6E6] bg-white px-2 py-1 text-[10.5px] font-medium text-[#536B73] hover:border-[#0A8F94]/40 hover:text-[#0A8F94]"
                  aria-label={`تنزيل الآية ${track.ayah}`}
                >
                  {track.ayah}
                </a>
              ))}
            </div>
          </details>
        )}

        <a
          href={card.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-[10.5px] text-[#82969B] underline decoration-[#C9DFE1] underline-offset-2 hover:text-[#0A8F94]"
        >
          مصدر ملفات الصوت: {card.source}
        </a>
      </div>
    </section>
  )
}
