// Current API.
export * from "./entry-esnext.ts";

// Backwards compatible API.
import { DataSet } from "./data-set.ts";
import { DataView } from "./data-view.ts";
import { Queue } from "./queue.ts";

export default { DataSet, DataView, Queue };
