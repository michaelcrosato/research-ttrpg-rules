// Mock Fetch API globally
global.fetch = jest.fn();

// Mock scrollIntoView which JSDOM doesn't implement
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Track event listeners to prevent leakage across tests
let windowListeners = [];
let documentListeners = [];

const originalWindowAdd = window.addEventListener;
const originalWindowRemove = window.removeEventListener;
const originalDocumentAdd = document.addEventListener;
const originalDocumentRemove = document.removeEventListener;

const getCaptureOption = (options) => {
  if (typeof options === 'boolean') return options;
  if (options && typeof options === 'object') return !!options.capture;
  return false;
};

window.addEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  const exists = windowListeners.some(
    (item) => item.type === type && item.listener === listener && getCaptureOption(item.options) === capture
  );
  if (!exists) {
    windowListeners.push({ type, listener, options });
  }
  return originalWindowAdd.call(this, type, listener, options);
};

window.removeEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  windowListeners = windowListeners.filter(
    (item) => !(item.type === type && item.listener === listener && getCaptureOption(item.options) === capture)
  );
  return originalWindowRemove.call(this, type, listener, options);
};

document.addEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  const exists = documentListeners.some(
    (item) => item.type === type && item.listener === listener && getCaptureOption(item.options) === capture
  );
  if (!exists) {
    documentListeners.push({ type, listener, options });
  }
  return originalDocumentAdd.call(this, type, listener, options);
};

document.removeEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  documentListeners = documentListeners.filter(
    (item) => !(item.type === type && item.listener === listener && getCaptureOption(item.options) === capture)
  );
  return originalDocumentRemove.call(this, type, listener, options);
};

// Reset mocks and clean up event listeners before/after each test
beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  windowListeners.forEach(({ type, listener, options }) => {
    originalWindowRemove.call(window, type, listener, options);
  });
  windowListeners = [];

  documentListeners.forEach(({ type, listener, options }) => {
    originalDocumentRemove.call(document, type, listener, options);
  });
  documentListeners = [];
});

// Robust polling wait helper
global.waitFor = async function (fn, timeout = 1000, interval = 10) {
  const startTime = Date.now();
  while (true) {
    try {
      const result = await fn();
      if (result !== false) {
        return result;
      }
    } catch (e) {
      if (Date.now() - startTime > timeout) {
        throw e;
      }
    }
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition in waitFor`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};
