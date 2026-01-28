export type Category = {
  id: string
  name: string
  createdAt: Date
}

export type Ingredient = {
  id: string
  name: string
  createdAt: Date
}

export enum RecipeStatus {
  Draft = "draft",
  Published = "published",
  Archived = "archived",
}

export type Recipe = {
  id: string
  title: string
  description?: string
  ingredients: { ingredientId: string; quantity: number; unit: string }[]
  steps: string[]
  servings: number
  categoryId: string
  createdAt: Date

  status: RecipeStatus
}

export type CreateRecipeInput = {
  title: string
  description?: string
  ingredients: { name: string; quantity: number; unit: string }[]
  steps: string[]
  servings: number
  categoryId: string
}

// Geração de Lista de Compras Consolidada
export type ShoppingListItem = {
  ingredientId: string
  name: string
  unit: string
  quantity: number
}