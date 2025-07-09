const { markerColor } = require('../pollution_data_visualizer/static/js/utils');

test('markerColor returns green for AQI <= 50', () => {
  expect(markerColor(40)).toBe('green');
});

test('markerColor returns yellow for AQI <= 100', () => {
  expect(markerColor(80)).toBe('yellow');
});

test('markerColor returns red for AQI > 100', () => {
  expect(markerColor(150)).toBe('red');
});
