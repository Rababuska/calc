const test = require('node:test');
const assert = require('node:assert/strict');

const photoCache = new Map();
global.window = global;
global.window.dispatchEvent = function () {};
global.window.crypto = { randomUUID: function () { return 'item-1'; } };
global.CustomEvent = function (type, options) {
  this.type = type;
  this.detail = options && options.detail;
};
global.localStorage = {
  store: {},
  maxLength: 600,
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem: function (key, value) {
    if (String(value).length > this.maxLength) throw new Error('QuotaExceededError');
    this.store[key] = String(value);
  },
  removeItem: function (key) { delete this.store[key]; }
};
global.PhotoStorage = {
  save: function (key, photos) {
    photoCache.set(key, photos.slice());
    return Promise.resolve();
  },
  load: function (key) { return Promise.resolve(photoCache.get(key) || null); }
};

function loadOrderState() {
  const modulePath = require.resolve('../core/state.js');
  delete require.cache[modulePath];
  require(modulePath);
  return window.OrderState;
}

test('keeps photos in IndexedDB when localStorage quota is exceeded and restores them', async () => {
  const photo = 'data:image/jpeg;base64,' + 'x'.repeat(1200);
  let order = loadOrderState();
  order.add({ id: 'item-1', title: 'Product', quantity: 1, unitPrice: 1, photos: [photo] });

  const saved = JSON.parse(localStorage.getItem('unified-calc-order'));
  assert.deepEqual(saved[0].photos, []);
  assert.equal(saved[0].photoCacheKey, 'order:item-1');
  assert.deepEqual(photoCache.get('order:item-1'), [photo]);

  order = loadOrderState();
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.deepEqual(order.getItems()[0].photos, [photo]);
});

test('adds an independently calculated run without changing the source calculation', () => {
  localStorage.store = {};
  localStorage.maxLength = 100000;
  const order = loadOrderState();
  order.add({ id: 'source', category: 'souvenir', quantity: 100, unitPrice: 10, total: 1000,
    calculationOptions: { inputs: { F4: '3000' } }, annotations: [{ total: 1000 }] });
  const newId = order.addCalculatedRun('source', {
    quantity: 200, unitPrice: 12, total: 2400, productionCost: 1800,
    calculationOptions: { inputs: { F4: '5000' } }, annotations: [{ total: 2400 }]
  });
  const items = order.getItems();
  assert.notEqual(newId, 'source');
  assert.equal(items[1].id, newId);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 100);
  assert.equal(items[0].total, 1000);
  assert.equal(items[0].calculationOptions.inputs.F4, '3000');
  assert.equal(items[1].quantity, 200);
  assert.equal(items[1].total, 2400);
  assert.equal(items[1].base_total, 2400);
  assert.equal(items[1].calculationOptions.inputs.F4, '5000');
  assert.equal(items[1].runGroupId, items[0].runGroupId);
  items[1].annotations[0].total = 1;
  assert.equal(items[0].annotations[0].total, 1000);
});

test('removing a run decoration preserves its internal adjustment', () => {
  localStorage.store = {};
  const order = loadOrderState();
  order.add({
    id: 'decorated', category: 'poly', quantity: 100, unitPrice: 18, total: 1800,
    baseUnitPrice: 10, baseTotal: 1000, baseProductionCost: 500,
    productionCost: 800, productionCostByCategory: { poly: 500, souvenir: 300 },
    annotations: [{ unitPrice: 6, total: 600, productionCost: 300 }],
    quoteInternalAdjustments: [{ chargeAmount: 200 }]
  });
  assert.equal(order.removeDecoration('decorated', 0), true);
  const item = order.getItems()[0];
  assert.equal(item.total, 1200);
  assert.equal(item.unitPrice, 12);
  assert.equal(item.quoteInternalAdjustments[0].chargeAmount, 200);
});
