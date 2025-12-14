import type IRC from "irc-framework";
import configJson from "../config.json";

export type NetworkConfig = IRC.ClientOptions & {
  channels?: string[];
  quitMessage?: string;
  enabled?: boolean;
};

export const config = configJson as {
  networks: Record<string, NetworkConfig>;
};
