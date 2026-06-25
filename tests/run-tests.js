const fs = require('fs');
const path = require('path');

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

fs.readFileSync = function (pathOrFd, options) {
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

fs.existsSync = function (pathVal) {
  if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
    const cachedContent = ensureCached(pathVal);
    if (cachedContent !== null) {
      return true;
    }
  }
  return originalExistsSync.call(fs, pathVal);
};

fs.statSync = function (pathVal, options) {
  if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
    const cachedContent = ensureCached(pathVal);
    if (cachedContent !== null) {
      return createMockStats(cachedContent);
    }
  }
  return originalStatSync.call(fs, pathVal, options);
};

fs.lstatSync = function (pathVal, options) {
  if (typeof pathVal === 'string' && isCompiledPath(pathVal)) {
    const cachedContent = ensureCached(pathVal);
    if (cachedContent !== null) {
      return createMockStats(cachedContent);
    }
  }
  return originalLstatSync.call(fs, pathVal, options);
};

fs.readFile = function (pathOrFd, options, callback) {
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

fs.stat = function (pathVal, options, callback) {
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

fs.lstat = function (pathVal, options, callback) {
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

// Pre-load all files from the dist directory into the memory cache on startup
const distDir = path.resolve(__dirname, '../dist');
try {
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      ensureCached(path.join(distDir, file));
    }
  }
} catch (e) {
  // Ignore pre-load errors
}

// Run Jest programmatically
require('jest').run();
