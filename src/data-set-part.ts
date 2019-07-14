import {
  AddEventPayload,
  DataInterface,
  EventCallbacksWithAny,
  EventName,
  EventNameWithAny,
  RemoveEventPayload,
  UpdateEventPayload,
} from './data-interface'

type EventSubscribers<Item, IdProp extends string> = {
  [Name in keyof EventCallbacksWithAny<Item, IdProp>]: {
    callback: any
  }
}

/**
 * [[DataSet]] code that can be reused in [[DataView]] or other similar implementations of [[DataInterface]].
 *
 * @typeparam Item - Item type that may or may not have an id.
 * @typeparam IdProp - Name of the property that contains the id.
 */
export abstract class DataSetPart<Item, IdProp extends string>
  implements Pick<DataInterface<Item, IdProp>, 'on' | 'off'> {
  protected _subscribers: {
    [Name in EventNameWithAny]: EventSubscribers<Item, IdProp>[Name][]
  } = {
    '*': [],
    add: [],
    remove: [],
    update: [],
  }

  protected _trigger(
    event: 'add',
    payload: AddEventPayload | null,
    senderId?: string | number | null | undefined
  ): void
  protected _trigger(
    event: 'update',
    payload: UpdateEventPayload<Item, IdProp> | null,
    senderId?: string | number | null | undefined
  ): void
  protected _trigger(
    event: 'remove',
    payload: RemoveEventPayload<Item, IdProp> | null,
    senderId?: string | number | null | undefined
  ): void
  /**
   * Trigger an event
   *
   * @param event - Event name.
   * @param payload - Event payload.
   * @param senderId - Id of the sender.
   */
  protected _trigger<Name extends EventName>(
    event: Name,
    payload:
      | AddEventPayload
      | UpdateEventPayload<Item, IdProp>
      | RemoveEventPayload<Item, IdProp>
      | null,
    senderId?: string | number | null | undefined
  ): void {
    // @TODO: Is this necessary?
    // Type checking error will happen anyway.
    if ((event as string) === '*') {
      throw new Error('Cannot trigger event *')
    }

    let subscribers: EventSubscribers<Item, IdProp>[Name][] = []
    if (event in this._subscribers) {
      subscribers = subscribers.concat(this._subscribers[event])
    }
    if ('*' in this._subscribers) {
      subscribers = subscribers.concat(this._subscribers['*'])
    }

    for (let i = 0, len = subscribers.length; i < len; i++) {
      const subscriber = subscribers[i]
      if (subscriber.callback) {
        subscriber.callback(event, payload, senderId != null ? senderId : null)
      }
    }
  }

  /**
   * Subscribe to an event, add an event listener.
   *
   * @param event - Event name.
   * @param callback - Callback method.
   */
  public on<Name extends EventNameWithAny>(
    event: Name,
    callback: EventCallbacksWithAny<Item, IdProp>[Name]
  ): void {
    this._subscribers[event].push({
      callback: callback,
    })
  }

  /**
   * Unsubscribe from an event, remove an event listener.
   *
   * @param event - Event name.
   * @param callback - Callback method. If the same callback was subscribed more than once **all** occurences will be removed.
   */
  public off<Name extends EventNameWithAny>(
    event: Name,
    callback: EventCallbacksWithAny<Item, IdProp>[Name]
  ): void {
    this._subscribers[event] = this._subscribers[event].filter(
      (listener): boolean => listener.callback !== callback
    )
  }

  /**
   * @deprecated Use on instead (PS: DataView.subscribe === DataView.on).
   */
  public subscribe: DataSetPart<Item, IdProp>['on'] = DataSetPart.prototype.on
  /**
   * @deprecated Use off instead (PS: DataView.unsubscribe === DataView.off).
   */
  public unsubscribe: DataSetPart<Item, IdProp>['off'] = DataSetPart.prototype.off
}
