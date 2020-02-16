import { expect } from "chai";

import { DataSet, DataView } from "../src";

interface Item {
  id: number;
}

describe("Data view dispose", function(): void {
  it("Disposed data view is unsubscribed and throws", function(): void {
    const ds = new DataSet<Item>([{ id: 1 }, { id: 2 }]);
    const dv = new DataView(ds);

    expect(ds.getIds().sort()).to.deep.equal([1, 2].sort());

    ds.add({ id: 3 });
    expect(ds.getIds().sort()).to.deep.equal([1, 2, 3].sort());

    dv.dispose();
    expect(
      (ds as any)._subscribers["*"],
      "Disposed data view should be unsubscribed from it's data set."
    ).to.have.lengthOf(0);
    expect((): void => {
      dv.getIds();
    }, "Disposed data view should always throw.").to.throw();
  });
});
