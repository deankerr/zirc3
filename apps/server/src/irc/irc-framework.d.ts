/**
 * Type declarations for irc-framework
 *
 * irc-framework is a pure JavaScript IRC library with no official TypeScript types.
 * These declarations were created by analyzing the source at:
 * https://github.com/kiwiirc/irc-framework
 *
 * @packageDocumentation
 */
/** biome-ignore-all lint/style/useConsistentTypeDefinitions: reality */
/** biome-ignore-all lint/nursery/noShadow: reality */
/** biome-ignore-all lint/style/useUnifiedTypeSignatures: reality */
declare module "irc-framework" {
  import { EventEmitter } from "eventemitter3";

  // ============================================================================
  // * TOP-LEVEL EXPORTS
  // ============================================================================

  /**
   * The main IRC client class. Manages connection to a single IRC network.
   */
  export class Client extends IrcClient {}

  /**
   * Parse a raw IRC protocol line into an IrcMessage object.
   */
  export function ircLineParser(line: string): IrcMessage;

  /**
   * Represents a parsed IRC message.
   */
  export class Message extends IrcMessage {}

  /**
   * IRCv3 message tag encoding/decoding utilities.
   */
  export const MessageTags: {
    decodeValue(value: string): string;
    encodeValue(value: string): string;
    decode(tag_str: string): Record<string, string>;
    encode(tags: Record<string, string | boolean>, separator?: string): string;
  };

  /**
   * Helper utilities for IRC parsing.
   */
  export const Helpers: {
    parseMask(mask: string): { nick: string; user: string; host: string };
    parseWhoFlags(
      flagsParam: string,
      networkOptions: IrcServerOptions
    ): {
      parsedFlags: {
        away: boolean;
        bot?: boolean;
        registered: boolean;
        operator: boolean;
        secure: boolean;
        channel_modes: string[];
      };
      unparsedFlags: string[];
    };
    splitOnce(input: string, separator: string): [string] | [string, string];
  };

  /**
   * Wrapper for interacting with a specific channel.
   */
  export class Channel extends IrcChannel {}

  // ============================================================================
  // * IRC CLIENT
  // ============================================================================

  /**
   * The main IRC client class. Manages connection to a single IRC network.
   *
   * @example
   * ```typescript
   * const client = new Client({
   *   host: 'irc.libera.chat',
   *   port: 6697,
   *   nick: 'mynick',
   *   tls: true,
   *   auto_reconnect: true,
   * })
   *
   * client.on('registered', () => {
   *   client.join('#channel')
   * })
   *
   * client.connect()
   * ```
   */
  class IrcClient extends EventEmitter {
    constructor(options?: ClientOptions);

    // ========================================================================
    // * Properties
    // ========================================================================

    /**
     * Whether the client is connected AND successfully registered to the IRC network.
     * This becomes true after the 'registered' event fires.
     */
    connected: boolean;

    /**
     * Information about the connected user (you).
     * Properties are populated after registration.
     */
    user: IrcUser;

    /**
     * Information about the IRC network.
     * Contains server capabilities, options, and helper methods.
     */
    network: IrcNetwork;

    /**
     * Low-level connection state and transport.
     * Use for checking connection status or accessing the raw socket.
     */
    connection: IrcConnection;

    /**
     * The command handler that processes parsed IRC messages.
     * Emits an 'all' event for every parsed IRC event before client-level processing.
     *
     * @remarks
     * Use command_handler.on('all', (command, event) => ...) to capture all events.
     */
    command_handler: IrcCommandHandler;

    /**
     * The options used for this client.
     * Can be modified between connections (e.g., changing port for STS).
     *
     * @remarks
     * Modifying options while connected may not take effect until reconnection.
     */
    options: ClientOptions;

    /**
     * Middleware pipeline for raw IRC commands.
     */
    raw_middleware: RawMiddleware;

    /**
     * Middleware pipeline for parsed IRC events.
     */
    parsed_middleware: ParsedMiddleware;

    /**
     * Extra capabilities to request during CAP negotiation.
     */
    request_extra_caps: string[];

    // ========================================================================
    // * Connection Methods
    // ========================================================================

    /**
     * Initiate connection to the IRC server.
     *
     * @param connect_options - Optional overrides for connection options
     *
     * @remarks
     * - Connection is async; listen for 'registered' event for success
     * - Listen for 'socket error' and 'close' for failures
     * - If auto_reconnect is enabled, will automatically retry on failure
     */
    connect(connect_options?: Partial<ClientOptions>): void;

    /**
     * Disconnect from the IRC server with optional quit message.
     *
     * @param quit_message - Message shown to other users on quit
     *
     * @remarks
     * This triggers the 'close' event (no auto-reconnect) rather than 'socket close'.
     */
    quit(quit_message?: string): void;

    // ========================================================================
    // * Channel Methods
    // ========================================================================

    /**
     * Join an IRC channel.
     *
     * @param channel - Channel name (e.g., '#rust')
     * @param key - Optional channel key/password
     *
     * @remarks
     * Listen for 'join' event to confirm successful join.
     * If the channel requires a key and none is provided, you'll receive an 'irc error'.
     */
    join(channel: string, key?: string): void;

    /**
     * Leave an IRC channel.
     *
     * @param channel - Channel name
     * @param message - Optional part message shown to channel
     */
    part(channel: string, message?: string): void;

    /**
     * Set or change a channel's topic.
     *
     * @param channel - Channel name
     * @param newTopic - New topic text (empty/undefined calls clearTopic)
     *
     * @remarks
     * Requires appropriate channel privileges (usually op or higher).
     */
    setTopic(channel: string, newTopic: string): void;

    /**
     * Clear a channel's topic.
     *
     * @param channel - Channel name
     */
    clearTopic(channel: string): void;

    /**
     * Get an IrcChannel wrapper for a specific channel.
     * Provides channel-specific methods and events.
     *
     * @param channel_name - The channel name
     * @returns IrcChannel instance
     */
    channel(channel_name: string): IrcChannel;

    // ========================================================================
    // * Messaging Methods
    // ========================================================================

    /**
     * Send a PRIVMSG to a channel or user.
     *
     * @param target - Channel name or nickname
     * @param message - Message text
     * @param tags - Optional IRCv3 message tags
     *
     * @remarks
     * Long messages are automatically split at word boundaries.
     * If echo-message cap is enabled, you'll receive your own message back via 'privmsg' event.
     */
    say(target: string, message: string, tags?: Record<string, string>): void;

