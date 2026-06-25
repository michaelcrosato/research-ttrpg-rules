// Intercept fs functions with an in-memory cache to completely bypass Windows file lock issues
const fs = require('fs');
const path = require('path');

if (!fs.readFileSync.__isWrapped) {
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalStatSync = fs.statSync;
  const originalLstatSync = fs.lstatSync;
  const originalReadFile = fs.readFile;
  const originalStat = fs.stat;
  const originalLstat = fs.lstat;

  const fileCache = new Map();

  const isCompiledPath = function (pathVal) {
    if (typeof pathVal !== 'string') return false;
    const standardized = pathVal.replace(/\\/g, '/').toLowerCase();
    return (
      (standardized.includes('dist/') || standardized.includes('dist_test/')) && !standardized.includes('node_modules')
    );
  };

  const createMockStats = (content) => {
    return {
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      size: content.length,
      mode: 33188, // S_IFREG | 0644
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
      mtimeMs: Date.now(),
      atimeMs: Date.now(),
      ctimeMs: Date.now(),
      birthtimeMs: Date.now(),
      ino: 0,
      dev: 0,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      blksize: 4096,
      blocks: Math.ceil(content.length / 512),
    };
  };

  const ensureCached = function (pathVal) {
    if (!isCompiledPath(pathVal)) return null;
    const standardized = pathVal.replace(/\\/g, '/').toLowerCase();

    for (const [key, content] of fileCache.entries()) {
      if (standardized.endsWith(key.replace(/\\/g, '/').toLowerCase())) {
        return content;
      }
    }

    let fileName = '';
    if (standardized.includes('dist/')) {
      fileName = pathVal.substring(standardized.lastIndexOf('dist/') + 5);
    } else if (standardized.includes('dist_test/')) {
      fileName = pathVal.substring(standardized.lastIndexOf('dist_test/') + 10);
    }

    if (!fileName) return null;

    const possiblePaths = [
      path.resolve(__dirname, '../dist', fileName),
      path.resolve(__dirname, '../dist_test', fileName),
    ];

    const maxAttempts = 10;
    const delayMs = 10;

    for (const targetPath of possiblePaths) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          if (originalExistsSync.call(fs, targetPath)) {
            const stats = originalStatSync.call(fs, targetPath);
            if (stats.isFile()) {
              const content = originalReadFileSync.call(fs, targetPath);
              fileCache.set(`dist/${fileName}`, content);
              fileCache.set(`dist\\${fileName}`, content);
              fileCache.set(`dist_test/${fileName}`, content);
              fileCache.set(`dist_test\\${fileName}`, content);
              return content;
            }
          }
          break;
        } catch (e) {
          attempts++;
          if (attempts >= maxAttempts) break;
          const start = Date.now();
          while (Date.now() - start < delayMs) {}
        }
      }
    }
    return null;
  };

  const wrapReadFileSync = function (pathOrFd, options) {
    if (typeof pathOrFd === 'string' && isCompiledPath(pathOrFd)) {
      const cachedContent = ensureCached(pathOrFd);
      if (cachedContent !== null) {
        const isUtf8 =
          options === 'utf8' ||
          options === 'utf-8' ||
          (options && (options.encoding === 'utf8' || options.encoding === 'utf-8'));
        if (isUtf8) {
          return typeof cachedContent === 'string' ? cachedContent : cachedContent.toString('utf8');
        }
        return Buffer.isBuffer(cachedContent) ? Buffer.from(cachedContent) : Buffer.from(cachedContent, 'utf8');
      }
    }
    return originalReadFileSync.call(fs, pathOrFd, options);
  };

  const wrapExistsSync = function (pathVal) {
    if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
      const cachedContent = ensureCached(pathVal);
      if (cachedContent !== null) {
        return true;
      }
    }
    return originalExistsSync.call(fs, pathVal);
  };

  const wrapStatSync = function (pathVal, options) {
    if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
      const cachedContent = ensureCached(pathVal);
      if (cachedContent !== null) {
        return createMockStats(cachedContent);
      }
    }
    return originalStatSync.call(fs, pathVal, options);
  };

  const wrapLstatSync = function (pathVal, options) {
    if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
      const cachedContent = ensureCached(pathVal);
      if (cachedContent !== null) {
        return createMockStats(cachedContent);
      }
    }
    return originalLstatSync.call(fs, pathVal, options);
  };

  const wrapReadFile = function (pathOrFd, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? undefined : options;
    if (typeof pathOrFd === 'string' && isCompiledPath(pathOrFd)) {
      const cachedContent = ensureCached(pathOrFd);
      if (cachedContent !== null) {
        const isUtf8 =
          opts === 'utf8' || opts === 'utf-8' || (opts && (opts.encoding === 'utf8' || opts.encoding === 'utf-8'));
        const result = isUtf8
          ? typeof cachedContent === 'string'
            ? cachedContent
            : cachedContent.toString('utf8')
          : Buffer.isBuffer(cachedContent)
            ? Buffer.from(cachedContent)
            : Buffer.from(cachedContent, 'utf8');
        if (cb) {
          process.nextTick(() => cb(null, result));
        }
        return;
      }
    }
    return originalReadFile.call(fs, pathOrFd, options, callback);
  };

  const wrapStat = function (pathVal, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? undefined : options;
    if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
      const cachedContent = ensureCached(pathVal);
      if (cachedContent !== null) {
        const mockStats = createMockStats(cachedContent);
        if (cb) {
          process.nextTick(() => cb(null, mockStats));
        }
        return;
      }
    }
    return originalStat.call(fs, pathVal, options, callback);
  };

  const wrapLstat = function (pathVal, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? undefined : options;
    if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
      const cachedContent = ensureCached(pathVal);
      if (cachedContent !== null) {
        const mockStats = createMockStats(cachedContent);
        if (cb) {
          process.nextTick(() => cb(null, mockStats));
        }
        return;
      }
    }
    return originalLstat.call(fs, pathVal, options, callback);
  };

  wrapReadFileSync.__isWrapped = true;
  wrapReadFileSync.__fileCache = fileCache;
  wrapReadFileSync.__original = originalReadFileSync;
  wrapReadFileSync.__ensureCached = ensureCached;

  wrapExistsSync.__original = originalExistsSync;
  wrapStatSync.__original = originalStatSync;
  wrapLstatSync.__original = originalLstatSync;

  fs.readFileSync = wrapReadFileSync;
  fs.existsSync = wrapExistsSync;
  fs.statSync = wrapStatSync;
  fs.lstatSync = wrapLstatSync;
  fs.readFile = wrapReadFile;
  fs.stat = wrapStat;
  fs.lstat = wrapLstat;

  if (fs.promises) {
    const originalPromisesReadFile = fs.promises.readFile;
    const originalPromisesStat = fs.promises.stat;
    const originalPromisesLstat = fs.promises.lstat;

    fs.promises.readFile = function (pathVal, options) {
      if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
        const cachedContent = ensureCached(pathVal);
        if (cachedContent !== null) {
          const isUtf8 =
            options === 'utf8' ||
            options === 'utf-8' ||
            (options && (options.encoding === 'utf8' || options.encoding === 'utf-8'));
          const result = isUtf8
            ? typeof cachedContent === 'string'
              ? cachedContent
              : cachedContent.toString('utf8')
            : Buffer.isBuffer(cachedContent)
              ? Buffer.from(cachedContent)
              : Buffer.from(cachedContent, 'utf8');
          return Promise.resolve(result);
        }
      }
      return originalPromisesReadFile.call(fs.promises, pathVal, options);
    };

    fs.promises.stat = function (pathVal, options) {
      if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
        const cachedContent = ensureCached(pathVal);
        if (cachedContent !== null) {
          return Promise.resolve(createMockStats(cachedContent));
        }
      }
      return originalPromisesStat.call(fs.promises, pathVal, options);
    };

    fs.promises.lstat = function (pathVal, options) {
      if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
        const cachedContent = ensureCached(pathVal);
        if (cachedContent !== null) {
          return Promise.resolve(createMockStats(cachedContent));
        }
      }
      return originalPromisesLstat.call(fs.promises, pathVal, options);
    };
  }
}

