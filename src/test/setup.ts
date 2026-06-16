import "@testing-library/jest-dom";

const testStorage = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return testStorage.size;
  },
  clear: () => testStorage.clear(),
  getItem: (key: string) => testStorage.get(key) ?? null,
  key: (index: number) => Array.from(testStorage.keys())[index] ?? null,
  removeItem: (key: string) => {
    testStorage.delete(key);
  },
  setItem: (key: string, value: string) => {
    testStorage.set(key, String(value));
  },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
