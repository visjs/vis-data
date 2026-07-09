import { expect } from "chai";

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
  it("isDataViewLike", function (): void {
    expect(isDataViewLike("id", undefined)).to.equal(false);
    expect(isDataViewLike("id", null)).to.equal(false);
    expect(isDataViewLike("id", {})).to.equal(false);
    expect(isDataViewLike("id", [])).to.equal(false);

    expect(isDataViewLike("id", new DataSet())).to.equal(true);
    expect(isDataViewLike("ds", new DataSet())).to.equal(false);
    expect(isDataViewLike("ds", new DataSet({ fieldId: "ds" }))).to.equal(true);

    expect(isDataViewLike("id", new DataView(new DataSet()))).to.equal(true);
    expect(isDataViewLike("dv", new DataView(new DataSet()))).to.equal(false);
    expect(
      isDataViewLike("dv", new DataView(new DataSet({ fieldId: "dv" }))),
    ).to.equal(true);

    expect(isDataViewLike("id", createFakeDataSet("fds"))).to.equal(false);
    expect(isDataViewLike("fds", createFakeDataSet("fds"))).to.equal(true);

    expect(isDataViewLike("id", createFakeDataView("fdv"))).to.equal(false);
    expect(isDataViewLike("fdv", createFakeDataView("fdv"))).to.equal(true);
  });

  it("isDataSetLike", function (): void {
    expect(isDataSetLike("id", undefined)).to.equal(false);
    expect(isDataSetLike("id", null)).to.equal(false);
    expect(isDataSetLike("id", {})).to.equal(false);
    expect(isDataSetLike("id", [])).to.equal(false);

    expect(isDataSetLike("id", new DataSet())).to.equal(true);
    expect(isDataSetLike("ds", new DataSet())).to.equal(false);
    expect(isDataSetLike("ds", new DataSet({ fieldId: "ds" }))).to.equal(true);

    expect(isDataSetLike("id", new DataView(new DataSet()))).to.equal(false);
    expect(isDataSetLike("dv", new DataView(new DataSet()))).to.equal(false);
    expect(
      isDataSetLike("dv", new DataView(new DataSet({ fieldId: "dv" }))),
    ).to.equal(false);

    expect(isDataSetLike("id", createFakeDataSet("fds"))).to.equal(false);
    expect(isDataSetLike("fds", createFakeDataSet("fds"))).to.equal(true);

    expect(isDataSetLike("id", createFakeDataView("fdv"))).to.equal(false);
    expect(isDataSetLike("fdv", createFakeDataView("fdv"))).to.equal(false);
  });
});
