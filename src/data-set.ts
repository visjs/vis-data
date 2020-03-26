/* eslint @typescript-eslint/member-ordering: ["error", { "classes": ["field", "constructor", "method"] }] */

import { v4 as uuid4 } from "uuid";
import { convert } from "./convert";
import { deepExtend } from "vis-util/esnext";

import {
  DataInterface,
  DataInterfaceForEachOptions,
  DataInterfaceGetIdsOptions,
  DataInterfaceGetOptions,
  DataInterfaceGetOptionsArray,
  DataInterfaceGetOptionsObject,
  DataInterfaceMapOptions,
  DataInterfaceOrder,
  DeepPartial,
  EventPayloads,
  FullItem,
  Id,
  OptId,
  PartItem,
  TypeMap,
  UpdateItem,
  isId
} from "./data-interface";

import { Queue, QueueOptions } from "./queue";
import { DataSetPart } from "./data-set-part";
import { DataStream } from "./data-stream";

const warnTypeCorectionDeprecation = (): void => {
  console.warn(
    "Type coercion has been deprecated. " +
      "Please, use data pipes instead. " +
      "See https://visjs.github.io/vis-data/data/datapipe.html#TypeCoercion for more details with working migration example."
  );
};

/**
 * Initial DataSet configuration object.
 *
 * @typeParam IdProp - Name of the property that contains the id.
 */
export interface DataSetInitialOptions<IdProp extends string> {
  /**
   * The name of the field containing the id of the items. When data is fetched from a server which uses some specific field to identify items, this field name can be specified in the DataSet using the option `fieldId`. For example [CouchDB](http://couchdb.apache.org/) uses the field `'_id'` to identify documents.
   */
  fieldId?: IdProp;
  /**
   * An object containing field names as key, and data types as value. By default, the type of the properties of items are left unchanged. Item properties can be normalized by specifying a field type. This is useful for example to automatically convert stringified dates coming from a server into JavaScript Date objects. The available data types are listed in [[TypeMap]].
   *
   * @remarks
   * **Warning**: There is no TypeScript support for this.
   *
   * @deprecated
   */
  type?: TypeMap;
  /**
   * Queue data changes ('add', 'update', 'remove') and flush them at once. The queue can be flushed manually by calling `DataSet.flush()`, or can be flushed after a configured delay or maximum number of entries.
   *
   * When queue is true, a queue is created with default options. Options can be specified by providing an object.
   */
  queue?: QueueOptions | false;
}
/** DataSet configuration object. */
export interface DataSetOptions {
  /**
   * Queue configuration object or false if no queue should be used.
   *
   * - If false and there was a queue before it will be flushed and then removed.
   * - If [[QueueOptions]] the existing queue will be reconfigured or a new queue will be created.
   */
  queue?: QueueOptions | false;
}

/**
 * # DataSet
 *
 * Vis.js comes with a flexible DataSet, which can be used to hold and manipulate unstructured data and listen for changes in the data. The DataSet is key/value based. Data items can be added, updated and removed from the DataSet, and one can subscribe to changes in the DataSet. The data in the DataSet can be filtered and ordered, and fields (like dates) can be converted to a specific type. Data can be normalized when appending it to the DataSet as well.
 *
 * ## Example
 *
 * The following example shows how to use a DataSet.
 *
 * ```javascript
 * // create a DataSet
 * var options = {};
 * var data = new vis.DataSet(options);
 *
 * // add items
 * // note that the data items can contain different properties and data formats
 * data.add([
 *   {id: 1, text: 'item 1', date: new Date(2013, 6, 20), group: 1, first: true},
 *   {id: 2, text: 'item 2', date: '2013-06-23', group: 2},
 *   {id: 3, text: 'item 3', date: '2013-06-25', group: 2},
 *   {id: 4, text: 'item 4'}
 * ]);
 *
 * // subscribe to any change in the DataSet
 * data.on('*', function (event, properties, senderId) {
 *   console.log('event', event, properties);
 * });
 *
 * // update an existing item
 * data.update({id: 2, group: 1});
 *
 * // remove an item
 * data.remove(4);
 *
 * // get all ids
 * var ids = data.getIds();
 * console.log('ids', ids);
 *
 * // get a specific item
 * var item1 = data.get(1);
 * console.log('item1', item1);
 *
 * // retrieve a filtered subset of the data
 * var items = data.get({
 *   filter: function (item) {
 *     return item.group == 1;
 *   }
 * });
 * console.log('filtered items', items);
 * ```
 *
 * @typeParam Item - Item type that may or may not have an id.
 * @typeParam IdProp - Name of the property that contains the id.
 */
