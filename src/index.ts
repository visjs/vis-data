export {
  DataInterface,
  DataInterfaceGetIdsOptions,
  DataInterfaceGetOptions,
  DataInterfaceGetOptionsArray,
  DataInterfaceGetOptionsObject,
  DataInterfaceMapOptions,
  DataInterfaceOrder,
  EventCallbacks,
  EventCallbacksWithAny,
  EventName,
  EventNameWithAny,
  TypeMap,
  Types
} from "./data-interface";

export * from "./data-pipe";
export { DataSet, DataSetOptions } from "./data-set";
export { DataStream } from "./data-stream";
export { DataView, DataViewOptions } from "./data-view";
export { Queue } from "./queue";

// Backwards compatible API.
import { DataSet } from "./data-set";
import { DataView } from "./data-view";
import { Queue } from "./queue";

export default { DataSet, DataView, Queue };
