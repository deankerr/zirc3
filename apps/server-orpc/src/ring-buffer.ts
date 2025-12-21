export class RingBuffer<T> {
  private readonly items: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(item: T) {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  getAll(): T[] {
    return this.items;
  }

  clear() {
    this.items.length = 0;
  }

  get length() {
    return this.items.length;
  }
}
