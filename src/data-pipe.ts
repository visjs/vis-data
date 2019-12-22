/* eslint @typescript-eslint/member-ordering: ["error", { "classes": ["field", "constructor", "method"] }] */

import { DataInterface, EventCallbacks, PartItem } from "./data-interface";
import { DataSet } from "./data-set";

/**
 * This interface is used to control the pipe.
 */
export interface DataPipe {
  /**
   * Take all items from the source data set or data view, transform them as
   * configured and update the target data set.
   */
  all(): this;

  /**
   * Start observing the source data set or data view, transforming the items
   * and updating the target data set.
   *
   * @remarks
   * The current content of the source data set will be ignored. If you for
   * example want to process all the items that are already there use:
   * `pipe.all().start()`.
   */
  start(): this;

  /**
   * Stop observing the source data set or data view, transforming the items
   * and updating the target data set.
   */
  stop(): this;
}

/**
 * This interface is used to construct the pipe.
 */
export type DataPipeFactory = InstanceType<typeof DataPipeUnderConstruction>;

/**
 * Create new data pipe.
 *
 * @param from - The source data set or data view.
 *
 * @remarks
 * Example usage:
 * ```typescript
 * interface AppItem {
 *   whoami: string;
 *   appData: unknown;
 *   visData: VisItem;
 * }
 * interface VisItem {
 *   id: number;
 *   label: string;
 *   color: string;
 *   x: number;
 *   y: number;
 * }
 *
 * const ds1 = new DataSet<AppItem, "whoami">([], { fieldId: "whoami" });
 * const ds2 = new DataSet<VisItem, "id">();
 *
 * const pipe = createNewDataPipeFrom(ds1)
 *   .filter((item): boolean => item.enabled === true)
 *   .map<VisItem, "id">((item): VisItem => item.visData)
 *   .to(ds2);
 *
 * pipe.start();
 * ```
 *
 * @returns A factory whose methods can be used to configure the pipe.
 */
export function createNewDataPipeFrom<
  SI extends PartItem<SP>,
  SP extends string = "id"
>(from: DataInterface<SI, SP>): DataPipeUnderConstruction<SI, SP> {
  return new DataPipeUnderConstruction(from);
}

type Transformer<T> = (input: T[]) => T[];

/**
 * Internal implementation of the pipe. This should be accessible only through
 * `createNewDataPipeFrom` from the outside.
 *
 * @typeparam SI - Source item type.
 * @typeparam SP - Source item type's id property name.
 * @typeparam TI - Target item type.
 * @typeparam TP - Target item type's id property name.
 */
class SimpleDataPipe<
  SI extends PartItem<SP>,
  SP extends string,
  TI extends PartItem<TP>,
  TP extends string
> implements DataPipe {
  /**
   * Bound listeners for use with `DataInterface['on' | 'off']`.
   */
  private readonly _listeners: EventCallbacks<SI, SP> = {
    add: this._add.bind(this),
    remove: this._remove.bind(this),
    update: this._update.bind(this)
  };

  /**
   * Create a new data pipe.
   *
   * @param _source - The data set or data view that will be observed.
   * @param _transformers - An array of transforming functions to be used to
   * filter or transform the items in the pipe.
   * @param _target - The data set or data view that will receive the items.
   */
  public constructor(
    private readonly _source: DataInterface<SI, SP>,
    private readonly _transformers: readonly Transformer<unknown>[],
    private readonly _target: DataSet<TI, TP>
  ) {}

  /** @inheritdoc */
  public all(): this {
    this._target.update(this._transformItems(this._source.get()));
    return this;
  }

  /** @inheritdoc */
  public start(): this {
    this._source.on("add", this._listeners.add);
    this._source.on("remove", this._listeners.remove);
    this._source.on("update", this._listeners.update);

    return this;
  }

  /** @inheritdoc */
  public stop(): this {
    this._source.off("add", this._listeners.add);
    this._source.off("remove", this._listeners.remove);
    this._source.off("update", this._listeners.update);

    return this;
  }

  /**
   * Apply the transformers to the items.
   *
   * @param items - The items to be transformed.
   *
   * @returns The transformed items.
   */
  private _transformItems(items: unknown[]): any[] {
    return this._transformers.reduce((items, transform): unknown[] => {
      return transform(items);
    }, items);
  }

  /**
   * Handle an add event.
   *
   * @param _name - Ignored.
   * @param payload - The payload containing the ids of the added items.
   */
  private _add(
    _name: Parameters<EventCallbacks<SI, SP>["add"]>[0],
    payload: Parameters<EventCallbacks<SI, SP>["add"]>[1]
  ): void {
    if (payload == null) {
      return;
    }

    this._target.add(this._transformItems(this._source.get(payload.items)));
  }

  /**
   * Handle an update event.
   *
   * @param _name - Ignored.
   * @param payload - The payload containing the ids of the updated items.
   */
  private _update(
    _name: Parameters<EventCallbacks<SI, SP>["update"]>[0],
    payload: Parameters<EventCallbacks<SI, SP>["update"]>[1]
  ): void {
    if (payload == null) {
      return;
    }

    this._target.update(this._transformItems(this._source.get(payload.items)));
  }

  /**
   * Handle a remove event.
   *
   * @param _name - Ignored.
   * @param payload - The payload containing the data of the removed items.
   */
  private _remove(
    _name: Parameters<EventCallbacks<SI, SP>["remove"]>[0],
    payload: Parameters<EventCallbacks<SI, SP>["remove"]>[1]
  ): void {
    if (payload == null) {
      return;
    }

    this._target.remove(this._transformItems(payload.oldData));
  }
}

