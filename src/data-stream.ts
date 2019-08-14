import { Id } from "./data-interface";

/**
 * Data stream
 *
 * @remarks
 * [[DataStream]] offers an always up to date stream of items from a [[DataSet]] or [[DataView]].
 * That means that the stream is evaluated at the time of iteration, conversion to another data type or when [[cache]] is called, not when the [[DataStream]] was created.
 * Multiple invocations of for example [[toItemArray]] may yield different results (if the data source like for example [[DataSet]] gets modified).
 *
 * @typeparam Item - The item type this stream is going to work with.
 */
export class DataStream<Item> implements Iterable<[Id, Item]> {
  /**
   * Create a new data stream.
   *
   * @param _pairs - The id, item pairs.
   */
  public constructor(private readonly _pairs: Iterable<[Id, Item]>) {}

  /**
   * Return an iterable of key, value pairs for every entry in the stream.
   */
  public *[Symbol.iterator](): IterableIterator<[Id, Item]> {
    for (const [id, item] of this._pairs) {
      yield [id, item];
    }
  }

  /**
   * Return an iterable of key, value pairs for every entry in the stream.
   */
  public *entries(): IterableIterator<[Id, Item]> {
    for (const [id, item] of this._pairs) {
      yield [id, item];
    }
  }

  /**
   * Return an iterable of keys in the stream.
   */
  public *keys(): IterableIterator<Id> {
    for (const [id] of this._pairs) {
      yield id;
    }
  }

  /**
   * Return an iterable of values in the stream.
   */
  public *values(): IterableIterator<Item> {
    for (const [, item] of this._pairs) {
      yield item;
    }
  }

  /**
   * Return an array containing all the ids in this stream.
   *
   * @remarks
   * The array may contain duplicities.
   *
   * @returns The array with all ids from this stream.
   */
  public toIdArray(): Id[] {
    return [...this._pairs].map((pair): Id => pair[0]);
  }

  /**
   * Return an array containing all the items in this stream.
   *
   * @remarks
   * The array may contain duplicities.
   *
   * @returns The array with all items from this stream.
   */
  public toItemArray(): Item[] {
    return [...this._pairs].map((pair): Item => pair[1]);
  }

  /**
   * Return an array containing all the entries in this stream.
   *
   * @remarks
   * The array may contain duplicities.
   *
   * @returns The array with all entries from this stream.
   */
  public toEntryArray(): [Id, Item][] {
    return [...this._pairs];
  }

  /**
   * Return an object map containing all the items in this stream accessible by ids.
   *
   * @remarks
   * In case of duplicate ids (coerced to string so `7 == '7'`) the last encoutered appears in the returned object.
   *
   * @returns The object map of all id → item pairs from this stream.
   */
  public toObjectMap(): Record<Id, Item> {
    const map: Record<Id, Item> = Object.create(null);
    for (const [id, item] of this._pairs) {
      map[id] = item;
    }
    return map;
  }

  /**
   * Return a map containing all the items in this stream accessible by ids.
   *
   * @returns The map of all id → item pairs from this stream.
   */
  public toMap(): Map<Id, Item> {
    return new Map(this._pairs);
  }

  /**
   * Return a set containing all the (unique) ids in this stream.
   *
   * @returns The set of all ids from this stream.
   */
  public toIdSet(): Set<Id> {
    return new Set(this.toIdArray());
  }

  /**
   * Return a set containing all the (unique) items in this stream.
   *
   * @returns The set of all items from this stream.
   */
  public toItemSet(): Set<Item> {
    return new Set(this.toItemArray());
  }

  /**
   * Cache the items from this stream.
   *
   * @remarks
   * This method allows for items to be fetched immediatelly and used (possibly multiple times) later.
   * It can also be used to optimize performance as [[DataStream]] would otherwise reevaluate everything upon each iteration.
   *
   * ## Example
   * ```javascript
   * const ds = new DataSet([…])
   *
   * const cachedStream = ds.stream()
   *   .filter(…)
   *   .sort(…)
   *   .map(…)
   *   .cached(…) // Data are fetched, processed and cached here.
   *
   * ds.clear()
   * chachedStream // Still has all the items.
   * ```
   *
   * @returns A new [[DataStream]] with cached items (detached from the original [[DataSet]]).
   */
  public cache(): DataStream<Item> {
    return new DataStream([...this._pairs]);
  }

