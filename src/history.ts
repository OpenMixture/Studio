/** Bounded product history. Snapshots are immutable transport values, never engine state. */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private group: string | undefined;
  private current: T;
  private readonly equal: (a: T, b: T) => boolean;
  readonly limit: number;
  constructor(current: T, equal: (a: T, b: T) => boolean, limit = 100) { this.current = current; this.equal = equal; this.limit = limit; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  boundary() { this.group = undefined; }
  record(next: T, group?: string) {
    if (this.equal(this.current, next)) return;
    if (!group || group !== this.group) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.current = next; this.future = []; this.group = group;
  }
  undo(): T | undefined {
    this.boundary();
    if (!this.past.length) return;
    this.future.push(this.current); return this.current = this.past.pop()!;
  }
  redo(): T | undefined {
    this.boundary();
    if (!this.future.length) return;
    this.past.push(this.current); return this.current = this.future.pop()!;
  }
}
