const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CLIENT_TIMELINE_BUFFER_DAYS,
  clientTargetDate,
} = require("../dist/lib/clientTimeline");

test("client timeline uses a ten calendar day buffer", () => {
  assert.equal(CLIENT_TIMELINE_BUFFER_DAYS, 10);
  assert.equal(
    clientTargetDate(new Date("2026-11-09T00:00:00.000Z")).toISOString(),
    "2026-11-19T00:00:00.000Z",
  );
});

test("client timeline crosses month and year boundaries", () => {
  assert.equal(
    clientTargetDate(new Date("2026-11-25T00:00:00.000Z")).toISOString(),
    "2026-12-05T00:00:00.000Z",
  );
  assert.equal(
    clientTargetDate(new Date("2026-12-27T00:00:00.000Z")).toISOString(),
    "2027-01-06T00:00:00.000Z",
  );
});

test("client timeline keeps an empty target empty", () => {
  assert.equal(clientTargetDate(null), null);
});
