import {
  DataInterface,
  DataInterfaceGetIdsOptions,
  DataInterfaceGetOptions,
  DataInterfaceGetOptionsDefaultOrArray,
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
  isId,
  DataInterfaceForEachOptions,
} from './data-interface'

import { DataSet } from './data-set'
import { DataSetPart } from './data-set-part'

export interface DataViewOptions<Item, T extends string> {
  fieldId?: T
  filter?: (item: Item) => boolean
}

/**
 * DataView
 *
 * A data view offers a filtered view on a data set or on other data view.
 */
export class DataView<Item extends PartItem<IdProp>, IdProp extends string = 'id'>
  extends DataSetPart<Item, IdProp>
  implements DataInterface<Item, IdProp> {
  /** @inheritdoc */
  public length: number = 0
  private listener: EventCallbacksWithAny<Item, IdProp>['*']

  private _data!: DataInterface<Item, IdProp> // constructor → setData
  private _ids: Record<Id, true> = {} // ids of the items currently in memory (just contains a boolean true)
  private _options: DataViewOptions<Item, IdProp>

  /**
   * Create a DataView.
   *
   * @param data - The instance containing data (directly or indirectly).
   * @param options - Options to configure this data view.
   */
  public constructor(data: DataInterface<Item, IdProp>, options: DataViewOptions<Item, IdProp>) {
    super()

    this._options = options || {}

    this.listener = this._onEvent.bind(this)

    this.setData(data)
  }

  // TODO: implement a function .config() to dynamically update things like configured filter
  // and trigger changes accordingly

  /**
   * Set a data source for the view.
   *
   * @param data - The instance containing data (directly or indirectly).
   */
  public setData(data: DataInterface<Item, IdProp>): void {
    if (this._data) {
      // unsubscribe from current dataset
      if (this._data.off) {
        this._data.off('*', this.listener)
      }

      // trigger a remove of all items in memory
      const ids = this._data.getIds({ filter: this._options.filter })
      const items = this._data.get(ids)

      this._ids = {}
      this.length = 0
      this._trigger('remove', { items: ids, oldData: items })
    }

    if (data != null) {
      this._data = data

      // trigger an add of all added items
      const ids = this._data.getIds({ filter: this._options.filter })
      for (let i = 0, len = ids.length; i < len; i++) {
        const id = ids[i]
        this._ids[id] = true
      }
      this.length = ids.length
      this._trigger('add', { items: ids })
    } else {
      this._data = new DataSet<Item, IdProp>()
    }

    // subscribe to new dataset
    if (this._data.on) {
      this._data.on('*', this.listener)
    }
  }

  /**
   * Refresh the DataView.
   * Useful when the DataView has a filter function containing a variable parameter.
   */
  public refresh(): void {
    const ids = this._data.getIds({
      filter: this._options.filter,
    })
    const oldIds = Object.keys(this._ids) as Id[]
    const newIds: Record<Id, boolean> = {}
    const addedIds: Id[] = []
    const removedIds: Id[] = []
    const removedItems: FullItem<Item, IdProp>[] = []

    // check for additions
    for (let i = 0, len = ids.length; i < len; i++) {
      const id = ids[i]
      newIds[id] = true
      if (!this._ids[id]) {
        addedIds.push(id)
        this._ids[id] = true
      }
    }

    // check for removals
    for (let i = 0, len = oldIds.length; i < len; i++) {
      const id = oldIds[i]
      const item = this._data.get(id)
      if (item == null) {
        // @TODO: Investigate.
        // Doesn't happen during tests or examples.
        // Is it really impossible or could it eventually happen?
        // How to handle it if it does? The types guarantee non-nullable items.
        console.error('If you see this, report it please.')
      } else if (!newIds[id]) {
        removedIds.push(id)
        removedItems.push(item)
        delete this._ids[id]
      }
    }

    this.length += addedIds.length - removedIds.length

    // trigger events
    if (addedIds.length) {
      this._trigger('add', { items: addedIds })
    }
    if (removedIds.length) {
      this._trigger('remove', { items: removedIds, oldData: removedItems })
    }
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
  ):
    | null
    | FullItem<Item, IdProp>
    | FullItem<Item, IdProp>[]
    | Record<string, FullItem<Item, IdProp>> {
    if (this._data == null) {
      return null
    }

    // parse the arguments
    let ids: Id | Id[] | null = null
    let options: any
    if (isId(first) || Array.isArray(first)) {
      ids = first
      options = second
    } else {
      options = first
    }

    // extend the options with the default options and provided options
    const viewOptions: DataInterfaceGetOptions<Item> = Object.assign({}, this._options, options)

    // create a combined filter method when needed
    const thisFilter = this._options.filter
    const optionsFilter = options && options.filter
    if (thisFilter && optionsFilter) {
      viewOptions.filter = (item): boolean => {
        return thisFilter(item) && optionsFilter(item)
      }
    }

    if (ids == null) {
      return this._data.get(viewOptions)
    } else {
      return this._data.get(ids, viewOptions)
    }
  }

  /** @inheritdoc */
  public getIds(options?: DataInterfaceGetIdsOptions<Item>): Id[] {
    if (this._data.length) {
      const defaultFilter = this._options.filter
      const optionsFilter = options != null ? options.filter : null
      let filter: DataInterfaceGetIdsOptions<Item>['filter']

      if (optionsFilter) {
        if (defaultFilter) {
          filter = (item): boolean => {
            return defaultFilter(item) && optionsFilter(item)
          }
        } else {
          filter = optionsFilter
        }
      } else {
        filter = defaultFilter
      }

      return this._data.getIds({
        filter: filter,
        order: options && options.order,
      })
    } else {
      return []
    }
  }

  /** @inheritdoc */
  public forEach(
    callback: (item: Item, id: Id) => void,
    options?: DataInterfaceForEachOptions<Item>
  ): void {
    if (this._data) {
      const defaultFilter = this._options.filter
      const optionsFilter = options && options.filter
      let filter: undefined | ((item: Item) => boolean)

      if (optionsFilter) {
        if (defaultFilter) {
          filter = function(item: Item): boolean {
            return defaultFilter(item) && optionsFilter(item)
          }
        } else {
          filter = optionsFilter
        }
      } else {
        filter = defaultFilter
      }

      this._data.forEach(callback, {
        filter: filter,
        order: options && options.order,
      })
    }
  }

  /** @inheritdoc */
  public map<T>(
    callback: (item: Item, id: Id) => T,
    options?: DataInterfaceMapOptions<Item, T>
  ): T[] {
    type Filter = NonNullable<DataInterfaceMapOptions<Item, T>['filter']>

    if (this._data) {
      const defaultFilter = this._options.filter
      const optionsFilter = options && options.filter
      let filter: undefined | Filter

      if (optionsFilter) {
        if (defaultFilter) {
          filter = (item): ReturnType<Filter> => {
            return defaultFilter(item) && optionsFilter(item)
          }
        } else {
          filter = optionsFilter
        }
      } else {
        filter = defaultFilter
      }

      return this._data.map(callback, {
        filter: filter,
        order: options && options.order,
      })
    } else {
      return []
    }
  }

  /** @inheritdoc */
  public getDataSet(): DataSet<Item, IdProp> {
    return this._data.getDataSet()
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
    params: EventPayloads<Item, IdProp>[EN][0],
    senderId: EventPayloads<Item, IdProp>[EN][1]
  ): void {
    if (!params || !params.items || !this._data) {
      return
    }

    const ids = params.items
    const addedIds: Id[] = []
    const updatedIds: Id[] = []
    const removedIds: Id[] = []
    const oldItems: FullItem<Item, IdProp>[] = []
    const updatedItems: FullItem<Item, IdProp>[] = []
    const removedItems: FullItem<Item, IdProp>[] = []

    switch (event) {
      case 'add':
        // filter the ids of the added items
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i]
          const item = this.get(id)
          if (item) {
            this._ids[id] = true
            addedIds.push(id)
          }
        }

        break

      case 'update':
        // determine the event from the views viewpoint: an updated
        // item can be added, updated, or removed from this view.
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i]
          const item = this.get(id)

          if (item) {
            if (this._ids[id]) {
              updatedIds.push(id)
              updatedItems.push((params as UpdateEventPayload<Item, IdProp>).data[i])
              oldItems.push((params as UpdateEventPayload<Item, IdProp>).oldData[i])
            } else {
              this._ids[id] = true
              addedIds.push(id)
            }
          } else {
            if (this._ids[id]) {
              delete this._ids[id]
              removedIds.push(id)
              removedItems.push((params as UpdateEventPayload<Item, IdProp>).oldData[i])
            } else {
              // nothing interesting for me :-(
            }
          }
        }

        break

      case 'remove':
        // filter the ids of the removed items
        for (let i = 0, len = ids.length; i < len; i++) {
          const id = ids[i]
          if (this._ids[id]) {
            delete this._ids[id]
            removedIds.push(id)
            removedItems.push((params as RemoveEventPayload<Item, IdProp>).oldData[i])
          }
        }

        break
    }

    this.length += addedIds.length - removedIds.length

    if (addedIds.length) {
      this._trigger('add', { items: addedIds }, senderId)
    }
    if (updatedIds.length) {
      this._trigger(
        'update',
        { items: updatedIds, oldData: oldItems, data: updatedItems },
        senderId
      )
    }
    if (removedIds.length) {
      this._trigger('remove', { items: removedIds, oldData: removedItems }, senderId)
    }
  }
}
