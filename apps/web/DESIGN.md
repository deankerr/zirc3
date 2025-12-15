# zirc3 Frontend Architecture Design

This document outlines a proposed refactor of the zirc3 web client to establish a more structured, maintainable architecture.

## Current State Analysis

### What We Have

- **Flat message storage**: All IRC messages in a single signal array, filtered at render time
- **Debug-style rendering**: `[timestamp] [command] [target] [source] [params]` format
- **Separate system vs IRC views**: Different routes with different rendering logic
- **Ad-hoc theming**: Colors hardcoded as Tailwind classes throughout components
- **Command-only input**: Only `/command` syntax supported, no direct messaging
- **Derived buffer list**: Buffers discovered from message targets, not tracked explicitly

### Pain Points

1. No unified buffer abstraction - system view and network buffers are completely separate
2. Message rendering not suited for actual IRC usage (debug view)
3. No way to send regular messages (only `/commands`)
4. Colors scattered across components, no theming system
5. No client-side persistence or structure for state
6. Server event shapes not optimised for rendering

---

## Proposed Architecture

### 1. Unified Buffer Primitive

The buffer is a **terminal-like console** - a dumb view that renders lines and accepts input. It doesn't know or care what "type" of buffer it is. This decouples the rendering primitive from the business logic and data structures above it, which will evolve.

Every buffer:
- Has an opaque identifier (just a string, no embedded semantics)
- Contains an ordered list of lines to render
- Supports an input field
- Can optionally have a sidebar (nick list, passed in by parent)

```
Buffer
├── BufferContent (scrollable line list)
│   └── BufferLine[] (individual rendered lines)
├── BufferSidebar? (nick list, optional, provided by parent)
└── BufferInput (text input, delegates handling to parent)
```

The buffer component receives:
- `lines: BufferLine[]` - What to render
- `sidebar?: SidebarData` - Optional nick list or similar
- `onInput: (text: string) => void` - Input handler (parent decides what to do)

**Buffer types exist in the data layer above**, not in the buffer component itself:
- System buffer, server buffers, channels, queries - all just buffers with different data fed in

### 2. Line-Oriented Data Model

Instead of storing raw IRC events and transforming at render time, we convert events to a **render-ready line format** at ingestion time.

```typescript
type BufferLine = {
  id: string              // UUIDv7 for ordering, ties back to source event
  timestamp: number
  type: LineType          // Determines styling
  source?: string         // Display string (nick, command name, event type, etc.)
  sourceStyle?: LineType  // Optional: style the source differently than content
  content: string         // Raw text (may contain IRC formatting codes)
}

type LineType =
  | "message"      // Regular PRIVMSG
  | "action"       // /me actions
  | "notice"       // NOTICEs
  | "join"         // Join events
  | "part"         // Part events
  | "quit"         // Quit events
  | "kick"         // Kick events
  | "nick"         // Nick changes
  | "mode"         // Mode changes
  | "topic"        // Topic changes
  | "info"         // Server info (MOTD lines, RPL_* numerics)
  | "error"        // Errors
  | "system"       // System/client events
```

The `id` field allows us to tie back to the source IRC event if needed, but we don't derive any information back out of this structure - it's purely for rendering.

**Decisions:**
- **Lazy parsing for IRC formatting** - store raw content string, parse to segments at render time with memoization. Simpler storage, can evolve parser independently.
- **Client-side conversion** - server stays focused on IRC protocol, client owns display format. Server sends raw IRC events, client converts to BufferLine.

### 3. IRC Formatting Code Support

IRC uses control characters for formatting. We need to:
1. Parse these codes from message text
2. Convert to renderable segments
3. Apply styling (respecting our theme)

**Control Codes:**
- `0x02` - Bold toggle
- `0x1D` - Italic toggle
- `0x1F` - Underline toggle
- `0x16` - Reverse (swap fg/bg)
- `0x0F` - Reset all formatting
- `0x03` - Color (followed by `N` or `N,M` where N=foreground, M=background)

**Standard IRC Colors (0-15):**
```
0  White       8  Yellow
1  Black       9  Light Green
2  Blue        10 Cyan
3  Green       11 Light Cyan
4  Light Red   12 Light Blue
5  Brown       13 Pink
6  Purple      14 Grey
7  Orange      15 Light Grey
99 Transparent
```