  /**
   * Get the distinct values of given property.
   *
   * @param callback - The function that picks and possibly converts the property.
   *
   * @typeparam T - The type of the distinct value.
   *
   * @returns A set of all distinct properties.
   */
  public distinct<T>(callback: (item: Item, id: Id) => T): Set<T> {
    const set = new Set<T>();

    for (const [id, item] of this._pairs) {
      set.add(callback(item, id));
    }

    return set;
  }

  /**
   * Filter the items of the stream.
   *
   * @param callback - The function that decides whether an item will be included.
   *
   * @returns A new data stream with the filtered items.
   */
  public filter(callback: (item: Item, id: Id) => boolean): DataStream<Item> {
    const pairs = this._pairs;
    return new DataStream<Item>({
      *[Symbol.iterator](): IterableIterator<[Id, Item]> {
        for (const [id, item] of pairs) {
          if (callback(item, id)) {
            yield [id, item];
          }
        }
      }
    });
  }

  /**
   * Execute a callback for each item of the stream.
   *
   * @param callback - The function that will be invoked for each item.
   */
  public forEach(callback: (item: Item, id: Id) => boolean): void {
    for (const [id, item] of this._pairs) {
      callback(item, id);
    }
  }

  /**
   * Map the items into a different type.
   *
   * @param callback - The function that does the conversion.
   *
   * @typeparam Mapped - The type of the item after mapping.
   *
   * @returns A new data stream with the mapped items.
   */
  public map<Mapped>(
    callback: (item: Item, id: Id) => Mapped
  ): DataStream<Mapped> {
    const pairs = this._pairs;
    return new DataStream<Mapped>({
      *[Symbol.iterator](): IterableIterator<[Id, Mapped]> {
        for (const [id, item] of pairs) {
          yield [id, callback(item, id)];
        }
      }
    });
  }

  /**
   * Get the item with the maximum value of given property.
   *
   * @param callback - The function that picks and possibly converts the property.
   *
   * @returns The item with the maximum if found otherwise null.
   */
  public max(callback: (item: Item, id: Id) => number): Item | null {
    const iter = this._pairs[Symbol.iterator]();
    let curr = iter.next();
    if (curr.done) {
      return null;
    }

    let maxItem: Item = curr.value[1];
    let maxValue: number = callback(curr.value[1], curr.value[0]);
    while (!(curr = iter.next()).done) {
      const [id, item] = curr.value;
      const value = callback(item, id);
      if (value > maxValue) {
        maxValue = value;
        maxItem = item;
      }
    }

    return maxItem;
  }

  /**
   * Get the item with the minimum value of given property.
   *
   * @param callback - The function that picks and possibly converts the property.
   *
   * @returns The item with the minimum if found otherwise null.
   */
  public min(callback: (item: Item, id: Id) => number): Item | null {
    const iter = this._pairs[Symbol.iterator]();
    let curr = iter.next();
    if (curr.done) {
      return null;
    }

    let minItem: Item = curr.value[1];
    let minValue: number = callback(curr.value[1], curr.value[0]);
    while (!(curr = iter.next()).done) {
      const [id, item] = curr.value;
      const value = callback(item, id);
      if (value < minValue) {
        minValue = value;
        minItem = item;
      }
    }

    return minItem;
  }

  /**
   * Reduce the items into a single value.
   *
   * @param callback - The function that does the reduction.
   * @param accumulator - The initial value of the accumulator.
   *
   * @typeparam T - The type of the accumulated value.
   *
   * @returns The reduced value.
   */
  public reduce<T>(
    callback: (accumulator: T, item: Item, id: Id) => T,
    accumulator: T
  ): T {
    for (const [id, item] of this._pairs) {
      accumulator = callback(accumulator, item, id);
    }
    return accumulator;
  }

  /**
   * Sort the items.
   *
   * @param callback - Item comparator.
   *
   * @returns A new stream with sorted items.
   */
  public sort(
    callback: (itemA: Item, itemB: Item, idA: Id, idB: Id) => number
  ): DataStream<Item> {
    return new DataStream({
      [Symbol.iterator]: (): IterableIterator<[Id, Item]> =>
        [...this._pairs]
          .sort(([idA, itemA], [idB, itemB]): number =>
            callback(itemA, itemB, idA, idB)
          )
          [Symbol.iterator]()
    });
  }
}
