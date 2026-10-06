"use client"

import { useEffect, useMemo, useState } from "react"
import { LoaderCircle, Music2, Play, RefreshCw } from "lucide-react"
import QuranAudioPlayer from "./QuranAudioPlayer"

interface SurahOption {
  number: number
  name: string
  ayahCount: number
}

interface ReciterOption {
  id: string
  name: string
  englishName: string
  imageUrl?: string | null
}

interface ParsedAudioRequest {
  surahNumber?: number
  fromAyah?: number
  toAyah?: number
  reciterQuery?: string
}

interface QuranAudioCardData {
  surahNumber: number
  surahName: string
  fromAyah: number
  toAyah: number
  reciter: ReciterOption
  tracks: Array<{ ayah: number; globalAyah: number; audioUrl: string; downloadUrl: string }>
  source: string
  sourceUrl: string
}

interface AudioOptionsResponse {
  surahs: SurahOption[]
  reciters: ReciterOption[]
  source: string
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0621-\u064A\u0660-\u0669\u0671\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findReciter(reciters: ReciterOption[], query?: string): ReciterOption | undefined {
  if (!query) return undefined
  const target = normalize(query)
  const matches = reciters.map((reciter) => {
    const names = [reciter.name, reciter.englishName].map(normalize)
    const score = Math.max(...names.map((name) =>
      name === target ? 1 : name.includes(target) || target.includes(name) ? 0.85 : 0
    ))
    return { reciter, score }
  }).sort((a, b) => b.score - a.score)
  return matches[0]?.score >= 0.5 ? matches[0].reciter : undefined
}

export default function QuranAudioRequestCard({ initialRequest }: { initialRequest: ParsedAudioRequest }) {
  const [options, setOptions] = useState<AudioOptionsResponse | null>(null)
  const [selectedSurah, setSelectedSurah] = useState(initialRequest.surahNumber ? String(initialRequest.surahNumber) : "")
  const [fromAyah, setFromAyah] = useState(initialRequest.fromAyah ? String(initialRequest.fromAyah) : "1")
  const [toAyah, setToAyah] = useState(initialRequest.toAyah ? String(initialRequest.toAyah) : "")
  const [selectedReciter, setSelectedReciter] = useState("")
  const [reciterQuery, setReciterQuery] = useState(initialRequest.reciterQuery || "")
  const [audioCard, setAudioCard] = useState<QuranAudioCardData | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const selectedSurahMeta = useMemo(
    () => options?.surahs.find((surah) => String(surah.number) === selectedSurah),
    [options, selectedSurah]
  )

  useEffect(() => {
    let active = true
    fetch("/api/quran/audio?mode=options")
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok) throw new Error(json?.error || "تعذّر تحميل خيارات التلاوة")
        return json as AudioOptionsResponse
      })
      .then((json) => {
        if (!active) return
        setOptions(json)
        setLoadingOptions(false)
        if (!selectedReciter && initialRequest.reciterQuery) {
          const match = findReciter(json.reciters || [], initialRequest.reciterQuery)
          if (match) setSelectedReciter(match.id)
        }
        const surah = json.surahs?.find((item) => item.number === initialRequest.surahNumber)
        if (surah && !initialRequest.toAyah) setToAyah(String(surah.ayahCount))
      })
      .catch((loadError) => {
        if (!active) return
        setLoadingOptions(false)
        setError(loadError?.message || "تعذّر تحميل خيارات التلاوة")
      })
    return () => { active = false }
    // The options are fetched once; initial values are intentionally captured for this message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSurahChange = (value: string) => {
    setSelectedSurah(value)
    const surah = options?.surahs.find((item) => String(item.number) === value)
    setFromAyah("1")
    setToAyah(surah ? String(surah.ayahCount) : "")
    setAudioCard(null)
    setError("")
  }

  const createAudio = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setAudioCard(null)

    if (!selectedSurah || !selectedReciter) {
      setError("اختر السورة والقارئ أولاً.")
      return
    }

    const from = Number(fromAyah || 1)
    const to = Number(toAyah || selectedSurahMeta?.ayahCount || 0)
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > (selectedSurahMeta?.ayahCount || 0)) {
      setError(`أدخل نطاقاً صحيحاً بين 1 و${selectedSurahMeta?.ayahCount || "عدد آيات السورة"}.`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/quran/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surahNumber: Number(selectedSurah),
          fromAyah: from,
          toAyah: to,
          reciterId: selectedReciter,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json?.audioCard) throw new Error(json?.error || "تعذّر إعداد التلاوة")
      setAudioCard(json.audioCard)
    } catch (requestError: any) {
      setError(requestError?.message || "تعذّر إعداد التلاوة الآن.")
    } finally {
      setSubmitting(false)
    }
  }

  const reciter = options?.reciters.find((item) => item.id === selectedReciter)

  return (
    <section
      dir="rtl"
      aria-label="طلب تلاوة قرآنية"
      className="mt-4 rounded-2xl border border-[#C9DFE1] bg-white p-4 shadow-[0_4px_16px_rgba(10,42,51,0.045)] sm:p-4.5"
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F5] text-[#0A8F94]">
          <Music2 size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13.5px] font-extrabold text-[#0A2A33]">جهّز التلاوة</h4>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#647C83]">
            اختر سورة أو نطاق آيات وقارئاً؛ يمكنك تشغيل الآيات بالتتابع وتنزيل كل آية.
          </p>
        </div>
      </div>

      <form onSubmit={createAudio} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-[11.5px] font-semibold text-[#45616A]">
          السورة
          <select
            value={selectedSurah}
            onChange={(event) => handleSurahChange(event.target.value)}
            disabled={loadingOptions}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[13px] text-[#0A2A33] outline-none focus:border-[#0A8F94] focus:ring-2 focus:ring-[#0A8F94]/15 disabled:bg-[#F7FAFA]"
          >
            <option value="">اختر السورة</option>
            {(options?.surahs || []).map((surah) => (
              <option key={surah.number} value={surah.number}>
                {surah.number}. {surah.name} · {surah.ayahCount} آية
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11.5px] font-semibold text-[#45616A]">
          القارئ
          <select
            value={selectedReciter}
            onChange={(event) => { setSelectedReciter(event.target.value); setAudioCard(null) }}
            disabled={loadingOptions}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[13px] text-[#0A2A33] outline-none focus:border-[#0A8F94] focus:ring-2 focus:ring-[#0A8F94]/15 disabled:bg-[#F7FAFA]"
          >
            <option value="">{reciterQuery ? `ابحث عن: ${reciterQuery}` : "اختر القارئ"}</option>
            {(options?.reciters || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.englishName && item.englishName !== item.name ? ` · ${item.englishName}` : ""}
              </option>
            ))}
          </select>
          {reciterQuery && !reciter && !loadingOptions && (
            <span className="mt-1 block text-[10.5px] font-normal text-[#8A6B2C]">لم يطابق الاسم قارئاً تلقائياً؛ اختر الأقرب من القائمة.</span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          <label className="block text-[11.5px] font-semibold text-[#45616A]">
            من الآية
            <input
              type="number"
              min={1}
              max={selectedSurahMeta?.ayahCount || 286}
              value={fromAyah}
              onChange={(event) => { setFromAyah(event.target.value); setAudioCard(null) }}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[13px] text-[#0A2A33] outline-none focus:border-[#0A8F94] focus:ring-2 focus:ring-[#0A8F94]/15"
            />
          </label>
          <label className="block text-[11.5px] font-semibold text-[#45616A]">
            إلى الآية
            <input
              type="number"
              min={1}
              max={selectedSurahMeta?.ayahCount || 286}
              value={toAyah}
              onChange={(event) => { setToAyah(event.target.value); setAudioCard(null) }}
              placeholder={selectedSurahMeta ? String(selectedSurahMeta.ayahCount) : "حتى نهاية السورة"}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E6E6] bg-white px-2.5 text-[13px] text-[#0A2A33] outline-none focus:border-[#0A8F94] focus:ring-2 focus:ring-[#0A8F94]/15"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          {selectedSurahMeta && (
            <span className="text-[10.5px] text-[#82969B]">عدد آيات سورة {selectedSurahMeta.name}: {selectedSurahMeta.ayahCount}</span>
          )}
          <button
            type="submit"
            disabled={loadingOptions || submitting}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0A8F94] px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-[#05495A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]/30 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : audioCard ? <RefreshCw size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {submitting ? "جارٍ تجهيز التلاوة" : audioCard ? "تحديث التلاوة" : "تشغيل المقطع"}
          </button>
        </div>
      </form>

      {loadingOptions && (
        <p className="mt-2 text-[11px] text-[#82969B]">جارٍ تحميل السور والقراء…</p>
      )}
      {!loadingOptions && options?.source && (
        <p className="mt-2 text-[10.5px] text-[#82969B]">مصدر قائمة القراء: {options.source}</p>
      )}
      {error && <p role="status" className="mt-2 text-[11.5px] leading-relaxed text-[#9A6700]">{error}</p>}
      {audioCard && <QuranAudioPlayer card={audioCard} />}
    </section>
  )
}
