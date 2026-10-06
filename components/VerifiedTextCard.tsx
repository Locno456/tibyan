"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { BookOpen, Check, Copy, ExternalLink } from "lucide-react"
import { isDorarSearchUrl, normalizeSourceUrl } from "../lib/sourceLinks"

export type VerifiedTextKind = "quran" | "hadith"

interface VerifiedTextCardProps {
  kind: VerifiedTextKind
  text?: string
  displayText?: string
  onShowFullText?: () => void
  source?: string
  sourceUrl?: string
  grade?: string
  surah?: number
  ayah?: number
  index?: number
  ornament?: boolean
}

function getSurahName(source?: string) {
  if (!source) return ""
  const match = source.match(/سورة\s+(.+?)\s*-\s*(?:الآية|آيه|آية)\s*\d+/)
  return match?.[1]?.trim() || ""
}

function getDomain(url?: string) {
  if (!url) return ""
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand("copy")
    } catch {
      // تجاهل فشل النسخ في المتصفحات التي تمنعه.
    }
    document.body.removeChild(textarea)
  }
}

export default function VerifiedTextCard({
  kind,
  text = "",
  displayText,
  onShowFullText,
  source = "",
  sourceUrl,
  grade,
  surah,
  ayah,
  index = 0,
  ornament = false,
}: VerifiedTextCardProps) {
  const [copied, setCopied] = useState(false)
  const reduceMotion = useReducedMotion()
  const isQuran = kind === "quran"
  const visibleText = typeof displayText === "string" ? displayText : text
  const isPreview = visibleText !== text
  const addPresentationMarks = (value: string) => {
    const hasMarks = isQuran
      ? value.startsWith("﴿") && value.endsWith("﴾")
      : value.startsWith("«") && value.endsWith("»")
    if (hasMarks) return value
    return isQuran ? `﴿${value}﴾` : `«${value}»`
  }
  const quotedText = addPresentationMarks(visibleText)
  const fullQuotedText = addPresentationMarks(text)
  const surahName = isQuran ? getSurahName(source) : ""
  const quranReference = [
    surahName ? `سورة ${surahName}` : surah ? `سورة ${surah}` : "",
    ayah ? `الآية ${ayah}` : "",
  ].filter(Boolean).join(" · ")
  const usableUrl = sourceUrl ? normalizeSourceUrl(sourceUrl) : undefined
  const domain = getDomain(usableUrl)
  const accent = isQuran ? "#14529E" : "#18794E"
  const surface = isQuran ? "#F4F8FF" : "#F3FAF5"
  const border = isQuran ? "#D8E4F4" : "#D6E8DA"
  const copyValue = fullQuotedText

  const handleCopy = async () => {
    await copyText(copyValue)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.045 * index, duration: 0.28, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border bg-white shadow-[0_3px_14px_rgba(10,42,51,0.045)]"
      style={{ borderColor: border }}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isQuran && quranReference && (
            <span className="text-[12px] font-semibold text-[#435C6B]">{quranReference}</span>
          )}
          {!isQuran && grade && (
            <span className="rounded-full border border-[#D6E8DA] bg-[#F3FAF5] px-2 py-0.5 text-[11px] font-bold text-[#18794E]">
              {grade}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "تم نسخ النص" : `نسخ ${isQuran ? "الآية" : isPreview ? "الحديث كاملاً" : "الحديث"}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#DCE7E8] bg-white px-2.5 text-[11.5px] font-semibold text-[#536B73] transition-colors hover:border-[#0A8F94]/40 hover:text-[#0A8F94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]/30"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "نُسخ" : "نسخ"}
        </button>
      </div>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <div
          className="relative rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5"
          style={{ backgroundColor: surface, borderColor: border }}
        >
          {isQuran && ornament && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-2 h-1.5 w-1.5 rotate-45 rounded-[1px] bg-[#E0B450]"
            />
          )}
          <p
            className={`sacred text-right ${isQuran ? "text-[19px] leading-[2.05] sm:text-[21px]" : "text-[18px] leading-[1.95] sm:text-[20px]"}`}
            style={{ color: accent, fontFamily: "Amiri, serif" }}
          >
            {quotedText}
          </p>
        </div>

        {(source || sourceUrl) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {source && !isQuran && (
              <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-[#536B73]">
                {source}
              </span>
            )}
            {sourceUrl && (
              <a
                href={usableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold transition-colors hover:underline hover:underline-offset-4"
                style={{ color: accent }}
              >
                {isQuran ? "تحقق من الآية" : usableUrl && isDorarSearchUrl(usableUrl) ? "اعرض نتائج البحث عن النص (ليس رابط الحديث المباشر)" : "تحقق من المصدر"}
                {domain && <span className="font-normal opacity-75">· {domain}</span>}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {isPreview && onShowFullText && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E6EEEE] pt-2.5">
            <span className="text-[10.5px] text-[#72858A]">مقتطف لتسهيل القراءة</span>
            <button
              type="button"
              onClick={onShowFullText}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-bold text-[#0A8F94] transition-colors hover:bg-[#EEF8F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]/30"
            >
              <BookOpen size={14} aria-hidden="true" />
              النص الكامل وتفاصيل المصدر
            </button>
          </div>
        )}
      </div>
    </motion.article>
  )
}
