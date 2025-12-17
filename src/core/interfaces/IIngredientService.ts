import { Ingredient } from "../models.js"

export interface IIngredientService {
  list(): Promise<Ingredient[]>
  get(id: string): Promise<Ingredient>
  findByName(name: string): Promise<Ingredient | undefined>
  create(data: { name: string }): Promise<Ingredient>
  update(id: string, data: { name?: string }): Promise<Ingredient>
  delete(id: string): Promise<void>
}