    /**
     * Send a NOTICE to a channel or user.
     *
     * @param target - Channel name or nickname
     * @param message - Notice text
     * @param tags - Optional IRCv3 message tags
     *
     * @remarks
     * NOTICEs are similar to PRIVMSGs but clients typically don't auto-reply to them.
     * Often used for bot responses or automated messages.
     */
    notice(
      target: string,
      message: string,
      tags?: Record<string, string>
    ): void;

    /**
     * Send a TAGMSG to a channel or user (message with only tags, no content).
     *
     * @param target - Channel name or nickname
     * @param tags - IRCv3 message tags
     */
    tagmsg(target: string, tags?: Record<string, string>): void;

    /**
     * Send a CTCP ACTION (/me) to a channel or user.
     *
     * @param target - Channel name or nickname
     * @param message - Action text (displayed as "* nick action")
     * @returns Array of message parts if the message was split
     */
    action(target: string, message: string): string[];

    // ========================================================================
    // * User Methods
    // ========================================================================

    /**
     * Change your nickname.
     *
     * @param nick - Desired new nickname
     *
     * @remarks
     * - Listen for 'nick' event to confirm the change
     * - May trigger 'nick in use' or 'nick invalid' errors
     * - If called before registration, sets the initial nick
     */
    changeNick(nick: string): void;

    /**
     * Request WHOIS information about a user.
     *
     * @param nick - Nickname to query
     * @param cb - Callback receiving the whois data
     *
     * @remarks
     * Alternatively, listen for the 'whois' event.
     */
    whois(nick: string, cb?: (event: WhoisEventArgs) => void): void;

    /**
     * Request WHOWAS information about a previously seen user.
     *
     * @param nick - Nickname to query
     * @param cb - Optional callback receiving the whowas data
     */
    whowas(nick: string, cb?: (event: WhoisEventArgs) => void): void;

    /**
     * Perform a WHO query on a target (channel or mask).
     *
     * @param target - Channel name or user mask
     * @param cb - Callback receiving the who list
     *
     * @remarks
     * WHO requests are queued and executed serially to match responses correctly.
     */
    who(target: string, cb?: (event: WhoEventArgs) => void): void;

    // ========================================================================
    // * Mode Methods
    // ========================================================================

    /**
     * Set or query channel/user modes.
     *
     * @param target - Channel name or your nickname
     * @param mode - Mode string (e.g., '+o', '-v', '+b')
     * @param extra_args - Additional mode arguments (e.g., nicknames for +o)
     *
     * @example
     * ```typescript
     * irc.mode('#channel', '+o', ['nickname'])  // Give op
     * irc.mode('#channel', '+b', ['*!*@host'])  // Set ban
     * irc.mode('#channel')                       // Query modes
     * ```
     */
    mode(target: string, mode?: string, extra_args?: string[]): void;

    /**
     * Request the ban list for a channel.
     *
     * @param channel - Channel name
     * @param cb - Optional callback receiving the ban list
     *
     * @remarks
     * Listen for 'banlist' event for the results.
     */
    banlist(channel: string, cb?: (event: BanlistEventArgs) => void): void;

    /**
     * Add a ban mask to a channel.
     *
     * @param channel - Channel name
     * @param mask - Ban mask (e.g., '*!*@hostname')
     */
    ban(channel: string, mask: string): void;

    /**
     * Remove a ban mask from a channel.
     *
     * @param channel - Channel name
     * @param mask - Ban mask to remove
     */
    unban(channel: string, mask: string): void;

    /**
     * Request the invite list for a channel.
     *
     * @param channel - Channel name
     * @param cb - Optional callback receiving the invite list
     */
    inviteList(
      channel: string,
      cb?: (event: InviteListEventArgs) => void
    ): void;

    /**
     * Add a user to a channel's invite list (mode +I).
     *
     * @param channel - Channel name
     * @param mask - Invite mask
     */
    addInvite(channel: string, mask: string): void;

    /**
     * Remove a user from a channel's invite list.
     *
     * @param channel - Channel name
     * @param mask - Invite mask to remove
     */
    removeInvite(channel: string, mask: string): void;

    /**
     * Invite a user to a channel.
     *
     * @param channel - Channel name
     * @param nick - User to invite
     */
    invite(channel: string, nick: string): void;

    // ========================================================================
    // * CTCP Methods
    // ========================================================================

    /**
     * Send a CTCP request to a target.
     *
     * @param target - Channel or nickname
     * @param type - CTCP type (e.g., 'VERSION', 'TIME', 'PING')
     * @param params - Additional parameters
     *
     * @example
     * ```typescript
     * irc.ctcpRequest('nickname', 'VERSION')
     * irc.ctcpRequest('nickname', 'PING', Date.now().toString())
     * ```
     */
    ctcpRequest(target: string, type: string, ...params: string[]): void;

    /**
     * Send a CTCP response to a target.
     *
     * @param target - Channel or nickname
     * @param type - CTCP type being responded to
     * @param params - Response parameters
     */
    ctcpResponse(target: string, type: string, ...params: string[]): void;

    // ========================================================================
    // * Server Query Methods
    // ========================================================================

    /**
     * Request channel list from the server.
     *
     * @param params - Optional filters (server-dependent)
     *
     * @remarks
     * Listen for 'channel list start', 'channel list', and 'channel list end' events.
     * Can be very slow on large networks - some networks throttle or limit results.
     */
    list(...params: string[]): void;

    /**
     * Send a PING to the server.
     *
     * @param message - Optional ping message (echoed back in PONG)
     */
    ping(message?: string): void;

    // ========================================================================
    // * Raw IRC Methods
    // ========================================================================

    /**
     * Send a raw IRC command to the server.
     *
     * @param raw_data_line - Command and parameters
     *
     * @example
     * ```typescript
     * irc.raw('AWAY', 'Gone fishing')     // Set away
     * irc.raw('AWAY')                      // Clear away
     * irc.raw('MODE', '#channel')          // Query channel modes
     * irc.raw('NAMES', '#channel')         // Request user list
     * irc.raw('SETNAME', 'New Real Name')  // Change realname (if supported)
     * ```
     *
     * @remarks
     * Use this for IRC commands not covered by other methods.
     * Parameters are automatically joined; don't include the leading ':' for the last param.
     */
    raw(...raw_data_line: string[]): void;

    /**
     * Convert arguments to a raw IRC protocol string.
     *
     * @param parameters - Command and parameters
     * @returns Formatted IRC protocol string
     */
    rawString(...parameters: string[]): string;
    rawString(parameters: string[]): string;

    // ========================================================================
    // * Capability Methods
    // ========================================================================

    /**
     * Request additional IRCv3 capabilities during connection.
     *
     * @param capabilities - Array of capability names to request
     *
     * @remarks
     * Must be called before connect() or during CAP negotiation.
     * Commonly requested: 'znc.in/self-message', 'znc.in/playback'
     */
    requestCap(capabilities: string[]): void;

