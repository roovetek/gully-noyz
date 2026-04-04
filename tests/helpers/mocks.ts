import { vi } from 'vitest';

export function mockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  };
}

export function mockMediaRecorder() {
  return class MockMediaRecorder {
    ondataavailable: ((event: any) => void) | null = null;
    onstop: (() => void) | null = null;
    state: string = 'inactive';

    start() {
      this.state = 'recording';
    }

    stop() {
      this.state = 'inactive';
      if (this.onstop) this.onstop();
    }

    pause() {
      this.state = 'paused';
    }

    resume() {
      this.state = 'recording';
    }
  };
}
