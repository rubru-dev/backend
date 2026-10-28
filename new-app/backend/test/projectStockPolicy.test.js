const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canReceiveFromPBStatus,
  pbCountsTowardQuota,
  receiptStatus,
  remainingQuantity,
} = require("../dist/lib/projectStockPolicy");

test("draft and rejected PB do not consume quota", () => {
  assert.equal(pbCountsTowardQuota("Draft"), false);
  assert.equal(pbCountsTowardQuota("Ditolak"), false);
  assert.equal(pbCountsTowardQuota("Diajukan"), true);
  assert.equal(pbCountsTowardQuota("Sebagian Diterima"), true);
});

test("remaining quantity never becomes negative", () => {
  assert.equal(remainingQuantity(10, 4), 6);
  assert.equal(remainingQuantity(10, 12), 0);
});

test("receipt status is partial until every item is received", () => {
  assert.equal(receiptStatus([{ ordered: 10, received: 10 }, { ordered: 5, received: 2 }]), "Sebagian Diterima");
  assert.equal(receiptStatus([{ ordered: 10, received: 10 }, { ordered: 5, received: 5 }]), "Selesai");
});

test("only PR processing states accept receipts", () => {
  assert.equal(canReceiveFromPBStatus("Diproses PR"), true);
  assert.equal(canReceiveFromPBStatus("Sebagian Diterima"), true);
  assert.equal(canReceiveFromPBStatus("Selesai"), false);
});