    /**
     * Register middleware to process raw and/or parsed IRC events.
     *
     * @param middleware_fn - Factory function returning the middleware handler
     *
     * @remarks
     * Middleware receives (client, raw_events, parsed_events) and can use
     * raw_events.use() or parsed_events.use() to intercept events.
     *
     * @example
     * ```typescript
     * client.use(function() {
     *   return function(client, raw_events, parsed_events) {
     *     raw_events.use((command, message, rawLine, client, next) => {
     *       console.log('Raw:', command, rawLine)
     *       next()
     *     })
     *     parsed_events.use((eventName, event, client, next) => {
     *       console.log('Parsed:', eventName, event)
     *       next()
     *     })
     *   }
     * }())
     * ```
     */
    use(
      middleware_fn: (
        client: Client,
        raw_events: RawMiddleware,
        parsed_events: ParsedMiddleware
      ) => void
    ): void;

    // ========================================================================
    // * Message Helpers
    // ========================================================================

    /**
     * Match incoming messages against a regex pattern.
     *
     * @param match_regex - Pattern to match
     * @param cb - Callback for matching messages
     * @param message_type - Type of message to match (default: 'message')
     * @returns Object with stop() method to remove the matcher
     */
    match(
      match_regex: string,
      cb: (event: MessageEventArgs) => void,
      message_type?: string
    ): { stop: () => void };

    /** Convenience method for matching NOTICE messages */
    matchNotice(
      match_regex: string,
      cb: (event: MessageEventArgs) => void
    ): void;

    /** Convenience method for matching PRIVMSG messages */
    matchMessage(
      match_regex: string,
      cb: (event: MessageEventArgs) => void
    ): void;

    /** Convenience method for matching ACTION messages */
    matchAction(
      match_regex: string,
      cb: (event: MessageEventArgs) => void
    ): void;

    // ========================================================================
    // * MONITOR Methods (IRCv3)
    // ========================================================================

    /**
     * Get the current MONITOR list.
     *
     * @param cb - Callback receiving the monitor list event
     */
    monitorlist(cb?: (event: MonitorListEventArgs) => void): void;

    /**
     * Add a target to the MONITOR list.
     *
     * @param target - Nick to monitor
     */
    addMonitor(target: string): void;

    /**
     * Remove a target from the MONITOR list.
     *
     * @param target - Nick to remove
     */
    removeMonitor(target: string): void;

    /**
     * Query the status of all monitored nicks.
     */
    queryMonitor(): void;

    /**
     * Clear the entire MONITOR list.
     */
    clearMonitor(): void;

    // ========================================================================
    // * Case Comparison Methods
    // ========================================================================

    /**
     * Compare two strings using IRC case rules.
     *
     * @param string1 - First string
     * @param string2 - Second string
     * @returns true if the strings are equal (case-insensitive per CASEMAPPING)
     */
    caseCompare(string1: string, string2: string): boolean;

    /**
     * Convert a string to lowercase using IRC case rules.
     *
     * @param string - String to convert
     * @returns Lowercase string per CASEMAPPING
     */
    caseLower(string: string): string;

    /**
     * Convert a string to uppercase using IRC case rules.
     *
     * @param string - String to convert
     * @returns Uppercase string per CASEMAPPING
     */
    caseUpper(string: string): string;

    // ========================================================================
    // * Properties (Getters)
    // ========================================================================

    /** Access to the IrcMessage class for creating messages */
    get Message(): typeof IrcMessage;

    // ========================================================================
    // * Static Methods
    // ========================================================================

    /**
     * Set the default transport for all Client instances.
     *
     * @param transport - Transport class (WebSocket or TCP)
     */
    static setDefaultTransport(transport: unknown): void;

    // ========================================================================
    // * Event Emitter Overloads
    // ========================================================================

    // ** Connection Events **

    /**
     * Fired when successfully registered with the IRC server.
     * This is the right time to join channels and send commands.
     */
    on(event: "registered", cb: (event: RegisteredEventArgs) => void): this;

    /**
     * Fired after 'registered', convenience alias.
     */
    on(event: "connected", cb: (event: RegisteredEventArgs) => void): this;

    /**
     * Fired when starting a connection attempt.
     */
    on(event: "connecting", cb: () => void): this;

    /**
     * Fired when the TCP/TLS socket connects (before registration).
     */
    on(event: "socket connected", cb: () => void): this;

    /**
     * Fired when the raw socket connects, before any IRC negotiation.
     * Useful for ident server integration.
     *
     * @param socket - The raw socket object
     */
    on(event: "raw socket connected", cb: (socket: unknown) => void): this;

    /**
     * Fired when the socket closes unexpectedly.
     * If auto_reconnect is enabled, will be followed by 'reconnecting'.
     *
     * @param error - Error message if connection failed
     */
    on(event: "socket close", cb: (error?: string) => void): this;

    /**
     * Fired when disconnected and will NOT auto-reconnect.
     * This happens after quit() or when max retries exceeded.
     */
    on(event: "close", cb: () => void): this;

    /**
     * Fired during reconnection attempts.
     */
    on(event: "reconnecting", cb: (event: ReconnectingEventArgs) => void): this;

    /**
     * Fired when the server stops responding to PINGs.
     */
    on(event: "ping timeout", cb: () => void): this;

    /**
     * Fired on socket-level errors.
     */
    on(event: "socket error", cb: (error: Error | string) => void): this;

    // ** Message Events **

    /**
     * Fired for PRIVMSG messages (channel and private).
     *
     * @remarks
     * Check `data.target` to determine if it's a channel or PM.
     * If echo-message is enabled, your own messages appear here too.
     */
    on(event: "privmsg", cb: (event: MessageEventArgs) => void): this;

    /**
     * Fired for NOTICE messages.
     */
    on(event: "notice", cb: (event: MessageEventArgs) => void): this;

    /**
     * Fired for ACTION messages (/me).
     */
    on(event: "action", cb: (event: MessageEventArgs) => void): this;

    /**
     * Fired for WALLOPS messages (server-wide broadcasts).
     *
     * @remarks
     * These are typically from server operators.
     */
    on(event: "wallops", cb: (event: MessageEventArgs) => void): this;

    /**
     * Fired for all message types (privmsg, notice, action).
     * Includes a 'type' property indicating the message type.
     */
    on(
      event: "message",
      cb: (event: MessageEventArgs & { type: string }) => void
    ): this;

    // ** Channel Events **

    /**
     * Fired when a user (including yourself) joins a channel.
     */
    on(event: "join", cb: (event: JoinEventArgs) => void): this;

