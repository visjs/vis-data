import type { PartItem } from "./data-interface.ts";
import type { DataSet } from "./data-set.ts";

/**
 * Check that given value is compatible with Vis Data Set interface.
 * @param idProp - The expected property to contain item id.
 * @param v - The value to be tested.
 * @returns True if all expected values and methods match, false otherwise.
 */
export function isDataSetLike<
  Item extends PartItem<IdProp>,
  IdProp extends string = "id",
>(idProp: IdProp, v: any): v is DataSet<Item, IdProp> {
  return (
    typeof v === "object" &&
    v !== null &&
    idProp === v.idProp &&
    typeof v.add === "function" &&
    typeof v.clear === "function" &&
    typeof v.distinct === "function" &&
    typeof v.forEach === "function" &&
    typeof v.get === "function" &&
    typeof v.getDataSet === "function" &&
    typeof v.getIds === "function" &&
    typeof v.length === "number" &&
    typeof v.map === "function" &&
    typeof v.max === "function" &&
    typeof v.min === "function" &&
    typeof v.off === "function" &&
    typeof v.on === "function" &&
    typeof v.remove === "function" &&
    typeof v.setOptions === "function" &&
    typeof v.stream === "function" &&
    typeof v.update === "function" &&
    typeof v.updateOnly === "function"
  );
}
