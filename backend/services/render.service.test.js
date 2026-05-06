const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSubtitleForceStyle,
  normalizeRenderOptions,
} = require('./render.service');

test('normalizeRenderOptions defaults to TikTok-style subtitles enabled', () => {
  const options = normalizeRenderOptions({}, {});

  assert.equal(options.subtitleEnabled, true);
  assert.equal(options.subtitleFont, 'Arial');
  assert.equal(options.subtitleFontSize, 24);
  assert.equal(options.subtitleColor, 'FFFFFF');
});

test('normalizeRenderOptions accepts request overrides and clamps unsafe values', () => {
  const options = normalizeRenderOptions({
    subtitleEnabled: 'false',
    subtitleFont: 'Bangers,evil',
    subtitleFontSize: '200',
    subtitleColor: '#ffcc00',
  }, {});

  assert.equal(options.subtitleEnabled, false);
  assert.equal(options.subtitleFont, 'Bangersevil');
  assert.equal(options.subtitleFontSize, 64);
  assert.equal(options.subtitleColor, 'FFCC00');
});

test('buildSubtitleForceStyle has no background box and can set font size and color', () => {
  const style = buildSubtitleForceStyle({
    subtitleFont: 'Impact',
    subtitleFontSize: 22,
    subtitleColor: 'FFCC00',
    subtitleOutline: 2,
    subtitleShadow: 1,
    subtitleMarginV: 40,
  });

  assert.match(style, /FontName=Impact/);
  assert.match(style, /FontSize=22/);
  assert.match(style, /PrimaryColour=&H0000CCFF/);
  assert.match(style, /BorderStyle=1/);
  assert.doesNotMatch(style, /BackColour/);
  assert.doesNotMatch(style, /BorderStyle=3/);
});
