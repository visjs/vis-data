// Current API.
export * from "./entry-esnext";

// Backwards compatible API.
import { DataSet } from "./data-set";
import { DataView } from "./data-view";
import { Queue } from "./queue";

export default { DataSet, DataView, Queue };
