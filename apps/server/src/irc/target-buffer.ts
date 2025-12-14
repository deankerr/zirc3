import { RingBuffer } from "../ring-buffer";
import type { IRCMessage } from "../types";

const DEFAULT_BUFFER_SIZE = 500;

export class TargetBuffer {
  readonly target: string;
  private readonly messages: RingBuffer<IRCMessage>;

  constructor(target: string, size = DEFAULT_BUFFER_SIZE) {
    this.target = target;
    this.messages = new RingBuffer(size);
  }

  push(message: IRCMessage) {
    this.messages.push(message);
  }

  getAll(): IRCMessage[] {
    return this.messages.getAll();
  }

  get length() {
    return this.messages.length;
  }

  clear() {
    this.messages.clear();
  }
}
