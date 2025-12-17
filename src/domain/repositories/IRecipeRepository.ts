import { Recipe } from "../entities/Recipe.js"

export type CreateRecipeDTO = {
  title: string
  description?: string
  ingredients: { ingredientId: string; quantity: number; unit: string }[]
  steps: string[]
  categoryId: string
}

export interface IRecipeRepository {
  list(): Promise<Recipe[]>
  listByCategoryId(categoryId: string): Promise<Recipe[]>
  findById(id: string): Promise<Recipe | undefined>
  create(data: CreateRecipeDTO): Promise<Recipe>
  update(id: string, data: Partial<CreateRecipeDTO>): Promise<Recipe>
  delete(id: string): Promise<void>
}
