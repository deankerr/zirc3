import type { ChannelMember, ChannelState } from "./types";

type CaseCompare = (a: string, b: string) => boolean;

export class IRCChannel {
  private readonly caseCompare: CaseCompare;
  name: string;
  topic = "";
  topicSetBy?: string;
  topicSetAt?: number;
  modes: string[] = [];
  users: ChannelMember[] = [];
  joined = false;

  constructor(name: string, caseCompare: CaseCompare) {
    this.name = name;
    this.caseCompare = caseCompare;
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

  // * Event handlers - each takes isSelf flag where relevant

  handleJoin(
    event: { nick: string; ident?: string; hostname?: string },
    isSelf: boolean
  ) {
    if (isSelf) {
      this.joined = true;
    } else {
      this.users.push({
        nick: event.nick,
        ident: event.ident,
        hostname: event.hostname,
        modes: [],
      });
    }
  }

  handlePart(nick: string, isSelf: boolean) {
    if (isSelf) {
      this.joined = false;
    } else {
      this.users = this.users.filter((u) => !this.caseCompare(u.nick, nick));
    }
  }

  handleKick(kicked: string, isSelf: boolean) {
    if (isSelf) {
      this.joined = false;
    } else {
      this.users = this.users.filter((u) => !this.caseCompare(u.nick, kicked));
    }
  }

  handleQuit(nick: string): boolean {
    const before = this.users.length;
    this.users = this.users.filter((u) => !this.caseCompare(u.nick, nick));
    return this.users.length !== before;
  }

  handleNick(oldNick: string, newNick: string): boolean {
    const user = this.users.find((u) => this.caseCompare(u.nick, oldNick));
    if (user) {
      user.nick = newNick;
      return true;
    }
    return false;
  }

  handleUserlist(users: Array<{ nick: string; modes?: string[] }>) {
    this.users = users.map((u) => ({
      nick: u.nick,
      modes: u.modes ?? [],
    }));
  }

  handleTopic(topic: string, nick?: string, time?: number) {
    this.topic = topic;
    if (topic === "") {
      // topic cleared - remove metadata
      this.topicSetBy = undefined;
      this.topicSetAt = undefined;
    } else {
      if (nick) {
        this.topicSetBy = nick;
      }
      if (time) {
        this.topicSetAt = time;
      }
    }
  }

  handleTopicSetBy(nick: string, when?: number) {
    this.topicSetBy = nick;
    if (when) {
      this.topicSetAt = when;
    }
  }

  private applyUserMode(nick: string, modeChar: string, adding: boolean) {
    const user = this.users.find((u) => this.caseCompare(u.nick, nick));
    if (!user) {
      return;
    }
    if (adding && !user.modes.includes(modeChar)) {
      user.modes.push(modeChar);
    } else if (!adding) {
      user.modes = user.modes.filter((m) => m !== modeChar);
    }
  }

  private applyChannelMode(modeChar: string, adding: boolean) {
    if (adding && !this.modes.includes(modeChar)) {
      this.modes.push(modeChar);
    } else if (!adding) {
      this.modes = this.modes.filter((m) => m !== modeChar);
    }
  }

  handleMode(
    modes: Array<{ mode: string; param?: string }>,
    prefixModes: string[]
  ) {
    for (const mode of modes) {
      const modeChar = mode.mode[1];
      if (!modeChar) {
        continue;
      }
      const adding = mode.mode[0] === "+";
      const isUserMode = prefixModes.includes(modeChar);

      if (isUserMode && mode.param) {
        this.applyUserMode(mode.param, modeChar, adding);
      } else {
        this.applyChannelMode(modeChar, adding);
      }
    }
  }

  handleChannelInfo(modes?: Array<{ mode: string }>) {
    if (modes) {
      this.modes = modes.map((m) => m.mode);
    }
  }
}
