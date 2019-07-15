/** Queue configuration object. */
export interface QueueOptions {
  /** Delay in milliseconds, default is none. */
  delay?: number
  /** Maximum number of entries in the queue, default is no limit. */
  max?: number
}
/**
 * Queue extending options.
 *
 * @typeparam T - The type of method names to be replaced by queued versions.
 */
export interface QueueExtendOptions<T> {
  /** A list with method names of the methods on the object to be replaced with queued ones. */
  replace: T[]
  /** When provided, the queue will be flushed automatically after an inactivity of this delay in milliseconds. Default value is null. */
  delay?: number
  /** When the queue exceeds the given maximum number of entries, the queue is flushed automatically. Default value of max is Infinity. */
  max?: number
}
/**
 * Queue call entry.
 * - A function to be executed.
 * - An object with function, args, context (like function.bind(context, ...args)).
 */
type QueueCallEntry =
  | Function
  | {
      fn: Function
      args: unknown[]
    }
  | {
      fn: Function
      args: unknown[]
      context: unknown
    }

interface QueueExtended<T> {
  object: T
  methods: {
    name: string
    original: unknown
  }[]
}

/**
 * A queue.
 *
 * @typeparam T - The type of method names to be replaced by queued versions.
 */
export class Queue<T = never> {
  /** Delay in milliseconds. If defined the queue will be periodically flushed. */
  public delay: null | number
  /** Maximum number of entries in the queue before it will be flushed. */
  public max: number

  private _queue: {
    fn: Function
    args?: unknown[]
    context?: unknown
  }[] = []

  private _timeout: ReturnType<typeof setTimeout> | null = null
  private _extended: null | QueueExtended<T> = null

  /**
   * Construct a new Queue.
   *
   * @param options - Queue configuration.
   */
  public constructor(options?: QueueOptions) {
    // options
    this.delay = null
    this.max = Infinity

    this.setOptions(options)
  }

  /**
   * Update the configuration of the queue.
   *
   * @param options - Queue configuration.
   */
  public setOptions(options?: QueueOptions): void {
    if (options && typeof options.delay !== 'undefined') {
      this.delay = options.delay
    }
    if (options && typeof options.max !== 'undefined') {
      this.max = options.max
    }

    this._flushIfNeeded()
  }

  /**
   * Extend an object with queuing functionality.
   * The object will be extended with a function flush, and the methods provided in options.replace will be replaced with queued ones.
   *
   * @param object - The object to be extended.
   * @param options - Additional options.
   *
   * @returns The created queue.
   */
  public static extend<T extends { flush?: () => void }, K extends string>(
    object: T,
    options: QueueExtendOptions<K>
  ): Queue<T> {
    const queue = new Queue<T>(options)

    if (object.flush !== undefined) {
      throw new Error('Target object already has a property flush')
    }
    object.flush = (): void => {
      queue.flush()
    }

    const methods: QueueExtended<T>['methods'] = [
      {
        name: 'flush',
        original: undefined,
      },
    ]

    if (options && options.replace) {
      for (let i = 0; i < options.replace.length; i++) {
        const name = options.replace[i]
        methods.push({
          name: name,
          // @TODO: better solution?
          original: ((object as unknown) as Record<K, () => void>)[name],
        })
        // @TODO: better solution?
        queue.replace((object as unknown) as Record<K, () => void>, name)
      }
    }

    queue._extended = {
      object: object,
      methods: methods,
    }

    return queue
  }

  /**
   * Destroy the queue. The queue will first flush all queued actions, and in case it has extended an object, will restore the original object.
   */
  public destroy(): void {
    this.flush()

    if (this._extended) {
      const object = this._extended.object
      const methods = this._extended.methods
      for (let i = 0; i < methods.length; i++) {
        const method = methods[i]
        if (method.original) {
          // @TODO: better solution?
          ;(object as any)[method.name] = method.original
        } else {
          // @TODO: better solution?
          delete (object as any)[method.name]
        }
      }
      this._extended = null
    }
  }

  /**
   * Replace a method on an object with a queued version.
   *
   * @param object - Object having the method.
   * @param method - The method name.
   */
  public replace<M extends string>(object: Record<M, () => void>, method: M): void {
    const me = this
    const original = object[method]
    if (!original) {
      throw new Error('Method ' + method + ' undefined')
    }

    object[method] = function(...args: unknown[]): void {
      // add this call to the queue
      me.queue({
        args: args,
        fn: original,
        context: this,
      })
    }
  }

  /**
   * Queue a call.
   *
   * @param entry - The function or entry to be queued.
   */
  public queue(entry: QueueCallEntry): void {
    if (typeof entry === 'function') {
      this._queue.push({ fn: entry })
    } else {
      this._queue.push(entry)
    }

    this._flushIfNeeded()
  }

  /**
   * Check whether the queue needs to be flushed.
   */
  private _flushIfNeeded(): void {
    // flush when the maximum is exceeded.
    if (this._queue.length > this.max) {
      this.flush()
    }

    // flush after a period of inactivity when a delay is configured
    if (this._timeout != null) {
      clearTimeout(this._timeout)
      this._timeout = null
    }
    if (this.queue.length > 0 && typeof this.delay === 'number') {
      this._timeout = setTimeout((): void => {
        this.flush()
      }, this.delay)
    }
  }

  /**
   * Flush all queued calls
   */
  public flush(): void {
    this._queue.splice(0).forEach((entry): void => {
      entry.fn.apply(entry.context || entry.fn, entry.args || [])
    })
  }
}
