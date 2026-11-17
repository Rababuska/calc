const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
require('../core/finance.js');
require('../core/kp.js');

test('print, Word and PDF include distinct souvenir run descriptions', async () => {
  const items = [
    { id: 'one', runGroupId: 'group', category: 'souvenir', title: 'Товар', quantity: 100, unitPrice: 10, total: 1000, details: 'УФ-печать' },
    { id: 'two', runGroupId: 'group', category: 'souvenir', title: 'Товар', quantity: 200, unitPrice: 8, total: 1600, details: 'Гравировка' }
  ];
  let printHtml = '';
  window.open = function () {
    return { document: { open: function () {}, write: function (html) { printHtml = html; }, close: function () {} } };
  };
  assert.equal(window.OrderKP.open(items, '', true), true);
  assert.match(printHtml, /Тираж 1 \(100 шт\.\): УФ-печать/);
  assert.match(printHtml, /Тираж 2 \(200 шт\.\): Гравировка/);

  let wordHtml = '';
  const selection = { removeAllRanges: function () {}, addRange: function () {} };
  window.getSelection = function () { return selection; };
  global.document = {
    createElement: function () { return { style: {}, remove: function () {}, click: function () {} }; },
    createRange: function () { return { selectNodeContents: function () {} }; },
    body: { appendChild: function (element) { wordHtml = element.innerHTML; } },
    execCommand: function () { return true; }
  };
  assert.equal(window.OrderKP.copy(items, '', true), true);
  assert.match(wordHtml, /Тираж 1 \(100 шт\.\): УФ-печать/);
  assert.match(wordHtml, /Тираж 2 \(200 шт\.\): Гравировка/);

  let pdfDefinition;
  const pdfMake = { createPdf: function (definition) {
    pdfDefinition = definition;
    return { getBlob: function (callback) { callback({}); } };
  } };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalSetTimeout = window.setTimeout;
  URL.createObjectURL = function () { return 'blob:test'; };
  window.setTimeout = function () {};
  try {
    assert.equal(await window.OrderKP.downloadPdf(items, '', pdfMake, {}, true), true);
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
    window.setTimeout = originalSetTimeout;
  }
  assert.equal(pdfDefinition.content[3].table.body[1][2].text,
    'Тираж 1 (100 шт.): УФ-печать\nТираж 2 (200 шт.): Гравировка');
});
