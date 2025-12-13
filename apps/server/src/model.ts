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
});

export const EventMessage = t.Object({
  type: t.String(),
  data: IRCMessage,
});
