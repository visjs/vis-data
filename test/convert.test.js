import { expect } from "chai";
import { DataSet } from "../src/data-set";
import { createNewDataPipeFrom } from "../src/data-pipe";

import moment from "moment";

describe("Convert replacement from the docs", function() {
  it("convert", function() {
    // --[BEGIN]-- The example code.

    // --[BEGIN]-- The original implementation of type coercion.

    // !!!! Make sure to import Moment.js as this code depends on it.
    const convert = (() => {
      // parse ASP.Net Date pattern,
      // for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
      // code from http://momentjs.com/
      const ASPDateRegex = /^\/?Date\((-?\d+)/i;

      /**
       * Test whether given object is a number
       *
       * @param value - Input value of unknown type.
       *
       * @returns True if number, false otherwise.
       */
      function isNumber(value) {
        return value instanceof Number || typeof value === "number";
      }

      /**
       * Test whether given object is a string
       *
       * @param value - Input value of unknown type.
       *
       * @returns True if string, false otherwise.
       */
      function isString(value) {
        return value instanceof String || typeof value === "string";
      }

      /**
       * Get the type of an object, for example exports.getType([]) returns 'Array'
       *
       * @param object - Input value of unknown type.
       *
       * @returns Detected type.
       */
      function getType(object) {
        const type = typeof object;

        if (type === "object") {
          if (object === null) {
            return "null";
          }
          if (object instanceof Boolean) {
            return "Boolean";
          }
          if (object instanceof Number) {
            return "Number";
          }
          if (object instanceof String) {
            return "String";
          }
          if (Array.isArray(object)) {
            return "Array";
          }
          if (object instanceof Date) {
            return "Date";
          }

          return "Object";
        }
        if (type === "number") {
          return "Number";
        }
        if (type === "boolean") {
          return "Boolean";
        }
        if (type === "string") {
          return "String";
        }
        if (type === undefined) {
          return "undefined";
        }

        return type;
      }

      /**
       * Convert an object into another type
       *
       * @param object - Value of unknown type.
       * @param type - Name of the desired type.
       *
       * @returns Object in the desired type.
       * @throws Error
       */
      return function convert(object, type) {
        let match;

        if (object === undefined) {
          return undefined;
        }
        if (object === null) {
          return null;
        }

        if (!type) {
          return object;
        }
        if (!(typeof type === "string") && !(type instanceof String)) {
          throw new Error("Type must be a string");
        }

        //noinspection FallthroughInSwitchStatementJS
        switch (type) {
          case "boolean":
          case "Boolean":
            return Boolean(object);

          case "number":
          case "Number":
            if (isString(object) && !isNaN(Date.parse(object))) {
              return moment(object).valueOf();
            } else {
              // @TODO: I don't think that Number and String constructors are a good idea.
              // This could also fail if the object doesn't have valueOf method or if it's redefined.
              // For example: Object.create(null) or { valueOf: 7 }.
              return Number(object.valueOf());
            }
          case "string":
          case "String":
            return String(object);

          case "Date":
            if (isNumber(object)) {
              return new Date(object);
            }
            if (object instanceof Date) {
              return new Date(object.valueOf());
            } else if (moment.isMoment(object)) {
              return new Date(object.valueOf());
            }
            if (isString(object)) {
              match = ASPDateRegex.exec(object);
              if (match) {
                // object is an ASP date
                return new Date(Number(match[1])); // parse number
              } else {
                return moment(new Date(object)).toDate(); // parse string
              }
            } else {
              throw new Error(
                "Cannot convert object of type " +
                  getType(object) +
                  " to type Date"
              );
            }

          case "Moment":
            if (isNumber(object)) {
              return moment(object);
            }
            if (object instanceof Date) {
              return moment(object.valueOf());
            } else if (moment.isMoment(object)) {
              return moment(object);
            }
            if (isString(object)) {
              match = ASPDateRegex.exec(object);
              if (match) {
                // object is an ASP date
                return moment(Number(match[1])); // parse number
              } else {
                return moment(object); // parse string
              }
            } else {
              throw new Error(
                "Cannot convert object of type " +
                  getType(object) +
                  " to type Date"
              );
            }

          case "ISODate":
            if (isNumber(object)) {
              return new Date(object);
            } else if (object instanceof Date) {
              return object.toISOString();
            } else if (moment.isMoment(object)) {
              return object.toDate().toISOString();
            } else if (isString(object)) {
              match = ASPDateRegex.exec(object);
              if (match) {
                // object is an ASP date
                return new Date(Number(match[1])).toISOString(); // parse number
              } else {
                return moment(object).format(); // ISO 8601
              }
            } else {
              throw new Error(
                "Cannot convert object of type " +
                  getType(object) +
                  " to type ISODate"
              );
            }

          case "ASPDate":
            if (isNumber(object)) {
              return "/Date(" + object + ")/";
            } else if (object instanceof Date || moment.isMoment(object)) {
              return "/Date(" + object.valueOf() + ")/";
            } else if (isString(object)) {
              match = ASPDateRegex.exec(object);
              let value;
              if (match) {
                // object is an ASP date
                value = new Date(Number(match[1])).valueOf(); // parse number
              } else {
                value = new Date(object).valueOf(); // parse string
              }
              return "/Date(" + value + ")/";
            } else {
              throw new Error(
                "Cannot convert object of type " +
                  getType(object) +
                  " to type ASPDate"
              );
            }

          default:
            throw new Error(`Unknown type ${type}`);
        }
      };
    })();

    // --[END]-- The original implementation of type coercion.

    const rawDS = new DataSet([
      /* raw data with arbitrary types */
      { id: 7, label: 4, date: "2017-09-04" },
      { id: false, label: 4, date: "2017-10-04" },
      { id: "test", label: true, date: "2017-11-04" }
    ]);
    const coercedDS = new DataSet(/* the data with coerced types will be piped here */);

    const types = {
      id: "string",
      label: "string",
      date: "Date"
    };

    const pipe = createNewDataPipeFrom(rawDS)
      .map(item =>
        Object.keys(item).reduce((acc, key) => {
          acc[key] = convert(item[key], types[key]);
          return acc;
        }, {})
      )
      .to(coercedDS);

    pipe.all().start();
    // All items were transformed and piped into visDS and all later changes
    // will be transformed and piped as well.

    // --[END]-- The example code.

    expect(coercedDS.get()).to.deep.equal([
      { id: "7", label: "4", date: new Date("2017-09-04") },
      { id: "false", label: "4", date: new Date("2017-10-04") },
      { id: "test", label: "true", date: new Date("2017-11-04") }
    ]);
  });
});
