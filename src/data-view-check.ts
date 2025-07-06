import type { DataView } from "./data-view.ts";
import type { PartItem } from "./data-interface.ts";
import { isDataSetLike } from "./data-set-check.ts";

/**
 * Check that given value is compatible with Vis Data View interface.
 * @param idProp - The expected property to contain item id.
 * @param v - The value to be tested.
 * @returns True if all expected values and methods match, false otherwise.
 */
export function isDataViewLike<
  Item extends PartItem<IdProp>,
  IdProp extends string = "id",
>(idProp: IdProp, v: any): v is DataView<Item, IdProp> {
  return (
    typeof v === "object" &&
    v !== null &&
    idProp === v.idProp &&
    typeof v.forEach === "function" &&
    typeof v.get === "function" &&
    typeof v.getDataSet === "function" &&
    typeof v.getIds === "function" &&
    typeof v.length === "number" &&
    typeof v.map === "function" &&
    typeof v.off === "function" &&
    typeof v.on === "function" &&
    typeof v.stream === "function" &&
    isDataSetLike(idProp, v.getDataSet())
  );
}
