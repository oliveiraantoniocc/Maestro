import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.maestro API (Electron IPC bridge)
const mockMaestro = {
  settings: {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({}),
  },
  sessions: {
    get: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  groups: {
    get: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
  process: {
    spawn: vi.fn().mockResolvedValue({ pid: 12345 }),
    write: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn().mockResolvedValue(undefined),
    resize: vi.fn().mockResolvedValue(undefined),
    onOutput: vi.fn().mockReturnValue(() => {}),
    onExit: vi.fn().mockReturnValue(() => {}),
  },
  git: {
    status: vi.fn().mockResolvedValue({ files: [], branch: 'main' }),
    diff: vi.fn().mockResolvedValue(''),
    isRepo: vi.fn().mockResolvedValue(true),
    numstat: vi.fn().mockResolvedValue([]),
  },
  fs: {
    readDir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
  },
  agents: {
    detect: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    config: vi.fn().mockResolvedValue({}),
  },
  claude: {
    listSessions: vi.fn().mockResolvedValue([]),
    readSession: vi.fn().mockResolvedValue(null),
    searchSessions: vi.fn().mockResolvedValue([]),
    getGlobalStats: vi.fn().mockResolvedValue(null),
  },
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
  dialog: {
    selectFolder: vi.fn().mockResolvedValue(null),
  },
  shells: {
    detect: vi.fn().mockResolvedValue([]),
  },
};

Object.defineProperty(window, 'maestro', {
  writable: true,
  value: mockMaestro,
});