/**
 * Internal implementation of the pipe factory. This should be accessible
 * only through `createNewDataPipeFrom` from the outside.
 *
 * @typeparam TI - Target item type.
 * @typeparam TP - Target item type's id property name.
 */
class DataPipeUnderConstruction<
  SI extends PartItem<SP>,
  SP extends string = "id"
> {
  /**
   * Array transformers used to transform items within the pipe. This is typed
   * as any for the sake of simplicity.
   */
  private readonly _transformers: Transformer<any>[] = [];

  /**
   * Create a new data pipe factory. This is an internal constructor that
   * should never be called from outside of this file.
   *
   * @param _source - The source data set or data view for this pipe.
   */
  public constructor(private readonly _source: DataInterface<SI, SP>) {}

  /**
   * Filter the items.
   *
   * @param callback - A filtering function that returns true if given item
   * should be piped and false if not.
   *
   * @returns This factory for further configuration.
   */
  public filter(
    callback: (item: SI) => boolean
  ): DataPipeUnderConstruction<SI, SP> {
    this._transformers.push((input): unknown[] => input.filter(callback));
    return this;
  }

  /**
   * Map each source item to a new type.
   *
   * @param callback - A mapping function that takes a source item and returns
   * corresponding mapped item.
   *
   * @typeparam TI - Target item type.
   * @typeparam TP - Target item type's id property name.
   *
   * @returns This factory for further configuration.
   */
  public map<TI extends PartItem<TP>, TP extends string = "id">(
    callback: (item: SI) => TI
  ): DataPipeUnderConstruction<TI, TP> {
    this._transformers.push((input): unknown[] => input.map(callback));
    return (this as unknown) as DataPipeUnderConstruction<TI, TP>;
  }

  /**
   * Map each source item to zero or more items of a new type.
   *
   * @param callback - A mapping function that takes a source item and returns
   * an array of corresponding mapped items.
   *
   * @typeparam TI - Target item type.
   * @typeparam TP - Target item type's id property name.
   *
   * @returns This factory for further configuration.
   */
  public flatMap<TI extends PartItem<TP>, TP extends string = "id">(
    callback: (item: SI) => TI[]
  ): DataPipeUnderConstruction<TI, TP> {
    this._transformers.push((input): unknown[] => input.flatMap(callback));
    return (this as unknown) as DataPipeUnderConstruction<TI, TP>;
  }

  /**
   * Connect this pipe to given data set.
   *
   * @param target - The data set that will receive the items from this pipe.
   *
   * @returns The pipe connected between given data sets and performing
   * configured transformation on the processed items.
   */
  public to(target: DataSet<SI, SP>): DataPipe {
    return new SimpleDataPipe(this._source, this._transformers, target);
  }
}
