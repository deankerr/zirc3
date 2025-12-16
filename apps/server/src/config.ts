import type IRC from "irc-framework";

export type NetworkConfig = IRC.ClientOptions & {
  channels?: string[];
  quitMessage?: string;
  enabled?: boolean;
};

export type Config = {
  networks: Record<string, NetworkConfig>;
};

const configPath = process.env.ZIRC_CONFIG ?? "./config.json";

export const config: Config = await Bun.file(configPath).json();