    /**
     * Fired when a user leaves a channel.
     */
    on(event: "part", cb: (event: PartEventArgs) => void): this;

    /**
     * Fired when a user disconnects from the network.
     *
     * @remarks
     * You'll receive this for every user in shared channels.
     */
    on(event: "quit", cb: (event: QuitEventArgs) => void): this;

    /**
     * Fired when a user is kicked from a channel.
     */
    on(event: "kick", cb: (event: KickEventArgs) => void): this;

    /**
     * Fired when a channel's topic changes.
     */
    on(event: "topic", cb: (event: TopicEventArgs) => void): this;

    /**
     * Fired with information about who set the topic and when.
     */
    on(event: "topicsetby", cb: (event: TopicSetByEventArgs) => void): this;

    /**
     * Fired when you're invited to a channel.
     */
    on(event: "invite", cb: (event: InviteEventArgs) => void): this;

    // ** User Events **

    /**
     * Fired when a user changes their nickname.
     */
    on(event: "nick", cb: (event: NickEventArgs) => void): this;

    /**
     * Fired when a user sets their away status.
     *
     * @remarks
     * Only received if away-notify cap is enabled.
     */
    on(event: "away", cb: (event: AwayEventArgs) => void): this;

    /**
     * Fired when a user clears their away status.
     */
    on(event: "back", cb: (event: AwayEventArgs) => void): this;

    /**
     * Fired when a user's host or ident changes (CHGHOST cap).
     */
    on(event: "user updated", cb: (event: UserUpdatedEventArgs) => void): this;

    // ** Mode Events **

    /**
     * Fired for mode changes on channels or users.
     */
    on(event: "mode", cb: (event: ModeEventArgs) => void): this;

    /**
     * Fired with channel information (modes, created_at, etc.) after joining.
     */
    on(event: "channel info", cb: (event: ChannelInfoEventArgs) => void): this;

    /**
     * Fired with your user mode information.
     */
    on(event: "user info", cb: (event: UserInfoEventArgs) => void): this;

    // ** List Events **

    /**
     * Fired with the user list for a channel after joining or NAMES.
     */
    on(event: "userlist", cb: (event: UserListEventArgs) => void): this;

    /** Channel list request started */
    on(event: "channel list start", cb: () => void): this;

    /** Batch of channels from LIST command */
    on(event: "channel list", cb: (channels: ChannelListItem[]) => void): this;

    /** Channel list request completed */
    on(event: "channel list end", cb: () => void): this;

    /**
     * Fired with the ban list for a channel.
     */
    on(event: "banlist", cb: (event: BanlistEventArgs) => void): this;

    /**
     * Fired with the invite list for a channel.
     */
    on(event: "inviteList", cb: (event: InviteListEventArgs) => void): this;

    // ** Monitor Events **

    /**
     * Fired with the MONITOR list.
     */
    on(event: "monitorList", cb: (event: MonitorListEventArgs) => void): this;

    /**
     * Fired when monitored users come online.
     */
    on(event: "users online", cb: (event: UsersOnlineEventArgs) => void): this;

    /**
     * Fired when monitored users go offline.
     */
    on(
      event: "users offline",
      cb: (event: UsersOfflineEventArgs) => void
    ): this;

    // ** WHOIS Events **

    /**
     * Fired with WHOIS response.
     */
    on(event: "whois", cb: (event: WhoisEventArgs) => void): this;

    /**
     * Fired with WHOWAS response.
     */
    on(event: "whowas", cb: (event: WhoisEventArgs) => void): this;

    // ** Server Info Events **

    /**
     * Fired with server options (PREFIX, CHANTYPES, NETWORK, etc.).
     *
     * @remarks
     * Important: Don't hardcode IRC options - they vary per network.
     * Always parse and use these values.
     */
    on(
      event: "server options",
      cb: (event: ServerOptionsEventArgs) => void
    ): this;

    /**
     * Fired with the Message of the Day.
     */
    on(event: "motd", cb: (event: MotdEventArgs) => void): this;

    /**
     * Fired with server info response.
     */
    on(event: "info", cb: (event: InfoEventArgs) => void): this;

    /**
     * Fired with help response.
     */
    on(event: "help", cb: (event: HelpEventArgs) => void): this;

    // ** Auth Events **

    /**
     * Fired when successfully logged in to services (SASL).
     */
    on(event: "loggedin", cb: (event: LoggedInEventArgs) => void): this;

    /**
     * Fired when logged out from services.
     */
    on(event: "loggedout", cb: () => void): this;

    // ** CAP Events **

    /**
     * Fired during CAP LS (capability listing).
     *
     * @remarks
     * Useful for detecting STS (Strict Transport Security).
     */
    on(event: "cap ls", cb: (event: CapEventArgs) => void): this;

    /**
     * Fired when server advertises new capabilities.
     */
    on(event: "cap new", cb: (event: CapEventArgs) => void): this;

    // ** CTCP Events **

    /**
     * Fired for incoming CTCP requests.
     *
     * @remarks
     * Common types: VERSION, PING, TIME, SOURCE
     * Respond with ctcpResponse() if appropriate.
     */
    on(event: "ctcp request", cb: (event: CtcpEventArgs) => void): this;

    /**
     * Fired for incoming CTCP responses.
     */
    on(event: "ctcp response", cb: (event: CtcpEventArgs) => void): this;

    // ** Error Events **

    /**
     * Fired for IRC protocol errors.
     *
     * @remarks
     * Common errors: cannot_send_to_chan, no_such_nick, banned_from_channel
     */
    on(event: "irc error", cb: (event: IrcErrorEventArgs) => void): this;

    /**
     * Fired when the requested nickname is already in use.
     *
     * @remarks
     * irc-framework will automatically try an alternate nick during registration.
     */
    on(event: "nick in use", cb: (event: NickErrorEventArgs) => void): this;

    /**
     * Fired when the requested nickname is invalid.
     */
    on(event: "nick invalid", cb: (event: NickErrorEventArgs) => void): this;

    // ** Debug Events **

    /**
     * Fired for debug messages when debug mode is enabled.
     */
    on(event: "debug", cb: (message: string) => void): this;

    /**
     * Fired for every raw IRC line sent and received.
     *
     * @remarks
     * Useful for debugging. Enable with debug.raw config option.
     */
    on(event: "raw", cb: (event: RawEventArgs) => void): this;

    /**
     * Fired for IRC commands not handled by specific events.
     */
    on(
      event: "unknown command",
      cb: (event: UnknownCommandEventArgs) => void
    ): this;

    // Generic fallback
    on(event: string | symbol, cb: (event: unknown) => void): this;

