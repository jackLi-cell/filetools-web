import { tools, type Tool } from "@/config/tools"

export function filterTools(query: string, limit = 8): Tool[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return tools
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.slug.includes(q)
    )
    .slice(0, limit)
}
