import { uuid4 } from 'vis-uuid'
import { convert } from 'vis-util'

import {
  DataInterface,
  DataInterfaceForEachOptions,
  DataInterfaceGetIdsOptions,
  DataInterfaceGetOptions,
  DataInterfaceGetOptionsDefaultOrArray,
  DataInterfaceGetOptionsObject,
  DataInterfaceMapOptions,
  DataInterfaceOrder,
  FullItem,
  Id,
  OptId,
  PartItem,
  TypeMap,
  isId,
} from './data-interface'

import { Queue, QueueOptions } from './queue'
import { DataSetPart } from './data-set-part'

/**
 * Initial DataSet configuration object.
 *
 * @typeparam IdProp - Name of the property that contains the id.
 */
export interface DataSetInitialOptions<IdProp extends string> {
  /** The name of the property in the item that will contain it's id. */
  fieldId?: IdProp
  /** An object map to enforce property types. */
  type?: TypeMap
  /** Queue configuration object or false if no queue should be used. */
  queue?: QueueOptions | false
}
/** DataSet configuration object. */
export interface DataSetOptions {
  /** Queue configuration object or false if no queue should be used. */
  queue?: QueueOptions | false
}

/**
 * DataSet
 *
 * A data set can:
 * - add/remove/update data,
 * - trigger events upon changes in the data,
 * - import/export data in various data formats.
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export class DataSet<Item extends PartItem<IdProp>, IdProp extends string = 'id'>
  extends DataSetPart<Item, IdProp>
  implements DataInterface<Item, IdProp> {
  /** Flush all queued calls. */
  public flush?: () => void
  /** @inheritdoc */
  public length: number

  private _options: DataSetInitialOptions<IdProp>
  private _data: Record<Id, FullItem<Item, IdProp>>
  private _idProp: IdProp
  private _type: TypeMap
  private _queue?: Queue<this>

  public constructor()
  /**
   * @param options - DataSet configuration.
   */
  public constructor(options: DataSetInitialOptions<IdProp>)
  /**
   * @param data - An initial set of items for the new instance.
   * @param options - DataSet configuration.
   */
  public constructor(data: Item[], options?: DataSetInitialOptions<IdProp>)
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
    super()

    // correctly read optional arguments
    if (data && !Array.isArray(data)) {
      options = data
      data = []
    }

    this._options = options || {}
    this._data = Object.create({}) // map with data indexed by id
    this.length = 0 // number of items in the DataSet
    this._idProp = this._options.fieldId || ('id' as IdProp) // name of the field containing id
    this._type = {} // internal field types (NOTE: this can differ from this._options.type)

    // all variants of a Date are internally stored as Date, so we can convert
    // from everything to everything (also from ISODate to Number for example)
    if (this._options.type) {
      const fields = Object.keys(this._options.type)
      for (let i = 0, len = fields.length; i < len; i++) {
        const field = fields[i]
        const value = this._options.type[field]
        if (value == 'Date' || value == 'ISODate' || value == 'ASPDate') {
          this._type[field] = 'Date'
        } else {
          this._type[field] = value
        }
      }
    }

    // add initial data when provided
    if (data && data.length) {
      this.add(data)
    }

    this.setOptions(options)
  }

  /**
   * Set new options.
   *
   * @param options - The options.
   */
  public setOptions(options?: DataSetOptions): void {
    if (options && options.queue !== undefined) {
      if (options.queue === false) {
        // delete queue if loaded
        if (this._queue) {
          this._queue.destroy()
          delete this._queue
        }
      } else {
        // create queue and update its options
        if (!this._queue) {
          this._queue = Queue.extend(this, {
            replace: ['add', 'update', 'remove'],
          })
        }

        if (options.queue && typeof options.queue === 'object') {
          this._queue.setOptions(options.queue)
        }
      }
    }
  }

  /**
   * Add data.
   * Adding an item will fail when there already is an item with the same id.
   *
   * @param data - Items to be added (ids will be generated if missing).
   * @param senderId - Sender id.
   *
   * @returns addedIds - Array with the ids (generated if not present) of the added items.
   */
  public add(data: Item | Item[], senderId?: string): (string | number)[] {
    const addedIds: Id[] = []
    let id: Id

    if (Array.isArray(data)) {
      // Array
      for (let i = 0, len = data.length; i < len; i++) {
        id = this._addItem(data[i])
        addedIds.push(id)
      }
    } else if (data && typeof data === 'object') {
      // Single item
      id = this._addItem(data)
      addedIds.push(id)
    } else {
      throw new Error('Unknown dataType')
    }

    if (addedIds.length) {
      this._trigger('add', { items: addedIds }, senderId)
    }

    return addedIds
  }

  /**
   * Update existing items. When an item does not exist, it will be created
   *
   * @param data - Items to be updated (if the id is already present) or added (if the id is missing).
   * @param senderId - Sender id.
   *
   * @returns updatedIds - The ids of the added (these may be newly generated if there was no id in the item from the data) or updated items.
   *
   * @throws Unknown Datatype
   */
  public update(data: Item | Item[], senderId?: string): Id[] {
    const addedIds: Id[] = []
    const updatedIds: Id[] = []
    const oldData: FullItem<Item, IdProp>[] = []
    const updatedData: FullItem<Item, IdProp>[] = []
    const idProp = this._idProp

    const addOrUpdate = (item: Item): void => {
      const origId: OptId = item[idProp]
      if (origId != null && this._data[origId]) {
        const fullItem = item as FullItem<Item, IdProp> // it has an id, therefore it is a fullitem
        const oldItem = Object.assign({}, this._data[origId])
        // update item
        const id = this._updateItem(fullItem)
        updatedIds.push(id)
        updatedData.push(fullItem)
        oldData.push(oldItem)
      } else {
        // add new item
        const id = this._addItem(item)
        addedIds.push(id)
      }
    }

    if (Array.isArray(data)) {
      // Array
      for (let i = 0, len = data.length; i < len; i++) {
        if (data[i] && typeof data[i] === 'object') {
          addOrUpdate(data[i])
        } else {
          console.warn('Ignoring input item, which is not an object at index ' + i)
        }
      }
    } else if (data && typeof data === 'object') {
      // Single item
      addOrUpdate(data)
    } else {
      throw new Error('Unknown dataType')
    }

    if (addedIds.length) {
      this._trigger('add', { items: addedIds }, senderId)
    }
    if (updatedIds.length) {
      const props = { items: updatedIds, oldData: oldData, data: updatedData }
      // TODO: remove deprecated property 'data' some day
      //Object.defineProperty(props, 'data', {
      //  'get': (function() {
      //    console.warn('Property data is deprecated. Use DataSet.get(ids) to retrieve the new data, use the oldData property on this object to get the old data');
      //    return updatedData;
      //  }).bind(this)
      //});
      this._trigger('update', props, senderId)
    }

    return addedIds.concat(updatedIds)
  }

  /** @inheritdoc */
  public get(): FullItem<Item, IdProp>[]
  /** @inheritdoc */
  public get(options: DataInterfaceGetOptionsDefaultOrArray<Item>): FullItem<Item, IdProp>[]
  /** @inheritdoc */
  public get(options: DataInterfaceGetOptionsObject<Item>): Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(id: Id): null | FullItem<Item, IdProp>
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptionsDefaultOrArray<Item>
  ): null | FullItem<Item, IdProp>
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptionsObject<Item>
  ): Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(
    id: Id,
    options: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(ids: Id[]): FullItem<Item, IdProp>[]
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptionsDefaultOrArray<Item>
  ): FullItem<Item, IdProp>[]
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptionsObject<Item>
  ): Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(
    ids: Id[],
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>
  /** @inheritdoc */
  public get(
    ids: Id | Id[],
    options?: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>

  /** @inheritdoc */
  public get(
    first?: DataInterfaceGetOptions<Item> | Id | Id[],
    second?: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>> {
    // @TODO: Woudn't it be better to split this into multiple methods?

    // parse the arguments
    let id: Id | undefined = undefined
    let ids: Id[] | undefined = undefined
    let options: DataInterfaceGetOptions<Item> | undefined = undefined
    if (isId(first)) {
      // get(id [, options])
      id = first
      options = second
    } else if (Array.isArray(first)) {
      // get(ids [, options])
      ids = first
      options = second
    } else {
      // get([, options])
      options = first
    }

    // determine the return type
    const returnType = options && options.returnType === 'Object' ? 'Object' : 'Array'
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
    const type = (options && options.type) || this._options.type
    const filter = options && options.filter
    const items: FullItem<Item, IdProp>[] = []
    let item: null | FullItem<Item, IdProp> = null
    let itemIds: null | Id[] = null
    let itemId: null | Id = null

    // convert items
    if (id != null) {
      // return a single item
      item = this._getItem(id, type)
      if (item && filter && !filter(item)) {
        item = null
      }
    } else if (ids != null) {
      // return a subset of items
      for (let i = 0, len = ids.length; i < len; i++) {
        item = this._getItem(ids[i], type)
        if (item != null && (!filter || filter(item))) {
          items.push(item)
        }
      }
    } else {
      // return all items
      itemIds = Object.keys(this._data)
      for (let i = 0, len = itemIds.length; i < len; i++) {
        itemId = itemIds[i]
        item = this._getItem(itemId, type)
        if (item != null && (!filter || filter(item))) {
          items.push(item)
        }
      }
    }

    // order the results
    if (options && options.order && id == undefined) {
      this._sort(items, options.order)
    }

    // filter fields of the items
    if (options && options.fields) {
      const fields = options.fields
      if (id != undefined && item != null) {
        item = this._filterFields(item, fields) as FullItem<Item, IdProp>
      } else {
        for (let i = 0, len = items.length; i < len; i++) {
          items[i] = this._filterFields(items[i], fields) as FullItem<Item, IdProp>
        }
      }
    }

    // return the results
    if (returnType == 'Object') {
      const result: Record<string, FullItem<Item, IdProp>> = {}
      for (let i = 0, len = items.length; i < len; i++) {
        const resultant = items[i]
        // @TODO: Shoudn't this be this._fieldId?
        // result[resultant.id] = resultant
        const id: Id = resultant[this._idProp]
        result[id] = resultant
      }
      return result
    } else {
      if (id != null) {
        // a single item
        return item
      } else {
        // just return our array
        return items
      }
    }
  }

  /** @inheritdoc */
  public getIds(options?: DataInterfaceGetIdsOptions<Item>): Id[] {
    const data = this._data
    const filter = options && options.filter
    const order = options && options.order
    const type = (options && options.type) || this._options.type
    const itemIds = Object.keys(data)
    const ids: Id[] = []
    let item: FullItem<Item, IdProp>
    let items: FullItem<Item, IdProp>[]

    if (filter) {
      // get filtered items
      if (order) {
        // create ordered list
        items = []
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i]
          item = this._getItem(id, type)
          if (filter(item)) {
            items.push(item)
          }
        }

        this._sort(items, order)

        for (let i = 0, len = items.length; i < len; i++) {
          ids.push(items[i][this._idProp])
        }
      } else {
        // create unordered list
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i]
          item = this._getItem(id, type)
          if (filter(item)) {
            ids.push(item[this._idProp])
          }
        }
      }
    } else {
      // get all items
      if (order) {
        // create an ordered list
        items = []
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i]
          items.push(data[id])
        }

        this._sort(items, order)

        for (let i = 0, len = items.length; i < len; i++) {
          ids.push(items[i][this._idProp])
        }
      } else {
        // create unordered list
        for (let i = 0, len = itemIds.length; i < len; i++) {
          const id = itemIds[i]
          item = data[id]
          ids.push(item[this._idProp])
        }
      }
    }

    return ids
  }

  /** @inheritdoc */
  public getDataSet(): DataSet<Item, IdProp> {
    return this
  }

  /** @inheritdoc */
  public forEach(
    callback: (item: Item, id: Id) => void,
    options?: DataInterfaceForEachOptions<Item>
  ): void {
    const filter = options && options.filter
    const type = (options && options.type) || this._options.type
    const data = this._data
    const itemIds = Object.keys(data)

    if (options && options.order) {
      // execute forEach on ordered list
      const items: FullItem<Item, IdProp>[] = this.get(options)

      for (let i = 0, len = items.length; i < len; i++) {
        const item = items[i]
        const id = item[this._idProp]
        callback(item, id)
      }
    } else {
      // unordered
      for (let i = 0, len = itemIds.length; i < len; i++) {
        const id = itemIds[i]
        const item = this._getItem(id, type)
        if (!filter || filter(item)) {
          callback(item, id)
        }
      }
    }
  }

  /** @inheritdoc */
  public map<T>(
    callback: (item: Item, id: Id) => T,
    options?: DataInterfaceMapOptions<Item, T>
  ): T[] {
    const filter = options && options.filter
    const type = (options && options.type) || this._options.type
    const mappedItems: T[] = []
    const data = this._data
    const itemIds = Object.keys(data)

    // convert and filter items
    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i]
      const item = this._getItem(id, type)
      if (!filter || filter(item)) {
        mappedItems.push(callback(item, id))
      }
    }

    // order items
    if (options && options.order) {
      this._sort(mappedItems, options.order)
    }

    return mappedItems
  }

  private _filterFields<K extends string>(item: null, fields: K[]): null
  private _filterFields<K extends string>(item: Record<K, unknown>, fields: K[]): Record<K, unknown>
  private _filterFields<K extends string>(
    item: Record<K, unknown>,
    fields: Record<K, unknown>
  ): Record<K, unknown>
  /**
   * Filter the fields of an item.
   *
   * @param item - The item whose fields should be filtered.
   * @param fields - The names of the fields that will be kept.
   *
   * @typeparam K - Field name type.
   *
   * @returns The item without any additional fields.
   */
  private _filterFields<K extends string>(
    item: Record<K, unknown> | null,
    fields: K[] | Record<K, unknown>
  ): Record<K, unknown> | null {
    if (!item) {
      // item is null
      return item
    }

    return (Array.isArray(fields)
      ? // Use the supplied array
        fields
      : // Use the keys of the supplied object
        (Object.keys(fields) as K[])
    ).reduce<Record<string, unknown>>((filteredItem, field): Record<string, unknown> => {
      filteredItem[field] = item[field]
      return filteredItem
    }, {})
  }

  /**
   * Sort the provided array with items.
   *
   * @param items - Items to be sorted in place.
   * @param order - A field name or custom sort function.
   *
   * @typeparam T - The type of the items in the items array.
   */
  private _sort<T>(items: T[], order: DataInterfaceOrder<T>): void {
    if (typeof order === 'string') {
      // order by provided field name
      const name = order // field name
      items.sort((a, b): -1 | 0 | 1 => {
        // @TODO: How to treat missing properties?
        const av = (a as any)[name]
        const bv = (b as any)[name]
        return av > bv ? 1 : av < bv ? -1 : 0
      })
    } else if (typeof order === 'function') {
      // order by sort function
      items.sort(order)
    } else {
      // TODO: extend order by an Object {field:string, direction:string}
      //       where direction can be 'asc' or 'desc'
      throw new TypeError('Order must be a function or a string')
    }
  }

  /**
   * Remove an object by reference or by id.
   *
   * @param id - One or more items or ids of items to be removed.
   * @param senderId - Sender id.
   *
   * @returns The ids of the removed items.
   */
  public remove(id: Id | Item | (Id | Item)[], senderId?: string): Id[] {
    const removedIds: Id[] = []
    const removedItems: FullItem<Item, IdProp>[] = []

    // force everything to be an array for simplicity
    const ids = Array.isArray(id) ? id : [id]

    for (let i = 0, len = ids.length; i < len; i++) {
      const item = this._remove(ids[i])
      if (item) {
        const itemId: OptId = item[this._idProp]
        if (itemId != null) {
          removedIds.push(itemId)
          removedItems.push(item)
        }
      }
    }

    if (removedIds.length) {
      this._trigger('remove', { items: removedIds, oldData: removedItems }, senderId)
    }

    return removedIds
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
    let ident: OptId

    // confirm the id to use based on the args type
    if (isId(id)) {
      ident = id
    } else if (id && typeof id === 'object') {
      ident = id[this._idProp] // look for the identifier field using _fieldId
    }

    // do the removing if the item is found
    if (ident != null && this._data[ident]) {
      const item = this._data[ident]
      delete this._data[ident]
      --this.length
      return item
    }

    return null
  }

  /**
   * Clear the data.
   *
   * @param senderId - Sender id.
   *
   * @returns removedIds - The ids of all removed items.
   */
  public clear(senderId?: string): Id[] {
    const ids = Object.keys(this._data)
    const items: FullItem<Item, IdProp>[] = []

    for (let i = 0, len = ids.length; i < len; i++) {
      items.push(this._data[ids[i]])
    }

    this._data = {}
    this.length = 0

    this._trigger('remove', { items: ids, oldData: items }, senderId)

    return ids
  }

  /**
   * Find the item with maximum value of a specified field.
   *
   * @param field - Name of the property that should be searched for max value.
   *
   * @returns Item containing max value, or null if no items.
   */
  public max(field: keyof Item): Item | null {
    const data = this._data
    const itemIds = Object.keys(data)
    let max = null
    let maxField = null

    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i]
      const item = data[id]
      const itemField = (item as any)[field]
      if (itemField != null && (maxField == null || itemField > maxField)) {
        max = item
        maxField = itemField
      }
    }

    return max
  }

  /**
   * Find the item with minimum value of a specified field.
   *
   * @param field - Name of the property that should be searched for min value.
   *
   * @returns Item containing min value, or null if no items.
   */
  public min(field: keyof Item): Item | null {
    const data = this._data
    const itemIds = Object.keys(data)
    let min = null
    let minField = null

    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i]
      const item = data[id]
      const itemField = (item as any)[field]
      if (itemField != null && (minField == null || itemField < minField)) {
        min = item
        minField = itemField
      }
    }

    return min
  }

  public distinct<T extends keyof Item>(prop: T): Item[T][]
  public distinct<T extends string>(prop: T): unknown[]
  /**
   * Find all distinct values of a specified field
   *
   * @param prop - The property name whose distinct values should be returned.
   *
   * @returns Unordered array containing all distinct values. Items without specified property are ignored.
   */
  public distinct<T extends string>(prop: T): unknown[] {
    const data = this._data
    const itemIds = Object.keys(data)
    const values: unknown[] = []
    const fieldType = (this._options.type && this._options.type[prop]) || null
    let count = 0

    for (let i = 0, len = itemIds.length; i < len; i++) {
      const id = itemIds[i]
      const item = data[id]
      const value = (item as any)[prop]
      let exists = false
      for (let j = 0; j < count; j++) {
        if (values[j] == value) {
          exists = true
          break
        }
      }
      if (!exists && value !== undefined) {
        values[count] = value
        count++
      }
    }

    if (fieldType) {
      for (let i = 0, len = values.length; i < len; i++) {
        values[i] = convert(values[i], fieldType)
      }
    }

    return values
  }

  /**
   * Add a single item. Will fail when an item with the same id already exists.
   *
   * @param item - A new item to be added.
   *
   * @returns Added item's id. An id is generated when it is not present in the item.
   */
  private _addItem(item: Item): Id {
    let id: OptId = item[this._idProp]

    if (id != null) {
      // check whether this id is already taken
      if (this._data[id]) {
        // item already exists
        throw new Error('Cannot add item: item with id ' + id + ' already exists')
      }
    } else {
      // generate an id
      id = uuid4()
      item[this._idProp] = id as any
    }

    const d: any = {}
    const fields = Object.keys(item)
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i]
      const fieldType = this._type[field] // type may be undefined
      d[field] = convert((item as any)[field], fieldType)
    }
    this._data[id] = d
    this.length++

    return id
  }

  private _getItem(id: Id): FullItem<Item, IdProp> | null
  private _getItem(id: Id, types?: TypeMap): any
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
    const raw = this._data[id]
    if (!raw) {
      return null
    }

    // convert the items field types
    let converted: any
    const fields = Object.keys(raw)

    if (types) {
      converted = {}
      for (let i = 0, len = fields.length; i < len; i++) {
        const field = fields[i]
        const value = (raw as any)[field]
        converted[field] = convert(value, types[field])
      }
    } else {
      // no field types specified, no converting needed
      converted = { ...raw }
    }

    if (!converted[this._idProp]) {
      converted[this._idProp] = (raw as any).id
    }

    return converted
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
    const id: OptId = item[this._idProp]
    if (id == null) {
      throw new Error('Cannot update item: item has no id (item: ' + JSON.stringify(item) + ')')
    }
    const d = this._data[id]
    if (!d) {
      // item doesn't exist
      throw new Error('Cannot update item: no item with id ' + id + ' found')
    }

    // merge with current item
    const fields = Object.keys(item)
    for (let i = 0, len = fields.length; i < len; i++) {
      const field = fields[i]
      const fieldType = this._type[field] // type may be undefined
      ;(d as any)[field] = convert((item as any)[field], fieldType)
    }

    return id
  }
}