    // Emit overloads for simulating events
    emit(event: "action", data: Partial<MessageEventArgs>): boolean;
    emit(event: "privmsg", data: Partial<MessageEventArgs>): boolean;
    emit(event: "notice", data: Partial<MessageEventArgs>): boolean;
    emit(event: string | symbol, ...args: unknown[]): boolean;

    // Remove listener
    off(event: string | symbol, cb: (...args: unknown[]) => void): this;
  }

  // ============================================================================
  // * IRC MESSAGE CLASS
  // ============================================================================

  /**
   * Represents a parsed IRC message.
   * Can be constructed manually or obtained from ircLineParser.
   */
  class IrcMessage {
    constructor(command?: string, ...args: string[]);

    /** IRCv3 message tags */
    tags: Record<string, string>;

    /** Full prefix (nick!user@host) */
    prefix: string;

    /** User's nickname */
    nick: string;

    /** User's ident/username */
    ident: string;

    /** User's hostname */
    hostname: string;

    /** IRC command (e.g., 'PRIVMSG', 'JOIN', '001') */
    command: string;

    /** Command parameters */
    params: string[];

    /** Convert to IRC protocol format (RFC 1459) */
    to1459(): string;

    /** Convert to JSON representation */
    toJson(): {
      tags: Record<string, string>;
      source: string;
      command: string;
      params: string[];
    };
  }

  // ============================================================================
  // * IRC CHANNEL CLASS
  // ============================================================================

  /**
   * Wrapper for interacting with a specific channel.
   * Obtained via client.channel('#channelname').
   * Note: IrcChannel does NOT extend EventEmitter in the source.
   */
  class IrcChannel {
    constructor(irc_client: IrcClient, channel_name: string, key?: string);

    /** Reference to the parent IRC client */
    irc_client: IrcClient;

    /** Channel name */
    name: string;

    /** Users currently in the channel (populated via userlist events) */
    users: Array<{
      nick: string;
      modes?: string[];
      ident?: string;
      hostname?: string;
      gecos?: string;
      account?: string | boolean;
    }>;

    /** Send a message to this channel */
    say(message: string, tags?: Record<string, string>): void;

    /** Send a notice to this channel */
    notice(message: string, tags?: Record<string, string>): void;

    /** Join this channel */
    join(key?: string): void;

    /** Leave this channel */
    part(message?: string): void;

    /** Set modes on this channel */
    mode(mode: string, extra_args?: string[]): void;

    /** Request ban list */
    banlist(cb?: (event: BanlistEventArgs) => void): void;

    /** Add a ban */
    ban(mask: string): void;

    /** Remove a ban */
    unban(mask: string): void;

    /** Request and populate user list via NAMES command */
    updateUsers(cb?: (channel: IrcChannel) => void): void;

    /**
     * Relay messages between channels using Node streams.
     *
     * @param target_chan - Target channel or channel name
     * @param opts - Relay options
     */
    relay(
      target_chan: IrcChannel | string,
      opts?: { one_way?: boolean; replay_nicks?: boolean }
    ): void;

    /**
     * Get a duplex stream for this channel.
     * Read side receives privmsg events, write side sends messages.
     */
    stream(opts?: { replay_nicks?: boolean }): NodeJS.ReadWriteStream;
  }

  // ============================================================================
  // * CLIENT OPTIONS
  // ============================================================================

  /**
   * Options for creating and connecting an IRC client.
   */
  export interface ClientOptions {
    // ** Connection **

    /** IRC server hostname */
    host?: string;

    /** IRC server port (default: 6667, or 6697 for TLS) */
    port?: number;

    /** Enable TLS/SSL connection */
    tls?: boolean;

    /**
     * Reject invalid SSL certificates.
     *
     * @remarks
     * Set to false for self-signed certs (not recommended for production).
     */
    rejectUnauthorized?: boolean;

    /** Server password (not NickServ password) */
    password?: string;

    /** Local IP address to bind to (for multi-homed hosts) */
    outgoing_addr?: string;

    // ** Identity **

    /** Initial nickname */
    nick?: string;

    /** Username (ident) */
    username?: string;

    /** Real name (gecos) */
    gecos?: string;

    // ** Reconnection **

    /**
     * Automatically reconnect on disconnection.
     *
     * @remarks
     * HIGHLY RECOMMENDED: IRC servers drop connections frequently.
     * Uses exponential backoff up to 300 seconds.
     */
    auto_reconnect?: boolean;

    /**
     * Maximum reconnection attempts before giving up.
     *
     * @remarks
     * Recommended: 30 (keeps trying for over an hour).
     */
    auto_reconnect_max_retries?: number;

    /** Initial wait between reconnection attempts (ms) */
    auto_reconnect_wait?: number;

    // ** IRCv3 Capabilities **

    /**
     * Enable echo-message capability.
     *
     * @remarks
     * IMPORTANT: Without this, you won't see your own messages in the client.
     * Always enable this.
     */
    enable_echomessage?: boolean;

    /** Enable CHGHOST tracking (host/ident changes) */
    enable_chghost?: boolean;

    /** Enable SETNAME tracking (realname changes) */
    enable_setname?: boolean;

    // ** Timeouts **

    /** Interval between PING messages (ms) */
    ping_interval?: number;

    /** Time to wait for PONG before considering connection dead (ms) */
    ping_timeout?: number;

    /** Maximum message length before splitting */
    message_max_length?: number;

    // ** CTCP **

    /**
     * CTCP VERSION response.
     *
     * @remarks
     * Set to false to handle VERSION yourself.
     */
    version?: string | boolean;

    // ** Encoding **

    /**
     * Text encoding.
     *
     * @remarks
     * IRC's relationship with UTF-8 is complicated.
     * Some servers/channels still use ISO-8859-1.
     */
    encoding?: string;

    // ** Authentication **

    /**
     * SASL authentication mechanism.
     *
     * @remarks
     * Common values: 'PLAIN', 'EXTERNAL' (client cert)
     */
    sasl_mechanism?: string;

    /** SASL account credentials */
    account?: {
      account: string;
      password: string;
    };

    /** Client certificate for SASL EXTERNAL */
    client_certificate?: {
      private_key: string;
      certificate: string;
    } | null;

    // ** Proxy **

    /** SOCKS proxy configuration */
    socks?: {
      host: string;
      port: number;
      user?: string;
      pass?: string;
    };

    /**
     * WEBIRC configuration for revealing real user IPs to IRC servers.
     *
     * @remarks
     * Requires server-side configuration. Password is shared secret.
     *
     * @see https://ircv3.net/specs/extensions/webirc
     */
    webirc?: {
      password: string | null;
      username: string;
      address?: string;
      hostname?: string;
      options?: {
        secure?: boolean;
      };
    } | null;

    // ** Transport **

