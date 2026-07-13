import { prisma } from "../config/database.js"


export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')       // spaces → dashes
    .replace(/-+/g, '-')        // collapse multiple dashes
    .slice(0, 50)
}

export const createUniqueSlug = async (name: string): Promise<string> => {
  const base = generateSlug(name)

  const existing = await prisma.workspace.findUnique({
    where: { slug: base },
  })

  if (!existing) return base

  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}