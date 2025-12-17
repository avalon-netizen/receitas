import { IRecipeRepository } from "../../domain/repositories/IRecipeRepository.js"
import { ICategoryRepository } from "../../domain/repositories/ICategoryRepository.js"
import { IIngredientRepository } from "../../domain/repositories/IIngredientRepository.js"
import { Recipe } from "../../domain/entities/Recipe.js"
 

type CreateRecipeInput = {
  title: string
  description?: string
  ingredients: { name: string; quantity: number; unit: string }[]
  steps: string[]
  categoryId: string
}

export class RecipeService {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly categories: ICategoryRepository,
    private readonly ingredientsRepo: IIngredientRepository
  ) {}

  async create(input: CreateRecipeInput): Promise<Recipe> {
    const title = input.title.trim()
    if (!title) throw new Error("Title is required")
    const category = await this.categories.findById(input.categoryId)
    if (!category) throw new Error("Category does not exist")
    const incoming = Array.isArray(input.ingredients)
      ? input.ingredients.map((i) => ({
          name: String(i.name ?? "").trim(),
          quantity: Number(i.quantity ?? 0),
          unit: String(i.unit ?? "").trim(),
        }))
      : []
    if (incoming.length === 0)
      throw new Error("Ingredients are required")
    incoming.forEach((i) => {
      if (!i.name) throw new Error("Ingredient name is required")
      if (!(i.quantity > 0)) throw new Error("Ingredient quantity must be > 0")
      if (!i.unit) throw new Error("Ingredient unit is required")
    })
    const resolved = [] as { ingredientId: string; quantity: number; unit: string }[]
    for (const i of incoming) {
      const existing = await this.ingredientsRepo.findByName(i.name)
      const ingredient = existing ?? (await this.ingredientsRepo.create({ name: i.name }))
      resolved.push({ ingredientId: ingredient.id, quantity: i.quantity, unit: i.unit })
    }
    const steps = Array.isArray(input.steps)
      ? input.steps.map((s) => String(s))
      : []
    return this.recipes.create({
      title,
      description: input.description,
      ingredients: resolved,
      steps,
      categoryId: input.categoryId,
    })
  }

  async list(filter?: { categoryId?: string; categoryName?: string; search?: string }): Promise<Recipe[]> {
    let categoryId = filter?.categoryId

    if (filter?.categoryName) {
      const category = await this.categories.findByName(filter.categoryName.trim())
      if (category) {
        categoryId = category.id
      } else {
        // If category name provided but not found, return empty list immediately
        return []
      }
    }

    const items = categoryId
      ? await this.recipes.listByCategoryId(categoryId)
      : await this.recipes.list()
    if (filter?.search) {
      const searchQuery = filter.search.trim().toLowerCase()
      const allIngredients = await this.ingredientsRepo.list()
      const nameById = new Map(allIngredients.map((ing) => [ing.id, ing.name.toLowerCase()]))
      return items.filter((recipe) => {
        if (recipe.title.toLowerCase().includes(searchQuery)) return true
        if (recipe.description && recipe.description.toLowerCase().includes(searchQuery)) return true
        return recipe.ingredients.some((ingredient) => {
          const name = nameById.get(ingredient.ingredientId)
          return !!name && name.includes(searchQuery)
        })
      })
    }
    return items
  }

  async get(id: string): Promise<Recipe> {
    const found = await this.recipes.findById(id)
    if (!found) throw new Error("Recipe not found")
    return found
  }

  async update(
    id: string,
    data: Partial<CreateRecipeInput>
  ): Promise<Recipe> {
    if (data.categoryId) {
      const category = await this.categories.findById(data.categoryId)
      if (!category) throw new Error("Category does not exist")
    }
    const repoData: Partial<import("../../domain/repositories/IRecipeRepository.js").CreateRecipeDTO> = {}
    if (data.title !== undefined) {
      const title = data.title.trim()
      if (!title) throw new Error("Title is required")
      repoData.title = title
    }
    if (data.description !== undefined) {
      repoData.description = data.description
    }
    if (data.steps !== undefined) {
      repoData.steps = Array.isArray(data.steps) ? [...data.steps] : []
    }
    if (data.categoryId !== undefined) {
      repoData.categoryId = data.categoryId
    }
    if (data.ingredients !== undefined) {
      const incoming = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => ({
            name: String(i.name ?? "").trim(),
            quantity: Number(i.quantity ?? 0),
            unit: String(i.unit ?? "").trim(),
          }))
        : []
      incoming.forEach((i) => {
        if (!i.name) throw new Error("Ingredient name is required")
        if (!(i.quantity > 0)) throw new Error("Ingredient quantity must be > 0")
        if (!i.unit) throw new Error("Ingredient unit is required")
      })
      const resolved = [] as { ingredientId: string; quantity: number; unit: string }[]
      for (const i of incoming) {
        const existing = await this.ingredientsRepo.findByName(i.name)
        const ingredient = existing ?? (await this.ingredientsRepo.create({ name: i.name }))
        resolved.push({ ingredientId: ingredient.id, quantity: i.quantity, unit: i.unit })
      }
      repoData.ingredients = resolved
    }
    return this.recipes.update(id, repoData)
  }

  async delete(id: string): Promise<void> {
    await this.recipes.delete(id)
  }
}
