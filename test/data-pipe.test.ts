import { expect } from "chai";

import { DataSet } from "../src";
import { DataPipe, createNewDataPipeFrom } from "../src/data-pipe";

interface Item1 {
  whoami: string;
  enabled: boolean;
  bar: number;
  vis: Item2;
}
interface Item2 {
  myId: number;
  foo: string;
  updated: string;
}

const generateItem = (index: number, updated = "no"): Item1 =>
  Object.freeze({
    whoami: String.fromCharCode(64 + index),
    enabled: index % 3 !== 0,
    bar: index,
    vis: Object.freeze({
      myId: index,
      foo: String.fromCharCode(96 + index),
      updated
    })
  });

const skippedItem: (index: 3 | 6 | 9, updated?: string) => Item1 = generateItem;
const pipedItem: (
  index: 1 | 2 | 4 | 5 | 7 | 8 | 10 | 11,
  updated?: string
) => Item1 = generateItem;

type Config = {
  name: string;
  expected: Item2[];
  message: string;
  operation(
    ds1: DataSet<Item1, "whoami">,
    pipe: DataPipe,
    ds2: DataSet<Item2, "myId">
  ): void;
};

describe("Data Pipe", function(): void {
  describe("Filter and map", function(): void {
    const configs: Config[] = [
      {
        name: "Not even started",
        expected: [],
        message: "No items should be added before the pipe is started",
        operation(ds1): void {
          ds1.add(skippedItem(6));
          ds1.add(pipedItem(7));
          ds1.add(pipedItem(8));
        }
      },
      {
        name: "Adding",
        expected: [pipedItem(7).vis, pipedItem(8).vis],
        message: "Only changes after the pipe was started should be processed",
        operation(ds1, pipe): void {
          pipe.start();
          ds1.add([skippedItem(6), pipedItem(7), pipedItem(8)]);
        }
      },
      {
        name: "Updating",
        expected: [pipedItem(1, "updated").vis, pipedItem(2, "updated").vis],
        message: "Updated items should be created if they didn't exist before",
        operation(ds1, pipe): void {
          pipe.start();
          ds1.update([
            pipedItem(1, "updated"),
            pipedItem(2, "updated"),
            skippedItem(3, "updated")
          ]);
        }
      },
      {
        name: "Removing",
        expected: [pipedItem(8).vis],
        message: "Updated items should be created if they didn't exist before",
        operation(ds1, pipe, ds2): void {
          pipe.start();

          ds1.add([skippedItem(6), pipedItem(7), pipedItem(8)]);
          expect(
            ds2.length,
            "Items should have been piped into the second data set by now"
          ).to.equal(2);
          ds1.remove([skippedItem(6), pipedItem(7)]);
        }
      },
      {
        name: "Piping all the data",
        expected: [pipedItem(1).vis, pipedItem(2).vis, pipedItem(4).vis],
        message: "All the data present in the source data set should be piped",
        operation(_ds1, pipe): void {
          pipe.all();
        }
      },
      {
        name: "Stopping",
        expected: [pipedItem(7).vis, pipedItem(8).vis],
        message: "All changes should be ignored if the pipe was stopped",
        operation(ds1, pipe): void {
          pipe.start();
          ds1.add([skippedItem(6), pipedItem(7), pipedItem(8)]);

          pipe.stop();
          ds1.add([skippedItem(9), pipedItem(10), pipedItem(11)]);
          ds1.update([skippedItem(6, "updated"), pipedItem(7, "updated")]);
          ds1.remove([skippedItem(6, "updated"), pipedItem(7, "updated")]);
        }
      },
      {
        name: "All combined",
        expected: [
          pipedItem(2, "updated").vis,
          pipedItem(4).vis,
          pipedItem(5).vis,
          pipedItem(7).vis,
          pipedItem(10, "updated").vis
        ],
        message: "This should work",
        operation(ds1, pipe): void {
          pipe
            .start()
            .stop()
            .all()
            .start();
          ds1.add([pipedItem(5), skippedItem(6), pipedItem(7)]);
          ds1.remove(pipedItem(1));
          ds1.update([pipedItem(2, "updated"), skippedItem(3, "updated")]);

          pipe.stop();
          ds1.remove([pipedItem(5), skippedItem(6), pipedItem(7)]);
          ds1.add([pipedItem(8), skippedItem(9), pipedItem(10)]);

          pipe.start();
          ds1.update([skippedItem(9, "updated"), pipedItem(10, "updated")]);
        }
      }
    ];

    configs.forEach(({ expected, message, name, operation }): void => {
      it(name, function(): void {
        const ds1 = new DataSet<Item1, "whoami">(
          [pipedItem(1), pipedItem(2), skippedItem(3), pipedItem(4)],
          { fieldId: "whoami" }
        );

        const ds2 = new DataSet<Item2, "myId">([], { fieldId: "myId" });

        const pipe = createNewDataPipeFrom(ds1)
          .filter((item): boolean => item.enabled === true)
          .map<Item2, "myId">((item): Item2 => item.vis)
          .to(ds2);

        operation(ds1, pipe, ds2);

        expect(ds2.get(), message).to.deep.equal(expected);
      });
    });
  });

  it("FlatMap", function(): void {
    const ds1 = new DataSet<Item1, "whoami">(
      [pipedItem(1), pipedItem(2), skippedItem(3), pipedItem(4)],
      { fieldId: "whoami" }
    );

    const ds2 = new DataSet<Item2, "myId">([], { fieldId: "myId" });

    const pipe = createNewDataPipeFrom(ds1)
      .flatMap<Item2, "myId">((item): Item2[] =>
        item.vis.myId % 3 === 0
          ? []
          : [item.vis, { ...item.vis, myId: -item.vis.myId }]
      )
      .to(ds2);

    pipe.all().start();

    ds1.add([pipedItem(5), skippedItem(6)]);
    ds1.update([pipedItem(2, "updated"), skippedItem(3, "updated")]);
    ds1.remove(pipedItem(4));

    expect(
      ds2.get(),
      "Unexpected items found, expected missing or corrupted"
    ).to.deep.equal([
      pipedItem(1).vis,
      { ...pipedItem(1).vis, myId: -1 },

      pipedItem(2, "updated").vis,
      { ...pipedItem(2, "updated").vis, myId: -2 },

      pipedItem(5).vis,
      { ...pipedItem(5).vis, myId: -5 }
    ]);
  });
});
