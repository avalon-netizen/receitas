import crypto from "node:crypto"
import { store } from "./store.js"
import { Recipe, CreateRecipeInput, RecipeStatus } from "./models.js"
import { CategoryService } from "./CategoryService.js"
import { IngredientService } from "./IngredientService.js"
import { IRecipeService } from "./interfaces/IRecipeService.js"

export class RecipeService implements IRecipeService {
  private categoryService = new CategoryService()
  private ingredientService = new IngredientService()

  async list(filter?: { categoryId?: string; categoryName?: string; search?: string; status?: RecipeStatus | "all" }): Promise<Recipe[]> {
    let categoryId = filter?.categoryId

    if (filter?.categoryName) {
      const category = await this.categoryService.findByName(filter.categoryName.trim())
      if (category) {
        categoryId = category.id
      } else {
        return []
      }
    }

    let items = [...store.recipes]

    if (categoryId) {
      items = items.filter(r => r.categoryId === categoryId)
    }

    if (filter?.search) {
      const searchQuery = filter.search.trim().toLowerCase()
      const allIngredients = await this.ingredientService.list()
      const nameById = new Map(allIngredients.map((ing) => [ing.id, ing.name.toLowerCase()]))

      items = items.filter((recipe) => {
        if (recipe.title.toLowerCase().includes(searchQuery)) return true
        if (recipe.description && recipe.description.toLowerCase().includes(searchQuery)) return true
        return recipe.ingredients.some((ingredient) => {
          const name = nameById.get(ingredient.ingredientId)
          return !!name && name.includes(searchQuery)
        })
      })
    }

    // filtro por status:
    if (filter?.status) {
      if (filter.status === "all") {
        // não filtra por status
      } else {
        items = items.filter(r => r.status === filter.status)
      }
    } else {
      // comportamento padrão para endpoints públicos: retornar apenas published
      items = items.filter(r => r.status === RecipeStatus.Published)
    }

    return items
  }

  async get(id: string): Promise<Recipe> {
    const found = store.recipes.find(r => r.id === id)
    if (!found) throw new Error("Recipe not found")
    return found
  }

async create(input: CreateRecipeInput): Promise<Recipe> {
    const title = input.title.trim()
    if (!title) throw new Error("Title is required")

    // Validate Category
    const category = await this.categoryService.get(input.categoryId).catch(() => null)
    if (!category) throw new Error("Category does not exist")

    // Process Ingredients
    const incoming = Array.isArray(input.ingredients)
      ? input.ingredients.map((i) => ({
          name: String(i.name ?? "").trim(),
          quantity: Number(i.quantity ?? 0),
          unit: String(i.unit ?? "").trim(),
        }))
      : []

    if (incoming.length === 0) throw new Error("Ingredients are required")

    incoming.forEach((i) => {
      if (!i.name) throw new Error("Ingredient name is required")
      if (!(i.quantity > 0)) throw new Error("Ingredient quantity must be > 0")
      if (!i.unit) throw new Error("Ingredient unit is required")
    })

    const resolved = [] as { ingredientId: string; quantity: number; unit: string }[]
    for (const i of incoming) {
      const existing = await this.ingredientService.findByName(i.name)
      const ingredient = existing ?? (await this.ingredientService.create({ name: i.name }))
      resolved.push({ ingredientId: ingredient.id, quantity: i.quantity, unit: i.unit })
    }

    const steps = Array.isArray(input.steps) ? input.steps.map((s) => String(s)) : []

    const servings = Number(input.servings)
    if (!(servings > 0)) throw new Error("Servings must be greater than 0")

    const recipe: Recipe = {
      id: crypto.randomUUID(),
      title,
      description: input.description,
      ingredients: resolved,
      steps,
      servings,
      categoryId: input.categoryId,
      createdAt: new Date(),
      // NOVO: status padrão = draft
      status: RecipeStatus.Draft,
    }
    store.recipes.push(recipe)
    return recipe
  }
  