const fileCache = fs.readFileSync.__fileCache;
const ensureCached = fs.readFileSync.__ensureCached;

const distDir = path.resolve(__dirname, '../dist');
try {
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      ensureCached(path.join(distDir, file));
    }
  }
} catch (e) {
  console.warn('Pre-load warning in setup:', e.message);
}

// Mock performance globally
global.performance = window.performance || global.performance || { now: () => Date.now() };

// Mock Fetch API globally
global.fetch = jest.fn();

// Sync global.indexedDB and window.indexedDB in JSDOM safely without recursion
if (typeof window !== 'undefined') {
  let sharedIndexedDB = undefined;
  let sharedSearchWorker = undefined;
  let sharedEmbeddingsWorker = undefined;

  const syncAll = () => {
    try {
      const gIDB = Object.getOwnPropertyDescriptor(global, 'indexedDB');
      const wIDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');
      if (gIDB && !gIDB.get && global.indexedDB !== sharedIndexedDB) {
        sharedIndexedDB = global.indexedDB;
      } else if (wIDB && !wIDB.get && window.indexedDB !== sharedIndexedDB) {
        sharedIndexedDB = window.indexedDB;
      }
    } catch (e) {}

    try {
      const gSW = Object.getOwnPropertyDescriptor(global, 'searchWorker');
      const wSW = Object.getOwnPropertyDescriptor(window, 'searchWorker');
      if (gSW && !gSW.get && global.searchWorker !== sharedSearchWorker) {
        sharedSearchWorker = global.searchWorker;
      } else if (wSW && !wSW.get && window.searchWorker !== sharedSearchWorker) {
        sharedSearchWorker = window.searchWorker;
      }
    } catch (e) {}

    try {
      const gEW = Object.getOwnPropertyDescriptor(global, 'embeddingsWorker');
      const wEW = Object.getOwnPropertyDescriptor(window, 'embeddingsWorker');
      if (gEW && !gEW.get && global.embeddingsWorker !== sharedEmbeddingsWorker) {
        sharedEmbeddingsWorker = global.embeddingsWorker;
      } else if (wEW && !wEW.get && window.embeddingsWorker !== sharedEmbeddingsWorker) {
        sharedEmbeddingsWorker = window.embeddingsWorker;
      }
    } catch (e) {}
  };

  global.__syncWorkersAndDb = syncAll;

  Object.defineProperty(global, 'indexedDB', {
    get() {
      syncAll();
      return sharedIndexedDB;
    },
    set(val) {
      sharedIndexedDB = val;
      syncAll();
    },
    configurable: true,
  });
  Object.defineProperty(window, 'indexedDB', {
    get() {
      syncAll();
      return sharedIndexedDB;
    },
    set(val) {
      sharedIndexedDB = val;
      syncAll();
    },
    configurable: true,
  });

  Object.defineProperty(global, 'searchWorker', {
    get() {
      syncAll();
      return sharedSearchWorker;
    },
    set(val) {
      sharedSearchWorker = val;
      syncAll();
    },
    configurable: true,
  });
  Object.defineProperty(window, 'searchWorker', {
    get() {
      syncAll();
      return sharedSearchWorker;
    },
    set(val) {
      sharedSearchWorker = val;
      syncAll();
    },
    configurable: true,
  });

  Object.defineProperty(global, 'embeddingsWorker', {
    get() {
      syncAll();
      return sharedEmbeddingsWorker;
    },
    set(val) {
      sharedEmbeddingsWorker = val;
      syncAll();
    },
    configurable: true,
  });
  Object.defineProperty(window, 'embeddingsWorker', {
    get() {
      syncAll();
      return sharedEmbeddingsWorker;
    },
    set(val) {
      sharedEmbeddingsWorker = val;
      syncAll();
    },
    configurable: true,
  });

  const originalDocumentDispatch = document.dispatchEvent;
  document.dispatchEvent = function (event) {
    syncAll();
    return originalDocumentDispatch.call(this, event);
  };

  const originalWindowDispatch = window.dispatchEvent;
  window.dispatchEvent = function (event) {
    syncAll();
    return originalWindowDispatch.call(this, event);
  };
}

