import { vi } from 'vitest';

/**
 * Shared Supabase client shape for Vitest UI/component tests.
 * Prefer `vi.hoisted(() => ({ supabase: mockSupabaseClient() }))` plus `vi.mock('../path/to/supabase', …)`
 * so tests never import the real client (which requires env at module load).
 */
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
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/clip.webm' } })),
      })),
    },
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