**Rendering Approach:**
```typescript
type Segment = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fg?: number    // IRC color index
  bg?: number    // IRC color index
}

// Parser converts raw string to segments
function parseIrcFormatting(raw: string): Segment[]

// Renderer maps IRC colors to CSS vars
function renderSegment(segment: Segment): JSX.Element
```

**Questions:**
- Support extended color codes (16-98)?
  - Some clients support these, adds complexity
  - **Lean: Start with 0-15 + 99**, extend later if needed
- Strip codes entirely for certain contexts (nick list, topic)?
  - **Lean: Yes** - formatting in nicks is annoying, strip for display

### 4. CSS Variable Theming System

Replace hardcoded Tailwind colors with CSS variables for consistent theming.

**Proposed Variables:**

```css
:root {
  /* Base colors */
  --color-bg-primary: /* neutral-950 */;
  --color-bg-secondary: /* neutral-900 */;
  --color-bg-tertiary: /* neutral-800 */;
  --color-bg-hover: /* neutral-800/50 */;

  --color-text-primary: /* neutral-100 */;
  --color-text-secondary: /* neutral-400 */;
  --color-text-muted: /* neutral-600 */;

  --color-border: /* neutral-800 */;

  /* Semantic colors for line types */
  --color-line-message: /* neutral-100 */;
  --color-line-action: /* emerald-400 */;
  --color-line-notice: /* sky-400 */;
  --color-line-join: /* cyan-400 */;
  --color-line-part: /* rose-400 */;
  --color-line-quit: /* rose-400 */;
  --color-line-kick: /* red-500 */;
  --color-line-nick: /* amber-400 */;
  --color-line-mode: /* violet-400 */;
  --color-line-topic: /* pink-400 */;
  --color-line-info: /* neutral-500 */;
  --color-line-error: /* red-500 */;
  --color-line-system: /* sky-400 */;

  /* IRC formatting colors (mapped from 0-15) */
  --irc-0: #ffffff;  /* White */
  --irc-1: #000000;  /* Black */
  --irc-2: #0000ff;  /* Blue */
  --irc-3: #00ff00;  /* Green */
  --irc-4: #ff0000;  /* Light Red */
  --irc-5: #7b0000;  /* Brown */
  --irc-6: #9b30ff;  /* Purple */
  --irc-7: #ff7f00;  /* Orange */
  --irc-8: #ffff00;  /* Yellow */
  --irc-9: #90ee90;  /* Light Green */
  --irc-10: #00ffff; /* Cyan */
  --irc-11: #e0ffff; /* Light Cyan */
  --irc-12: #add8e6; /* Light Blue */
  --irc-13: #ff69b4; /* Pink */
  --irc-14: #808080; /* Grey */
  --irc-15: #d3d3d3; /* Light Grey */

  /* Accent colors */
  --color-accent-primary: /* emerald-500 */;
  --color-accent-secondary: /* amber-500 */;

  /* Status colors */
  --color-status-connected: /* emerald-400 */;
  --color-status-disconnected: /* rose-400 */;
  --color-status-connecting: /* amber-400 */;
}
```

**Implementation:**
- Define vars in `styles.css`
- Create Tailwind theme extension to reference vars
- Or use `style` attributes with `var()` directly for IRC colors
- Future: Support theme switching (dark/light/custom)

### 5. Client-Side Store Architecture

Replace ad-hoc signals with a structured store.

```typescript
type Store = {
  // Connection state
  connection: {
    status: "disconnected" | "connecting" | "connected"
    url?: string
  }

  // Network metadata
  networks: Map<string, NetworkState>

  // Buffer state (the core data structure)
  buffers: Map<BufferId, BufferState>

  // UI state
  ui: {
    activeBuffer: BufferId | null
    // Future: sidebar collapsed, search open, etc.
  }
}

type NetworkState = {
  name: string
  status: "connecting" | "connected" | "disconnected"
  user?: UserInfo
  channels: Map<string, ChannelState>
}

type BufferState = {
  id: string              // Opaque identifier, format determined by data layer
  type: "system" | "server" | "channel" | "query"
  network?: string        // undefined for system buffer
  target?: string         // channel name or nick
  lines: BufferLine[]     // Ordered by timestamp/id
  unread: number          // Future: unread count
  lastRead?: string       // Future: last read line id
}

// Buffer IDs are opaque strings - the data layer decides the format
// The Buffer component doesn't parse or interpret them
```

