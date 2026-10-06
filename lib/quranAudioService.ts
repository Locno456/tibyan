import {
  AudioReciterOption,
  getSurahMetadata,
  getVerifiedAyah,
  matchAudioReciter,
  QURAN_SURAHS,
} from "./quranAudio"

export interface QuranAudioTrack {
  ayah: number
  globalAyah: number
  audioUrl: string
  downloadUrl: string
}

export interface QuranAudioCard {
  surahNumber: number
  surahName: string
  fromAyah: number
  toAyah: number
  reciter: AudioReciterOption
  tracks: QuranAudioTrack[]
  source: string
  sourceUrl: string
}

const RECITER_CATALOG_URL = "https://api.alquran.cloud/v1/edition/format/audio"
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio/128"
const RECITER_CACHE_MS = 6 * 60 * 60 * 1000

const FALLBACK_RECITERS: AudioReciterOption[] = [
  { id: "ar.alafasy", name: "مشاري العفاسي", englishName: "Alafasy" },
  { id: "ar.husary", name: "محمود خليل الحصري", englishName: "Husary" },
  { id: "ar.abdurrahmaansudais", name: "عبدالرحمن السديس", englishName: "Abdurrahmaan As-Sudais" },
  { id: "ar.mahermuaiqly", name: "ماهر المعيقلي", englishName: "Maher Al Muaiqly" },
  { id: "ar.hudhaify", name: "علي بن عبدالرحمن الحذيفي", englishName: "Hudhaify" },
  { id: "ar.muhammadayyoub", name: "محمد أيوب", englishName: "Muhammad Ayyoub" },
  { id: "ar.shaatree", name: "أبو بكر الشاطري", englishName: "Abu Bakr Ash-Shaatree" },
]

let reciterCache: { expiresAt: number; reciters: AudioReciterOption[] } | undefined
let reciterRequest: Promise<AudioReciterOption[]> | undefined

function withTimeout(timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, dispose: () => clearTimeout(timer) }
}

function trustedReciterImage(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const trustedHosts = ["alquran.cloud", "islamhouse.com", "islamic-content.com", "mp3quran.net"]
    return trustedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url.toString() : null
  } catch {
    return null
  }
}

async function fetchReciterCatalog(): Promise<AudioReciterOption[]> {
  const now = Date.now()
  if (reciterCache && now < reciterCache.expiresAt) return reciterCache.reciters
  if (reciterRequest) return reciterRequest

  reciterRequest = (async () => {
    const { signal, dispose } = withTimeout(5_000)
    try {
      const response = await fetch(RECITER_CATALOG_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      })
      if (!response.ok) throw new Error(`Quran audio catalog HTTP ${response.status}`)
      const json: any = await response.json()
      const rows = Array.isArray(json?.data) ? json.data : []
      const options: AudioReciterOption[] = []
      const seen = new Set<string>()

      for (const row of rows) {
        if (row?.format !== "audio" || row?.language !== "ar" || row?.type !== "versebyverse") continue
        if (typeof row.identifier !== "string" || !/^ar\.[a-z0-9][a-z0-9.-]{0,48}$/i.test(row.identifier)) continue
        const key = String(row.identifier).toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        options.push({
          id: row.identifier,
          name: typeof row.name === "string" ? row.name : String(row.englishName || row.identifier),
          englishName: typeof row.englishName === "string" ? row.englishName : String(row.name || row.identifier),
          imageUrl: trustedReciterImage(row.imageUrl || row.image || row.picture || row.photo),
          source: "Quran Cloud",
        })
      }

      const reciters = options.length ? options : FALLBACK_RECITERS
      reciterCache = { expiresAt: now + RECITER_CACHE_MS, reciters }
      return reciters
    } catch {
      reciterCache = { expiresAt: now + 60_000, reciters: FALLBACK_RECITERS }
      return FALLBACK_RECITERS
    } finally {
      dispose()
      reciterRequest = undefined
    }
  })()

  return reciterRequest
}

export async function getQuranAudioOptions(): Promise<{
  surahs: typeof QURAN_SURAHS
  reciters: AudioReciterOption[]
  source: string
}> {
  const reciters = await fetchReciterCatalog()
  return {
    surahs: QURAN_SURAHS,
    reciters,
    source: reciters === FALLBACK_RECITERS ? "Quran Cloud · قائمة قراء احتياطية" : "Quran Cloud",
  }
}

function buildFileUrl(edition: string, globalAyah: number, download = false): string {
  const query = new URLSearchParams({ mode: "file", edition, ayah: String(globalAyah) })
  if (download) query.set("download", "1")
  return `/api/quran/audio?${query.toString()}`
}

export async function resolveQuranAudioClip(input: {
  surahNumber: number
  fromAyah?: number
  toAyah?: number
  reciterId: string
}): Promise<QuranAudioCard> {
  const surah = getSurahMetadata(input.surahNumber)
  if (!surah) throw new Error("رقم السورة غير صحيح")

  const fromAyah = input.fromAyah ?? 1
  const toAyah = input.toAyah ?? surah.ayahCount
  if (!Number.isInteger(fromAyah) || !Number.isInteger(toAyah) || fromAyah < 1 || toAyah < fromAyah || toAyah > surah.ayahCount) {
    throw new Error(`نطاق الآيات يجب أن يكون بين 1 و${surah.ayahCount}`)
  }

  const reciters = await fetchReciterCatalog()
  const reciter = reciters.find((item) => item.id === input.reciterId)
  if (!reciter) throw new Error("القارئ غير موجود في فهرس التلاوات المتاح")

  const tracks: QuranAudioTrack[] = []
  for (let ayah = fromAyah; ayah <= toAyah; ayah += 1) {
    const verified = getVerifiedAyah(input.surahNumber, ayah)
    if (!verified) throw new Error(`تعذر التحقق من الآية ${ayah} في ملف القرآن المحلي`)
    tracks.push({
      ayah,
      globalAyah: verified.globalNumber,
      audioUrl: buildFileUrl(reciter.id, verified.globalNumber),
      downloadUrl: buildFileUrl(reciter.id, verified.globalNumber, true),
    })
  }

  return {
    surahNumber: surah.number,
    surahName: surah.name,
    fromAyah,
    toAyah,
    reciter,
    tracks,
    source: "Quran Cloud · تلاوات آية بآية",
    sourceUrl: "https://alquran.cloud/",
  }
}

export async function resolveAudioRequest(input: {
  surahNumber?: number
  fromAyah?: number
  toAyah?: number
  reciterQuery?: string
}): Promise<QuranAudioCard | null> {
  if (!input.surahNumber) return null
  const reciters = await fetchReciterCatalog()
  const reciter = matchAudioReciter(reciters, input.reciterQuery)
  if (!reciter) return null
  return resolveQuranAudioClip({
    surahNumber: input.surahNumber,
    fromAyah: input.fromAyah,
    toAyah: input.toAyah,
    reciterId: reciter.id,
  })
}

export function isAllowedAudioEdition(edition: string): boolean {
  return /^ar\.[a-z0-9][a-z0-9.-]{0,48}$/i.test(edition) && !edition.includes("..") && !edition.includes("/") && !edition.includes("\\")
}

export function getAudioCdnUrl(edition: string, globalAyah: number): string {
  if (!isAllowedAudioEdition(edition) || !Number.isInteger(globalAyah) || globalAyah < 1 || globalAyah > 6236) {
    throw new Error("معرّف الصوت غير صالح")
  }
  return `${AUDIO_CDN}/${encodeURIComponent(edition)}/${globalAyah}.mp3`
}
