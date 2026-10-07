"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Brain, Check, ChevronDown, CircleAlert, LoaderCircle, RefreshCw, Search, X, Zap } from "lucide-react"
import type { AIModelCatalog, AIModelInfo, AIModelSelection, AIProviderInfo } from "../lib/aiProviderTypes"
import ProviderLogo from "./ProviderLogo"

interface ModelPickerProps {
  open: boolean
  selected?: AIModelSelection | null
  fallbackSelection?: AIModelSelection | null
  onSelect: (selection: AIModelSelection) => void
  onFallbackSelect: (selection: AIModelSelection | null) => void
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

function selectionLabel(selection?: AIModelSelection | null): string {
  if (!selection) return "غير محدد"
  return `${selection.providerName || selection.providerId} · ${selection.modelName || selection.modelId}`
}

export default function ModelPicker({
  open,
  selected,
  fallbackSelection,
  onSelect,
  onFallbackSelect,
  onDefaultSelection,
  onClose,
}: ModelPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [catalog, setCatalog] = useState<AIModelCatalog | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [probeStates, setProbeStates] = useState<Record<string, ProbeState>>({})
  const [expandedProviderIds, setExpandedProviderIds] = useState<string[]>([])

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
    } catch (error: any) {
      setLoadError(String(error?.message || error).slice(0, 220))
    } finally {
      setLoading(false)
    }
  }, [])

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

  useEffect(() => {
    if (open && !selected && catalog?.defaultSelection) onDefaultSelection?.(catalog.defaultSelection)
  }, [catalog, onDefaultSelection, open, selected])

  useEffect(() => {
    if (!catalog || catalog.providers.length < 2) return
    const selectedProvider = selected?.providerId && catalog.providers.some((provider) => provider.id === selected.providerId)
      ? selected.providerId
      : undefined
    const initialProvider = selectedProvider || catalog.defaultSelection?.providerId || catalog.providers[0]?.id
    setExpandedProviderIds(initialProvider ? [initialProvider] : [])
  }, [catalog, selected?.providerId])

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

  const toggleProvider = (providerId: string) => {
    setExpandedProviderIds((previous) => previous.includes(providerId)
      ? previous.filter((id) => id !== providerId)
      : [...previous, providerId])
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

  const hasMultipleProviders = (catalog?.providers.length || 0) > 1

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
                  <Brain size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="model-picker-title" className="text-[16px] font-extrabold text-[#0A2A33] sm:text-[18px]">نماذج الذكاء الاصطناعي</h2>
                  <p className="mt-0.5 text-[11.5px] text-[#6D8A90] sm:text-[12px]">اختر النموذج الأساسي، وحدد نموذجاً احتياطياً عند الحاجة</p>
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
                المفاتيح لا تُرسل إلى المتصفح. النقطة الفيروزية تعني أن النموذج ظهر في قائمة المزود، ولا تثبت نجاح التوليد؛ استخدم «اختبار» لفحص اتصال فعلي. التبديل التلقائي مخصص للأخطاء التقنية، لا للامتناع بسبب نقص الدليل.
              </p>

              {(selected || fallbackSelection) && (
                <div className="mb-3 grid gap-1.5 rounded-xl border border-[#C9DFE1]/70 bg-white px-3 py-2.5 text-[11px] sm:grid-cols-2">
                  <p className="truncate text-[#46636A]" title={selectionLabel(selected)}>
                    <span className="font-bold text-[#0A2A33]">الأساسي: </span>{selectionLabel(selected)}
                  </p>
                  <p className="truncate text-[#765B18]" title={selectionLabel(fallbackSelection)}>
                    <span className="font-bold text-[#8D6A13]">الاحتياطي: </span>{selectionLabel(fallbackSelection)}
                  </p>
                </div>
              )}

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
                    <Brain size={22} aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-[14px] font-extrabold text-[#0A2A33]">لا يوجد مزود مهيأ بعد</h3>
                  <p className="mx-auto mt-1.5 max-w-[560px] text-[12px] leading-relaxed text-[#667F85]">
                    أضف متغيراً أو أكثر في بيئة الخادم — مثل <code className="rounded bg-[#F0F6F6] px-1" dir="ltr">GEMINI_API_KEY</code> أو <code className="rounded bg-[#F0F6F6] px-1" dir="ltr">OPENAI_API_KEY</code> — ثم أعد تحميل القائمة. لا تضع المفاتيح في المتصفح.
                  </p>
                  <p className="mx-auto mt-2 max-w-[600px] text-[10.5px] leading-relaxed text-[#789196]" dir="ltr">
                    ANTHROPIC_API_KEY · OPENROUTER_API_KEY · GROQ_API_KEY · ZAI_API_KEY · MISTRAL_API_KEY · DEEPSEEK_API_KEY
                  </p>
                </div>
              )}

              {catalog?.providers.length === 0 && loadError && (
                <div className="py-6 text-center text-[12px] text-[#728A90]">تحقق من إعدادات الخادم ثم أعد المحاولة.</div>
              )}

              {catalog && catalog.providers.length > 0 && filteredProviders.length === 0 && !loadError && (
                <div className="py-12 text-center text-[13px] text-[#728A90]">لا توجد نماذج تطابق بحثك.</div>
              )}

              <div className="space-y-3">
                {filteredProviders.map((provider) => (
                  <ProviderGroup
                    key={provider.id}
                    provider={provider}
                    selected={selected}
                    fallbackSelection={fallbackSelection}
                    showAccordion={hasMultipleProviders}
                    expanded={search.trim() ? true : expandedProviderIds.includes(provider.id)}
                    onToggle={() => toggleProvider(provider.id)}
                    probeStates={probeStates}
                    onSelect={onSelect}
                    onFallbackSelect={onFallbackSelect}
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
  fallbackSelection,
  showAccordion,
  expanded,
  onToggle,
  probeStates,
  onSelect,
  onFallbackSelect,
  onProbe,
}: {
  provider: AIProviderInfo & { models: AIModelInfo[] }
  selected?: AIModelSelection | null
  fallbackSelection?: AIModelSelection | null
  showAccordion: boolean
  expanded: boolean
  onToggle: () => void
  probeStates: Record<string, ProbeState>
  onSelect: (selection: AIModelSelection) => void
  onFallbackSelect: (selection: AIModelSelection | null) => void
  onProbe: (provider: AIProviderInfo, model: AIModelInfo) => void
}) {
  const listId = `provider-models-${provider.id}`
  const providerHeading = (
    <div className="flex min-w-0 items-center gap-2.5 text-right">
      <ProviderLogo providerId={provider.id} size={29} />
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-extrabold text-[#0A2A33]">{provider.name}</h3>
        <p className="text-[10.5px] text-[#789196]">{provider.models.length ? `${provider.models.length} نموذجاً` : "لم تُسترجع نماذج"}</p>
      </div>
    </div>
  )
  const providerStatus = (
    <div className="flex shrink-0 items-center gap-1.5 text-[10.5px]">
      <span className={`h-2 w-2 rounded-full ${provider.status === "connected" ? "bg-[#0A8F94]" : "bg-rose-500"}`} />
      <span className={provider.status === "connected" ? "text-[#0A8F94]" : "text-rose-700"}>
        {provider.status === "connected" ? "قائمة المزود متاحة" : "تعذّر جلب القائمة"}
      </span>
    </div>
  )

  return (
    <section aria-label={`نماذج ${provider.name}`} className={showAccordion ? "overflow-hidden rounded-2xl border border-[#DCE8E9] bg-white" : ""}>
      {showAccordion ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={listId}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-right transition-colors hover:bg-[#F5FAF9]"
        >
          {providerHeading}
          <div className="flex shrink-0 items-center gap-2">
            {providerStatus}
            <ChevronDown size={17} className={`text-[#789196] transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>
      ) : (
        <div className="mb-2 flex items-center justify-between gap-3">
          {providerHeading}
          {providerStatus}
        </div>
      )}

      {(!showAccordion || expanded) && (
        <div id={listId} className={showAccordion ? "border-t border-[#E6EEEE] p-2.5" : ""}>
          {provider.error && (
            <p role="status" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{provider.error}</p>
          )}
          <div className="space-y-1.5">
            {provider.models.map((model) => {
              const selectedNow = selected?.providerId === provider.id && selected?.modelId === model.id
              const fallbackNow = fallbackSelection?.providerId === provider.id && fallbackSelection?.modelId === model.id
              const modelSelection: AIModelSelection = {
                providerId: provider.id,
                modelId: model.id,
                modelName: model.name,
                providerName: provider.name,
              }
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
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${selectedNow ? "border-[#0A8F94]/50 bg-[#EFF9F7]" : fallbackNow ? "border-[#E0B450]/70 bg-[#FFF9E8]" : "border-[#E2EBEC] bg-white hover:border-[#B7D4D7]"}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(modelSelection)}
                    className="flex min-w-[180px] flex-1 items-center gap-2.5 text-right"
                    aria-pressed={selectedNow}
                    title={`اختيار ${model.name} كنموذج أساسي`}
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
                  <label
                    title={selected ? `تبديل تلقائي إلى ${model.name} إذا فشل النموذج الأساسي` : "اختر النموذج الأساسي أولاً لتعيين نموذج احتياطي"}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[10px] font-semibold ${fallbackNow ? "text-[#8D6A13]" : "text-[#6C8186]"} ${!selected || selectedNow ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-[#F6FAF9]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={fallbackNow}
                      disabled={!selected || selectedNow}
                      onChange={(event) => onFallbackSelect(event.target.checked ? modelSelection : null)}
                      aria-label={`استخدم ${model.name} نموذجاً احتياطياً تلقائياً`}
                      className="h-3.5 w-3.5 rounded border-[#AFC5C8] accent-[#0A8F94]"
                    />
                    بديل تلقائي
                  </label>
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
        </div>
      )}
    </section>
  )
}
