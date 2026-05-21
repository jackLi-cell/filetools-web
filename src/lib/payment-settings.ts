import { Tool, categories } from "@/config/tools"

export interface CategoryPaymentSetting {
  id?: number
  category: string
  name: string
  paidEnabled: boolean
  updatedAt?: string
}

export const defaultCategoryPaymentSettings: CategoryPaymentSetting[] = categories.map((category) => ({
  category: category.slug,
  name: category.name,
  paidEnabled: false,
}))

export function applyCategoryPaymentSettings(
  tools: Tool[],
  settings: CategoryPaymentSetting[] = defaultCategoryPaymentSettings,
): Tool[] {
  const paidEnabledByCategory = new Map(settings.map((setting) => [setting.category, setting.paidEnabled]))

  return tools.map((tool) => {
    const paidEnabled = paidEnabledByCategory.get(tool.category) === true
    if (tool.isFree || tool.creditsCost <= 0) {
      return {
        ...tool,
        isFree: true,
        creditsCost: 0,
      }
    }
    if (paidEnabled) return tool

    return {
      ...tool,
      isFree: true,
      creditsCost: 0,
    }
  })
}

export function applyCategoryPaymentSetting(
  tool: Tool,
  settings: CategoryPaymentSetting[] = defaultCategoryPaymentSettings,
): Tool {
  return applyCategoryPaymentSettings([tool], settings)[0]
}