    /** Custom transport class (WebSocket or TCP) */
    transport?: new (
      options: unknown
    ) => unknown;
  }

  // ============================================================================
  // * IRC USER CLASS
  // ============================================================================

  /**
   * Represents the connected user (you) on the IRC network.
   * This is the User class from user.js, used for client.user.
   */
  class IrcUser {
    constructor(opts?: {
      nick?: string;
      username?: string;
      gecos?: string;
      host?: string;
      away?: boolean;
      modes?: string[];
    });

    /** Current nickname */
    nick: string;

    /** Username/ident */
    username: string;

    /** Real name (gecos) */
    gecos: string;

    /** Hostname (may be cloaked) */
    host: string;

    /** Whether user is away */
    away: boolean;

    /** User modes as a Set */
    modes: Set<string>;

    /** Toggle modes from a mode string like '+iw-x' */
    toggleModes(modestr: string): void;
  }

  // ============================================================================
  // * IRC NETWORK
  // ============================================================================

  /**
   * Information about the IRC network.
   * This is the NetworkInfo class from networkinfo.js.
   */
  class IrcNetwork {
    /** Name of the network (from NETWORK in ISUPPORT) */
    name: string;

    /** Name of the connected server */
    server: string;

    /** The reported IRCd type */
    ircd: string;

    /** Server-advertised options from ISUPPORT (005) */
    options: IrcServerOptions;

    /** IRCv3 capability information */
    cap: {
      /** Whether CAP negotiation is in progress */
      negotiating: boolean;

      /** Capabilities we've requested */
      requested: string[];

      /** List of enabled capabilities */
      enabled: string[];

      /** Map of available capabilities and their values */
      available: Map<string, string>;

      /**
       * Check if a capability is enabled.
       *
       * @param cap_name - Capability name (e.g., 'echo-message', 'multi-prefix')
       */
      isEnabled(cap_name: string): boolean;
    };

    /** Time offset samples for server time sync */
    time_offsets: number[];

    /** Current calculated time offset */
    time_offset: number;

    /** Convert server time to local time */
    timeToLocal(serverTimeMs: number): number;

    /** Convert local time to server time */
    timeToServer(localTimeMs: number): number;

    /** Get median server time offset */
    getServerTimeOffset(): number;

    /** Add a new server time sample */
    addServerTimeOffset(time: number): void;

    /**
     * Check if the server supports a feature from ISUPPORT.
     *
     * @param support_name - Feature name (e.g., 'MODES', 'WHOX')
     * @returns The value if set, or undefined
     */
    supports(support_name: string): unknown;

    /**
     * Check if a client tag is supported (for message-tags cap).
     *
     * @param tag_name - Tag name to check
     */
    supportsTag(tag_name: string): boolean;

    /**
     * Check if a string is a valid channel name.
     *
     * @param channel_name - String to check
     */
    isChannelName(channel_name: string): boolean;

    /**
     * Extract target group prefix from a message target.
     *
     * @param target - Message target (e.g., '@#channel')
     * @returns Separated target and target_group, or null
     */
    extractTargetGroup(target: string): {
      target: string;
      target_group: string;
    } | null;
  }

  /**
   * Server options from ISUPPORT (numeric 005).
   *
   * @remarks
   * These vary significantly between networks. Never hardcode!
   */
  export interface IrcServerOptions {
    /**
     * Valid channel prefixes.
     *
     * @remarks
     * Common: '#', '&'. Some networks also use '!', '+'.
     * Use this to detect if a target is a channel.
     */
    CHANTYPES?: string;

    /**
     * User mode prefixes and their corresponding mode letters.
     *
     * @example '(ov)@+' means '@' = 'o' (op), '+' = 'v' (voice)
     */
    PREFIX?: Array<{ symbol: string; mode: string }>;

    /** Network name (e.g., 'Libera.Chat') */
    NETWORK?: string;

    /** Maximum nickname length */
    NICKLEN?: string;

    /**
     * Available channel modes grouped by type.
     *
     * @example 'beI,k,l,imnpst'
     */
    CHANMODES?: string;

    /** Maximum modes per MODE command */
    MODES?: string;

    /**
     * Case mapping for nick/channel comparison.
     *
     * @remarks
     * Usually 'rfc1459' or 'ascii'. Affects []\~ handling.
     */
    CASEMAPPING?: string;

    /** Additional server-specific options */
    [key: string]: unknown;
  }

  // ============================================================================
  // * IRC CONNECTION
  // ============================================================================

  /**
   * Low-level connection manager.
   * This is the Connection class from connection.js.
   * Extends EventEmitter and emits: connecting, reconnecting, close,
   * socket close, socket error, raw socket connected, debug, raw, socket connected
   */
  interface IrcConnection extends EventEmitter {
    /** Listen for raw IRC lines (both incoming and outgoing) */
    on(event: "raw", cb: (event: RawEventArgs) => void): this;
    on(event: "socket connected", cb: () => void): this;
    on(event: "socket close", cb: (error?: Error) => void): this;
    on(event: "connecting", cb: () => void): this;
    on(
      event: "message",
      cb: (message: IrcMessage, rawLine: string) => void
    ): this;
    on(event: string, cb: (...args: unknown[]) => void): this;

    /** Connection options */
    options: ClientOptions;

    /** TCP connection is established */
    connected: boolean;

    /** User requested disconnect (don't auto-reconnect) */
    requested_disconnect: boolean;

    /** Number of reconnection attempts made */
    reconnect_attempts: number;

    /** IRC registration completed - timestamp in ms, or false */
    registered: number | false;

    /** Transport layer (socket wrapper) */
    transport: IrcTransport | null;

    /** Mark registration as successful (sets registered to Date.now()) */
    registeredSuccessfully(): void;

    /** Connect to the server */
    connect(options?: ClientOptions): void;

    /** Write raw data to the connection */
    write(data: string, callback?: () => void): boolean;

    /**
     * Close the connection after sending optional data.
     * @param data - Optional final message to send
     * @param had_error - Whether this is due to an error (affects reconnect)
     */
    end(data?: string, had_error?: boolean): void;

    /** Set the connection encoding */
    setEncoding(encoding: string): boolean | undefined;

    /** Create a tracked timeout */
    setTimeout(
      fn: () => void,
      length: number,
      ...args: unknown[]
    ): NodeJS.Timeout;

    /** Clear a tracked timeout */
    clearTimeout(tmr: NodeJS.Timeout): void;

    /** Clear all tracked timeouts */
    clearTimers(): void;

    /** Output debug message */
    debugOut(out: string): void;
  }

  /**
   * Transport layer wrapping the socket.
   */
  interface IrcTransport {
    /** Write a line to the socket */
    writeLine(data: string, callback?: () => void): boolean;

