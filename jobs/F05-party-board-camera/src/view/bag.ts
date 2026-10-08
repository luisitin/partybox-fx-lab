// Everything the GPU holds goes through one bag, so dispose() frees all of it.
export interface Disposable {
  dispose(): void;
}

export class Bag {
  private items = new Set<Disposable>();
  add<T extends Disposable>(item: T): T {
    this.items.add(item);
    return item;
  }
  get size(): number {
    return this.items.size;
  }
  dispose(): void {
    for (const item of this.items) item.dispose();
    this.items.clear();
  }
}
