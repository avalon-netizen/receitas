import { Router } from "express"
import { IRecipeService } from "../../../core/interfaces/IRecipeService.js"
import { RecipeStatus } from "../../../core/models.js"

export function recipesRoutes(service: IRecipeService) {
  const router = Router()

  router.get("/", async (req, res, next) => {
    try {
      const includeAll = req.query.all === "true"
      const items = await service.list({
        categoryId: req.query.categoryId as string | undefined,
        categoryName: req.query.categoryName as string | undefined,
        search: req.query.search as string | undefined,
        status: includeAll ? "all" : RecipeStatus.Published,
      })
      res.json(items)
    } catch (error) {
      next(error)
    }
  })

  router.post("/shopping-list", async (req, res, next) => {
    try {
      const recipeIds = req.body?.recipeIds
      if (!Array.isArray(recipeIds)) {
        throw new Error("Request body must contain 'recipeIds' array")
      }

      const list = await service.generateShoppingList(recipeIds)
      res.json(list)
    } catch (error) {
      next(error)
    }
  })

  // Escalonar porções: retorna apenas a receita escalonada (não persiste)
  // GET /recipes/:id/scale?servings=8
  router.get("/:id/scale", async (req, res, next) => {
    try {
      const servingsParam = req.query.servings
      const servings = servingsParam ? Number(servingsParam) : NaN
      if (!(servings > 0)) throw new Error("Query parameter 'servings' is required and must be greater than 0")

      const scaled = await service.scale(req.params.id, servings)
      res.json(scaled)
    } catch (error) {
      next(error)
    }
  })

  router.get("/:id", async (req, res, next) => {
    try {
      const item = await service.get(req.params.id)
      res.json(item)
    } catch (error) {
      next(error)
    }
  })

  router.post("/", async (req, res, next) => {
    try {
      const item = await service.create({
        title: String(req.body.title ?? ""),
        description: req.body.description,
        ingredients: Array.isArray(req.body.ingredients)
          ? req.body.ingredients.map((i: any) => ({
            name: String(i?.name ?? ""),
            quantity: Number(i?.quantity ?? 0),
            unit: String(i?.unit ?? ""),
          }))
          : [],
        steps: Array.isArray(req.body.steps) ? req.body.steps.map(String) : [],
        servings: Number(req.body.servings ?? 0),
        categoryId: String(req.body.categoryId ?? ""),
      })
      res.status(201).json(item)
    } catch (error) {
      next(error)
    }
  })

  router.put("/:id", async (req, res, next) => {
    try {
      const item = await service.update(req.params.id, {
        title: req.body.title,
        description: req.body.description,
        ingredients: req.body.ingredients,
        steps: req.body.steps,
        servings: req.body.servings,
        categoryId: req.body.categoryId,
      })
      res.json(item)
    } catch (error) {
      next(error)
    }
  })

   // PATCH /recipes/:id/publish
  router.patch("/:id/publish", async (req, res, next) => {
    try {
      const published = await service.publish(req.params.id)
      res.json(published)
    } catch (error) {
      next(error)
    }
  })

  // PATCH /recipes/:id/archive
  router.patch("/:id/archive", async (req, res, next) => {
    try {
      const archived = await service.archive(req.params.id)
      res.json(archived)
    } catch (error) {
      next(error)
    }
  })

  router.delete("/:id", async (req, res, next) => {
    try {
      await service.delete(req.params.id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  return router
}