  // --- NOVO: escalonar porções sem persistir a receita original
  async scale(id: string, servings: number): Promise<Recipe> {
    if (!(servings > 0)) throw new Error("Servings must be greater than 0")

    // buscar receita (não alterar a stored recipe)
    const recipe = store.recipes.find((r) => r.id === id)
    if (!recipe) throw new Error("Recipe not found")

    // fator de escala
    const factor = servings / recipe.servings

    // cria cópia profunda dos ingredientes com quantidades ajustadas
    const scaledIngredients = recipe.ingredients.map((ing) => {
      // ing: { ingredientId, quantity, unit }
      const newQty = Number((ing.quantity * factor).toFixed(2)) // arredonda para 2 casas; ajusta se desejar outro comportamento
      return {
        ingredientId: ing.ingredientId,
        quantity: newQty,
        unit: ing.unit,
      }
    })

    // cria nova receita (cópia) — NÃO altera o store
    const scaledRecipe: Recipe = {
      ...recipe,
      id: recipe.id, // mantém id como referência (ou você pode gerar um novo id se preferir)
      servings,
      // substitui por ingredientes escalonados (cópia)
      ingredients: scaledIngredients,
      // createdAt: recipe.createdAt // mantém o createdAt do original (ou não)
    }

    return scaledRecipe
  }

async update(id: string, data: Partial<CreateRecipeInput>): Promise<Recipe> {
    const idx = store.recipes.findIndex(r => r.id === id)
    if (idx < 0) throw new Error("Recipe not found")
    const current = store.recipes[idx]

    // Regra: receitas arquivadas não podem ser editadas
    if (current.status === RecipeStatus.Archived) {
      throw new Error("Archived recipes cannot be edited")
    }

    const updated = { ...current }

    if (data.categoryId) {
      const category = await this.categoryService.get(data.categoryId).catch(() => null)
      if (!category) throw new Error("Category does not exist")
      updated.categoryId = data.categoryId
    }

    if (data.title !== undefined) {
      const title = data.title.trim()
      if (!title) throw new Error("Title is required")
      updated.title = title
    }

    if (data.description !== undefined) {
      updated.description = data.description
    }

    if (data.steps !== undefined) {
      updated.steps = Array.isArray(data.steps) ? data.steps.map((s) => String(s)) : []
    }

    if (data.ingredients !== undefined) {
      const incoming = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => ({
            name: String(i.name ?? "").trim(),
            quantity: Number(i.quantity ?? 0),
            unit: String(i.unit ?? "").trim(),
          }))
        : []

      if (incoming.length === 0) throw new Error("Ingredients are required")

      incoming.forEach((i) => {
        if (!i.name) throw new Error("Ingredient name is required")
        if (!(i.quantity > 0)) throw new Error("Ingredient quantity must be > 0")
        if (!i.unit) throw new Error("Ingredient unit is required")
      })

      const resolved = [] as { ingredientId: string; quantity: number; unit: string }[]
      for (const i of incoming) {
        const existing = await this.ingredientService.findByName(i.name)
        const ingredient = existing ?? (await this.ingredientService.create({ name: i.name }))
        resolved.push({ ingredientId: ingredient.id, quantity: i.quantity, unit: i.unit })
      }

      updated.ingredients = resolved
    }

    store.recipes[idx] = updated
    return updated
  }

  async generateShoppingList(recipeIds: string[]) {
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new Error("recipeIds must be a non-empty array")
    }

    const recipes = recipeIds.map((id) => store.recipes.find((r) => r.id === id))
    const missing = recipeIds.filter((_, idx) => !recipes[idx])
    if (missing.length > 0) {
      throw new Error(`Recipe not found: ${missing.join(", ")}`)
    }

    const map = new Map<string, { ingredientId: string; unit: string; quantity: number }>()

    for (const recipe of recipes) {
      const ingList = (recipe as any).ingredients ?? []
      for (const ing of ingList) {
        const ingredientId = ing.ingredientId
        const unit = ing.unit ?? ""
        const qty = Number(ing.quantity ?? 0)
        const key = `${ingredientId}::${unit}`

        const existing = map.get(key)
        if (existing) {
          existing.quantity = existing.quantity + qty
          map.set(key, existing)
        } else {
          map.set(key, { ingredientId, unit, quantity: qty })
        }
      }
    }

    const result: { ingredientId: string; name: string; unit: string; quantity: number }[] = []

    for (const [, entry] of map) {
      const ingredient = await this.ingredientService.get(entry.ingredientId)
      result.push({
        ingredientId: entry.ingredientId,
        name: ingredient.name,
        unit: entry.unit,
        quantity: Number(entry.quantity.toFixed(2)),
      })
    }

    result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }

  async delete(id: string): Promise<void> {
    const idx = store.recipes.findIndex(r => r.id === id)
    if (idx < 0) throw new Error("Recipe not found")
    const recipe = store.recipes[idx]

    // Regra: receitas publicadas não podem ser excluídas
    if (recipe.status === RecipeStatus.Published) {
      throw new Error("Published recipes cannot be deleted. Archive them instead.")
    }

    store.recipes.splice(idx, 1)
  }

  async publish(id: string): Promise<Recipe> {
    const idx = store.recipes.findIndex(r => r.id === id)
    if (idx < 0) throw new Error("Recipe not found")
    const current = store.recipes[idx]

    if (current.status === RecipeStatus.Published) return current // idempotente

    // (Opcional) aqui você pode validar requisitos para publicar (ex: ingredientes, porções)
    const updated = { ...current, status: RecipeStatus.Published }
    store.recipes[idx] = updated
    return updated
  }

  // ARQUIVAR — altera status para archived
  async archive(id: string): Promise<Recipe> {
    const idx = store.recipes.findIndex(r => r.id === id)
    if (idx < 0) throw new Error("Recipe not found")
    const current = store.recipes[idx]

    if (current.status === RecipeStatus.Archived) return current // idempotente

    const updated = { ...current, status: RecipeStatus.Archived }
    store.recipes[idx] = updated
    return updated
  }
}

