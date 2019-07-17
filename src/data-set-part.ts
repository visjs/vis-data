import {
  AddEventPayload,
  DataInterface,
  EventCallbacksWithAny,
  EventName,
  EventNameWithAny,
  RemoveEventPayload,
  UpdateEventPayload,
  Id,
  EventPayloads,
} from './data-interface'

type EventSubscribers<Item, IdProp extends string> = {
  [Name in keyof EventCallbacksWithAny<Item, IdProp>]: {
    callback: any
  }
}

/**
 * [[DataSet]] code that can be reused in [[DataView]] or other similar implementations of [[DataInterface]].
 *
 * @typeParam Item - Item type that may or may not have an id.
 * @typeParam IdProp - Name of the property that contains the id.
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
    payload: EventPayloads<Item, IdProp>['add'],
    senderId?: Id | null
  ): void
  protected _trigger(
    event: 'update',
    payload: EventPayloads<Item, IdProp>['update'],
    senderId?: Id | null
  ): void
  protected _trigger(
    event: 'remove',
    payload: EventPayloads<Item, IdProp>['remove'],
    senderId?: Id | null
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
    payload: EventPayloads<Item, IdProp>[Name],
    senderId?: Id | null
  ): void {
    if ((event as string) === '*') {
      throw new Error('Cannot trigger event *')
    }

    const subscribers: EventSubscribers<Item, IdProp>[Name][] = [
      ...this._subscribers[event],
      ...this._subscribers['*'],
    ]

    for (let i = 0, len = subscribers.length; i < len; i++) {
      const subscriber = subscribers[i]
      if (subscriber.callback) {
        subscriber.callback(event, payload, senderId != null ? senderId : null)
      }
    }
  }

  /** @inheritdoc */
  public on(event: '*', callback: EventCallbacksWithAny<Item, IdProp>['*']): void
  /** @inheritdoc */
  public on(event: 'add', callback: EventCallbacksWithAny<Item, IdProp>['add']): void
  /** @inheritdoc */
  public on(event: 'remove', callback: EventCallbacksWithAny<Item, IdProp>['remove']): void
  /** @inheritdoc */
  public on(event: 'update', callback: EventCallbacksWithAny<Item, IdProp>['update']): void
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

  /** @inheritdoc */
  public off(event: '*', callback: EventCallbacksWithAny<Item, IdProp>['*']): void
  /** @inheritdoc */
  public off(event: 'add', callback: EventCallbacksWithAny<Item, IdProp>['add']): void
  /** @inheritdoc */
  public off(event: 'remove', callback: EventCallbacksWithAny<Item, IdProp>['remove']): void
  /** @inheritdoc */
  public off(event: 'update', callback: EventCallbacksWithAny<Item, IdProp>['update']): void
  /**
   * Unsubscribe from an event, remove an event listener.
   *
   * @remarks If the same callback was subscribed more than once **all** occurences will be removed.
   *
   * @param event - Event name.
   * @param callback - Callback method.
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
