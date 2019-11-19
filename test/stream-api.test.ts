import { expect } from "chai";
import { spy, stub } from "sinon";

import { DataSet, DataStream, DataView } from "../src";
import { Id } from "../src/data-interface";

interface CreateDataStreamRet<Item> {
  stream: DataStream<Item>;
  update: (id: Id, item: Item) => void;
  pop: () => void;
}

const pairById = ([a]: [Id, any], [b]: [Id, any]): number =>
  `${a}`.localeCompare(`${b}`);
const itemById = ({ id: a }: { id: Id }, { id: b }: { id: Id }): number =>
  `${a}`.localeCompare(`${b}`);

const testStreamAPI = function(
  createDataStream: <Item extends { id: number }>(
    data: readonly [Id, Item][]
  ) => CreateDataStreamRet<Item>
): void {
  /* eslint-disable-next-line require-jsdoc */
  function testReuse<T extends { id: number }>({
    data,
    updateArgs,
    streamCallback,
    valueCallback
  }: {
    data: [Id, T][];
    updateArgs?: [Id, T];
    streamCallback?: (stream: DataStream<T>) => DataStream<unknown>;
    valueCallback?: (stream: DataStream<T>) => unknown;
  }): void {
    describe("Reuse", function(): void {
      if (streamCallback) {
        it("Double iteration", function(): void {
          const { stream } = createDataStream(data);

          const stream2 = streamCallback(stream);
          const first = [...stream2];
          const second = [...stream2];

          expect(
            [...stream],
            "The original stream shouldn’t be used up."
          ).to.have.lengthOf(data.length);
          expect(
            second.length,
            "The processed stream shouldn’t be used up."
          ).to.equal(first.length);
        });

        it("Reiteration after data removals", function(): void {
          const { stream, pop } = createDataStream(data);
          const stream2 = streamCallback(stream);

          let prev = [...stream2].length;

          for (let i = 0; i < data.length; ++i) {
            pop();
            const curr = [...stream2].length;
            expect(curr).to.be.most(prev);
            prev = curr;
          }

          expect(prev).to.be.equal(0);
        });

        it("Reiteration after data update", function(): void {
          const { stream, update, pop } = createDataStream(data);
          const stream2 = streamCallback(stream);

          const before = [...stream2];
          if (updateArgs) {
            update(...updateArgs);
          } else {
            pop();
          }
          const after = [...stream2];

          // Warning: the updateArgs content has to change the callback return value.
          expect(
            after,
            "If the source is changed the stream should work with the new data."
          ).to.not.deep.equal(before);
        });
      } else if (valueCallback) {
        it("Multiple calls on the same stream", function(): void {
          const { stream } = createDataStream(data);

          const first = valueCallback(stream);
          const second = valueCallback(stream);

          expect(
            [...stream],
            "The original stream shouldn’t be used up."
          ).to.have.lengthOf(data.length);
          expect(
            second,
            "The processed streams should return equal values."
          ).to.deep.equal(first);
        });
      } else {
        it("This should never happen.", function(): void {
          expect.fail("This is an error in the test spec.");
        });
      }
    });
  }

  describe("Iterator", function(): void {
    describe("Convert to an array", function(): void {
      it("Empty", function(): void {
        const { stream } = createDataStream([]);
        expect([...stream]).to.deep.equal([]);
      });

      it("With data", function(): void {
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
        expect([...stream]).to.deep.equal([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
      });

      it("Two times with data", function(): void {
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
        expect([...stream]).to.deep.equal([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
        expect([...stream]).to.deep.equal([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
      });
    });

    describe("Iterate (for..of)", function(): void {
      it("Empty", function(): void {
        const fofSpy = spy();
        const { stream } = createDataStream([] as any);
        for (const pair of stream) {
          fofSpy(pair);
        }
        expect(fofSpy.callCount).to.equal(0);
      });

      it("With data", function(): void {
        const fofSpy = spy();
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        for (const pair of stream) {
          fofSpy(pair);
        }

        expect(fofSpy.callCount).to.equal(2);

        expect(
          fofSpy.getCalls().map((call): any => call.args[0])
        ).to.deep.equal([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
      });

      it("Two times with data", function(): void {
        const fofSpy = spy();
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        for (const pair of stream) {
          fofSpy(pair);
        }
        for (const pair of stream) {
          fofSpy(pair);
        }

        expect(fofSpy.callCount).to.equal(4);

        expect(
          fofSpy.getCalls().map((call): any => call.args[0])
        ).to.deep.equal([
          [7, { id: 7 }],
          [10, { id: 10 }],
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
      });
    });
  });

  describe("Conversions", function(): void {
    it("Id Array", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const idArray = stream.toIdArray();

      expect(idArray, "An array should be returned.").to.be.an("array");
      expect(
        idArray,
        "All ids should be included in the array."
      ).to.have.lengthOf(4);
      expect(idArray.sort()).to.deep.equal([3, 7, 10, 13].sort());
    });

    it("Item Array", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const itemArray = stream.toItemArray();

      expect(itemArray, "An array should be returned.").to.be.an("array");
      expect(
        itemArray,
        "All items should be included in the array."
      ).to.have.lengthOf(4);
      expect(itemArray.sort(itemById)).to.deep.equal(
        [{ id: 3 }, { id: 7 }, { id: 10 }, { id: 13 }].sort(itemById)
      );
    });

    it("Entry Array", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const entryArray = stream.toEntryArray();

      expect(entryArray, "An array should be returned.").to.be.an("array");
      expect(
        entryArray,
        "All items should be included in the array."
      ).to.have.lengthOf(4);
      expect(entryArray.sort(pairById)).to.deep.equal(
        [
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ].sort(pairById as any)
      );
    });

    it("Object map", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const map = stream.toObjectMap();

      expect(
        Object.getPrototypeOf(map),
        "An object should be returned."
      ).to.equal(null);
      expect(
        Object.keys(map),
        "All items should be included in the map."
      ).to.have.lengthOf(4);
      expect(
        Object.values(map),
        "All items should be included in the map."
      ).to.have.lengthOf(4);
      expect(Object.keys(map).sort()).to.deep.equal(
        ["3", "7", "10", "13"].sort()
      );
      expect(Object.values(map).sort(itemById)).to.deep.equal(
        [{ id: 3 }, { id: 7 }, { id: 10 }, { id: 13 }].sort(itemById)
      );
    });

    it("Map", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const map = stream.toMap();

      expect(map, "A Map instance should be returned.").to.instanceof(Map);
      expect(map, "All items should be included in the map.").to.have.lengthOf(
        4
      );
      expect([...map.entries()].sort(pairById)).to.deep.equal(
        [
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ].sort(pairById as any)
      );
    });

    it("Id Set", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const idSet = stream.toIdSet();

      expect(idSet, "A Set instance should be returned.").to.instanceof(Set);
      expect(idSet, "All ids should be included in the set.").to.have.lengthOf(
        4
      );
      expect([...idSet.values()].sort()).to.deep.equal([3, 7, 10, 13].sort());
    });

    it("Item Set", function(): void {
      const { stream } = createDataStream([
        [3, { id: 3 }],
        [7, { id: 7 }],
        [10, { id: 10 }],
        [13, { id: 13 }]
      ]);

      const itemSet = stream.toItemSet();

      expect(itemSet, "A Set instance should be returned.").to.instanceof(Set);
      expect(
        itemSet,
        "All items should be included in the set."
      ).to.have.lengthOf(4);
      expect([...itemSet.values()].sort(itemById)).to.deep.equal(
        [{ id: 3 }, { id: 7 }, { id: 10 }, { id: 13 }].sort(itemById)
      );
    });
  });

  describe("Methods", function(): void {
    describe("Cache", function(): void {
      it("Simple test", function(): void {
        const { stream } = createDataStream([
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ]);

        const cached = stream.cache();

        expect([...stream]).to.deep.equal([
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ]);
        expect([...cached]).to.deep.equal([
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ]);
      });

      it("Data removal", function(): void {
        const { stream, pop } = createDataStream([
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ]);

        const cached = stream.cache();

        pop();
        pop();

        expect([...stream]).to.have.lengthOf(2);
        expect([...cached]).to.deep.equal([
          [3, { id: 3 }],
          [7, { id: 7 }],
          [10, { id: 10 }],
          [13, { id: 13 }]
        ]);
      });

      it("Data update", function(): void {
        const { stream, update } = createDataStream([
          [3, { id: 3, value: 3 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: 13 }]
        ]);

        const cached = stream.cache();

        update(3, { id: 3, value: -3 });
        update(13, { id: 13, value: -13 });

        expect([...stream]).to.deep.equal([
          [3, { id: 3, value: -3 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: -13 }]
        ]);
        expect([...cached]).to.deep.equal([
          [3, { id: 3, value: 3 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: 13 }]
        ]);
      });
    });

    describe("Distinct", function(): void {
      it("No items", function(): void {
        const distinctStub = stub();
        distinctStub.throws("This should never be called.");

        const { stream } = createDataStream([]);

        const result = stream.distinct(distinctStub);
        expect(result, "Distinct should return a set.").to.be.instanceof(Set);
        expect([...result]).to.deep.equal([]);
      });

      it("4 items (2 distinct values)", function(): void {
        const distinctStub = stub();
        distinctStub.withArgs({ id: 3, value: 10 }, 3).returns(10);
        distinctStub.withArgs({ id: 7, value: 7 }, 7).returns(7);
        distinctStub.withArgs({ id: 10, value: 10 }, 10).returns(10);
        distinctStub.withArgs({ id: 13, value: 10 }, 13).returns(10);
        distinctStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [3, { id: 3, value: 10 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: 10 }]
        ]);

        const result = stream.distinct(distinctStub);
        expect(result, "Distinct should return a set.").to.be.instanceof(Set);
        expect([...result].sort()).to.deep.equal([7, 10].sort());
      });

      testReuse({
        data: [
          [3, { id: 3, value: 10 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: 10 }]
        ],
        updateArgs: [10, { id: 10, value: 42 }],
        valueCallback: (stream): any =>
          stream.distinct((item): number => item.value)
      });
    });

    describe("Filter", function(): void {
      it("Simple test", function(): void {
        const filterStub = stub();
        filterStub.withArgs({ id: 7 }, 7).returns(true);
        filterStub.withArgs({ id: 10 }, 10).returns(false);
        filterStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect([...stream.filter(filterStub)]).to.deep.equal([[7, { id: 7 }]]);
      });

      testReuse({
        data: [
          [3, { id: 3, include: false }],
          [4, { id: 4, include: true }],
          [5, { id: 5, include: false }],
          [6, { id: 6, include: true }]
        ],
        updateArgs: [6, { id: 6, include: false }],
        streamCallback: (stream): any =>
          stream.filter((item): boolean => item.include)
      });
    });

    describe("For Each", function(): void {
      it("Simple test", function(): void {
        const forEachSpy = spy();

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);
        stream.forEach(forEachSpy);

        expect(
          forEachSpy.getCalls().map((call): any => call.args)
        ).to.deep.equal([
          [{ id: 7 }, 7],
          [{ id: 10 }, 10]
        ]);
      });

      testReuse({
        data: [
          [3, { id: 3 }],
          [4, { id: 4 }],
          [5, { id: 5 }],
          [6, { id: 6 }]
        ],
        valueCallback: (stream): any => {
          const forEachSpy = spy();
          stream.forEach(forEachSpy);
          return forEachSpy.callCount;
        }
      });
    });

    describe("Keys (Get Ids)", function(): void {
      it("Simple test", function(): void {
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect([...stream.keys()]).to.deep.equal([7, 10]);
      });

      testReuse({
        data: [
          [3, { id: 3 }],
          [4, { id: 4 }],
          [5, { id: 5 }],
          [6, { id: 6 }]
        ],
        valueCallback: (stream): any => [...stream.keys()]
      });
    });

    describe("Values (Get Items)", function(): void {
      it("Simple test", function(): void {
        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect([...stream.values()]).to.deep.equal([{ id: 7 }, { id: 10 }]);
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: -5 }],
        valueCallback: (stream): any => [...stream.values()]
      });
    });

    describe("Map", function(): void {
      it("Simple test", function(): void {
        const mapStub = stub();
        mapStub.withArgs({ id: 7 }, 7).returns(7);
        mapStub.withArgs({ id: 10 }, 10).returns(10);
        mapStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect([...stream.map(mapStub)]).to.deep.equal([
          [7, 7],
          [10, 10]
        ]);
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: -5 }],
        streamCallback: (stream): any =>
          stream.map((item): number => item.value)
      });
    });

    describe("Max", function(): void {
      it("No items", function(): void {
        const maxStub = stub();
        maxStub.throws("This should never be called.");

        const { stream } = createDataStream([]);

        expect(stream.max(maxStub)).to.equal(null);
      });

      it("2 items", function(): void {
        const maxStub = stub();
        maxStub.withArgs({ id: 7 }, 7).returns(7);
        maxStub.withArgs({ id: 10 }, 10).returns(10);
        maxStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect(stream.max(maxStub)).to.deep.equal({ id: 10 });
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: 55 }],
        valueCallback: (stream): any => stream.max((item): number => item.value)
      });
    });

    describe("Min", function(): void {
      it("No items", function(): void {
        const minStub = stub();
        minStub.throws("This should never be called.");

        const { stream } = createDataStream([]);

        expect(stream.min(minStub)).to.equal(null);
      });

      it("2 items", function(): void {
        const minStub = stub();
        minStub.withArgs({ id: 7 }, 7).returns(7);
        minStub.withArgs({ id: 10 }, 10).returns(10);
        minStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect(stream.min(minStub)).to.deep.equal({ id: 7 });
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: -5 }],
        valueCallback: (stream): any => stream.min((item): number => item.value)
      });
    });

    describe("Reduce", function(): void {
      it("Simple test", function(): void {
        const reduceStub = stub();
        reduceStub.withArgs(0, { id: 7 }, 7).returns(1);
        reduceStub.withArgs(1, { id: 10 }, 10).returns(2);
        reduceStub.throws("Invalid callback input.");

        const { stream } = createDataStream([
          [7, { id: 7 }],
          [10, { id: 10 }]
        ]);

        expect(stream.reduce(reduceStub, 0)).to.equal(2);
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: -5 }],
        valueCallback: (stream): any =>
          stream.reduce((acc, item): number => acc + item.value, 0)
      });
    });

    describe("Sort", function(): void {
      it("No items", function(): void {
        const sortSpy = spy();

        const { stream } = createDataStream([]);

        expect([...stream.sort(sortSpy)]).to.deep.equal([]);
        expect(
          sortSpy.callCount,
          "There are no items, so the callback shouldn‘t be called."
        ).to.equal(0);
      });

      it("8 sorted items", function(): void {
        const { stream } = createDataStream([
          [1, { id: 1 }],
          [2, { id: 2 }],
          [3, { id: 3 }],
          [4, { id: 4 }],
          [5, { id: 5 }],
          [6, { id: 6 }],
          [7, { id: 7 }],
          [8, { id: 8 }]
        ]);

        expect([
          ...stream.sort((_a, _b, idA, idB): number => +idA - +idB)
        ]).to.deep.equal([
          [1, { id: 1 }],
          [2, { id: 2 }],
          [3, { id: 3 }],
          [4, { id: 4 }],
          [5, { id: 5 }],
          [6, { id: 6 }],
          [7, { id: 7 }],
          [8, { id: 8 }]
        ]);
      });

      it("14 unsorted items", function(): void {
        const { stream } = createDataStream([
          [1, { value: Math.PI, id: 1 }],
          [12, { value: 0, id: 12 }],
          [6, { value: 6, id: 6 }],
          [11, { value: 0, id: 11 }],
          [9, { value: Number.MAX_SAFE_INTEGER, id: 9 }],
          [14, { value: Number.MAX_VALUE, id: 14 }],
          [7, { value: 20, id: 7 }],
          [2, { value: 3, id: 2 }],
          [3, { value: 3, id: 3 }],
          [4, { value: -12, id: 4 }],
          [10, { value: Number.MIN_SAFE_INTEGER, id: 10 }],
          [5, { value: 43, id: 5 }],
          [13, { value: Number.MIN_VALUE, id: 13 }],
          [8, { value: 1, id: 8 }]
        ]);

        expect([
          ...stream.sort(
            (a, b, idA, idB): number => a.value - b.value || +idA - +idB
          )
        ]).to.deep.equal([
          [10, { value: Number.MIN_SAFE_INTEGER, id: 10 }],
          [4, { value: -12, id: 4 }],
          [11, { value: 0, id: 11 }],
          [12, { value: 0, id: 12 }],
          [13, { value: Number.MIN_VALUE, id: 13 }],
          [8, { value: 1, id: 8 }],
          [2, { value: 3, id: 2 }],
          [3, { value: 3, id: 3 }],
          [1, { value: Math.PI, id: 1 }],
          [6, { value: 6, id: 6 }],
          [7, { value: 20, id: 7 }],
          [5, { value: 43, id: 5 }],
          [9, { value: Number.MAX_SAFE_INTEGER, id: 9 }],
          [14, { value: Number.MAX_VALUE, id: 14 }]
        ]);
      });

      testReuse({
        data: [
          [3, { id: 3, value: 3 }],
          [4, { id: 4, value: 4 }],
          [5, { id: 5, value: 5 }],
          [6, { id: 6, value: 6 }]
        ],
        updateArgs: [5, { id: 5, value: -5 }],
        streamCallback: (stream): any =>
          stream.sort((a, b): number => a.value - b.value)
      });
    });
  });

  describe("Combinations", function(): void {
    it("Filter → Map → Reduce", function(): void {
      const reduceStub = stub();
      reduceStub.withArgs(0, { id: 7 }, 7).returns(1);
      reduceStub.withArgs(1, { id: 10 }, 10).returns(2);
      reduceStub.throws("Invalid callback input.");

      const { stream } = createDataStream([
        [7, { id: 7 }],
        [13, { id: 13 }],
        [10, { id: 10 }],
        [3, { id: 3 }]
      ]);
      const filteredSum = stream
        .filter((_, id): boolean => +id % 2 !== 0)
        .map((item): number => item.id)
        .reduce((acc, val): number => acc + val, 0);

      expect(filteredSum).to.equal(23);
    });

    testReuse({
      data: [
        [3, { id: 3, value: 3 }],
        [4, { id: 4, value: 4 }],
        [5, { id: 5, value: 5 }],
        [6, { id: 6, value: 6 }]
      ],
      updateArgs: [5, { id: 5, value: -5 }],
      valueCallback: (stream): any =>
        stream
          .filter((item): boolean => item.value > 2)
          .map((item): number => item.value)
          .reduce((acc, val): number => acc + val, 0)
    });
  });
};

