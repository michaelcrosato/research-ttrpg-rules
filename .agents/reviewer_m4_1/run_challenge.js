// run_challenge.js
// A clean wrapper to run empirical_render_challenge.js with global.Worker polyfilled.

const { JSDOM } = require('jsdom');
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.window = dom.window;

// Setup global.Worker as a getter/setter to sync with window.Worker
Object.defineProperty(global, 'Worker', {
  get() {
    return window.Worker;
  },
  set(val) {
    window.Worker = val;
  },
  configurable: true
});

// Run the script
require('../../tests/empirical_render_challenge.js');
