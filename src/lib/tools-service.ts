import { tools as staticTools, categories as staticCategories, Tool, ToolCategory } from "@/config/tools"

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
  if (!API_URL) return staticTools.filter(t => t.version === "v0.1")

  try {
    const res = await fetch(`${API_URL}/api/tools`, { next: { revalidate: 60 } })
    if (!res.ok) return staticTools.filter(t => t.version === "v0.1")
    const data = await res.json()
    if (data.code === 0 && Array.isArray(data.data)) {
      return data.data.map((t: ApiTool) => ({
        slug: t.toolSlug,
        name: t.name,
        description: t.description || "",
        category: t.category,
        isFree: t.isFree,
        creditsCost: t.creditsCost,
        isLocal: t.isFree && t.creditsCost === 0,
        version: "v0.1",
      }))
    }
  } catch {}

  return staticTools.filter(t => t.version === "v0.1")
}

export function getCategories(): ToolCategory[] {
  return staticCategories
}

export function getToolsByCategory(categorySlug: string): Tool[] {
  return staticTools.filter(t => t.category === categorySlug && t.version === "v0.1")
}

export function getToolBySlug(slug: string): Tool | undefined {
  return staticTools.find(t => t.slug === slug)
}
