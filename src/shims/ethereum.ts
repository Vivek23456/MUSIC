// src/shims/ethereum.ts
if (!(window as any).ethereum) {
  Object.defineProperty(window, 'ethereum', {
    value: {},
    writable: false,
    configurable: true
  });
}