**Questions:**
- Use SolidJS stores or signals?
  - Stores: Built-in fine-grained reactivity for nested updates
  - Signals: More explicit, what we have now
  - **Lean: SolidJS stores** - better ergonomics for nested state
- Message limit per buffer?
  - Currently 500 total messages, needs to be per-buffer
  - **Lean: 500 per buffer**, with virtual scrolling later
- Persist to localStorage/IndexedDB?
  - Would enable offline viewing, but complex
  - **Lean: Not now**, but design for it

### 6. Buffer Input Handling

The input component needs to handle both commands and regular messages contextually.

**Behavior:**
- `/command args` - Parsed and sent as IRC command
- `text without slash` - Sent as PRIVMSG to current buffer target
- System buffer: Commands only (for admin tasks like `/network add`)

```typescript
function handleInput(buffer: BufferState, input: string) {
  if (input.startsWith("/")) {
    // Parse and dispatch command
    const { command, args } = parseCommand(input)
    dispatchCommand(buffer, command, args)
  } else if (buffer.type === "channel" || buffer.type === "query") {
    // Send as PRIVMSG
    sendMessage(buffer.network!, buffer.target!, input)
  }
  // System/server buffers: ignore non-commands or show error
}
```

**Questions:**
- Input history (up/down arrows)?
  - **Lean: Yes**, implement with simple array
- Tab completion for nicks/commands?
  - **Lean: Later**, but design input component to support it
- Multi-line input?
  - **Lean: No**, IRC is line-oriented

---

## File Structure Proposal

```
apps/web/src/
├── main.tsx
├── api.ts
├── styles.css              # CSS vars + base styles
├── store/
│   ├── index.ts            # Store creation and provider
│   ├── types.ts            # Store type definitions
│   └── actions.ts          # Store mutations
├── lib/
│   ├── irc-formatting.ts   # IRC color/formatting parser
│   └── line-converter.ts   # IRC event -> BufferLine conversion
├── components/
│   ├── buffer.tsx          # Terminal-like buffer (lines + input)
│   ├── buffer-line.tsx     # Single line renderer
│   ├── buffer-sidebar.tsx  # Nick list (passed into buffer)
│   ├── header.tsx
│   ├── network-tabs.tsx
│   └── buffer-tabs.tsx
├── routes/
│   ├── __root.tsx          # Layout + providers
│   ├── index.tsx           # System buffer view
│   └── $network.$buffer.tsx # Network buffer view (channels, queries, server)
```

The buffer component stays flat and simple - it's just a scrollable line list with an input. All the IRC-specific logic lives in the store and lib layers.

---

## Migration Path

### Phase 1: Foundation
1. Set up CSS variable theming system
2. Create store structure with types
3. Implement BufferLine type and basic line rendering

### Phase 2: Buffer Unification
1. Create unified Buffer component
2. Implement line converter for IRC messages
3. Convert system events to BufferLine format
4. Replace current routes with unified buffer view

### Phase 3: Enhanced Features
1. IRC formatting code parser
2. Nick/channel coloring in message content
3. Proper input handling (commands + messages)
4. Input history

### Phase 4: Polish
1. Unread indicators
2. Tab completion
3. Virtual scrolling for large buffers
4. Theme switching

---

## Future Considerations

These are not blockers for the initial refactor, but worth keeping in mind:

- Server-side BufferLine conversion vs client-side only
- Buffer persistence (IndexedDB) for offline/refresh survival
- System buffer admin commands (`/network add`, `/connect`, etc.)
- Hash-based nick coloring for visual identification
- Timestamp format options (relative, dates for old messages)
- URL auto-linking in messages

---

## References

- [IRC Formatting - modern.ircdocs.horse](https://modern.ircdocs.horse/formatting)
- [mIRC Colors](https://www.mirc.com/colors.html)
- [SolidJS Stores](https://docs.solidjs.com/concepts/stores)
