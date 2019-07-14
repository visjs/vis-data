import { DataSet } from './data-set'

type ValueOf<T> = T[keyof T]

/** Available types for enforcing property types. */
export type Types =
  | 'boolean'
  | 'Boolean'
  | 'number'
  | 'Number'
  | 'string'
  | 'String'
  | 'Date'
  | 'ISODate'
  | 'ASPDate'
  | 'Moment'

/** Valid id type.  */
export type Id = number | string
/** Nullable id type.  */
export type OptId = undefined | null | Id
/**
 * Determine whether a value can be used as an id.
 *
 * @param value - Input value of unknown type.
 *
 * @returns True if the value is valid id, false otherwise.
 */
export function isId(value: unknown): value is Id {
  return typeof value === 'string' || typeof value === 'number'
}

/**
 * An item that may ([[Id]]) or may not (absent, undefined or null) have an id property.
 *
 * @typeparam IdProp - Name of the property that contains the id.
 */
export type PartItem<IdProp extends string> = Partial<Record<IdProp, OptId>>
/**
 * An item that has a property containing an id.
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export type FullItem<Item extends PartItem<IdProp>, IdProp extends string> = Item &
  Record<IdProp, Id>
/**
 * Test whether an item has an id (is [[FullItem]]).
 *
 * @param item - The item to be tested.
 * @param idProp - Name of the id property.
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 *
 * @returns True if this value is a [[FullItem]], false otherwise.
 */
export function isFullItem<Item extends PartItem<IdProp>, IdProp extends string>(
  item: Item,
  idProp: IdProp
): item is FullItem<Item, IdProp> {
  return item[idProp] != null
}

/** Add event payload. */
export interface AddEventPayload {
  /** Ids of added items. */
  items: Id[]
}
/** Update event payload. */
export interface UpdateEventPayload<Item, IdProp extends string> {
  /** Ids of updated items. */
  items: Id[]
  /** Items as they were before this update. */
  oldData: FullItem<Item, IdProp>[]
  /**
   * Items as they are now.
   * @deprecated Just get the data from the data set or data view.
   */
  data: FullItem<Item, IdProp>[]
}
/** Remove event payload. */
export interface RemoveEventPayload<Item, IdProp extends string> {
  /** Ids of removed items. */
  items: Id[]
  /** Items as they were before their removal. */
  oldData: FullItem<Item, IdProp>[]
}

/**
 * Map of event payload types (event name → payload).
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export interface EventPayloads<Item, IdProp extends string> {
  add: [AddEventPayload | null, string | number | null]
  update: [UpdateEventPayload<Item, IdProp> | null, string | number | null]
  remove: [RemoveEventPayload<Item, IdProp> | null, string | number | null]
}
/**
 * Map of event payload types including any event (event name → payload).
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export interface EventPayloadsWithAny<Item, IdProp extends string>
  extends EventPayloads<Item, IdProp> {
  '*': ValueOf<EventPayloads<Item, IdProp>>
}

/**
 * Map of event callback types (event name → callback).
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export type EventCallbacks<Item, IdProp extends string> = {
  [Name in keyof EventPayloads<Item, IdProp>]: (
    name: Name,
    ...args: EventPayloads<Item, IdProp>[Name]
  ) => void
}
/**
 * Map of event callback types including any event (event name → callback).
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export interface EventCallbacksWithAny<Item, IdProp extends string>
  extends EventCallbacks<Item, IdProp> {
  '*': <EN extends EventName>(
    event: EN,
    params: EventPayloads<Item, IdProp>[EN][0],
    senderId: EventPayloads<Item, IdProp>[EN][1]
  ) => void
}

/** Available event names. */
export type EventName = keyof EventPayloads<never, ''>
/** Available event names and '*' to listen for all. */
export type EventNameWithAny = EventName | '*'

/** Maps property name to a type. */
export type TypeMap = Record<string, Types>
/**
 * Data interface order parameter.
 * - A string value determines which property will be used for sorting (using < and > operators).
 * - A function will be used the same way as in Array.sort.
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export type DataInterfaceOrder<Item> = keyof Item | ((a: Item, b: Item) => number)

/**
 * Data interface get options (return type independent).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceGetOptionsBase<Item> {
  /** If present only selected properties of the items will be returned.  */
  fields?: string[]
  /** If present will be used to filter the items.  */
  filter?: (item: Item) => boolean
  /** If present the items will be sorted using this comparator.  */
  order?: DataInterfaceOrder<Item>
  /** If present the properties of items will be coerced to the requested types.  */
  type?: TypeMap
}

