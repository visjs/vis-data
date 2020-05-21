import { expect } from "chai";
import { spy } from "sinon";

import { DataSet, DataView } from "../src";

interface Item {
  whoami: number;
  payload: string;
}

describe("Data view chaining events", function (): void {
  const data = [
    { whoami: 0, payload: "#0" },
    { whoami: 1, payload: "#1" },
    { whoami: 2, payload: "#2" },
    { whoami: 3, payload: "#3" },
    { whoami: 4, payload: "#4" },
    { whoami: 5, payload: "#5" },
    { whoami: 6, payload: "#6" },
    { whoami: 7, payload: "#7" },
    { whoami: 8, payload: "#8" },
    { whoami: 9, payload: "#9" },
  ];

  const spies = {
    ds: {
      "*": spy(),
      add: spy(),
      remove: spy(),
      update: spy(),
    },
    dv1: {
      "*": spy(),
      add: spy(),
      remove: spy(),
      update: spy(),
    },
    dv2: {
      "*": spy(),
      add: spy(),
      remove: spy(),
      update: spy(),
    },
    dv3: {
      "*": spy(),
      add: spy(),
      remove: spy(),
      update: spy(),
    },
  };

  // All items
  const ds = new DataSet<Item, "whoami">(data, { fieldId: "whoami" });

  // Only with ids < 9
  const dv1 = new DataView<Item, "whoami">(ds, {
    filter: (item): boolean => item.whoami < 9,
  });

  // Only with odd ids < 9
  const dv2 = new DataView<Item, "whoami">(dv1, {
    filter: (item): boolean => item.whoami % 2 !== 0,
  });

  // Only with ids that are odd and even at the same time (therefore empty)
  const dv3 = new DataView<Item, "whoami">(dv2, {
    filter: (item): boolean => item.whoami % 2 === 0,
  });

  it("do some before attachment mutations", function (): void {
    ds.add({ whoami: -41, payload: "#-41" });
    ds.update({ whoami: -41, payload: "new -41" });
    ds.remove(-41);
  });

  it("attach the spies", function (): void {
    // Attach the spies
    ds.on("*", spies.ds["*"]);
    ds.on("add", spies.ds["add"]);
    ds.on("remove", spies.ds["remove"]);
    ds.on("update", spies.ds["update"]);
    dv1.on("*", spies.dv1["*"]);
    dv1.on("add", spies.dv1["add"]);
    dv1.on("remove", spies.dv1["remove"]);
    dv1.on("update", spies.dv1["update"]);
    dv2.on("*", spies.dv2["*"]);
    dv2.on("add", spies.dv2["add"]);
    dv2.on("remove", spies.dv2["remove"]);
    dv2.on("update", spies.dv2["update"]);
    dv3.on("*", spies.dv3["*"]);
    dv3.on("add", spies.dv3["add"]);
    dv3.on("remove", spies.dv3["remove"]);
    dv3.on("update", spies.dv3["update"]);
  });

  it("mutate the data set", function (): void {
    // Mutate the data set
    ds.add({ whoami: 20, payload: "#20" }, "A1");
    ds.add([
      { whoami: -22, payload: "#-22" },
      { whoami: -21, payload: "#-21" },
    ]);
    ds.update({ whoami: -22, payload: "new -22" }, "U1");
    ds.update(
      [
        { whoami: 20, payload: "new 20" },
        { whoami: -21, payload: "new -21" },
        { whoami: -23, payload: "new -23" },
      ],
      "U2"
    );
    ds.remove(42, "this doesn‘t exist");
    ds.remove(-21);
    ds.remove([20, -22], "R2");
  });

  it("detach the spies", function (): void {
    ds.off("*", spies.ds["*"]);
    ds.off("add", spies.ds["add"]);
    ds.off("remove", spies.ds["remove"]);
    ds.off("update", spies.ds["update"]);
    dv1.off("*", spies.dv1["*"]);
    dv1.off("add", spies.dv1["add"]);
    dv1.off("remove", spies.dv1["remove"]);
    dv1.off("update", spies.dv1["update"]);
    dv2.off("*", spies.dv2["*"]);
    dv2.off("add", spies.dv2["add"]);
    dv2.off("remove", spies.dv2["remove"]);
    dv2.off("update", spies.dv2["update"]);
    dv3.off("*", spies.dv3["*"]);
    dv3.off("add", spies.dv3["add"]);
    dv3.off("remove", spies.dv3["remove"]);
    dv3.off("update", spies.dv3["update"]);
  });

  it("do some after detachment mutations", function (): void {
    ds.add({ whoami: -43, payload: "#-43" });
    ds.update({ whoami: -43, payload: "new -43" });
    ds.remove(-43);
  });

  describe("Data set", function (): void {
    describe("*", function (): void {
      it("should be called 7 times", function (): void {
        expect(spies.ds["*"].callCount).to.equal(7);
      });
      it("call #1", function (): void {
        expect(spies.ds["*"].getCall(0).args).to.deep.equal([
          "add",
          { items: [20] },
          "A1",
        ]);
      });
      it("call #2", function (): void {
        expect(spies.ds["*"].getCall(1).args).to.deep.equal([
          "add",
          { items: [-22, -21] },
          null,
        ]);
      });
      it("call #3", function (): void {
        expect(spies.ds["*"].getCall(2).args).to.deep.equal([
          "update",
          {
            items: [-22],
            data: [{ whoami: -22, payload: "new -22" }],
            oldData: [{ whoami: -22, payload: "#-22" }],
          },
          "U1",
        ]);
      });
      it("call #4", function (): void {
        expect(spies.ds["*"].getCall(3).args).to.deep.equal([
          "add",
          { items: [-23] },
          "U2",
        ]);
      });
      it("call #5", function (): void {
        expect(spies.ds["*"].getCall(4).args).to.deep.equal([
          "update",
          {
            items: [20, -21],
            data: [
              { whoami: 20, payload: "new 20" },
              { whoami: -21, payload: "new -21" },
            ],
            oldData: [
              { whoami: 20, payload: "#20" },
              { whoami: -21, payload: "#-21" },
            ],
          },
          "U2",
        ]);
      });
      it("call #6", function (): void {
        expect(spies.ds["*"].getCall(5).args).to.deep.equal([
          "remove",
          {
            items: [-21],
            oldData: [{ whoami: -21, payload: "new -21" }],
          },
          null,
        ]);
      });
      it("call #7", function (): void {
        expect(spies.ds["*"].getCall(6).args).to.deep.equal([
          "remove",
          {
            items: [20, -22],
            oldData: [
              { whoami: 20, payload: "new 20" },
              { whoami: -22, payload: "new -22" },
            ],
          },
          "R2",
        ]);
      });
    });

    describe("add", function (): void {
      it("should be called 3 times", function (): void {
        expect(spies.ds["add"].callCount).to.equal(3);
      });
      it("add #1 is * #1", function (): void {
        expect(spies.ds["add"].getCall(0).args).to.deep.equal(
          spies.ds["*"].getCall(0).args
        );
      });
      it("add #2 is * #2", function (): void {
        expect(spies.ds["add"].getCall(1).args).to.deep.equal(
          spies.ds["*"].getCall(1).args
        );
      });
      it("add #3 is * #4", function (): void {
        expect(spies.ds["add"].getCall(2).args).to.deep.equal(
          spies.ds["*"].getCall(3).args
        );
      });
    });

    describe("remove", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.ds["remove"].callCount).to.equal(2);
      });
      it("remove #1 is * #6", function (): void {
        expect(spies.ds["remove"].getCall(0).args).to.deep.equal(
          spies.ds["*"].getCall(5).args
        );
      });
      it("remove #2 is * #7", function (): void {
        expect(spies.ds["remove"].getCall(1).args).to.deep.equal(
          spies.ds["*"].getCall(6).args
        );
      });
    });

    describe("update", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.ds["update"].callCount).to.equal(2);
      });
      it("update #1 is * #3", function (): void {
        expect(spies.ds["update"].getCall(0).args).to.deep.equal(
          spies.ds["*"].getCall(2).args
        );
      });
      it("update #2 is * #5", function (): void {
        expect(spies.ds["update"].getCall(1).args).to.deep.equal(
          spies.ds["*"].getCall(4).args
        );
      });
    });
  });

  describe("Data view 1", function (): void {
    describe("*", function (): void {
      it("should be called 6 times", function (): void {
        expect(spies.dv1["*"].callCount).to.equal(6);
      });
      it("call #1", function (): void {
        expect(spies.dv1["*"].getCall(0).args).to.deep.equal([
          "add",
          { items: [-22, -21] },
          null,
        ]);
      });
      it("call #2", function (): void {
        expect(spies.dv1["*"].getCall(1).args).to.deep.equal([
          "update",
          {
            items: [-22],
            data: [{ whoami: -22, payload: "new -22" }],
            oldData: [{ whoami: -22, payload: "#-22" }],
          },
          "U1",
        ]);
      });
      it("call #3", function (): void {
        expect(spies.dv1["*"].getCall(2).args).to.deep.equal([
          "add",
          { items: [-23] },
          "U2",
        ]);
      });
      it("call #4", function (): void {
        expect(spies.dv1["*"].getCall(3).args).to.deep.equal([
          "update",
          {
            items: [-21],
            data: [{ whoami: -21, payload: "new -21" }],
            oldData: [{ whoami: -21, payload: "#-21" }],
          },
          "U2",
        ]);
      });
      it("call #5", function (): void {
        expect(spies.dv1["*"].getCall(4).args).to.deep.equal([
          "remove",
          {
            items: [-21],
            oldData: [{ whoami: -21, payload: "new -21" }],
          },
          null,
        ]);
      });
      it("call #6", function (): void {
        expect(spies.dv1["*"].getCall(5).args).to.deep.equal([
          "remove",
          {
            items: [-22],
            oldData: [{ whoami: -22, payload: "new -22" }],
          },
          "R2",
        ]);
      });
    });

    describe("add", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.dv1["add"].callCount).to.equal(2);
      });
      it("add #1 is * #1", function (): void {
        expect(spies.dv1["add"].getCall(0).args).to.deep.equal(
          spies.dv1["*"].getCall(0).args
        );
      });
      it("add #2 is * #3", function (): void {
        expect(spies.dv1["add"].getCall(1).args).to.deep.equal(
          spies.dv1["*"].getCall(2).args
        );
      });
    });

    describe("remove", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.dv1["remove"].callCount).to.equal(2);
      });
      it("remove #1 is * #5", function (): void {
        expect(spies.dv1["remove"].getCall(0).args).to.deep.equal(
          spies.dv1["*"].getCall(4).args
        );
      });
      it("remove #2 is * #6", function (): void {
        expect(spies.dv1["remove"].getCall(1).args).to.deep.equal(
          spies.dv1["*"].getCall(5).args
        );
      });
    });

    describe("update", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.dv1["update"].callCount).to.equal(2);
      });
      it("update #1 is * #2", function (): void {
        expect(spies.dv1["update"].getCall(0).args).to.deep.equal(
          spies.dv1["*"].getCall(1).args
        );
      });
      it("update #2 is * #4", function (): void {
        expect(spies.dv1["update"].getCall(1).args).to.deep.equal(
          spies.dv1["*"].getCall(3).args
        );
      });
    });
  });

  describe("Data view 2", function (): void {
    describe("*", function (): void {
      it("should be called 4 times", function (): void {
        expect(spies.dv2["*"].callCount).to.equal(4);
      });
      it("call #1", function (): void {
        expect(spies.dv2["*"].getCall(0).args).to.deep.equal([
          "add",
          { items: [-21] },
          null,
        ]);
      });
      it("call #2", function (): void {
        expect(spies.dv2["*"].getCall(1).args).to.deep.equal([
          "add",
          { items: [-23] },
          "U2",
        ]);
      });
      it("call #3", function (): void {
        expect(spies.dv2["*"].getCall(2).args).to.deep.equal([
          "update",
          {
            items: [-21],
            data: [{ whoami: -21, payload: "new -21" }],
            oldData: [{ whoami: -21, payload: "#-21" }],
          },
          "U2",
        ]);
      });
      it("call #4", function (): void {
        expect(spies.dv2["*"].getCall(3).args).to.deep.equal([
          "remove",
          {
            items: [-21],
            oldData: [{ whoami: -21, payload: "new -21" }],
          },
          null,
        ]);
      });
    });

    describe("add", function (): void {
      it("should be called 2 times", function (): void {
        expect(spies.dv2["add"].callCount).to.equal(2);
      });
      it("add #1 is * #1", function (): void {
        expect(spies.dv2["add"].getCall(0).args).to.deep.equal(
          spies.dv2["*"].getCall(0).args
        );
      });
      it("add #2 is * #2", function (): void {
        expect(spies.dv2["add"].getCall(1).args).to.deep.equal(
          spies.dv2["*"].getCall(1).args
        );
      });
    });

    describe("remove", function (): void {
      it("should be called 1 times", function (): void {
        expect(spies.dv2["remove"].callCount).to.equal(1);
      });
      it("remove #1 is * #4", function (): void {
        expect(spies.dv2["remove"].getCall(0).args).to.deep.equal(
          spies.dv2["*"].getCall(3).args
        );
      });
    });

    describe("update", function (): void {
      it("should be called 1 times", function (): void {
        expect(spies.dv2["update"].callCount).to.equal(1);
      });
      it("update #1 is * #3", function (): void {
        expect(spies.dv2["update"].getCall(0).args).to.deep.equal(
          spies.dv2["*"].getCall(2).args
        );
      });
    });
  });

  describe("Data view 3", function (): void {
    describe("*", function (): void {
      it("should be called 0 times", function (): void {
        expect(spies.dv3["*"].callCount).to.equal(0);
      });
    });

    describe("add", function (): void {
      it("should be called 0 times", function (): void {
        expect(spies.dv3["add"].callCount).to.equal(0);
      });
    });

    describe("remove", function (): void {
      it("should be called 0 times", function (): void {
        expect(spies.dv3["remove"].callCount).to.equal(0);
      });
    });

    describe("update", function (): void {
      it("should be called 0 times", function (): void {
        expect(spies.dv3["update"].callCount).to.equal(0);
      });
    });
  });
});