    /** Close the transport */
    close(had_error?: boolean): void;

    /** Dispose of the socket */
    disposeSocket(): void;

    /** Set the encoding */
    setEncoding(encoding: string): boolean;

    /** Connect the transport */
    connect(): void;

    /** Remove all event listeners */
    removeAllListeners(): void;

    /** The underlying socket (implementation-dependent) */
    socket?: unknown;
  }

  // ============================================================================
  // * EVENT ARGUMENT TYPES
  // ============================================================================

  // ** Message Events **

  /**
   * Data for message events (privmsg, notice, action, wallops).
   */
  export interface MessageEventArgs {
    /** Sender's nickname (may be empty for server messages) */
    nick: string;

    /** Sender's ident/username */
    ident: string;

    /** Sender's hostname */
    hostname: string;

    /** Message target (channel name or your nick for PMs) */
    target: string;

    /** Message content */
    message: string;

    /**
     * Server timestamp (if server-time cap enabled).
     *
     * @remarks
     * Milliseconds since epoch. Use for accurate message ordering.
     */
    time?: number;

    /** Sender's services account (if logged in) */
    account?: string;

    /** IRCv3 message tags */
    tags?: Record<string, string>;

    /**
     * Target group prefix (for status messages).
     *
     * @example '@' for messages to channel ops only
     */
    group?: string;

    /**
     * Whether this is a server-originated message.
     *
     * @remarks
     * Set manually in some cases when nick is empty.
     */
    from_server?: boolean;

    /** Reply helper function */
    reply(message: string): void;
  }

  // ** Channel Events **

  export interface JoinEventArgs {
    /** User who joined */
    nick: string;

    /** User's ident */
    ident: string;

    /** User's hostname */
    hostname: string;

    /** Channel joined */
    channel: string;

    /** User's real name */
    gecos?: string;

    /** User's services account */
    account?: string | boolean;

    /** Server timestamp */
    time?: number;
  }

  export interface PartEventArgs {
    /** User who left */
    nick: string;

    /** User's ident */
    ident: string;

    /** User's hostname */
    hostname: string;

    /** Channel left */
    channel: string;

    /** Part message */
    message?: string;

    /** Server timestamp */
    time?: number;
  }

  export interface QuitEventArgs {
    /** User who quit */
    nick: string;

    /** User's ident */
    ident: string;

    /** User's hostname */
    hostname: string;

    /** Quit message */
    message?: string;

    /** Server timestamp */
    time?: number;
  }

  export interface KickEventArgs {
    /** User who performed the kick */
    nick: string;

    /** Kicker's ident */
    ident: string;

    /** Kicker's hostname */
    hostname: string;

    /** Channel */
    channel?: string;

    /** User who was kicked */
    kicked?: string;

    /** Kick reason */
    message?: string;

    /** Server timestamp */
    time?: number;
  }

  export interface TopicEventArgs {
    /** Channel */
    channel: string;

    /** New topic text */
    topic: string;

    /** User who set the topic (if known) */
    nick?: string;

    /** Server timestamp */
    time?: number;
  }

  export interface TopicSetByEventArgs {
    /** Channel */
    channel: string;

    /** User who set the topic */
    nick: string;

    /** Topic setter's ident */
    ident: string;

    /** Topic setter's hostname */
    hostname: string;

    /**
     * When the topic was set.
     *
     * @remarks
     * Unix timestamp in SECONDS (not milliseconds).
     */
    when?: number;
  }

  export interface InviteEventArgs {
    /** User who sent the invite */
    nick: string;

    /** User who was invited */
    invited: string;

    /** Channel being invited to */
    channel: string;

    /** Server timestamp */
    time?: number;
  }

  // ** User Events **

  export interface NickEventArgs {
    /** Old nickname */
    nick: string;

    /** New nickname */
    new_nick: string;

    /** User's ident */
    ident: string;

    /** User's hostname */
    hostname: string;

    /** Server timestamp */
    time?: number;
  }

  export interface AwayEventArgs {
    /** User's nickname */
    nick: string;

    /** Away message (empty if returning) */
    message?: string;

    /** Whether this is about yourself */
    self?: boolean;

    /** Server timestamp */
    time?: number;
  }

  export interface UserUpdatedEventArgs {
    /** User's nickname */
    nick: string;

    /** Old ident */
    ident: string;

    /** Old hostname */
    hostname: string;

    /** New ident */
    new_ident: string;

    /** New hostname */
    new_hostname: string;

    /** Server timestamp */
    time?: number;
  }

  // ** Mode Events **

  export interface ModeEventArgs {
    /** Target (channel or nick) */
    target: string;

    /** User who changed modes */
    nick: string;

    /** Parsed mode changes */
    modes: Array<{
      /** Mode change (e.g., '+o', '-v') */
      mode: string;

      /** Mode parameter (e.g., nickname for +o) */
      param?: string;
    }>;

    /** Raw mode string (e.g., '+ov-b') */
    raw_modes: string;

    /** Raw mode parameters */
    raw_params: string[];

    /** Server timestamp */
    time?: number;
  }

  export interface ChannelInfoEventArgs {
    /** Channel name */
    channel: string;

    /**
     * Channel creation timestamp.
     *
     * @remarks
     * Unix timestamp in seconds.
     */
    created_at?: number;

    /** Channel modes */
    modes?: Array<{ mode: string; param?: string }>;

    /** Channel URL (if set) */
    url?: string;

    /** Raw mode string */
    raw_modes?: string;

    /** Raw mode parameters */
    raw_params?: string[];
  }

  export interface UserInfoEventArgs {
    /** Raw mode string */
    raw_modes: string;
  }

  // ** List Events **

  export interface UserListEventArgs {
    /** Channel name */
    channel: string;

    /** Users in the channel */
    users: Array<{
      nick: string;
      modes: string[];
    }>;
  }

  export interface WhoEventArgs {
    /** Query target */
    target: string;

    /** Users matching the query */
    users: IrcUser[];
  }

  export interface BanlistEventArgs {
    /** Channel name */
    channel: string;

    /** Ban entries */
    bans: Array<{
      /** Ban mask */
      banned: string;

      /** Who set the ban */
      banned_by: string;

      /**
       * When the ban was set.
       *
       * @remarks
       * Unix timestamp in SECONDS.
       */
      banned_at: number;
    }>;
  }

  export interface InviteListEventArgs {
    /** Channel name */
    channel: string;

    /** Invite entries */
    invites: Array<{
      /** Invite mask */
      invited: string;

      /** Who set the invite */
      invited_by: string;

      /**
       * When the invite was set.
       *
       * @remarks
       * Unix timestamp in SECONDS.
       */
      invited_at: number;
    }>;
  }

