import type IRC from "irc-framework";
import configJson from "../config.json";

export type NetworkConfig = IRC.ClientOptions & {
  channels?: string[];
};

export const config = configJson as {
  networks: Record<string, NetworkConfig>;
};
