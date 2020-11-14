import {
  DataInterface,
  EventCallbacksWithAny,
  EventName,
  EventNameWithAny,
  EventPayloads,
  Id,
} from "./data-interface";

type EventSubscribers<Item, IdProp extends string> = {
  [Name in keyof EventCallbacksWithAny<Item, IdProp>]: (...args: any[]) => void;
};

/**
 * [[DataSet]] code that can be reused in [[DataView]] or other similar implementations of [[DataInterface]].
 *
 * @typeParam Item - Item type that may or may not have an id.
 * @typeParam IdProp - Name of the property that contains the id.
 */
export abstract class DataSetPart<Item, IdProp extends string>
  implements Pick<DataInterface<Item, IdProp>, "on" | "off"> {
  private readonly _subscribers: {
    [Name in EventNameWithAny]: EventSubscribers<Item, IdProp>[Name][];
  } = {
    "*": [],
    add: [],
    remove: [],
    update: [],
  };

  protected _trigger(
    event: "add",
    payload: EventPayloads<Item, IdProp>["add"],
    senderId?: Id | null
  ): void;
  protected _trigger(
    event: "update",
    payload: EventPayloads<Item, IdProp>["update"],
    senderId?: Id | null
  ): void;
  protected _trigger(
    event: "remove",
    payload: EventPayloads<Item, IdProp>["remove"],
    senderId?: Id | null
  ): void;
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
    if ((event as string) === "*") {
      throw new Error("Cannot trigger event *");
    }

    [...this._subscribers[event], ...this._subscribers["*"]].forEach(
      (subscriber): void => {
        subscriber(event, payload, senderId != null ? senderId : null);
      }
    );
  }

  /** @inheritDoc */
  public on(
    event: "*",
    callback: EventCallbacksWithAny<Item, IdProp>["*"]
  ): void;
  /** @inheritDoc */
  public on(
    event: "add",
    callback: EventCallbacksWithAny<Item, IdProp>["add"]
  ): void;
  /** @inheritDoc */
  public on(
    event: "remove",
    callback: EventCallbacksWithAny<Item, IdProp>["remove"]
  ): void;
  /** @inheritDoc */
  public on(
    event: "update",
    callback: EventCallbacksWithAny<Item, IdProp>["update"]
  ): void;
  /**
   * Subscribe to an event, add an event listener.
   *
   * @remarks Non-function callbacks are ignored.
   *
   * @param event - Event name.
   * @param callback - Callback method.
   */
  public on<Name extends EventNameWithAny>(
    event: Name,
    callback: EventCallbacksWithAny<Item, IdProp>[Name]
  ): void {
    if (typeof callback === "function") {
      this._subscribers[event].push(callback);
    }
    // @TODO: Maybe throw for invalid callbacks?
  }

  /** @inheritDoc */
  public off(
    event: "*",
    callback: EventCallbacksWithAny<Item, IdProp>["*"]
  ): void;
  /** @inheritDoc */
  public off(
    event: "add",
    callback: EventCallbacksWithAny<Item, IdProp>["add"]
  ): void;
  /** @inheritDoc */
  public off(
    event: "remove",
    callback: EventCallbacksWithAny<Item, IdProp>["remove"]
  ): void;
  /** @inheritDoc */
  public off(
    event: "update",
    callback: EventCallbacksWithAny<Item, IdProp>["update"]
  ): void;
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
      (subscriber): boolean => subscriber !== callback
    );
  }

  /**
   * @deprecated Use on instead (PS: DataView.subscribe === DataView.on).
   */
  public subscribe: DataSetPart<Item, IdProp>["on"] = DataSetPart.prototype.on;
  /**
   * @deprecated Use off instead (PS: DataView.unsubscribe === DataView.off).
   */
  public unsubscribe: DataSetPart<Item, IdProp>["off"] =
    DataSetPart.prototype.off;

  /* develblock:start */
  public get testLeakSubscribers(): any {
    return this._subscribers;
  }
  /* develblock:end */
}