  export interface ChannelListItem {
    /** Channel name */
    channel: string;

    /** Number of users */
    num_users?: number;

    /** Channel topic */
    topic?: string;
  }

  // ** WHOIS Events **

  export interface WhoisEventArgs {
    /** User's nickname */
    nick: string;

    /** User's ident */
    ident?: string;

    /** User's hostname */
    hostname?: string;

    /** Real name */
    real_name?: string;

    /** Services account */
    account?: string;

    /** Server the user is on */
    server?: string;

    /** Server info */
    server_info?: string;

    /**
     * Idle time in seconds.
     *
     * @remarks
     * Not always available; depends on server and user settings.
     */
    idle?: number;

    /**
     * Logon time.
     *
     * @remarks
     * Unix timestamp in SECONDS.
     */
    logon?: number;

    /** Channels the user is in */
    channels?: string;

    /** Whether user is an operator */
    operator?: string;

    /** Whether the query was for WHOWAS */
    whowas?: boolean;

    /** Error if user not found */
    error?: string;

    // Computed fields (added by handlers)
    /** Absolute time in ms since user went idle */
    idleTime?: number;

    /** Absolute logon time in ms */
    logonTime?: number;
  }

  // ** Server Info Events **

  export interface ServerOptionsEventArgs {
    /** Server options from ISUPPORT */
    options: IrcServerOptions;

    /** Capability information */
    cap: {
      enabled: string[];
    };
  }

  export interface MotdEventArgs {
    /** Message of the Day text */
    motd?: string;

    /** Error message if MOTD unavailable */
    error?: string;
  }

  export interface InfoEventArgs {
    /** Server info text */
    info?: string;
  }

  export interface HelpEventArgs {
    /** Help text */
    help?: string;
  }

  // ** Auth Events **

  export interface RegisteredEventArgs {
    /** Your registered nickname */
    nick: string;
  }

  export interface LoggedInEventArgs {
    /** Services account name */
    account: string;
  }

  // ** CAP Events **

  export interface CapEventArgs {
    /** Available capabilities and their values */
    capabilities: Record<string, string>;
  }

  // ** CTCP Events **

  export interface CtcpEventArgs {
    /** Sender's nickname */
    nick: string;

    /** Sender's ident */
    ident: string;

    /** Sender's hostname */
    hostname: string;

    /** CTCP target */
    target: string;

    /** CTCP type (e.g., 'VERSION', 'PING') */
    type: string;

    /** CTCP message content */
    message: string;

    /** Server timestamp */
    time?: number;

    /** Whether from server */
    from_server?: boolean;
  }

  // ** Error Events **

  export interface IrcErrorEventArgs {
    /** Error type (e.g., 'cannot_send_to_chan', 'no_such_nick') */
    error: string;

    /** Related channel (if applicable) */
    channel?: string;

    /** Error reason/message */
    reason?: string;

    /** Related nickname (if applicable) */
    nick?: string;

    /** IRC command that caused the error */
    command?: string;
  }

  export interface NickErrorEventArgs {
    /** The problematic nickname */
    nick: string;

    /** Error reason */
    reason?: string;
  }

  // ** Monitor Events **

  export interface MonitorListEventArgs {
    /** List of monitored nicks */
    nicks: string[];
  }

  export interface UsersOnlineEventArgs {
    /** Nicks that are online */
    nicks: string[];

    /** IRCv3 message tags */
    tags?: Record<string, string>;
  }

  export interface UsersOfflineEventArgs {
    /** Nicks that are offline */
    nicks: string[];

    /** IRCv3 message tags */
    tags?: Record<string, string>;
  }

  // ** Connection Events **

  export interface ReconnectingEventArgs {
    /** Time to wait before reconnecting (ms) */
    wait: number;

    /** Current attempt number */
    attempt: number;

    /** Maximum retries configured */
    max_retries: number;
  }

  // ** Debug Events **

  export interface RawEventArgs {
    /** Whether the line was received from server (vs sent) */
    from_server: boolean;

    /** Raw IRC protocol line */
    line: string;
  }

  export interface UnknownCommandEventArgs {
    /** IRC command/numeric */
    command: string;

    /** Command parameters */
    params: string[];
  }

  // ============================================================================
  // * IRC COMMAND HANDLER
  // ============================================================================

  /**
   * Handles parsed IRC commands and emits events.
   * Extends EventEmitter with an 'all' event that fires for every parsed event.
   */
  export interface IrcCommandHandler {
    /**
     * Listen for all events. Fires before client-level processing.
     *
     * @param event - 'all'
     * @param cb - Callback receiving (command: string, event: any)
     */
    on(event: "all", cb: (command: string, eventData: unknown) => void): this;

    /**
     * Listen for unknown IRC commands (not handled by specific handlers).
     */
    on(
      event: "unknown command",
      cb: (command: UnknownCommandEventArgs) => void
    ): this;

    /** Generic event listener */
    on(event: string, cb: (...args: unknown[]) => void): this;

    /** Remove event listener */
    off(event: string, cb: (...args: unknown[]) => void): this;
  }

  // ============================================================================
  // * MIDDLEWARE PIPELINES
  // ============================================================================

  /**
   * Pipeline for registering middleware to intercept raw IRC events.
   * Raw events are received before parsing into structured events.
   */
  export interface RawMiddleware {
    /**
     * Register a middleware handler for raw IRC events.
     *
     * @param handler - Middleware function that receives (command, message, rawLine, client, next)
     *
     * @remarks
     * - `command` is the IRC command (e.g., 'PRIVMSG', 'JOIN', '001')
     * - `message` is the parsed IrcMessage object
     * - `rawLine` is the raw IRC protocol line
     * - `client` is the IRC client instance
     * - `next()` must be called to continue the middleware chain
     */
    use(
      handler: (
        command: string,
        message: IrcMessage,
        rawLine: string,
        client: Client,
        next: () => void
      ) => void
    ): void;
  }

  /**
   * Pipeline for registering middleware to intercept parsed IRC events.
   * Parsed events are structured and ready for application use.
   */
  export interface ParsedMiddleware {
    /**
     * Register a middleware handler for parsed IRC events.
     *
     * @param handler - Middleware function that receives (eventName, event, client, next)
     *
     * @remarks
     * - `eventName` is the event name (e.g., 'privmsg', 'join', 'registered')
     * - `event` is the parsed event data
     * - `client` is the IRC client instance
     * - `next()` must be called to continue the middleware chain
     */
    use(
      handler: (
        eventName: string,
        event: unknown,
        client: Client,
        next: () => void
      ) => void
    ): void;
  }
}