export class DataSet<
  Item extends PartItem<IdProp>,
  IdProp extends string = "id"
> extends DataSetPart<Item, IdProp> implements DataInterface<Item, IdProp> {
  /** Flush all queued calls. */
  public flush?: () => void;
  /** @inheritdoc */
  public length: number;

  private readonly _options: DataSetInitialOptions<IdProp>;
  private readonly _data: Map<Id, FullItem<Item, IdProp>>;
  private readonly _idProp: IdProp;
  private readonly _type: TypeMap;
  private _queue?: Queue<this>;

  /**
   * @param options - DataSet configuration.
   */
  public constructor(options?: DataSetInitialOptions<IdProp>);
  /**
   * @param data - An initial set of items for the new instance.
   * @param options - DataSet configuration.
   */
  public constructor(data: Item[], options?: DataSetInitialOptions<IdProp>);
  /**
   * Construct a new DataSet.
   *
   * @param data - Initial data or options.
   * @param options - Options (type error if data is also options).
   */
  public constructor(
    data?: Item[] | DataSetInitialOptions<IdProp>,
    options?: DataSetInitialOptions<IdProp>
  ) {
    super();

    // correctly read optional arguments
    if (data && !Array.isArray(data)) {
      options = data;
      data = [];
    }

    this._options = options || {};
    this._data = new Map(); // map with data indexed by id
    this.length = 0; // number of items in the DataSet
    this._idProp = this._options.fieldId || ("id" as IdProp); // name of the field containing id
    this._type = {}; // internal field types (NOTE: this can differ from this._options.type)

    // all variants of a Date are internally stored as Date, so we can convert
    // from everything to everything (also from ISODate to Number for example)
    if (this._options.type) {
      warnTypeCorectionDeprecation();

      const fields = Object.keys(this._options.type);
      for (let i = 0, len = fields.length; i < len; i++) {
        const field = fields[i];
        const value = this._options.type[field];
        if (value == "Date" || value == "ISODate" || value == "ASPDate") {
          this._type[field] = "Date";
        } else {
          this._type[field] = value;
        }
      }
    }

    // add initial data when provided
    if (data && data.length) {
      this.add(data);
    }

    this.setOptions(options);
  }

  /**
   * Set new options.
   *
   * @param options - The new options.
   */
  public setOptions(options?: DataSetOptions): void {
    if (options && options.queue !== undefined) {
      if (options.queue === false) {
        // delete queue if loaded
        if (this._queue) {
          this._queue.destroy();
          delete this._queue;
        }
      } else {
        // create queue and update its options
        if (!this._queue) {
          this._queue = Queue.extend(this, {
            replace: ["add", "update", "remove"]
          });
        }

        if (options.queue && typeof options.queue === "object") {
          this._queue.setOptions(options.queue);
        }
      }
    }
  }

  /**
   * Add a data item or an array with items.
   *
   * After the items are added to the DataSet, the DataSet will trigger an event `add`. When a `senderId` is provided, this id will be passed with the triggered event to all subscribers.
   *
   * ## Example
   *
   * ```javascript
   * // create a DataSet
   * const data = new vis.DataSet()
   *
   * // add items
   * const ids = data.add([
   *   { id: 1, text: 'item 1' },
   *   { id: 2, text: 'item 2' },
   *   { text: 'item without an id' }
   * ])
   *
   * console.log(ids) // [1, 2, '<UUIDv4>']
   * ```
   *
   * @param data - Items to be added (ids will be generated if missing).
   * @param senderId - Sender id.
   *
   * @returns addedIds - Array with the ids (generated if not present) of the added items.
   *
   * @throws When an item with the same id as any of the added items already exists.
   */
  public add(data: Item | Item[], senderId?: Id | null): (string | number)[] {
    const addedIds: Id[] = [];
    let id: Id;

    if (Array.isArray(data)) {
      // Array
      const idsToAdd: Id[] = data.map(d => d[this._idProp] as Id);
      if (idsToAdd.some(id => this._data.has(id))) {
        throw new Error("A duplicate id was found in the parameter array.");
      }
      for (let i = 0, len = data.length; i < len; i++) {
        id = this._addItem(data[i]);
        addedIds.push(id);
      }
    } else if (data && typeof data === "object") {
      // Single item
      id = this._addItem(data);
      addedIds.push(id);
    } else {
      throw new Error("Unknown dataType");
    }

    if (addedIds.length) {
      this._trigger("add", { items: addedIds }, senderId);
    }

    return addedIds;
  }

  /**
   * Update existing items. When an item does not exist, it will be created.
   *
   * @remarks
   * The provided properties will be merged in the existing item. When an item does not exist, it will be created.
   *
   * After the items are updated, the DataSet will trigger an event `add` for the added items, and an event `update`. When a `senderId` is provided, this id will be passed with the triggered event to all subscribers.
   *
   * ## Example
   *
   * ```javascript
   * // create a DataSet
   * const data = new vis.DataSet([
   *   { id: 1, text: 'item 1' },
   *   { id: 2, text: 'item 2' },
   *   { id: 3, text: 'item 3' }
   * ])
   *
   * // update items
   * const ids = data.update([
   *   { id: 2, text: 'item 2 (updated)' },
   *   { id: 4, text: 'item 4 (new)' }
   * ])
   *
   * console.log(ids) // [2, 4]
   * ```
   *
   * ## Warning for TypeScript users
   * This method may introduce partial items into the data set. Use add or updateOnly instead for better type safety.
   *
   * @param data - Items to be updated (if the id is already present) or added (if the id is missing).
   * @param senderId - Sender id.
   *
   * @returns updatedIds - The ids of the added (these may be newly generated if there was no id in the item from the data) or updated items.
   *
   * @throws When the supplied data is neither an item nor an array of items.
   */
  public update(
    data: DeepPartial<Item> | DeepPartial<Item>[],
    senderId?: Id | null
  ): Id[] {
    const addedIds: Id[] = [];
    const updatedIds: Id[] = [];
    const oldData: FullItem<Item, IdProp>[] = [];
    const updatedData: FullItem<Item, IdProp>[] = [];
    const idProp = this._idProp;

    const addOrUpdate = (item: DeepPartial<Item>): void => {
      const origId: OptId = item[idProp];
      if (origId != null && this._data.has(origId)) {
        const fullItem = item as FullItem<Item, IdProp>; // it has an id, therefore it is a fullitem
        const oldItem = Object.assign({}, this._data.get(origId));
        // update item
        const id = this._updateItem(fullItem);
        updatedIds.push(id);
        updatedData.push(fullItem);
        oldData.push(oldItem);
      } else {
        // add new item
        const id = this._addItem(item as any);
        addedIds.push(id);
      }
    };

    if (Array.isArray(data)) {
      // Array
      for (let i = 0, len = data.length; i < len; i++) {
        if (data[i] && typeof data[i] === "object") {
          addOrUpdate(data[i]);
        } else {
          console.warn(
            "Ignoring input item, which is not an object at index " + i
          );
        }
      }
    } else if (data && typeof data === "object") {
      // Single item
      addOrUpdate(data);
    } else {
      throw new Error("Unknown dataType");
    }

    if (addedIds.length) {
      this._trigger("add", { items: addedIds }, senderId);
    }
    if (updatedIds.length) {
      const props = { items: updatedIds, oldData: oldData, data: updatedData };
      // TODO: remove deprecated property 'data' some day
      //Object.defineProperty(props, 'data', {
      //  'get': (function() {
      //    console.warn('Property data is deprecated. Use DataSet.get(ids) to retrieve the new data, use the oldData property on this object to get the old data');
      //    return updatedData;
      //  }).bind(this)
      //});
      this._trigger("update", props, senderId);
    }

    return addedIds.concat(updatedIds);
  }

  /**
   * Update existing items. When an item does not exist, an error will be thrown.
   *
   * @remarks
   * The provided properties will be deeply merged into the existing item.
   * When an item does not exist (id not present in the data set or absent), an error will be thrown and nothing will be changed.
   *
   * After the items are updated, the DataSet will trigger an event `update`.
   * When a `senderId` is provided, this id will be passed with the triggered event to all subscribers.
   *
   * ## Example
   *
   * ```javascript
   * // create a DataSet
   * const data = new vis.DataSet([
   *   { id: 1, text: 'item 1' },
   *   { id: 2, text: 'item 2' },
   *   { id: 3, text: 'item 3' },
   * ])
   *
   * // update items
   * const ids = data.update([
   *   { id: 2, text: 'item 2 (updated)' }, // works
   *   // { id: 4, text: 'item 4 (new)' }, // would throw
   *   // { text: 'item 4 (new)' }, // would also throw
   * ])
   *
   * console.log(ids) // [2]
   * ```
   *
   * @param data - Updates (the id and optionally other props) to the items in this data set.
   * @param senderId - Sender id.
   *
   * @returns updatedIds - The ids of the updated items.
   *
   * @throws When the supplied data is neither an item nor an array of items, when the ids are missing.
   */
  public updateOnly(
    data: UpdateItem<Item, IdProp> | UpdateItem<Item, IdProp>[],
    senderId?: Id | null
  ): Id[] {
    if (!Array.isArray(data)) {
      data = [data];
    }

    const updateEventData = data
      .map((update): {
        oldData: FullItem<Item, IdProp>;
        update: UpdateItem<Item, IdProp>;
      } => {
        const oldData = this._data.get(update[this._idProp]);
        if (oldData == null) {
          throw new Error("Updating non-existent items is not allowed.");
        }
        return { oldData, update };
      })
      .map(({ oldData, update }): {
        id: Id;
        oldData: FullItem<Item, IdProp>;
        updatedData: FullItem<Item, IdProp>;
      } => {
        const id = oldData[this._idProp];
        const updatedData = deepExtend(deepExtend({}, oldData), update);

        this._data.set(id, updatedData);

        return {
          id,
          oldData: oldData,
          updatedData
        };
      });

    if (updateEventData.length) {
      const props: EventPayloads<Item, IdProp>["update"] = {
        items: updateEventData.map((value): Id => value.id),
        oldData: updateEventData.map(
          (value): FullItem<Item, IdProp> => value.oldData
        ),
        data: updateEventData.map(
          (value): FullItem<Item, IdProp> => value.updatedData
        )
      };
      // TODO: remove deprecated property 'data' some day
      //Object.defineProperty(props, 'data', {
      //  'get': (function() {
      //    console.warn('Property data is deprecated. Use DataSet.get(ids) to retrieve the new data, use the oldData property on this object to get the old data');
      //    return updatedData;
      //  }).bind(this)
      //});
      this._trigger("update", props, senderId);

      return props.items;
    } else {
      return [];
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
    | Record<Id, FullItem<Item, IdProp>> {
    // @TODO: Woudn't it be better to split this into multiple methods?

    // parse the arguments
    let id: Id | undefined = undefined;
    let ids: Id[] | undefined = undefined;
    let options: DataInterfaceGetOptions<Item> | undefined = undefined;
    if (isId(first)) {
      // get(id [, options])
      id = first;
      options = second;
    } else if (Array.isArray(first)) {
      // get(ids [, options])
      ids = first;
      options = second;
    } else {
      // get([, options])
      options = first;
    }

    // determine the return type
    const returnType =
      options && options.returnType === "Object" ? "Object" : "Array";
    // @TODO: WTF is this? Or am I missing something?
    // var returnType
    // if (options && options.returnType) {
    //   var allowedValues = ['Array', 'Object']
    //   returnType =
    //     allowedValues.indexOf(options.returnType) == -1
    //       ? 'Array'
    //       : options.returnType
    // } else {
    //   returnType = 'Array'
    // }

    // build options
    const type = (options && options.type) || this._options.type;
    const filter = options && options.filter;
    const items: FullItem<Item, IdProp>[] = [];
    let item: null | FullItem<Item, IdProp> = null;
    let itemIds: null | Id[] = null;
    let itemId: null | Id = null;

    // convert items
    if (id != null) {
      // return a single item
      item = this._getItem(id, type);
      if (item && filter && !filter(item)) {
        item = null;
      }
    } else if (ids != null) {
      // return a subset of items
      for (let i = 0, len = ids.length; i < len; i++) {
        item = this._getItem(ids[i], type);
        if (item != null && (!filter || filter(item))) {
          items.push(item);
        }
      }
    } else {
      // return all items
      itemIds = [...this._data.keys()];
      for (let i = 0, len = itemIds.length; i < len; i++) {
        itemId = itemIds[i];
        item = this._getItem(itemId, type);
        if (item != null && (!filter || filter(item))) {
          items.push(item);
        }
      }
    }

    // order the results
    if (options && options.order && id == undefined) {
      this._sort(items, options.order);
    }

    // filter fields of the items
    if (options && options.fields) {
      const fields = options.fields;
      if (id != undefined && item != null) {
        item = this._filterFields(item, fields) as FullItem<Item, IdProp>;
      } else {
        for (let i = 0, len = items.length; i < len; i++) {
          items[i] = this._filterFields(items[i], fields) as FullItem<
            Item,
            IdProp
          >;
        }
      }
    }

    // return the results
    if (returnType == "Object") {
      const result: Record<string, FullItem<Item, IdProp>> = {};
      for (let i = 0, len = items.length; i < len; i++) {
        const resultant = items[i];
        // @TODO: Shoudn't this be this._fieldId?
        // result[resultant.id] = resultant
        const id: Id = resultant[this._idProp];
        result[id] = resultant;
      }
      return result;
    } else {
      if (id != null) {
        // a single item
        return item;
      } else {
        // just return our array
        return items;
      }
    }
  }

  /** @inheritdoc */
  public getIds(options?: DataInterfaceGetIdsOptions<Item>): Id[] {
    const data = this._data;
    const filter = options && options.filter;
    const order = options && options.order;
    const type = (options && options.type) || this._options.type;
    const itemIds = [...data.keys()];
    const ids: Id[] = [];
    let item: FullItem<Item, IdProp>;
    let items: FullItem<Item, IdProp>[];

    if (filter) {
      // get filtered items
      if (order) {
        // create ordered list
        items = [];
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i];
          item = this._getItem(id, type);
          if (filter(item)) {
            items.push(item);
          }
        }

        this._sort(items, order);

        for (let i = 0, len = items.length; i < len; i++) {
          ids.push(items[i][this._idProp]);
        }
      } else {
        // create unordered list
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i];
          item = this._getItem(id, type);
          if (filter(item)) {
            ids.push(item[this._idProp]);
          }
        }
      }
    } else {
      // get all items
      if (order) {
        // create an ordered list
        items = [];
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i];
          items.push(data.get(id)!);
        }

        this._sort(items, order);

        for (let i = 0, len = items.length; i < len; i++) {
          ids.push(items[i][this._idProp]);
        }
      } else {
        // create unordered list
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i];
          item = data.get(id)!;
          ids.push(item[this._idProp]);
        }
      }
    }

    return ids;
  }

  /** @inheritdoc */
  public getDataSet(): DataSet<Item, IdProp> {
    return this;
  }

  /** @inheritdoc */
  public forEach(
    callback: (item: Item, id: Id) => void,
    options?: DataInterfaceForEachOptions<Item>
  ): void {
    const filter = options && options.filter;
    const type = (options && options.type) || this._options.type;
    const data = this._data;
    const itemIds = [...data.keys()];

    if (options && options.order) {
      // execute forEach on ordered list
      const items: FullItem<Item, IdProp>[] = this.get(options);

      for (let i = 0, len = items.length; i < len; i++) {
        const item = items[i];
        const id = item[this._idProp];
        callback(item, id);
      }
    } else {
      // unordered
      for (let i = 0, len = itemIds.length; i < len; i++) {
        const id = itemIds[i];
        const item = this._getItem(id, type);
        if (!filter || filter(item)) {
          callback(item, id);
        }
      }
    }
  }

  /** @inheritdoc */
  public map<T>(
    callback: (item: Item, id: Id) => T,
    options?: DataInterfaceMapOptions<Item, T>
  ): T[] {
    const filter = options && options.filter;
    const type = (options && options.type) || this._options.type;
    const mappedItems: T[] = [];
    const data = this._data;
    const itemIds = [...data.keys()];

    // convert and filter items
    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i];
      const item = this._getItem(id, type);
      if (!filter || filter(item)) {
        mappedItems.push(callback(item, id));
      }
    }

    // order items
    if (options && options.order) {
      this._sort(mappedItems, options.order);
    }

    return mappedItems;
  }

  private _filterFields<K extends string>(item: null, fields: K[]): null;
  private _filterFields<K extends string>(
    item: Record<K, unknown>,
    fields: K[]
  ): Record<K, unknown>;
  private _filterFields<K extends string>(
    item: Record<K, unknown>,
    fields: K[] | Record<K, string>
  ): any;
  /**
   * Filter the fields of an item.
   *
   * @param item - The item whose fields should be filtered.
   * @param fields - The names of the fields that will be kept.
   *
   * @typeParam K - Field name type.
   *
   * @returns The item without any additional fields.
   */
  private _filterFields<K extends string>(
    item: Record<K, unknown> | null,
    fields: K[] | Record<K, unknown>
  ): Record<K, unknown> | null {
    if (!item) {
      // item is null
      return item;
    }

    return (Array.isArray(fields)
      ? // Use the supplied array
        fields
      : // Use the keys of the supplied object
        (Object.keys(fields) as K[])
    ).reduce<Record<string, unknown>>((filteredItem, field): Record<
      string,
      unknown
    > => {
      filteredItem[field] = item[field];
      return filteredItem;
    }, {});
  }

  /**
   * Sort the provided array with items.
   *
   * @param items - Items to be sorted in place.
   * @param order - A field name or custom sort function.
   *
   * @typeParam T - The type of the items in the items array.
   */
  private _sort<T>(items: T[], order: DataInterfaceOrder<T>): void {
    if (typeof order === "string") {
      // order by provided field name
      const name = order; // field name
      items.sort((a, b): -1 | 0 | 1 => {
        // @TODO: How to treat missing properties?
        const av = (a as any)[name];
        const bv = (b as any)[name];
        return av > bv ? 1 : av < bv ? -1 : 0;
      });
    } else if (typeof order === "function") {
      // order by sort function
      items.sort(order);
    } else {
      // TODO: extend order by an Object {field:string, direction:string}
      //       where direction can be 'asc' or 'desc'
      throw new TypeError("Order must be a function or a string");
    }
  }

  /**
   * Remove an item or multiple items by “reference” (only the id is used) or by id.
   *
   * The method ignores removal of non-existing items, and returns an array containing the ids of the items which are actually removed from the DataSet.
   *
   * After the items are removed, the DataSet will trigger an event `remove` for the removed items. When a `senderId` is provided, this id will be passed with the triggered event to all subscribers.
   *
   * ## Example
   * ```javascript
   * // create a DataSet
   * const data = new vis.DataSet([
   *   { id: 1, text: 'item 1' },
   *   { id: 2, text: 'item 2' },
   *   { id: 3, text: 'item 3' }
   * ])
   *
   * // remove items
   * const ids = data.remove([2, { id: 3 }, 4])
   *
   * console.log(ids) // [2, 3]
   * ```
   *
   * @param id - One or more items or ids of items to be removed.
   * @param senderId - Sender id.
   *
   * @returns The ids of the removed items.
   */
  public remove(id: Id | Item | (Id | Item)[], senderId?: Id | null): Id[] {
    const removedIds: Id[] = [];
    const removedItems: FullItem<Item, IdProp>[] = [];

    // force everything to be an array for simplicity
    const ids = Array.isArray(id) ? id : [id];

    for (let i = 0, len = ids.length; i < len; i++) {
      const item = this._remove(ids[i]);
      if (item) {
        const itemId: OptId = item[this._idProp];
        if (itemId != null) {
          removedIds.push(itemId);
          removedItems.push(item);
        }
      }
    }

    if (removedIds.length) {
      this._trigger(
        "remove",
        { items: removedIds, oldData: removedItems },
        senderId
      );
    }

    return removedIds;
  }

  /**
   * Remove an item by its id or reference.
   *
   * @param id - Id of an item or the item itself.
   *
   * @returns The removed item if removed, null otherwise.
   */
  private _remove(id: Id | Item): FullItem<Item, IdProp> | null {
    // @TODO: It origianlly returned the item although the docs say id.
    // The code expects the item, so probably an error in the docs.
    let ident: OptId;

    // confirm the id to use based on the args type
    if (isId(id)) {
      ident = id;
    } else if (id && typeof id === "object") {
      ident = id[this._idProp]; // look for the identifier field using ._idProp
    }

    // do the removing if the item is found
    if (ident != null && this._data.has(ident)) {
      const item = this._data.get(ident) || null;
      this._data.delete(ident);
      --this.length;
      return item;
    }

    return null;
  }

  /**
   * Clear the entire data set.
   *
   * After the items are removed, the [[DataSet]] will trigger an event `remove` for all removed items. When a `senderId` is provided, this id will be passed with the triggered event to all subscribers.
   *
   * @param senderId - Sender id.
   *
   * @returns removedIds - The ids of all removed items.
   */
  public clear(senderId?: Id | null): Id[] {
    const ids = [...this._data.keys()];
    const items: FullItem<Item, IdProp>[] = [];

    for (let i = 0, len = ids.length; i < len; i++) {
      items.push(this._data.get(ids[i])!);
    }

    this._data.clear();
    this.length = 0;

    this._trigger("remove", { items: ids, oldData: items }, senderId);

    return ids;
  }

  /**
   * Find the item with maximum value of a specified field.
   *
   * @param field - Name of the property that should be searched for max value.
   *
   * @returns Item containing max value, or null if no items.
   */
  public max(field: keyof Item): Item | null {
    let max = null;
    let maxField = null;

    for (const item of this._data.values()) {
      const itemField = item[field];
      if (
        typeof itemField === "number" &&
        (maxField == null || itemField > maxField)
      ) {
        max = item;
        maxField = itemField;
      }
    }

    return max || null;
  }

  /**
   * Find the item with minimum value of a specified field.
   *
   * @param field - Name of the property that should be searched for min value.
   *
   * @returns Item containing min value, or null if no items.
   */
  public min(field: keyof Item): Item | null {
    let min = null;
    let minField = null;

    for (const item of this._data.values()) {
      const itemField = item[field];
      if (
        typeof itemField === "number" &&
        (minField == null || itemField < minField)
      ) {
        min = item;
        minField = itemField;
      }
    }

    return min || null;
  }

  public distinct<T extends keyof Item>(prop: T): Item[T][];
  public distinct(prop: string): unknown[];
  /**
   * Find all distinct values of a specified field
   *
   * @param prop - The property name whose distinct values should be returned.
   *
   * @returns Unordered array containing all distinct values. Items without specified property are ignored.
   */
  public distinct<T extends string>(prop: T): unknown[] {
    const data = this._data;
    const itemIds = [...data.keys()];
    const values: unknown[] = [];
    const fieldType = (this._options.type && this._options.type[prop]) || null;
    let count = 0;

    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i];
      const item = data.get(id);
      const value = (item as any)[prop];
      let exists = false;
      for (let j = 0; j < count; j++) {
        if (values[j] == value) {
          exists = true;
          break;
        }
      }
      if (!exists && value !== undefined) {
        values[count] = value;
        count++;
      }
    }

    if (fieldType) {
      for (let i = 0, len = values.length; i < len; i++) {
        values[i] = convert(values[i], fieldType);
      }
    }

    return values;
  }

  /**
   * Add a single item. Will fail when an item with the same id already exists.
   *
   * @param item - A new item to be added.
   *
   * @returns Added item's id. An id is generated when it is not present in the item.
   */
  private _addItem(item: Item): Id {
    let id: OptId = item[this._idProp];

    if (id != null) {
      // check whether this id is already taken
      if (this._data.has(id)) {
        // item already exists
        throw new Error(
          "Cannot add item: item with id " + id + " already exists"
        );
      }
    } else {
      // generate an id
      id = uuid4();
      item[this._idProp] = id as any;
    }

    const d: any = {};
    const fields = Object.keys(item);
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      const fieldType = this._type[field]; // type may be undefined
      d[field] = convert((item as any)[field], fieldType);
    }
    this._data.set(id, d);
    ++this.length;

    return id;
  }

  private _getItem(id: Id): FullItem<Item, IdProp> | null;
  private _getItem(id: Id, types?: TypeMap): any;
  /**
   * Get an item. Fields can be converted to a specific type
   *
   * @param id - Id of the requested item.
   * @param types - Property name to type name object map of type converstions.
   *
   * @returns The item, optionally after type conversion.
   */
  private _getItem(id: Id, types?: TypeMap): any {
    // @TODO: I have no idea how to type this.
    // get the item from the dataset
    const raw = this._data.get(id);
    if (!raw) {
      return null;
    }

    // convert the items field types
    let converted: any;
    const fields = Object.keys(raw);

    if (types) {
      warnTypeCorectionDeprecation();

      converted = {};
      for (let i = 0, len = fields.length; i < len; i++) {
        const field = fields[i];
        const value = (raw as any)[field];
        converted[field] = convert(value, types[field]);
      }
    } else {
      // no field types specified, no converting needed
      converted = { ...raw };
    }

    if (converted[this._idProp] == null) {
      converted[this._idProp] = (raw as any).id;
    }

    return converted;
  }

  /**
   * Update a single item: merge with existing item.
   * Will fail when the item has no id, or when there does not exist an item with the same id.
   *
   * @param item - The new item
   *
   * @returns The id of the updated item.
   */
  private _updateItem(item: FullItem<Item, IdProp>): Id {
    const id: OptId = item[this._idProp];
    if (id == null) {
      throw new Error(
        "Cannot update item: item has no id (item: " +
          JSON.stringify(item) +
          ")"
      );
    }
    const d = this._data.get(id);
    if (!d) {
      // item doesn't exist
      throw new Error("Cannot update item: no item with id " + id + " found");
    }

    // merge with current item
    const fields = Object.keys(item);
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i];
      const fieldType = this._type[field]; // type may be undefined
      (d as any)[field] = convert((item as any)[field], fieldType);
    }

    return id;
  }

  /** @inheritdoc */
  public stream(ids?: Iterable<Id>): DataStream<Item> {
    if (ids) {
      const data = this._data;

      return new DataStream<Item>({
        *[Symbol.iterator](): IterableIterator<[Id, Item]> {
          for (const id of ids) {
            const item = data.get(id);
            if (item != null) {
              yield [id, item];
            }
          }
        }
      });
    } else {
      return new DataStream({
        [Symbol.iterator]: this._data.entries.bind(this._data)
      });
    }
  }
}
