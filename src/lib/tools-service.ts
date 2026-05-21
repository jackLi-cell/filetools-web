import { tools as staticTools, categories as staticCategories, Tool, ToolCategory } from "@/config/tools"
import { applyCategoryPaymentSettings, CategoryPaymentSetting, defaultCategoryPaymentSettings } from "@/lib/payment-settings"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface ApiTool {
  toolSlug: string
  name: string
  description?: string
  category: string
  isFree: boolean
  creditsCost: number
}

function mergeStaticTools(apiTools: ApiTool[] = [], settings: CategoryPaymentSetting[] = defaultCategoryPaymentSettings): Tool[] {
  const staticToolMap = new Map(staticTools.map((tool) => [tool.slug, tool]))
  return applyCategoryPaymentSettings(
    apiTools
      .map((apiTool) => {
        const staticTool = staticToolMap.get(apiTool.toolSlug)
        return {
          slug: apiTool.toolSlug,
          name: apiTool.name || staticTool?.name || apiTool.toolSlug,
          description: apiTool.description || staticTool?.description || "",
          category: apiTool.category || staticTool?.category || "tools",
          isFree: apiTool.isFree,
          creditsCost: apiTool.creditsCost,
          isLocal: staticTool?.isLocal ?? (apiTool.isFree && apiTool.creditsCost <= 0),
          version: staticTool?.version ?? "v0.1",
        }
      }),
    settings,
  )
}

export async function fetchTools(): Promise<Tool[]> {
  if (!API_URL) return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))

  try {
    const [toolsRes, settingsRes] = await Promise.all([
      fetch(`${API_URL}/api/tools`, { cache: "no-store" }),
      fetch(`${API_URL}/api/tools/category-payment-settings`, { cache: "no-store" }),
    ])
    if (!toolsRes.ok) return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))
    const data = await toolsRes.json()
    const settingsData = settingsRes.ok ? await settingsRes.json() : null
    const settings: CategoryPaymentSetting[] = settingsData?.code === 0 && Array.isArray(settingsData.data)
      ? settingsData.data
      : defaultCategoryPaymentSettings
    if (data.code === 0 && Array.isArray(data.data)) {
      return mergeStaticTools(data.data as ApiTool[], settings)
    }
  } catch {}

  return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))
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
  return tool ? applyCategoryPaymentSettings([tool])[0] : undefined
}
