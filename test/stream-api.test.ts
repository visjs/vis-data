import { expect } from 'chai'
import { spy, stub } from 'sinon'

import { DataSet, DataStream, DataView } from '../src'
import { Id } from '../src/data-interface'

const testStreamAPI = function(
  createDataStream: <Item extends { id: number }>(data: [Id, Item][]) => DataStream<Item>
): void {
  describe('Iterator', function(): void {
    describe('Convert to an array', function(): void {
      it('Empty', function(): void {
        const stream = createDataStream([])
        expect([...stream]).to.deep.equal([])
      })

      it('With data', function(): void {
        const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])
        expect([...stream]).to.deep.equal([{ id: 7 }, { id: 10 }])
      })
    })

    describe('Iterate (for..of)', function(): void {
      it('Empty', function(): void {
        const fofSpy = spy()
        const stream = createDataStream([] as any)
        for (const item of stream) {
          fofSpy(item)
        }
        expect(fofSpy.callCount).to.equal(0)
      })

      it('With data', function(): void {
        const fofSpy = spy()
        const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

        for (const item of stream) {
          fofSpy(item)
        }

        expect(fofSpy.callCount).to.equal(2)

        expect(fofSpy.getCalls().map((call): any => call.args[0])).to.deep.equal([
          { id: 7 },
          { id: 10 },
        ])
      })
    })
  })

  describe('Methods', function(): void {
    describe('Distinct', function(): void {
      it('No items', function(): void {
        const distinctStub = stub()
        distinctStub.throws('This should never be called.')

        const stream = createDataStream([])

        const result = stream.distinct(distinctStub)
        expect(result, 'Distinct should return a set.').to.be.instanceof(Set)
        expect([...result]).to.deep.equal([])
      })

      it('4 items (2 distinct values)', function(): void {
        const distinctStub = stub()
        distinctStub.withArgs({ id: 3, value: 10 }, 3).returns(10)
        distinctStub.withArgs({ id: 7, value: 7 }, 7).returns(7)
        distinctStub.withArgs({ id: 10, value: 10 }, 10).returns(10)
        distinctStub.withArgs({ id: 13, value: 10 }, 13).returns(10)
        distinctStub.throws('Invalid callback input.')

        const stream = createDataStream([
          [3, { id: 3, value: 10 }],
          [7, { id: 7, value: 7 }],
          [10, { id: 10, value: 10 }],
          [13, { id: 13, value: 10 }],
        ])

        const result = stream.distinct(distinctStub)
        expect(result, 'Distinct should return a set.').to.be.instanceof(Set)
        expect([...result].sort()).to.deep.equal([7, 10].sort())
      })
    })

    it('Filter', function(): void {
      const filterStub = stub()
      filterStub.withArgs({ id: 7 }, 7).returns(true)
      filterStub.withArgs({ id: 10 }, 10).returns(false)
      filterStub.throws('Invalid callback input.')

      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

      expect([...stream.filter(filterStub)]).to.deep.equal([{ id: 7 }])
    })

    it('For Each', function(): void {
      const forEachSpy = spy()

      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])
      stream.forEach(forEachSpy)

      expect(forEachSpy.getCalls().map((call): any => call.args)).to.deep.equal([
        [{ id: 7 }, 7],
        [{ id: 10 }, 10],
      ])
    })

    it('Get Ids', function(): void {
      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

      expect(stream.getIds()).to.deep.equal([7, 10])
    })

    it('Get Items', function(): void {
      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

      expect(stream.getItems()).to.deep.equal([{ id: 7 }, { id: 10 }])
    })

    it('Map', function(): void {
      const mapStub = stub()
      mapStub.withArgs({ id: 7 }, 7).returns(7)
      mapStub.withArgs({ id: 10 }, 10).returns(10)
      mapStub.throws('Invalid callback input.')

      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

      expect([...stream.map(mapStub)]).to.deep.equal([7, 10])
    })

    describe('Max', function(): void {
      it('No items', function(): void {
        const maxStub = stub()
        maxStub.throws('This should never be called.')

        const stream = createDataStream([])

        expect(stream.max(maxStub)).to.equal(null)
      })

      it('2 items', function(): void {
        const maxStub = stub()
        maxStub.withArgs({ id: 7 }, 7).returns(7)
        maxStub.withArgs({ id: 10 }, 10).returns(10)
        maxStub.throws('Invalid callback input.')

        const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

        expect(stream.max(maxStub)).to.deep.equal({ id: 10 })
      })
    })

    describe('Min', function(): void {
      it('No items', function(): void {
        const minStub = stub()
        minStub.throws('This should never be called.')

        const stream = createDataStream([])

        expect(stream.min(minStub)).to.equal(null)
      })

      it('2 items', function(): void {
        const minStub = stub()
        minStub.withArgs({ id: 7 }, 7).returns(7)
        minStub.withArgs({ id: 10 }, 10).returns(10)
        minStub.throws('Invalid callback input.')

        const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

        expect(stream.min(minStub)).to.deep.equal({ id: 7 })
      })
    })

    it('Reduce', function(): void {
      const reduceStub = stub()
      reduceStub.withArgs(0, { id: 7 }, 7).returns(1)
      reduceStub.withArgs(1, { id: 10 }, 10).returns(2)
      reduceStub.throws('Invalid callback input.')

      const stream = createDataStream([[7, { id: 7 }], [10, { id: 10 }]])

      expect(stream.reduce(reduceStub, 0)).to.equal(2)
    })

    describe('Sort', function(): void {
      it('No items', function(): void {
        const sortSpy = spy()

        const stream = createDataStream([])

        expect([...stream.sort(sortSpy)]).to.deep.equal([])
        expect(
          sortSpy.callCount,
          'There are no items, so the callback shouldn‘t be called.'
        ).to.equal(0)
      })

      it('8 sorted items', function(): void {
        const stream = createDataStream([
          [1, { id: 1 }],
          [2, { id: 2 }],
          [3, { id: 3 }],
          [4, { id: 4 }],
          [5, { id: 5 }],
          [6, { id: 6 }],
          [7, { id: 7 }],
          [8, { id: 8 }],
        ])

        expect([...stream.sort((_a, _b, idA, idB): number => +idA - +idB)]).to.deep.equal([
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
          { id: 7 },
          { id: 8 },
        ])
      })

      it('8 unsorted items', function(): void {
        const stream = createDataStream([
          [5, { value: 43, id: 5 }],
          [4, { value: -12, id: 4 }],
          [6, { value: 6, id: 6 }],
          [8, { value: 1, id: 8 }],
          [7, { value: 20, id: 7 }],
          [3, { value: 3, id: 3 }],
          [2, { value: 3, id: 2 }],
          [1, { value: Math.PI, id: 1 }],
        ])

        expect([
          ...stream.sort((a, b, idA, idB): number => a.value - b.value || +idA - +idB),
        ]).to.deep.equal([
          { value: -12, id: 4 },
          { value: 1, id: 8 },
          { value: 3, id: 2 },
          { value: 3, id: 3 },
          { value: Math.PI, id: 1 },
          { value: 6, id: 6 },
          { value: 20, id: 7 },
          { value: 43, id: 5 },
        ])
      })
    })
  })

  describe('Combinations', function(): void {
    it('Filter → Map → Reduce', function(): void {
      const reduceStub = stub()
      reduceStub.withArgs(0, { id: 7 }, 7).returns(1)
      reduceStub.withArgs(1, { id: 10 }, 10).returns(2)
      reduceStub.throws('Invalid callback input.')

      const stream = createDataStream([
        [7, { id: 7 }],
        [13, { id: 13 }],
        [10, { id: 10 }],
        [3, { id: 3 }],
      ])
      const filteredSum = stream
        .filter((_, id): boolean => +id % 2 !== 0)
        .map((item): number => item.id)
        .reduce((acc, val): number => acc + val, 0)

      expect(filteredSum).to.equal(23)
    })
  })
}

describe('Stream API', function(): void {
  describe('Data Stream', function(): void {
    testStreamAPI(<Item>(data: [Id, Item][]): DataStream<Item> => new DataStream(data))
  })

  describe('Data Set', function(): void {
    testStreamAPI(
      <Item>(data: [Id, Item][]): DataStream<Item> =>
        new DataSet(data.map((pair): Item => pair[1])).stream()
    )
  })

  describe('Data View', function(): void {
    testStreamAPI(
      <Item>(data: [Id, Item][]): DataStream<Item> => {
        const ds = new DataSet(
          data
            .map((pair, i): Item[] => [
              pair[1],
              { id: -i, dataSetOnly: 'This should never appear in the data view.' } as any,
            ])
            .flat()
        )
        const dv = new DataView(ds, { filter: (item): boolean => !(item as any).dataSetOnly })
        return dv.stream()
      }
    )
  })
})
