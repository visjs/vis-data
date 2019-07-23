import { Id } from './data-interface'

/**
 * Data stream
 *
 * @typeparam Item - The item type this stream is going to work with.
 */
export class DataStream<Item> implements Iterable<Item> {
  /**
   * Create a new data stream.
   *
   * @param _pairs - The id, item pairs.
   */
  public constructor(private readonly _pairs: Iterable<[Id, Item]>) {}

  /**
   * Get the ES compatible iterator.
   */
  public *[Symbol.iterator](): Iterator<Item> {
    for (const [, item] of this._pairs) {
      yield item
    }
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
    const set = new Set<T>()

    for (const [id, item] of this._pairs) {
      set.add(callback(item, id))
    }

    return set
  }

  /**
   * Filter the items of the stream.
   *
   * @param callback - The function that decides whether an item will be included.
   *
   * @returns A new data stream with the filtered items.
   */
  public filter(callback: (item: Item, id: Id) => boolean): DataStream<Item> {
    const pairs = this._pairs
    return new DataStream<Item>({
      *[Symbol.iterator](): IterableIterator<[Id, Item]> {
        for (const [id, item] of pairs) {
          if (callback(item, id)) {
            yield [id, item]
          }
        }
      },
    })
  }

  /**
   * Execute a callback for each item of the stream.
   *
   * @param callback - The function that will be invoked for each item.
   */
  public forEach(callback: (item: Item, id: Id) => boolean): void {
    for (const [id, item] of this._pairs) {
      callback(item, id)
    }
  }

  /**
   * Get the ids as an array.
   *
   * @returns An array with the ids from this stream.
   */
  public getIds(): Id[] {
    return [...this._pairs].map((pair): Id => pair[0])
  }

  /**
   * Get the items as an array.
   *
   * @returns An array with the items from this stream.
   */
  public getItems(): Item[] {
    return [...this._pairs].map((pair): Item => pair[1])
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
  public map<Mapped>(callback: (item: Item, id: Id) => Mapped): DataStream<Mapped> {
    const pairs = this._pairs
    return new DataStream<Mapped>({
      *[Symbol.iterator](): IterableIterator<[Id, Mapped]> {
        for (const [id, item] of pairs) {
          yield [id, callback(item, id)]
        }
      },
    })
  }

  /**
   * Get the item with the maximum value of given property.
   *
   * @param callback - The function that picks and possibly converts the property.
   *
   * @returns The item with the maximum if found otherwise null.
   */
  public max(callback: (item: Item, id: Id) => number): Item | null {
    const iter = this._pairs[Symbol.iterator]()
    let curr = iter.next()
    if (curr.done) {
      return null
    }

    let maxItem: Item = curr.value[1]
    let maxValue: number = callback(curr.value[1], curr.value[0])
    while (!(curr = iter.next()).done) {
      const [id, item] = curr.value
      const value = callback(item, id)
      if (value > maxValue) {
        maxValue = value
        maxItem = item
      }
    }

    return maxItem
  }

  /**
   * Get the item with the minimum value of given property.
   *
   * @param callback - The function that picks and possibly converts the property.
   *
   * @returns The item with the minimum if found otherwise null.
   */
  public min(callback: (item: Item, id: Id) => number): Item | null {
    const iter = this._pairs[Symbol.iterator]()
    let curr = iter.next()
    if (curr.done) {
      return null
    }

    let minItem: Item = curr.value[1]
    let minValue: number = callback(curr.value[1], curr.value[0])
    while (!(curr = iter.next()).done) {
      const [id, item] = curr.value
      const value = callback(item, id)
      if (value < minValue) {
        minValue = value
        minItem = item
      }
    }

    return minItem
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
  public reduce<T>(callback: (accumulator: T, item: Item, id: Id) => T, accumulator: T): T {
    for (const [id, item] of this._pairs) {
      accumulator = callback(accumulator, item, id)
    }
    return accumulator
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
          [Symbol.iterator](),
    })
  }
}
