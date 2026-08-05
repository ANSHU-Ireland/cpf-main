import { randomUUID } from 'node:crypto';

export type Record_ = Record<string, unknown>;

/**
 * A tiny in-memory collection store. Collections are keyed by a normalized path
 * (parent ids substituted in), so nested resources are scoped to their parent.
 */
export class Store {
  private readonly collections = new Map<string, Map<string, Record_>>();

  private col(key: string): Map<string, Record_> {
    let c = this.collections.get(key);
    if (c === undefined) {
      c = new Map<string, Record_>();
      this.collections.set(key, c);
    }
    return c;
  }

  list(key: string): Record_[] {
    return [...this.col(key).values()];
  }

  get(key: string, id: string): Record_ | undefined {
    return this.col(key).get(id);
  }

  create(key: string, body: Record_): Record_ {
    const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : randomUUID();
    const now = new Date().toISOString();
    const record: Record_ = { id, ...body, createdAt: body.createdAt ?? now };
    this.col(key).set(id, record);
    return record;
  }

  update(key: string, id: string, patch: Record_): Record_ | undefined {
    const existing = this.col(key).get(id);
    if (existing === undefined) return undefined;
    const updated: Record_ = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.col(key).set(id, updated);
    return updated;
  }

  remove(key: string, id: string): boolean {
    return this.col(key).delete(id);
  }

  /** Ensures a collection has at least `n` seeded demo records, returning them. */
  seed(key: string, n: number, make: (i: number) => Record_): Record_[] {
    const c = this.col(key);
    for (let i = c.size; i < n; i++) {
      const record = this.create(key, make(i));
      void record;
    }
    return this.list(key);
  }
}
