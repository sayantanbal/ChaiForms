import { db } from "./index";

type ExtractTransaction<T> = T extends (callback: (tx: infer TX) => any, ...args: any[]) => any
  ? TX
  : never;
export type DbTransaction = ExtractTransaction<typeof db.transaction>;

export async function withTransaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      throw error;
    }
  });
}
