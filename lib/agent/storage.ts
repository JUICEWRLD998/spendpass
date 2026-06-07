import { KVStorage, type KVStore, type Storage } from "@auth/agent";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { agentClientKv } from "../db/schema";

const agentKvStore: KVStore = {
  async get(key) {
    const rows = await db
      .select({ value: agentClientKv.value })
      .from(agentClientKv)
      .where(eq(agentClientKv.key, key))
      .limit(1);

    return rows[0]?.value ?? null;
  },
  async set(key, value) {
    await db
      .insert(agentClientKv)
      .values({ key, value })
      .onConflictDoUpdate({
        target: agentClientKv.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  },
  async del(key) {
    await db.delete(agentClientKv).where(eq(agentClientKv.key, key));
  },
};

let storageInstance: Storage | null = null;

export function getAgentStorage(): Storage {
  storageInstance ??= new KVStorage(agentKvStore, {
    prefix: "spendpass-agent-client",
  });

  return storageInstance;
}
