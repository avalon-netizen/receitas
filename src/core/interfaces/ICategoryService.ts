import { Category } from "../models.js"

export interface ICategoryService {
  list(): Promise<Category[]>
  get(id: string): Promise<Category>
  findByName(name: string): Promise<Category | undefined>
  create(data: { name: string }): Promise<Category>
  update(id: string, data: { name?: string }): Promise<Category>
  delete(id: string): Promise<void>
}
