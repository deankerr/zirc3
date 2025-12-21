import type IRC from "irc-framework";

export type ChannelMember = {
  nick: string;
  ident?: string;
  hostname?: string;
  modes: string[];
};

export type ChannelState = {
  name: string;
  topic: string;
  topicSetBy?: string;
  topicSetAt?: number;
  modes: string[];
  users: ChannelMember[];
  joined: boolean;
};

export class IRCChannel {
  private readonly client: IRC.Client;
  name: string;
  topic = "";
  topicSetBy?: string;
  topicSetAt?: number;
  modes: string[] = [];
  users: ChannelMember[] = [];
  joined = false;

  constructor(name: string, client: IRC.Client) {
    this.name = name;
    this.client = client;
    this.setupListeners();
  }

  private matches(channelName: string): boolean {
    return this.client.caseCompare(channelName, this.name);
  }

  private removeUser(nick: string) {
    this.users = this.users.filter(
      (u) => !this.client.caseCompare(u.nick, nick)
    );
  }

  private applyMode(modeStr: string, param?: string) {
    const modeChar = modeStr[1];
    if (!modeChar) return;

    const adding = modeStr[0] === "+";
    const prefixModes =
      this.client.network.options.PREFIX?.map((p) => p.mode) ?? [];
    const isUserMode = prefixModes.includes(modeChar);

    if (isUserMode && param) {
      const user = this.users.find((u) =>
        this.client.caseCompare(u.nick, param)
      );
      if (!user) return;
      if (adding && !user.modes.includes(modeChar)) {
        user.modes.push(modeChar);
      } else if (!adding) {
        user.modes = user.modes.filter((m) => m !== modeChar);
      }
      return;
    }

    if (adding && !this.modes.includes(modeChar)) {
      this.modes.push(modeChar);
    } else if (!adding) {
      this.modes = this.modes.filter((m) => m !== modeChar);
    }
  }

  private setupListeners() {
    const { client } = this;

    client.on("join", (event) => {
      if (!this.matches(event.channel)) return;
      if (event.nick === client.user.nick) {
        this.joined = true;
      } else {
        this.users.push({
          nick: event.nick,
          ident: event.ident,
          hostname: event.hostname,
          modes: [],
        });
      }
    });

    client.on("part", (event) => {
      if (!this.matches(event.channel)) return;
      if (event.nick === client.user.nick) {
        this.joined = false;
      } else {
        this.removeUser(event.nick);
      }
    });

    client.on("kick", (event) => {
      if (!event.channel) return;
      if (!this.matches(event.channel)) return;
      if (!event.kicked) return;
      if (event.kicked === client.user.nick) {
        this.joined = false;
      } else {
        this.removeUser(event.kicked);
      }
    });

    client.on("quit", (event) => {
      this.removeUser(event.nick);
    });

    client.on("nick", (event) => {
      const user = this.users.find((u) =>
        client.caseCompare(u.nick, event.nick)
      );
      if (user) user.nick = event.new_nick;
    });

    client.on("userlist", (event) => {
      if (!this.matches(event.channel)) return;
      this.users = event.users.map((u) => ({
        nick: u.nick,
        modes: u.modes ?? [],
      }));
    });

    client.on("topic", (event) => {
      if (!this.matches(event.channel)) return;
      this.topic = event.topic;
      if (event.topic === "") {
        this.topicSetBy = undefined;
        this.topicSetAt = undefined;
      } else if (event.nick) {
        this.topicSetBy = event.nick;
        this.topicSetAt = event.time ?? Date.now();
      }
    });

    client.on("topicsetby", (event) => {
      if (!this.matches(event.channel)) return;
      this.topicSetBy = event.nick;
      if (event.when) {
        this.topicSetAt = Number.parseInt(event.when, 10) * 1000;
      }
    });

    client.on("mode", (event) => {
      if (!event.target.startsWith("#")) return;
      if (!this.matches(event.target)) return;
      for (const mode of event.modes) {
        this.applyMode(mode.mode, mode.param);
      }
    });

    client.on("channel info", (event) => {
      if (!this.matches(event.channel)) return;
      if (event.modes) {
        this.modes = event.modes.map((m) => m.mode);
      }
    });
  }

  getState(): ChannelState {
    return {
      name: this.name,
      topic: this.topic,
      topicSetBy: this.topicSetBy,
      topicSetAt: this.topicSetAt,
      modes: [...this.modes],
      users: this.users.map((u) => ({ ...u, modes: [...u.modes] })),
      joined: this.joined,
    };
  }
}