/**
 * Data interface get options (default).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceGetOptionsDefault<Item> extends DataInterfaceGetOptionsBase<Item> {
  /** Items return type (null or single item for one id, array of items for array of ids). */
  returnType?: undefined
}
/**
 * Data interface get options (array).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceGetOptionsArray<Item> extends DataInterfaceGetOptionsBase<Item> {
  /** Items will be returned as an array. */
  returnType: 'Array'
}
/**
 * Data interface get options (default or array).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export type DataInterfaceGetOptionsDefaultOrArray<Item> =
  | DataInterfaceGetOptionsDefault<Item>
  | DataInterfaceGetOptionsArray<Item>
/**
 * Data interface get options (object).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceGetOptionsObject<Item> extends DataInterfaceGetOptionsBase<Item> {
  /** Items will be returned as an object map (id → item). */
  returnType: 'Object'
}
/**
 * Data interface get options (array or object).
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export type DataInterfaceGetOptions<Item> =
  | DataInterfaceGetOptionsDefaultOrArray<Item>
  | DataInterfaceGetOptionsObject<Item>

/**
 * Data interface get ids options.
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceGetIdsOptions<Item> {
  /** If present will be used to filter the items.  */
  filter?: (item: Item) => boolean
  /** If present the items will be sorted using this comparator.  */
  order?: DataInterfaceOrder<Item>
  /** If present the properties of items will be coerced to the requested types.  */
  type?: TypeMap
}

/**
 * Data interface for each options.
 *
 * @typeparam Item - Item type that may or may not have an id.
 */
export interface DataInterfaceForEachOptions<Item> {
  /** If present only selected properties of the items will be returned.  */
  fields?: string[]
  /** If present will be used to filter the items.  */
  filter?: (item: Item) => boolean
  /** If present the items will be sorted using this comparator.  */
  order?: DataInterfaceOrder<Item>
  /** If present the properties of items will be coerced to the requested types.  */
  type?: TypeMap
}

/**
 * Data interface map oprions.
 *
 * @typeparam Original - The original item type in the data.
 * @typeparam Mapped - The type after mapping.
 */
export interface DataInterfaceMapOptions<Original, Mapped> {
  /** If present only selected properties of the items will be returned.  */
  fields?: string[]
  /** If present will be used to filter the items.  */
  filter?: (item: Original) => boolean
  /** If present the items will be sorted using this comparator.  */
  order?: DataInterfaceOrder<Mapped>
  /** If present the properties of items will be coerced to the requested types.  */
  type?: TypeMap
}

