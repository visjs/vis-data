import { expect } from "chai";

import { DataSet, DataView } from "../src";

describe("Data part edge cases", function(): void {
  const ds = new DataSet([]);
  const dv = new DataView(ds);
  [
    { name: "Data set", dp: ds },
    { name: "Data view", dp: dv }
  ].forEach(({ name, dp }): void => {
    describe(name, function(): void {
      it("trigger *", function(): void {
        expect((): void => {
          (dp as any)._trigger("*", {});
        }, "It shoudn‘t be possible to trigger * event.").to.throw();
      });

      it("on/off with falsy invalid callback", function(): void {
        dp.on("add", false as any);
        expect((): void => {
          (dp as any)._trigger("add", {});
        }, "Invalid callbacks shoudn‘t be called.").to.not.throw();
        dp.off("add", false as any);
      });

      it("on/off with truthy invalid callback", function(): void {
        const callback = Symbol("Invalid callback");
        dp.on("add", callback as any);
        expect((): void => {
          (dp as any)._trigger("add", {});
        }, "Invalid callbacks shoudn‘t be called.").to.not.throw();
        dp.off("add", callback as any);
      });

      it("off with not registered callback", function(): void {
        expect((): void => {
          dp.off("add", (): void => {});
        }, "Callbacks that are not registered shoudn‘t cause problems.").to.not.throw();
      });

      it("callbacks shoudn’t have access to this", function(): void {
        dp.on("add", function(this: any): void {
          expect(this).to.be.undefined;
        });
        (dp as any)._trigger("add", {});
      });
    });
  });
});
