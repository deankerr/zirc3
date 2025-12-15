import { t } from "elysia";

export const IRCMessage = t.Object({
  id: t.String(),
  timestamp: t.Number(),
  network: t.String(),

  command: t.String(),
  params: t.Array(t.String()),
  source: t.String(),
  tags: t.Record(t.String(), t.String()),
  numeric: t.Optional(t.String()),
  target: t.Optional(t.String()),
});

export const UserInfo = t.Object({
  nick: t.String(),
  username: t.String(),
  host: t.String(),
  away: t.Boolean(),
  modes: t.Array(t.String()),
});

export const ChannelMember = t.Object({
  nick: t.String(),
  ident: t.Optional(t.String()),
  hostname: t.Optional(t.String()),
  modes: t.Array(t.String()),
});

export const ChannelState = t.Object({
  name: t.String(),
  topic: t.String(),
  topicSetBy: t.Optional(t.String()),
  topicSetAt: t.Optional(t.Number()),
  modes: t.Array(t.String()),
  users: t.Array(ChannelMember),
  joined: t.Boolean(),
});

// * Historical events that get buffered and replayed
export const SystemEvent = t.Object({
  id: t.String(),
  timestamp: t.Number(),
  network: t.String(),
  event: t.Union([
    t.Object({
      type: t.Literal("connecting"),
      address: t.Optional(t.String()),
    }),
    t.Object({ type: t.Literal("registered"), nick: t.String() }),
    t.Object({
      type: t.Literal("socket_close"),
      error: t.Optional(t.String()),
    }),
    t.Object({ type: t.Literal("socket_error"), error: t.String() }),
    t.Object({
      type: t.Literal("reconnecting"),
      attempt: t.Number(),
      wait: t.Number(),
    }),
    t.Object({ type: t.Literal("close") }),
  ]),
});

// * Live state sync - sent on connect and when state changes
export const NetworkStateSync = t.Object({
  name: t.String(),
  status: t.Union([
    t.Literal("connecting"),
    t.Literal("connected"),
    t.Literal("disconnected"),
  ]),
  user: t.Optional(UserInfo),
  channels: t.Record(t.String(), ChannelState),
});

export const NetworkInfo = t.Object({
  name: t.String(),
});

export const EventMessage = t.Union([
  t.Object({ type: t.Literal("irc"), data: IRCMessage }),
  t.Object({ type: t.Literal("system"), data: SystemEvent }),
  t.Object({ type: t.Literal("networks"), data: t.Array(NetworkInfo) }),
  t.Object({ type: t.Literal("state"), data: NetworkStateSync }),
]);

export const IRCCommand = t.Object({
  network: t.String(),
  command: t.String(),
  args: t.Array(t.String()),
});

export const CommandMessage = t.Union([
  t.Object({ type: t.Literal("irc"), data: IRCCommand }),
]);
