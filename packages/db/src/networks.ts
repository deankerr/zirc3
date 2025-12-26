import { eq } from "drizzle-orm";
import type { DatabaseConnection } from "./index";
import { type NetworkConfig, networkConfigs } from "./schema";

// * Get all network configs
export function getAllNetworkConfigs(db: DatabaseConnection): NetworkConfig[] {
  const rows = db.select().from(networkConfigs).all();
  return rows.map((row) => row.config);
}

// * Get a single network config by name
export function getNetworkConfig(
  db: DatabaseConnection,
  name: string
): NetworkConfig | undefined {
  const row = db
    .select()
    .from(networkConfigs)
    .where(eq(networkConfigs.name, name))
    .get();
  return row?.config;
}

// * Upsert a network config (uses config.network as the key)
export function putNetworkConfig(
  db: DatabaseConnection,
  config: NetworkConfig
) {
  return db
    .insert(networkConfigs)
    .values({ name: config.network, config })
    .onConflictDoUpdate({
      target: networkConfigs.name,
      set: { config },
    })
    .run();
}

// * Delete a network config by name
export function deleteNetworkConfig(db: DatabaseConnection, name: string) {
  return db.delete(networkConfigs).where(eq(networkConfigs.name, name)).run();
}
