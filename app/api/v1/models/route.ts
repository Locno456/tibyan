import { NextRequest, NextResponse } from "next/server"
import { getAIModelCatalog } from "../../../../lib/aiProviders"
import {
  authorizePublicApi,
  publicApiError,
  selectedModelName,
  setNoStore,
} from "../../../../lib/publicApi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const unauthorized = authorizePublicApi(request, "openai")
  if (unauthorized) return unauthorized

  try {
    const catalog = await getAIModelCatalog(false)
    const data = catalog.providers.flatMap((provider) => provider.models.map((model) => ({
      id: selectedModelName(provider.id, model.id),
      object: "model" as const,
      providerId: provider.id,
      provider: provider.name,
      modelId: model.id,
      name: model.name,
      status: provider.status,
      ...(model.contextWindow ? { contextWindow: model.contextWindow } : {}),
      ...(model.maxOutputTokens ? { maxOutputTokens: model.maxOutputTokens } : {}),
      ...(model.supportsTools !== undefined ? { supportsTools: model.supportsTools } : {}),
    })))
    const defaultModel = catalog.defaultSelection
      ? selectedModelName(catalog.defaultSelection.providerId, catalog.defaultSelection.modelId)
      : undefined
    const response = NextResponse.json({
      object: "list",
      checkedAt: catalog.checkedAt,
      ...(defaultModel ? { default_model: defaultModel } : {}),
      data,
    })
    return setNoStore(response)
  } catch {
    return publicApiError("The configured model catalog is unavailable.", 503, "openai", "model_catalog_unavailable")
  }
}