describe("Stream API", function(): void {
  describe("Data Stream", function(): void {
    testStreamAPI(
      <Item>(data: readonly [Id, Item][]): CreateDataStreamRet<Item> => {
        const streamData = data.slice();
        return {
          stream: new DataStream(streamData),
          update: (id, item): void => {
            streamData.splice(
              streamData.findIndex((pair): boolean => pair[0] === id),
              1,
              [id, item]
            );
          },
          pop: (): void => {
            streamData.pop();
          }
        };
      }
    );
  });

  describe("Data Set", function(): void {
    testStreamAPI(
      <Item>(data: readonly [Id, Item][]): CreateDataStreamRet<Item> => {
        const ds = new DataSet(data.map((pair): Item => pair[1]));
        return {
          stream: ds.stream(),
          update: (_, item: any): void => {
            ds.updateOnly(item);
          },
          pop: (): void => {
            const id = ds.getIds()[0];
            if (id != null) {
              ds.remove(id);
            }
          }
        };
      }
    );
  });

  describe("Data View", function(): void {
    testStreamAPI(
      <Item>(data: readonly [Id, Item][]): CreateDataStreamRet<Item> => {
        const ids = new Set(data.map(([id]): Id => id));
        const dsData = data.map(([, Item]): Item => Item);

        let id = Number.MIN_SAFE_INTEGER + 500;
        for (let i = 0; i < 6; ++i) {
          while (ids.has(++id)) {
            // Find the next free id.
          }

          dsData.push({
            id,
            dataSetOnly: "This should never appear in the data view."
          } as any);
        }

        const ds = new DataSet(dsData);
        const dv = new DataView(ds, {
          filter: (item): boolean => !(item as any).dataSetOnly
        });

        return {
          stream: dv.stream(),
          update: (_, item: any): void => {
            ds.updateOnly(item);
          },
          pop: (): void => {
            const id = dv.getIds()[0];
            if (id != null) {
              ds.remove(id);
            }
          }
        };
      }
    );
  });

  describe("Chained Data View", function(): void {
    testStreamAPI(
      <Item>(data: readonly [Id, Item][]): CreateDataStreamRet<Item> => {
        const ids = new Set(data.map(([id]): Id => id));
        const dsData = data.map(([, Item]): Item => Item);

        let id = Number.MIN_SAFE_INTEGER + 500;
        for (let i = 0; i < 6; ++i) {
          while (ids.has(++id)) {
            // Find the next free id.
          }

          dsData.push({
            id,
            dataSetOnly: "This should never appear in any data view."
          } as any);
        }
        for (let i = 0; i < 6; ++i) {
          while (ids.has(++id)) {
            // Find the next free id.
          }

          dsData.unshift({
            id,
            dataView1Only: "This should never appear in the data view."
          } as any);
        }

        const ds = new DataSet(dsData);
        const dv1 = new DataView(ds, {
          filter: (item): boolean => !(item as any).dataSetOnly
        });
        const dv2 = new DataView(dv1, {
          filter: (item): boolean => !(item as any).dataView1Only
        });

        return {
          stream: dv2.stream(),
          update: (_, item: any): void => {
            ds.updateOnly(item);
          },
          pop: (): void => {
            const id = dv2.getIds()[0];
            if (id != null) {
              ds.remove(id);
            }
          }
        };
      }
    );
  });
});
