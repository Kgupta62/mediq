import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class MemoryStorage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(i) { return [...this.#items.keys()][i] ?? null; }
  getItem(k) { return this.#items.has(k) ? this.#items.get(k) : null; }
  setItem(k, v) { this.#items.set(String(k), String(v)); }
  removeItem(k) { this.#items.delete(k); }
  clear() { this.#items.clear(); }
}

for (const name of ['localStorage', 'sessionStorage']) {
  if (!globalThis[name]) {
    Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true });
  }
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
