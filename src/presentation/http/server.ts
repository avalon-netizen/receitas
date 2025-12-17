import express from "express"
import { CategoryService } from "../../application/services/CategoryService.js"
import { RecipeService } from "../../application/services/RecipeService.js"
import { IngredientService } from "../../application/services/IngredientService.js"
import { CategoryMemoryRepository } from "../../infrastructure/repositories/memory/CategoryMemoryRepository.js"
import { IngredientMemoryRepository } from "../../infrastructure/repositories/memory/IngredientMemoryRepository.js"
import { RecipeMemoryRepository } from "../../infrastructure/repositories/memory/RecipeMemoryRepository.js"
import { categoriesRoutes } from "./routes/categories.js"
import { recipesRoutes } from "./routes/recipes.js"
import { ingredientsRoutes } from "./routes/ingredients.js"
import { errorHandler } from "./middlewares/errorHandler.js"

const app = express()
app.use(express.json())

const categoryRepository = new CategoryMemoryRepository()
const ingredientRepository = new IngredientMemoryRepository()
const recipeRepository = new RecipeMemoryRepository()

const categoryService = new CategoryService(categoryRepository, recipeRepository)
const recipeService = new RecipeService(
  recipeRepository,
  categoryRepository,
  ingredientRepository
)
const ingredientService = new IngredientService(ingredientRepository)

app.use("/categories", categoriesRoutes(categoryService))
app.use("/recipes", recipesRoutes(recipeService))
app.use("/ingredients", ingredientsRoutes(ingredientService))
app.use(errorHandler)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  process.stdout.write(`server running on http://localhost:${port}\n`)
})

