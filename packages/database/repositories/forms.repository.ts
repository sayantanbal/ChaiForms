import { db, eq, and, isNull, desc, count } from "../index";
import { formsTable } from "../schema";
import type { SelectForm, InsertForm } from "../models/form";

export class FormsRepository {
  async findById(id: string): Promise<SelectForm | null> {
    const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id)).limit(1);
    return form || null;
  }

  async findBySlug(slug: string): Promise<SelectForm | null> {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.slug, slug), isNull(formsTable.deletedAt)))
      .limit(1);
    return form || null;
  }

  async findByCreator(
    creatorId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<SelectForm[]> {
    const conditions = [eq(formsTable.creatorId, creatorId)];

    if (!options.includeDeleted) {
      conditions.push(isNull(formsTable.deletedAt));
    }

    return db
      .select()
      .from(formsTable)
      .where(and(...conditions))
      .orderBy(desc(formsTable.updatedAt));
  }

  async create(data: InsertForm): Promise<SelectForm> {
    const [form] = await db.insert(formsTable).values(data).returning();
    return form!;
  }

  async update(id: string, data: Partial<InsertForm>): Promise<SelectForm> {
    const [form] = await db.update(formsTable).set(data).where(eq(formsTable.id, id)).returning();
    return form!;
  }

  async softDelete(id: string): Promise<void> {
    await db.update(formsTable).set({ deletedAt: new Date() }).where(eq(formsTable.id, id));
  }

  async hardDelete(id: string): Promise<void> {
    await db.delete(formsTable).where(eq(formsTable.id, id));
  }

  async countByCreator(creatorId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(formsTable)
      .where(and(eq(formsTable.creatorId, creatorId), isNull(formsTable.deletedAt)));
    return Number(result?.count ?? 0);
  }
}

export const formsRepository = new FormsRepository();