// Mock performance globally for JSDOM
if (typeof window !== 'undefined' && !window.performance) {
  window.performance = require('perf_hooks').performance;
}
if (!global.performance) {
  global.performance = require('perf_hooks').performance;
}

// Mock scrollIntoView which JSDOM doesn't implement
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Track event listeners to prevent leakage across tests globally
if (!global.__windowListeners) global.__windowListeners = [];
if (!global.__documentListeners) global.__documentListeners = [];

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
  const exists = global.__windowListeners.some(
    (item) => item.type === type && item.listener === listener && getCaptureOption(item.options) === capture
  );
  if (!exists) {
    global.__windowListeners.push({ type, listener, options });
  }
  return originalWindowAdd.call(this, type, listener, options);
};

window.removeEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  global.__windowListeners = global.__windowListeners.filter(
    (item) => !(item.type === type && item.listener === listener && getCaptureOption(item.options) === capture)
  );
  return originalWindowRemove.call(this, type, listener, options);
};

document.addEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  const exists = global.__documentListeners.some(
    (item) => item.type === type && item.listener === listener && getCaptureOption(item.options) === capture
  );
  if (!exists) {
    global.__documentListeners.push({ type, listener, options });
  }
  return originalDocumentAdd.call(this, type, listener, options);
};

document.removeEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options);
  global.__documentListeners = global.__documentListeners.filter(
    (item) => !(item.type === type && item.listener === listener && getCaptureOption(item.options) === capture)
  );
  return originalDocumentRemove.call(this, type, listener, options);
};

