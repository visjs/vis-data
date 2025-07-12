import { expect } from "chai";
import { spy } from "sinon";

import { DataSet, DataView } from "../src";

interface Item {
  whoami: number;
  payload: { foo: string; bar: number };
}

describe("Data view chaining", function (): void {
  describe("DV3 → DV2 → DV1 → DS", function (): void {
    const data = [
      { whoami: 0, payload: { foo: "#0", bar: 0 } },
      { whoami: 1, payload: { foo: "#1", bar: 1 } },
      { whoami: 2, payload: { foo: "#2", bar: 2 } },
      { whoami: 3, payload: { foo: "#3", bar: 3 } },
      { whoami: 4, payload: { foo: "#4", bar: 4 } },
      { whoami: 5, payload: { foo: "#5", bar: 5 } },
      { whoami: 6, payload: { foo: "#6", bar: 6 } },
      { whoami: 7, payload: { foo: "#7", bar: 7 } },
      { whoami: 8, payload: { foo: "#8", bar: 8 } },
      { whoami: 9, payload: { foo: "#9", bar: 9 } },
    ];

    const ds = new DataSet<Item, "whoami">(data, { fieldId: "whoami" });
    const dv1 = new DataView<Item, "whoami">(ds, {
      filter: (item): boolean => item.whoami < 9,
    });
    const dv2 = new DataView<Item, "whoami">(dv1, {
      filter: (item): boolean => item.whoami % 2 !== 0,
    });
    const dv3 = new DataView<Item, "whoami">(dv2, {
      filter: (item): boolean => item.whoami % 2 === 0,
    });

    it(".length", function (): void {
      expect(ds.length, "Data set").to.equal(10);
      expect(dv1.length, "Data view 1").to.equal(9);
      expect(dv2.length, "Data view 2").to.equal(4);
      expect(dv3.length, "Data view 3").to.equal(0);
    });

    it(".getIds", function (): void {
      expect(
        ds.getIds(),
        "The data set should contain all 10 items.",
      ).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(
        dv1.getIds(),
        "The 1st data view should filter item.whoami < 9.",
      ).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(
        dv2.getIds(),
        "The 2nd data view should get only odd ids from the 1st data view.",
      ).to.deep.equal([1, 3, 5, 7]);
      expect(
        dv3.getIds(),
        "The 3rd data view should get even ids from the 2nd data view (there are none).",
      ).to.deep.equal([]);
    });

    it(".get", function (): void {
      expect(ds.get(3), "Data set").to.deep.equal(data[3]);
      expect(dv1.get(3), "Data view 1").to.deep.equal(data[3]);
      expect(dv2.get(3), "Data view 2").to.deep.equal(data[3]);
      expect(dv3.get(3), "Data view 3").to.be.null;
    });

    it(".getDataSet", function (): void {
      expect(ds.getDataSet(), "Data set").to.equal(ds);
      expect(dv1.getDataSet(), "Data view 1").to.equal(ds);
      expect(dv2.getDataSet(), "Data view 2").to.equal(ds);
      expect(dv3.getDataSet(), "Data view 3").to.equal(ds);
    });

    it(".forEach", function (): void {
      const spyDS = spy();
      const spyDV1 = spy();
      const spyDV2 = spy();
      const spyDV3 = spy();

      ds.forEach(spyDS);
      expect(spyDS.callCount, "Data set").to.equal(10);

      dv1.forEach(spyDV1);
      expect(spyDV1.callCount, "Data view 1").to.equal(9);

      dv2.forEach(spyDV2);
      expect(spyDV2.callCount, "Data view 2").to.equal(4);

      dv3.forEach(spyDV3);
      expect(spyDV3.callCount, "Data view 3").to.equal(0);
    });

    it(".map", function (): void {
      const convert = (item: Item): string => item.payload.foo;
      const spyDS = spy(convert);
      const spyDV1 = spy(convert);
      const spyDV2 = spy(convert);
      const spyDV3 = spy(convert);

      const dsResult = ds.map(spyDS);
      expect(spyDS.callCount, "Data set").to.equal(10);
      expect(dsResult, "Data set").to.deep.equal([
        "#0",
        "#1",
        "#2",
        "#3",
        "#4",
        "#5",
        "#6",
        "#7",
        "#8",
        "#9",
      ]);

      const dv1Result = dv1.map(spyDV1);
      expect(spyDV1.callCount, "Data view 1").to.equal(9);
      expect(dv1Result, "Data view 1").to.deep.equal([
        "#0",
        "#1",
        "#2",
        "#3",
        "#4",
        "#5",
        "#6",
        "#7",
        "#8",
      ]);

      const dv2Result = dv2.map(spyDV2);
      expect(spyDV2.callCount, "Data view 2").to.equal(4);
      expect(dv2Result, "Data view 2").to.deep.equal(["#1", "#3", "#5", "#7"]);

      const dv3Result = dv3.map(spyDV3);
      expect(spyDV3.callCount, "Data view 3").to.equal(0);
      expect(dv3Result, "Data view 3").to.deep.equal([]);
    });
  });
});
