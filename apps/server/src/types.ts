import type { app } from "./index";
import type * as model from "./model";

export type ElysiaApp = typeof app;

export type IRCMessage = (typeof model.IRCMessage)["static"];
export type SystemEvent = (typeof model.SystemEvent)["static"];
export type NetworkInfo = (typeof model.NetworkInfo)["static"];
export type NetworkStateSync = (typeof model.NetworkStateSync)["static"];
export type EventMessage = (typeof model.EventMessage)["static"];

export type IRCCommand = (typeof model.IRCCommand)["static"];
export type CommandMessage = (typeof model.CommandMessage)["static"];

export type ChannelState = (typeof model.ChannelState)["static"];
export type ChannelMember = (typeof model.ChannelMember)["static"];
export type UserInfo = (typeof model.UserInfo)["static"];
