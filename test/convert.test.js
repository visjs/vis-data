import assert, { equal, deepEqual, throws } from "assert";

import { convert } from "../src/convert";
import moment from "moment";

const ASPDateRegex = /^\/?Date\((\-?\d+)/i;

describe("convertModule", function() {
  describe("convert", function() {
    it("handles null", function() {
      equal(convert(null), null);
    });

    it("handles undefined", function() {
      equal(convert(undefined), undefined);
    });

    it("undefined type returns original object", function() {
      deepEqual(convert({}), {});
    });

    it("non-string type throws", function() {
      throws(
        function() {
          convert({}, {});
        },
        Error,
        null
      );
    });

    it("converts to boolean", function() {
      assert(convert({}, "boolean"));
    });

    it("converts to number", function() {
      equal(typeof convert("1198908717056", "number"), "number");
    });

    it("converts to String", function() {
      equal(typeof convert({}, "string"), "string");
    });

    it("converts to Date from Number", function() {
      assert(convert(1198908717056, "Date") instanceof Date);
    });

    it("converts to Date from String", function() {
      assert(convert("1198908717056", "Date") instanceof Date);
    });

    it("converts to Date from Moment", function() {
      assert(convert(new moment(), "Date") instanceof Date);
    });

    it("throws when converting unknown object to Date", function() {
      throws(
        function() {
          convert({}, "Date");
        },
        Error,
        null
      );
    });

    it("converts to Moment from Number", function() {
      assert(convert(1198908717056, "Moment") instanceof moment);
    });

    it("converts to Moment from String", function() {
      assert(convert("2007-12-29T06:11:57.056Z", "Moment") instanceof moment);
    });

    it("converts to Moment from Date", function() {
      assert(convert(new Date(), "Moment") instanceof moment);
    });

    it("converts to Moment from Moment", function() {
      assert(convert(new moment(), "Moment") instanceof moment);
    });

    it("throws when converting unknown object to Moment", function() {
      throws(
        function() {
          convert({}, "Moment");
        },
        Error,
        null
      );
    });

    it("converts to ISODate from Number", function() {
      assert(convert(1198908717056, "ISODate") instanceof Date);
    });

    it("converts to ISODate from String", function() {
      equal(typeof convert("1995-01-01", "ISODate"), "string");
    });

    it("converts to ISODate from Date - Throws a deprecation warning", function() {
      equal(typeof convert(new Date(), "ISODate"), "string");
    });

    it("converts to ISODate from Moment", function() {
      equal(typeof convert(new moment(), "ISODate"), "string");
    });

    it("throws when converting unknown object to ISODate", function() {
      throws(
        function() {
          convert({}, "ISODate");
        },
        Error,
        null
      );
    });

    it("converts to ASPDate from Number", function() {
      assert(ASPDateRegex.test(convert(1198908717056, "ASPDate")));
    });

    it("converts to ASPDate from String", function() {
      assert(ASPDateRegex.test(convert("1995-01-01", "ASPDate")));
    });

    it("converts to ASPDate from Date", function() {
      assert(ASPDateRegex.test(convert(new Date(), "ASPDate")));
    });

    it("converts to ASPDate from ASPDate", function() {
      assert(ASPDateRegex.test(convert("/Date(12344444)/", "ASPDate")));
    });

    it("converts to ASPDate from Moment", function() {
      assert(ASPDateRegex.test(convert(new moment(), "ASPDate")));
    });

    it("throws when converting unknown object to ASPDate", function() {
      throws(
        function() {
          convert({}, "ASPDate");
        },
        Error,
        null
      );
    });

    it("throws when converting unknown type", function() {
      throws(
        function() {
          convert({}, "UnknownType");
        },
        Error,
        null
      );
    });
  });
});
