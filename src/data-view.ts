import {
  DataInterface,
  DataInterfaceForEachOptions,
  DataInterfaceGetIdsOptions,
  DataInterfaceGetOptions,
  DataInterfaceGetOptionsArray,
  DataInterfaceGetOptionsObject,
  DataInterfaceMapOptions,
  EventCallbacksWithAny,
  EventName,
  EventPayloads,
  FullItem,
  Id,
  PartItem,
  RemoveEventPayload,
  UpdateEventPayload,
  isId
} from "./data-interface";

import { DataSet } from "./data-set";
import { DataSetPart } from "./data-set-part";
import { DataStream } from "./data-stream";

/**
 * Data view options.
 *
 * @typeParam Item - Item type that may or may not have an id.
 * @typeParam IdProp - Name of the property that contains the id.
 */
export interface DataViewOptions<Item, IdProp extends string> {
  /**
   * The name of the field containing the id of the items. When data is fetched from a server which uses some specific field to identify items, this field name can be specified in the DataSet using the option `fieldId`. For example [CouchDB](http://couchdb.apache.org/) uses the field `'_id'` to identify documents.
   */
  fieldId?: IdProp;
  /** Items can be filtered on specific properties by providing a filter function. A filter function is executed for each of the items in the DataSet, and is called with the item as parameter. The function must return a boolean. All items for which the filter function returns true will be emitted. */
  filter?: (item: Item) => boolean;
}

/**
 * DataView
 *
 * A DataView offers a filtered and/or formatted view on a DataSet. One can subscribe to changes in a DataView, and easily get filtered or formatted data without having to specify filters and field types all the time.
 *
 * ## Example
 * ```javascript
 * // create a DataSet
 * var data = new vis.DataSet();
 * data.add([
 *   {id: 1, text: 'item 1', date: new Date(2013, 6, 20), group: 1, first: true},
 *   {id: 2, text: 'item 2', date: '2013-06-23', group: 2},
 *   {id: 3, text: 'item 3', date: '2013-06-25', group: 2},
 *   {id: 4, text: 'item 4'}
 * ]);
 *
 * // create a DataView
 * // the view will only contain items having a property group with value 1,
 * // and will only output fields id, text, and date.
 * var view = new vis.DataView(data, {
 *   filter: function (item) {
 *     return (item.group == 1);
 *   },
 *   fields: ['id', 'text', 'date']
 * });
 *
 * // subscribe to any change in the DataView
 * view.on('*', function (event, properties, senderId) {
 *   console.log('event', event, properties);
 * });
 *
 * // update an item in the data set
 * data.update({id: 2, group: 1});
 *
 * // get all ids in the view
 * var ids = view.getIds();
 * console.log('ids', ids); // will output [1, 2]
 *
 * // get all items in the view
 * var items = view.get();
 * ```
 *
 * @typeParam Item - Item type that may or may not have an id.
 * @typeParam IdProp - Name of the property that contains the id.
 */
export class DataView<
  Item extends PartItem<IdProp>,
  IdProp extends string = "id"