// Reset mocks and clean up event listeners before/after each test
beforeEach(() => {
  global.fetch = jest.fn();
  global.indexedDB = undefined;
  global.searchWorker = undefined;
  global.embeddingsWorker = undefined;
  global.alert = jest.fn();
  if (typeof window !== 'undefined') {
    window.alert = global.alert;
  }
  jest.clearAllMocks();
  if (global.__syncWorkersAndDb) global.__syncWorkersAndDb();
});

afterEach(() => {
  global.__windowListeners.forEach(({ type, listener, options }) => {
    originalWindowRemove.call(window, type, listener, options);
  });
  global.__windowListeners = [];

  global.__documentListeners.forEach(({ type, listener, options }) => {
    originalDocumentRemove.call(document, type, listener, options);
  });
  global.__documentListeners = [];
  if (global.__syncWorkersAndDb) global.__syncWorkersAndDb();
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

// Load compiled dependencies into JSDOM window
try {
  require('../dist/dsl.js');
  require('../dist/solver.js');
  require('../dist/diagnostics.js');
} catch (e) {
  console.warn('Failed to load compiled scripts in test setup:', e.message);
}

// Mock WebGPU globally
if (typeof navigator === 'undefined') {
  global.navigator = {};
}
if (!global.navigator.gpu) {
  global.navigator.gpu = {
    requestAdapter: jest.fn().mockResolvedValue({
      requestDevice: jest.fn().mockResolvedValue({
        createShaderModule: jest.fn(),
        createBuffer: jest.fn(),
        createBindGroupLayout: jest.fn(),
        createPipelineLayout: jest.fn(),
        createComputePipeline: jest.fn().mockReturnValue({
          getBindGroupLayout: jest.fn().mockReturnValue({}),
        }),
        createBindGroup: jest.fn(),
        createCommandEncoder: jest.fn().mockReturnValue({
          beginComputePass: jest.fn().mockReturnValue({
            setPipeline: jest.fn(),
            setBindGroup: jest.fn(),
            dispatchWorkgroups: jest.fn(),
            end: jest.fn(),
          }),
          copyBufferToBuffer: jest.fn(),
          finish: jest.fn(),
        }),
        queue: {
          writeBuffer: jest.fn(),
          submit: jest.fn(),
          onSubmittedWorkDone: jest.fn().mockResolvedValue(undefined),
        },
        destroy: jest.fn(),
      }),
    }),
  };
}
if (typeof window !== 'undefined' && !window.navigator.gpu) {
  window.navigator.gpu = global.navigator.gpu;
}

// Mock WebRTC globally
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({ sdp: 'mock-sdp', type: 'offer' }),
  createAnswer: jest.fn().mockResolvedValue({ sdp: 'mock-sdp', type: 'answer' }),
  setLocalDescription: jest.fn().mockResolvedValue(undefined),
  setRemoteDescription: jest.fn().mockResolvedValue(undefined),
  addIceCandidate: jest.fn().mockResolvedValue(undefined),
  createDataChannel: jest.fn().mockReturnValue({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onicecandidate: null,
  ontrack: null,
  ondatachannel: null,
}));
global.RTCIceCandidate = jest.fn().mockImplementation((candidate) => candidate);
global.RTCSessionDescription = jest.fn().mockImplementation((description) => description);

if (typeof window !== 'undefined') {
  window.RTCPeerConnection = global.RTCPeerConnection;
  window.RTCIceCandidate = global.RTCIceCandidate;
  window.RTCSessionDescription = global.RTCSessionDescription;
}

// Mock Canvas getContext
if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
  const mockContext = {
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 50, height: 10 }),
    strokeText: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    drawImage: jest.fn(),
    createLinearGradient: jest.fn().mockReturnValue({
      addColorStop: jest.fn(),
    }),
    createPattern: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    closePath: jest.fn(),
    canvas: null,
  };
  window.HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
}

// Mock URL createObjectURL and revokeObjectURL
if (typeof URL !== 'undefined') {
  URL.createObjectURL = jest.fn().mockReturnValue('blob://test');
  URL.revokeObjectURL = jest.fn();
}
if (typeof window !== 'undefined' && window.URL) {
  window.URL.createObjectURL = URL.createObjectURL;
  window.URL.revokeObjectURL = URL.revokeObjectURL;
}

// Mock HTMLAnchorElement click to dispatch click event in JSDOM
if (typeof window !== 'undefined' && window.HTMLAnchorElement) {
  window.HTMLAnchorElement.prototype.click = function () {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  };
}

// Global synchronization completed
