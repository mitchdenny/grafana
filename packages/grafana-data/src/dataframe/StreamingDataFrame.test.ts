import { reduceField, ReducerID } from '..';
import { DataFrame, FieldType } from '../types/dataFrame';
import { DataFrameJSON } from './DataFrameJSON';
import { StreamingDataFrame } from './StreamingDataFrame';

describe('Streaming JSON', () => {
  describe('when called with a DataFrame', () => {
    const json: DataFrameJSON = {
      schema: {
        fields: [
          { name: 'time', type: FieldType.time },
          { name: 'name', type: FieldType.string },
          { name: 'value', type: FieldType.number },
        ],
      },
      data: {
        values: [
          [100, 200, 300],
          ['a', 'b', 'c'],
          [1, 2, 3],
        ],
      },
    };

    const stream = new StreamingDataFrame(json, {
      maxLength: 5,
      maxDelta: 300,
    });

    it('should create frame with schema & data', () => {
      expect(stream.fields.map((f) => ({ name: f.name, value: f.values.buffer }))).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "time",
            "value": Array [
              100,
              200,
              300,
            ],
          },
          Object {
            "name": "name",
            "value": Array [
              "a",
              "b",
              "c",
            ],
          },
          Object {
            "name": "value",
            "value": Array [
              1,
              2,
              3,
            ],
          },
        ]
      `);
    });

    it('should append new data to frame', () => {
      stream.push({
        data: {
          values: [[400], ['d'], [4]],
        },
      });

      expect(stream.fields.map((f) => ({ name: f.name, value: f.values.buffer }))).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "time",
            "value": Array [
              100,
              200,
              300,
              400,
            ],
          },
          Object {
            "name": "name",
            "value": Array [
              "a",
              "b",
              "c",
              "d",
            ],
          },
          Object {
            "name": "value",
            "value": Array [
              1,
              2,
              3,
              4,
            ],
          },
        ]
      `);
    });

    it('should append new data and slice based on maxDelta', () => {
      stream.push({
        data: {
          values: [[500], ['e'], [5]],
        },
      });

      expect(stream.fields.map((f) => ({ name: f.name, value: f.values.buffer }))).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "time",
            "value": Array [
              200,
              300,
              400,
              500,
            ],
          },
          Object {
            "name": "name",
            "value": Array [
              "b",
              "c",
              "d",
              "e",
            ],
          },
          Object {
            "name": "value",
            "value": Array [
              2,
              3,
              4,
              5,
            ],
          },
        ]
      `);
    });

    it('should append new data and slice based on maxLength', () => {
      stream.push({
        data: {
          values: [
            [501, 502, 503],
            ['f', 'g', 'h'],
            [6, 7, 8, 9],
          ],
        },
      });

      expect(stream.fields.map((f) => ({ name: f.name, value: f.values.buffer }))).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "time",
            "value": Array [
              400,
              500,
              501,
              502,
              503,
            ],
          },
          Object {
            "name": "name",
            "value": Array [
              "d",
              "e",
              "f",
              "g",
              "h",
            ],
          },
          Object {
            "name": "value",
            "value": Array [
              4,
              5,
              6,
              7,
              8,
              9,
            ],
          },
        ]
      `);
    });
  });

  describe('lengths property is accurate', () => {
    const stream = new StreamingDataFrame(
      {
        schema: {
          fields: [{ name: 'simple', type: FieldType.number }],
        },
        data: {
          values: [[100]],
        },
      },
      {
        maxLength: 5,
      }
    );
    let val = reduceField({ field: stream.fields[0], reducers: [ReducerID.lastNotNull] })[ReducerID.lastNotNull];
    expect(val).toEqual(100);
    expect(stream.length).toEqual(1);
    stream.push({
      data: { values: [[200]] },
    });
    val = reduceField({ field: stream.fields[0], reducers: [ReducerID.lastNotNull] })[ReducerID.lastNotNull];
    expect(val).toEqual(200);
    expect(stream.length).toEqual(2);

    const copy = ({ ...stream } as any) as DataFrame;
    expect(copy.length).toEqual(2);
  });

  describe('streaming labels column', () => {
    const stream = new StreamingDataFrame(
      {
        schema: {
          fields: [
            { name: 'time', type: FieldType.time },
            { name: 'labels', type: FieldType.string },
            { name: 'speed', type: FieldType.number },
          ],
        },
      },
      {
        maxLength: 4,
      }
    );

    stream.push({
      data: {
        values: [
          [100, 100],
          ['sensor=A', 'sensor=B'],
          [10, 15],
        ],
      },
    });

    stream.push({
      data: {
        values: [
          [200, 200],
          ['sensor=B', 'sensor=C'],
          [20, 25],
        ],
      },
    });

    stream.push({
      data: {
        values: [
          [300, 400],
          ['sensor=A', 'sensor=C'],
          [30, 40],
        ],
      },
    });

    expect(stream.fields.map((f) => ({ name: f.name, labels: f.labels, value: f.values.buffer })))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "labels": undefined,
          "name": "time",
          "value": Array [
            100,
            200,
            300,
            400,
          ],
        },
        Object {
          "labels": Object {
            "sensor": "A",
          },
          "name": "speed",
          "value": Array [
            10,
            undefined,
            30,
            undefined,
          ],
        },
        Object {
          "labels": Object {
            "sensor": "B",
          },
          "name": "speed",
          "value": Array [
            15,
            20,
            undefined,
            undefined,
          ],
        },
        Object {
          "labels": Object {
            "sensor": "C",
          },
          "name": "speed",
          "value": Array [
            undefined,
            25,
            undefined,
            40,
          ],
        },
      ]
    `);
  });
});
