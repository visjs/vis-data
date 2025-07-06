import { test, given } from "sazerac";

import {
  DataSet,
  DataView,
  isDataSetLike,
  isDataViewLike,
} from "../src/entry-esnext.ts";

function createFakeDataSet(idProp: string): any {
  const v = {
    add: (): void => {},
    clear: (): void => {},
    distinct: (): void => {},
    forEach: (): void => {},
    get: (): void => {},
    getDataSet: (): any => v,
    getIds: (): void => {},
    idProp,
    length: 7,
    map: (): void => {},
    max: (): void => {},
    min: (): void => {},
    off: (): void => {},
    on: (): void => {},
    remove: (): void => {},
    setOptions: (): void => {},
    stream: (): void => {},
    update: (): void => {},
    updateOnly: (): void => {},
  };
  return v;
}
function createFakeDataView(idProp: string): any {
  const v = {
    forEach: (): void => {},
    get: (): void => {},
    getDataSet: (): any => createFakeDataSet(idProp),
    getIds: (): void => {},
    idProp,
    length: 3,
    map: (): void => {},
    off: (): void => {},
    on: (): void => {},
    stream: (): void => {},
  };
  return v;
}

describe("Type checks", function (): void {
  test(isDataViewLike, function (): void {
    given("id").expect(false);
    given("id", undefined).expect(false);
    given("id", null).expect(false);
    given("id", {}).expect(false);
    given("id", []).expect(false);

    given("id", new DataSet()).expect(true);
    given("ds", new DataSet()).expect(false);
    given("ds", new DataSet({ fieldId: "ds" })).expect(true);

    given("id", new DataView(new DataSet())).expect(true);
    given("dv", new DataView(new DataSet())).expect(false);
    given("dv", new DataView(new DataSet({ fieldId: "dv" }))).expect(true);

    given("id", createFakeDataSet("fds")).expect(false);
    given("fds", createFakeDataSet("fds")).expect(true);

    given("id", createFakeDataView("fdv")).expect(false);
    given("fdv", createFakeDataView("fdv")).expect(true);
  });

  test(isDataSetLike, function (): void {
    given("id").expect(false);
    given("id", undefined).expect(false);
    given("id", null).expect(false);
    given("id", {}).expect(false);
    given("id", []).expect(false);

    given("id", new DataSet()).expect(true);
    given("ds", new DataSet()).expect(false);
    given("ds", new DataSet({ fieldId: "ds" })).expect(true);

    given("id", new DataView(new DataSet())).expect(false);
    given("dv", new DataView(new DataSet())).expect(false);
    given("dv", new DataView(new DataSet({ fieldId: "dv" }))).expect(false);

    given("id", createFakeDataSet("fds")).expect(false);
    given("fds", createFakeDataSet("fds")).expect(true);

    given("id", createFakeDataView("fdv")).expect(false);
    given("fdv", createFakeDataView("fdv")).expect(false);
  });
});
