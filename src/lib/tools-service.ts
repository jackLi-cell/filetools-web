import { tools as staticTools, categories as staticCategories, Tool, ToolCategory } from "@/config/tools"
import { applyCategoryPaymentSettings, CategoryPaymentSetting } from "@/lib/payment-settings"
import { getApiBaseUrl } from "@/lib/api-base"

const API_URL = getApiBaseUrl()

interface ApiTool {
  toolSlug: string
  name: string
  description?: string
  category: string
  isFree: boolean
  creditsCost: number
  effectiveIsFree?: boolean
  effectiveCreditsCost?: number
}

function mergeStaticTools(apiTools: ApiTool[] = [], settings?: CategoryPaymentSetting[]): Tool[] {
  const staticToolMap = new Map(staticTools.map((tool) => [tool.slug, tool]))
  const hasEffectivePricing = apiTools.some(
    (apiTool) => apiTool.effectiveIsFree !== undefined || apiTool.effectiveCreditsCost !== undefined,
  )
  const mergedTools = apiTools.map((apiTool) => {
    const staticTool = staticToolMap.get(apiTool.toolSlug)
    const isFree = apiTool.effectiveIsFree ?? apiTool.isFree
    const creditsCost = apiTool.effectiveCreditsCost ?? apiTool.creditsCost
    return {
      slug: apiTool.toolSlug,
      name: apiTool.name || staticTool?.name || apiTool.toolSlug,
      description: apiTool.description || staticTool?.description || "",
      category: apiTool.category || staticTool?.category || "tools",
      isFree,
      creditsCost,
      isLocal: staticTool?.isLocal ?? (isFree && creditsCost <= 0),
      version: staticTool?.version ?? "v0.1",
    }
  })

  if (hasEffectivePricing) return mergedTools

  return settings ? applyCategoryPaymentSettings(mergedTools, settings) : mergedTools
}

export async function fetchTools(): Promise<Tool[]> {
  try {
    const [toolsRes, settingsRes] = await Promise.all([
      fetch(`${API_URL}/api/tools`, { cache: "no-store" }),
      fetch(`${API_URL}/api/tools/category-payment-settings`, { cache: "no-store" }),
    ])
    if (!toolsRes.ok) return staticTools.filter(t => t.version === "v0.1")
    const data = await toolsRes.json()
    const settingsData = settingsRes.ok ? await settingsRes.json() : null
    const settings: CategoryPaymentSetting[] | undefined = settingsData?.code === 0 && Array.isArray(settingsData.data)
      ? settingsData.data
      : undefined
    if (data.code === 0 && Array.isArray(data.data)) {
      return mergeStaticTools(data.data as ApiTool[], settings)
    }
  } catch {}

  return staticTools.filter(t => t.version === "v0.1")
}

export function getCategories(): ToolCategory[] {
  return staticCategories
}

export async function getToolsByCategory(categorySlug: string): Promise<Tool[]> {
  return (await fetchTools()).filter(t => t.category === categorySlug)
}

export async function getToolBySlug(slug: string): Promise<Tool | undefined> {
  return (await fetchTools()).find(t => t.slug === slug)
}

export function getStaticToolBySlug(slug: string): Tool | undefined {
  const tool = staticTools.find(t => t.slug === slug)
  return tool
}
