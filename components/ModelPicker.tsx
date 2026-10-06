"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, CircleAlert, LoaderCircle, RefreshCw, Search, X, Zap } from "lucide-react"
import type { AIModelCatalog, AIModelInfo, AIModelSelection, AIProviderInfo } from "../lib/aiProviderTypes"
import ProviderLogo from "./ProviderLogo"

interface ModelPickerProps {
  open: boolean
  selected?: AIModelSelection | null
  onSelect: (selection: AIModelSelection) => void
  onDefaultSelection?: (selection: AIModelSelection) => void
  onClose: () => void
}

type ProbeState = { status: "working" | "failed" | "probing"; message?: string; latencyMs?: number }

function contextLabel(value?: number): string {
  if (!value || !Number.isFinite(value)) return "حجم السياق غير متاح من API المزود"
  return `نافذة السياق: ${new Intl.NumberFormat("ar").format(value)} رمز`
}

function modelKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`
}

export default function ModelPicker({ open, selected, onSelect, onDefaultSelection, onClose }: ModelPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [catalog, setCatalog] = useState<AIModelCatalog | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [probeStates, setProbeStates] = useState<Record<string, ProbeState>>({})

  useEffect(() => setMounted(true), [])

  const loadCatalog = useCallback(async (refresh = false) => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch(`/api/models${refresh ? "?refresh=1" : ""}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "تعذّر تحميل قائمة النماذج")
      const nextCatalog = data as AIModelCatalog
      setCatalog(nextCatalog)
      if (!selected && nextCatalog.defaultSelection) onDefaultSelection?.(nextCatalog.defaultSelection)
    } catch (error: any) {
      setLoadError(String(error?.message || error).slice(0, 220))
    } finally {
      setLoading(false)
    }
  }, [onDefaultSelection, selected])

  useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }
    void loadCatalog(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, loadCatalog, onClose])

  const filteredProviders = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    return (catalog?.providers || []).map((provider) => ({
      ...provider,
      models: [...provider.models]
        .filter((model) => !needle || `${provider.name} ${provider.shortName} ${model.name} ${model.id}`.toLocaleLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name, "ar", { sensitivity: "base" }) || a.id.localeCompare(b.id)),
    })).filter((provider) => provider.models.length > 0 || (provider.status === "error" && !needle))
  }, [catalog, search])

  const refresh = () => {
    setProbeStates({})
    void loadCatalog(true)
  }

  const probeModel = async (provider: AIProviderInfo, model: AIModelInfo) => {
    const key = modelKey(provider.id, model.id)
    setProbeStates((previous) => ({ ...previous, [key]: { status: "probing" } }))
    try {
      const response = await fetch("/api/models/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id, modelId: model.id }),
      })
      const result = await response.json()
      if (!response.ok || !result?.ok) throw new Error(result?.error || "فشل اختبار الاتصال")
      setProbeStates((previous) => ({
        ...previous,
        [key]: { status: "working", message: "نجح اختبار توليد فعلي", latencyMs: result.latencyMs },
      }))
    } catch (error: any) {
      setProbeStates((previous) => ({
        ...previous,
        [key]: { status: "failed", message: String(error?.message || error).slice(0, 180) },
      }))
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center sm:p-4" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق نافذة اختيار النموذج"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#071F27]/45 backdrop-blur-[3px]"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-picker-title"
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-[1] flex max-h-[90dvh] w-full max-w-[820px] flex-col overflow-hidden rounded-t-[22px] border border-[#C9DFE1]/80 bg-[#FBFEFD] shadow-[0_24px_70px_rgba(10,42,51,0.25)] sm:rounded-[20px]"
          >
            <div className="h-1 w-full shrink-0 bg-gradient-to-l from-[#19D6C4] via-[#0A8F94] to-[#14529E]" />
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#C9DFE1]/60 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EAF6F5] text-[#0A8F94]">
                  <Zap size={19} />
                </div>
                <div className="min-w-0">
                  <h2 id="model-picker-title" className="text-[16px] font-extrabold text-[#0A2A33] sm:text-[18px]">مزود النموذج والنموذج</h2>
                  <p className="mt-0.5 text-[11.5px] text-[#6D8A90] sm:text-[12px]">قائمة من مفاتيح الخادم والنماذج التي يعيدها API المزود</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#C9DFE1] bg-white px-2.5 text-[11px] font-bold text-[#0A8F94] transition-colors hover:bg-[#EFF9F7] disabled:opacity-60 sm:px-3 sm:text-[12px]"
                  title="إعادة جلب النماذج وحالة واجهة المزود"
                >
                  {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span className="hidden min-[420px]:inline">تحديث القائمة</span>
                  <span className="min-[420px]:hidden">تحديث</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C9DFE1] bg-white text-[#4B6A72] transition-colors hover:bg-[#EEF6F6]"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="shrink-0 px-4 pt-4 sm:px-6">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#C9DFE1] bg-white px-3.5 focus-within:border-[#0A8F94] focus-within:ring-2 focus-within:ring-[#0A8F94]/10">
                <Search size={17} className="shrink-0 text-[#7B969B]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المزود أو النموذج…"
                  aria-label="البحث عن مزود أو نموذج"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#0A2A33] outline-none placeholder:text-[#9CB3B7]"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث" className="text-[#799196] hover:text-[#0A2A33]">
                    <X size={15} />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 tb-scroll sm:px-6">
              <p className="mb-3 text-[11px] leading-relaxed text-[#70888D]">
                المفاتيح لا تُرسل إلى المتصفح. النقطة الفيروزية تعني أن النموذج ظهر في قائمة المزود، ولا تثبت نجاح التوليد؛ استخدم «اختبار» لفحص اتصال فعلي.
              </p>

              {loading && !catalog && (
                <div className="flex items-center justify-center gap-2 py-12 text-[13px] font-semibold text-[#0A8F94]">
                  <LoaderCircle size={18} className="animate-spin" /> جارٍ جلب النماذج من المزودات المهيأة…
                </div>
              )}
              {loadError && (
                <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] leading-relaxed text-rose-800">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" /> {loadError}
                </div>
              )}

              {!loading && catalog && catalog.providers.length === 0 && (
                <div className="rounded-2xl border border-[#C9DFE1] bg-white p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF6F5] text-[#0A8F94]">
                    <Zap size={21} />
                  </div>
                  <h3 className="mt-3 text-[14px] font-extrabold text-[#0A2A33]">لا يوجد مزود مهيأ بعد</h3>
                  <p className="mx-auto mt-1.5 max-w-[520px] text-[12px] leading-relaxed text-[#667F85]">
                    أضف مفتاحاً في متغيرات البيئة على الخادم — مثل <code className="rounded bg-[#F0F6F6] px-1" dir="ltr">GEMINI_API_KEY</code> أو <code className="rounded bg-[#F0F6F6] px-1" dir="ltr">OPENAI_API_KEY</code> — ثم أعد تحميل القائمة. لا تضع المفتاح في المتصفح.
                  </p>
                </div>
              )}

              {catalog?.providers.length === 0 && loadError && (
                <div className="py-6 text-center text-[12px] text-[#728A90]">تحقق من إعدادات الخادم ثم أعد المحاولة.</div>
              )}

              {catalog && catalog.providers.length > 0 && filteredProviders.length === 0 && !loadError && (
                <div className="py-12 text-center text-[13px] text-[#728A90]">لا توجد نماذج تطابق بحثك.</div>
              )}

              <div className="space-y-5">
                {filteredProviders.map((provider) => (
                  <ProviderGroup
                    key={provider.id}
                    provider={provider}
                    selected={selected}
                    probeStates={probeStates}
                    onSelect={onSelect}
                    onProbe={probeModel}
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#C9DFE1]/70 bg-white/80 px-4 py-3 text-[10.5px] text-[#7A9297] sm:px-6">
              <span className="min-w-0 truncate">نافذة السياق تظهر فقط إذا أعادها API؛ لا تُقدّر يدوياً.</span>
              <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#0A8F94] hover:underline">
                إغلاق <ChevronDown size={13} className="-rotate-90" />
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ProviderGroup({
  provider,
  selected,
  probeStates,
  onSelect,
  onProbe,
}: {
  provider: AIProviderInfo & { models: AIModelInfo[] }
  selected?: AIModelSelection | null
  probeStates: Record<string, ProbeState>
  onSelect: (selection: AIModelSelection) => void
  onProbe: (provider: AIProviderInfo, model: AIModelInfo) => void
}) {
  return (
    <section aria-label={`نماذج ${provider.name}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProviderLogo providerId={provider.id} size={29} />
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-extrabold text-[#0A2A33]">{provider.name}</h3>
            <p className="text-[10.5px] text-[#789196]">{provider.models.length ? `${provider.models.length} نموذجاً` : "لم تُسترجع نماذج"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[10.5px]">
          <span className={`h-2 w-2 rounded-full ${provider.status === "connected" ? "bg-[#0A8F94]" : "bg-rose-500"}`} />
          <span className={provider.status === "connected" ? "text-[#0A8F94]" : "text-rose-700"}>
            {provider.status === "connected" ? "قائمة المزود متاحة" : "تعذّر جلب القائمة"}
          </span>
        </div>
      </div>
      {provider.error && (
        <p role="status" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{provider.error}</p>
      )}
      <div className="space-y-1.5">
        {provider.models.map((model) => {
          const selectedNow = selected?.providerId === provider.id && selected?.modelId === model.id
          const probe = probeStates[modelKey(provider.id, model.id)]
          const dotClass = probe?.status === "working"
            ? "bg-emerald-500"
            : probe?.status === "failed" || provider.status === "error"
              ? "bg-rose-500"
              : probe?.status === "probing"
                ? "bg-amber-400"
                : "bg-[#0A8F94]"
          const statusTitle = probe?.status === "working"
            ? `${probe.message}${probe.latencyMs ? ` · ${probe.latencyMs}ms` : ""}`
            : probe?.status === "failed"
              ? probe.message || "فشل الاختبار"
              : probe?.status === "probing"
                ? "جارٍ اختبار اتصال التوليد…"
                : provider.status === "connected"
                  ? "مدرج في قائمة المزود؛ لم يُجرَ اختبار توليد فعلي بعد"
                  : provider.error || "تعذّر جلب حالة النموذج"
          return (
            <div
              key={model.id}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${selectedNow ? "border-[#0A8F94]/50 bg-[#EFF9F7]" : "border-[#E2EBEC] bg-white hover:border-[#B7D4D7]"}`}
            >
              <button
                type="button"
                onClick={() => onSelect({ providerId: provider.id, modelId: model.id, modelName: model.name, providerName: provider.name })}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
                aria-pressed={selectedNow}
                title={`اختيار ${model.name}`}
              >
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center" title={statusTitle}>
                  <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                  {probe?.status === "probing" && <LoaderCircle size={17} className="absolute animate-spin text-amber-500" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-bold text-[#203B42]" dir="auto">{model.name}</span>
                    {selectedNow && <Check size={14} className="shrink-0 text-[#0A8F94]" />}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[9.5px] text-[#81979B]" dir="ltr">{model.id}</span>
                  <span className="mt-0.5 block text-[10px] text-[#71898E]">{contextLabel(model.contextWindow)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void onProbe(provider, model)}
                disabled={probe?.status === "probing" || provider.status === "error"}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#C9DFE1] bg-white px-2 text-[10.5px] font-bold text-[#0A8F94] transition-colors hover:bg-[#EFF9F7] disabled:cursor-not-allowed disabled:opacity-45"
                title="إجراء اختبار توليد فعلي لهذا النموذج"
              >
                {probe?.status === "probing" ? <LoaderCircle size={13} className="animate-spin" /> : <Zap size={12} />}
                <span className="hidden min-[420px]:inline">اختبار</span>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