> extends DataSetPart<Item, IdProp> implements DataInterface<Item, IdProp> {
  /** @inheritdoc */
  public length = 0;
  private readonly _listener: EventCallbacksWithAny<Item, IdProp>["*"];

  private _data!: DataInterface<Item, IdProp>; // constructor → setData
  private readonly _ids: Set<Id> = new Set(); // ids of the items currently in memory (just contains a boolean true)
  private readonly _options: DataViewOptions<Item, IdProp>;

  /**
   * Create a DataView.
   *
   * @param data - The instance containing data (directly or indirectly).
   * @param options - Options to configure this data view.
   */
  public constructor(
    data: DataInterface<Item, IdProp>,
    options?: DataViewOptions<Item, IdProp>
  ) {
    super();

    this._options = options || {};

    this._listener = this._onEvent.bind(this);

    this.setData(data);
  }

  // TODO: implement a function .config() to dynamically update things like configured filter
  // and trigger changes accordingly

  /**
   * Set a data source for the view.
   *
   * @param data - The instance containing data (directly or indirectly).
   *
   * @remarks
   * Note that when the data view is bound to a data set it won't be garbage
   * collected unless the data set is too. Use `dataView.setData(null)` or
   * `dataView.dispose()` to enable garbage collection before you lose the last
   * reference.
   */
  public setData(data: DataInterface<Item, IdProp>): void {
    if (this._data) {
      // unsubscribe from current dataset
      if (this._data.off) {
        this._data.off("*", this._listener);
      }

      // trigger a remove of all items in memory
      const ids = this._data.getIds({ filter: this._options.filter });
      const items = this._data.get(ids);

      this._ids.clear();
      this.length = 0;
      this._trigger("remove", { items: ids, oldData: items });
    }

    if (data != null) {
      this._data = data;

      // trigger an add of all added items
      const ids = this._data.getIds({ filter: this._options.filter });
      for (let i = 0, len = ids.length; i < len; i++) {
        const id = ids[i];
        this._ids.add(id);
      }
      this.length = ids.length;
      this._trigger("add", { items: ids });
    } else {
      this._data = new DataSet<Item, IdProp>();
    }

    // subscribe to new dataset
    if (this._data.on) {
      this._data.on("*", this._listener);
    }
  }

  /**
   * Refresh the DataView.
   * Useful when the DataView has a filter function containing a variable parameter.
   */
  public refresh(): void {
    const ids = this._data.getIds({
      filter: this._options.filter
    });
    const oldIds = [...this._ids];
    const newIds: Record<Id, boolean> = {};
    const addedIds: Id[] = [];
    const removedIds: Id[] = [];
    const removedItems: FullItem<Item, IdProp>[] = [];

    // check for additions
    for (let i = 0, len = ids.length; i < len; i++) {
      const id = ids[i];
      newIds[id] = true;
      if (!this._ids.has(id)) {
        addedIds.push(id);
        this._ids.add(id);
      }
    }

    // check for removals
    for (let i = 0, len = oldIds.length; i < len; i++) {
      const id = oldIds[i];
      const item = this._data.get(id);
      if (item == null) {
        // @TODO: Investigate.
        // Doesn't happen during tests or examples.
        // Is it really impossible or could it eventually happen?
        // How to handle it if it does? The types guarantee non-nullable items.
        console.error("If you see this, report it please.");
      } else if (!newIds[id]) {
        removedIds.push(id);
        removedItems.push(item);
        this._ids.delete(id);
      }
    }

    this.length += addedIds.length - removedIds.length;

    // trigger events
    if (addedIds.length) {
      this._trigger("add", { items: addedIds });
    }
    if (removedIds.length) {
      this._trigger("remove", { items: removedIds, oldData: removedItems });
    }
  }

  /** @inheritdoc */
  public get(): FullItem<Item, IdProp>[];
  /** @inheritdoc */
  public get(
    options: DataInterfaceGetOptionsArray<Item>
  ): FullItem<Item, IdProp>[];
  /** @inheritdoc */
  public get(
    options: DataInterfaceGetOptionsObject<Item>
  ): Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(id: Id): null | FullItem<Item, IdProp>;
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptionsArray<Item>
  ): null | FullItem<Item, IdProp>;
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptionsObject<Item>
  ): Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(ids: Id[]): FullItem<Item, IdProp>[];
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptionsArray<Item>
  ): FullItem<Item, IdProp>[];
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptionsObject<Item>
  ): Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>;
  /** @inheritdoc */
  public get(
    ids: Id | Id[],
    options?: DataInterfaceGetOptions<Item>
  ):
    | null
    | FullItem<Item, IdProp>
    | FullItem<Item, IdProp>[]
    | Record<Id, FullItem<Item, IdProp>>;

  /** @inheritdoc */
  public get(
    first?: DataInterfaceGetOptions<Item> | Id | Id[],
    second?: DataInterfaceGetOptions<Item>
  ):
    | null
    | FullItem<Item, IdProp>
    | FullItem<Item, IdProp>[]
    | Record<string, FullItem<Item, IdProp>> {
    if (this._data == null) {
      return null;
    }

    // parse the arguments
    let ids: Id | Id[] | null = null;
    let options: any;
    if (isId(first) || Array.isArray(first)) {
      ids = first;
      options = second;
    } else {
      options = first;
    }

    // extend the options with the default options and provided options
    const viewOptions: DataInterfaceGetOptions<Item> = Object.assign(
      {},
      this._options,
      options
    );

    // create a combined filter method when needed
    const thisFilter = this._options.filter;
    const optionsFilter = options && options.filter;
    if (thisFilter && optionsFilter) {
      viewOptions.filter = (item): boolean => {
        return thisFilter(item) && optionsFilter(item);
      };
    }

    if (ids == null) {
      return this._data.get(viewOptions);
    } else {
      return this._data.get(ids, viewOptions);
    }
  }

  /** @inheritdoc */
  public getIds(options?: DataInterfaceGetIdsOptions<Item>): Id[] {
    if (this._data.length) {
      const defaultFilter = this._options.filter;
      const optionsFilter = options != null ? options.filter : null;
      let filter: DataInterfaceGetIdsOptions<Item>["filter"];

      if (optionsFilter) {
        if (defaultFilter) {
          filter = (item): boolean => {
            return defaultFilter(item) && optionsFilter(item);
          };
        } else {
          filter = optionsFilter;
        }
      } else {
        filter = defaultFilter;
      }

      return this._data.getIds({
        filter: filter,
        order: options && options.order
      });
    } else {
      return [];
    }
  }

  /** @inheritdoc */
  public forEach(
    callback: (item: Item, id: Id) => void,
    options?: DataInterfaceForEachOptions<Item>
  ): void {
    if (this._data) {
      const defaultFilter = this._options.filter;
      const optionsFilter = options && options.filter;
      let filter: undefined | ((item: Item) => boolean);

      if (optionsFilter) {
        if (defaultFilter) {
          filter = function(item: Item): boolean {
            return defaultFilter(item) && optionsFilter(item);
          };
        } else {
          filter = optionsFilter;
        }
      } else {
        filter = defaultFilter;
      }

      this._data.forEach(callback, {
        filter: filter,
        order: options && options.order
      });
    }
  }

  /** @inheritdoc */
  public map<T>(
    callback: (item: Item, id: Id) => T,
    options?: DataInterfaceMapOptions<Item, T>
  ): T[] {
    type Filter = NonNullable<DataInterfaceMapOptions<Item, T>["filter"]>;

    if (this._data) {
      const defaultFilter = this._options.filter;
      const optionsFilter = options && options.filter;
      let filter: undefined | Filter;

      if (optionsFilter) {
        if (defaultFilter) {
          filter = (item): ReturnType<Filter> => {
            return defaultFilter(item) && optionsFilter(item);
          };
        } else {
          filter = optionsFilter;
        }
      } else {
        filter = defaultFilter;
      }

      return this._data.map(callback, {
        filter: filter,
        order: options && options.order
      });
    } else {
      return [];
    }
  }

  /** @inheritdoc */
  public getDataSet(): DataSet<Item, IdProp> {
    return this._data.getDataSet();
  }

  /** @inheritdoc */
  public stream(ids?: Iterable<Id>): DataStream<Item> {
    return this._data.stream(
      ids || {
        [Symbol.iterator]: this._ids.keys.bind(this._ids)
      }
    );
  }

  /**
   * Render the instance unusable prior to garbage collection.
   *
   * @remarks
   * The intention of this method is to help discover scenarios where the data
   * view is being used when the programmer thinks it has been garbage collected
   * already. It's stricter version of `dataView.setData(null)`.
   */
  public dispose(): void {
    if (this._data?.off) {
      this._data.off("*", this._listener);
    }

    const message = "This data view has already been disposed of.";
    Object.defineProperty(this, "_data", {
      get: (): void => {
        throw new Error(message);
      },
      set: (): void => {
        throw new Error(message);
      },

      configurable: false
    });
  }

  /**
   * Event listener. Will propagate all events from the connected data set to the subscribers of the DataView, but will filter the items and only trigger when there are changes in the filtered data set.
   *
   * @param event - The name of the event.
   * @param params - Parameters of the event.
   * @param senderId - Id supplied by the sender.
   */
  private _onEvent<EN extends EventName>(
    event: EN,
    params: EventPayloads<Item, IdProp>[EN],
    senderId?: Id | null
  ): void {
    if (!params || !params.items || !this._data) {
      return;
    }

    const ids = params.items;
    const addedIds: Id[] = [];
    const updatedIds: Id[] = [];
    const removedIds: Id[] = [];
    const oldItems: FullItem<Item, IdProp>[] = [];
    const updatedItems: FullItem<Item, IdProp>[] = [];
    const removedItems: FullItem<Item, IdProp>[] = [];

    switch (event) {
      case "add":
        // filter the ids of the added items
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i];
          const item = this.get(id);
          if (item) {
            this._ids.add(id);
            addedIds.push(id);
          }
        }

        break;

      case "update":
        // determine the event from the views viewpoint: an updated
        // item can be added, updated, or removed from this view.
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i];
          const item = this.get(id);

          if (item) {
            if (this._ids.has(id)) {
              updatedIds.push(id);
              updatedItems.push(
                (params as UpdateEventPayload<Item, IdProp>).data[i]
              );
              oldItems.push(
                (params as UpdateEventPayload<Item, IdProp>).oldData[i]
              );
            } else {
              this._ids.add(id);
              addedIds.push(id);
            }
          } else {
            if (this._ids.has(id)) {
              this._ids.delete(id);
              removedIds.push(id);
              removedItems.push(
                (params as UpdateEventPayload<Item, IdProp>).oldData[i]
              );
            } else {
              // nothing interesting for me :-(
            }
          }
        }

        break;

      case "remove":
        // filter the ids of the removed items
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i];
          if (this._ids.has(id)) {
            this._ids.delete(id);
            removedIds.push(id);
            removedItems.push(
              (params as RemoveEventPayload<Item, IdProp>).oldData[i]
            );
          }
        }

        break;
    }

    this.length += addedIds.length - removedIds.length;

    if (addedIds.length) {
      this._trigger("add", { items: addedIds }, senderId);
    }
    if (updatedIds.length) {
      this._trigger(
        "update",
        { items: updatedIds, oldData: oldItems, data: updatedItems },
        senderId
      );
    }
    if (removedIds.length) {
      this._trigger(
        "remove",
        { items: removedIds, oldData: removedItems },
        senderId
      );
    }
  }
}
