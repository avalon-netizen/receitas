import { Recipe, CreateRecipeInput, RecipeStatus, ShoppingListItem } from "../models.js"

export interface IRecipeService {
  list(filter?: { categoryId?: string; categoryName?: string; search?: string; status?: RecipeStatus | "all" }): Promise<Recipe[]>
  get(id: string): Promise<Recipe>
  create(input: CreateRecipeInput): Promise<Recipe>
  update(id: string, data: Partial<CreateRecipeInput>): Promise<Recipe>
  delete(id: string): Promise<void>
  
  generateShoppingList(recipeIds: string[]): Promise<ShoppingListItem[]>

  scale(id: string, servings: number): Promise<Recipe>

  publish(id: string): Promise<Recipe>
  archive(id: string): Promise<Recipe>
}