/**
 * Common interface for data sets and data view.
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export interface DataInterface<Item extends PartItem<IdProp>, IdProp extends string = 'id'> {
  /** The number of items. */
  length: number

  /**
   * Add an event listener to a single event.
   *
   * @param event - Event name.
   * @param callback - Callback method.
   */
  on<Name extends EventName>(event: Name, callback: EventCallbacks<Item, IdProp>[Name]): void
  /**
   * Add an event listener to a single or all events.
   *
   * @param event - Event name, * stands for all events.
   * @param callback - Callback method.
   */
  on<Name extends EventNameWithAny>(
    event: Name,
    callback: EventCallbacksWithAny<Item, IdProp>[Name]
  ): void
  /**
   * Remove an event listener from a single event.
   *
   * @param event - Event name.
   * @param callback - Callback method.
   */
  off<Name extends EventName>(event: Name, callback: EventCallbacks<Item, IdProp>[Name]): void
  /**
   * Remove an event listener from a single or all events.
   *
   * @param event - Event name, * stands for all events.
   * @param callback - Callback method.
   */
  off<Name extends EventNameWithAny>(
    event: Name,
    callback: EventCallbacksWithAny<Item, IdProp>[Name]
  ): void

  /**
   * Get all the items.
   *
   * @returns An array containing all the items.
   */
  get(): FullItem<Item, IdProp>[]
  /**
   * Get all the items.
   *
   * @param options - Additional options.
   *
   * @returns An array containing requested items.
   */
  get(options: DataInterfaceGetOptionsDefaultOrArray<Item>): FullItem<Item, IdProp>[]
  /**
   * Get all the items.
   *
   * @param options - Additional options.
   *
   * @returns An object map of items (may be an empty object if there are no items).
   */
  get(options: DataInterfaceGetOptionsObject<Item>): Record<Id, FullItem<Item, IdProp>>
  /**
   * Get all the items.
   *
   * @param options - Additional options.
   *
   * @returns An array containing requested items or if requested an object map of items (may be an empty object if there are no items).
   */
  get(
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>
  /**
   * Get one item.
   *
   * @param id - The id of the item.
   *
   * @returns The item or null if the id doesn't correspond to any item.
   */
  get(id: Id): null | FullItem<Item, IdProp>
  /**
   * Get one item.
   *
   * @param id - The id of the item.
   * @param options - Additional options.
   *
   * @returns The item or null if the id doesn't correspond to any item.
   */
  get(id: Id, options: DataInterfaceGetOptionsDefaultOrArray<Item>): null | FullItem<Item, IdProp>
  /**
   * Get one item.
   *
   * @param id - The id of the item.
   * @param options - Additional options.
   *
   * @returns An object map of items (may be an empty object if no item was found).
   */
  get(id: Id, options: DataInterfaceGetOptionsObject<Item>): Record<Id, FullItem<Item, IdProp>>
  /**
   * Get one item.
   *
   * @param id - The id of the item.
   * @param options - Additional options.
   *
   * @returns The item if found or null otherwise. If requested an object map with 0 to 1 items.
   */
  get(
    id: Id,
    options: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | Record<Id, FullItem<Item, IdProp>>
  /**
   * Get multiple items.
   *
   * @param ids - An array of requested ids.
   *
   * @returns An array of found items (ids that do not correspond to any item are omitted).
   */
  get(ids: Id[]): FullItem<Item, IdProp>[]
  /**
   * Get multiple items.
   *
   * @param ids - An array of requested ids.
   * @param options - Additional options.
   *
   * @returns An array of found items (ids that do not correspond to any item are omitted).
   */
  get(ids: Id[], options: DataInterfaceGetOptionsDefaultOrArray<Item>): FullItem<Item, IdProp>[]
  /**
   * Get multiple items.
   *
   * @param ids - An array of requested ids.
   * @param options - Additional options.
   *
   * @returns An object map of items (may be an empty object if no item was found).
   */
  get(ids: Id[], options: DataInterfaceGetOptionsObject<Item>): Record<Id, FullItem<Item, IdProp>>
  /**
   * Get multiple items.
   *
   * @param ids - An array of requested ids.
   * @param options - Additional options.
   *
   * @returns An array of found items (ids that do not correspond to any item are omitted).
   * If requested an object map of items (may be an empty object if no item was found).
   */
  get(
    ids: Id[],
    options: DataInterfaceGetOptions<Item>
  ): FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>
  /**
   * Get items.
   *
   * @param ids - Id or ids to be returned.
   * @param options - Options to specify iteration details.
   *
   * @returns The items (format is determined by ids (single or array) and the options.
   */
  get(
    ids: Id | Id[],
    options?: DataInterfaceGetOptions<Item>
  ): null | FullItem<Item, IdProp> | FullItem<Item, IdProp>[] | Record<Id, FullItem<Item, IdProp>>

  /**
   * Get the DataSet to which the instance implementing this interface is connected.
   * In case there is a chain of multiple DataViews, the root DataSet of this chain is returned.
   *
   * @returns The data set that actually contains the data.
   */
  getDataSet(): DataSet<Item, IdProp>

  /**
   * Get ids of items.
   *
   * @param options - Additional configuration.
   *
   * @returns An array of requested ids.
   */
  getIds(options?: DataInterfaceGetIdsOptions<Item>): Id[]

  /**
   * Execute a callback function for each item.
   *
   * @param callback - Array.forEach-like callback, but only with the first two params.
   * @param options - Options to specify iteration details.
   */
  forEach(callback: (item: Item, id: Id) => void, options?: DataInterfaceForEachOptions<Item>): void

  /**
   * Map each item into different item and return them as an array.
   *
   * @param callback - Array.map-like callback, but only with the first two params.
   * @param options - Options to specify iteration details.
   *
   * @returns The mapped items.
   */
  map<T>(callback: (item: Item, id: Id) => T, options?: DataInterfaceMapOptions<Item, T>): T[]
}
