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

export async function fetchTools(): Promise<Tool[]> {
  if (!API_URL) return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))

  try {
    const [toolsRes, settingsRes] = await Promise.all([
      fetch(`${API_URL}/api/tools`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/api/tools/category-payment-settings`, { next: { revalidate: 60 } }),
    ])
    if (!toolsRes.ok) return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))
    const data = await toolsRes.json()
    const settingsData = settingsRes.ok ? await settingsRes.json() : null
    const settings: CategoryPaymentSetting[] = settingsData?.code === 0 && Array.isArray(settingsData.data)
      ? settingsData.data
      : defaultCategoryPaymentSettings
    if (data.code === 0 && Array.isArray(data.data)) {
      return applyCategoryPaymentSettings(data.data.map((t: ApiTool) => ({
        slug: t.toolSlug,
        name: t.name,
        description: t.description || "",
        category: t.category,
        isFree: t.isFree,
        creditsCost: t.creditsCost,
        isLocal: t.isFree && t.creditsCost === 0,
        version: "v0.1",
      })), settings)
    }
  } catch {}

  return applyCategoryPaymentSettings(staticTools.filter(t => t.version === "v0.1"))
}

export function getCategories(): ToolCategory[] {
  return staticCategories
}

export function getToolsByCategory(categorySlug: string): Tool[] {
  return applyCategoryPaymentSettings(staticTools.filter(t => t.category === categorySlug && t.version === "v0.1"))
}

export function getToolBySlug(slug: string): Tool | undefined {
  const tool = staticTools.find(t => t.slug === slug)
  return tool ? applyCategoryPaymentSettings([tool])[0] : undefined
}
