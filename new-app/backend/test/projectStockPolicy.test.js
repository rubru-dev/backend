const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canReceiveFromPBStatus,
  pbCountsTowardQuota,
  prReadyForReceipt,
  quantitiesMatch,
  receiptStatus,
  remainingQuantity,
  validReceiptKey,
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

test("linked PR quantity must exactly match the PB quantity", () => {
  assert.equal(quantitiesMatch(10, 10), true);
  assert.equal(quantitiesMatch(10, 6), false);
  assert.equal(quantitiesMatch(10, Number.NaN), false);
});

test("receipt requires an approved and signed PR", () => {
  assert.equal(prReadyForReceipt("Disetujui", new Date()), true);
  assert.equal(prReadyForReceipt("Disetujui", null), false);
  assert.equal(prReadyForReceipt("Pending", new Date()), false);
});

test("receipt request key only accepts bounded safe identifiers", () => {
  assert.equal(validReceiptKey("a2d96c65-34c8-41d1-b55d-28f13f4f3e78"), true);
  assert.equal(validReceiptKey("short"), false);
  assert.equal(validReceiptKey("invalid key with spaces"), false);
});
