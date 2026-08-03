import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ---- Supabase client mock -------------------------------------------------
const { authMock, rpcMock, fromMock } = vi.hoisted(() => {
  const authMock = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(async () => ({ data: { user: null } })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    resend: vi.fn(async () => ({ error: null })),
  };
  const rpcMock = vi.fn(async () => ({ data: false, error: null }));
  const fromMock = vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
  }));
  return { authMock, rpcMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: authMock,
    rpc: (...args: any[]) => (rpcMock as any)(...args),
    from: (...args: any[]) => (fromMock as any)(...args),
  },
}));

const ctxRef = vi.hoisted(() => ({ current: {} as any }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ctxRef.current,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAuth, normalizePhone } from '@/hooks/useAuth';


/** Minimal harness to call hook methods outside of React events. */
function getSignUp() {
  let api: ReturnType<typeof useAuth> | null = null;
  function Probe() {
    api = useAuth();
    return null;
  }
  render(<MemoryRouter><Probe /></MemoryRouter>);
  return api!;
}

beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ data: false, error: null } as any);
});

describe('phone normalization', () => {
  it('normalizes Kenyan formats', () => {
    expect(normalizePhone('0712345678')).toBe('+254712345678');
    expect(normalizePhone('712345678')).toBe('+254712345678');
    expect(normalizePhone('+254112345678')).toBe('+254112345678');
  });
  it('rejects invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('+1 555 0100')).toBeNull();
  });
});

describe('signup', () => {
  it('succeeds end-to-end and forwards normalized metadata', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, session: null },
      error: null,
    });
    const { signUp } = getSignUp();
    const data = await signUp('a@b.com', 'secret123', 'Jane Doe', '0712345678', 'sender');

    expect(data.user.id).toBe('u1');
    expect(authMock.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        options: expect.objectContaining({
          data: expect.objectContaining({ phone: '+254712345678', full_name: 'Jane Doe', role: 'sender' }),
        }),
      }),
    );
  });

  it('blocks a duplicate phone number before creating the account', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null } as any);
    const { signUp } = getSignUp();

    await expect(
      signUp('a@b.com', 'secret123', 'Jane Doe', '0712345678', 'sender'),
    ).rejects.toThrow(/already uses this phone number/i);
    expect(authMock.signUp).not.toHaveBeenCalled();
  });

  it('surfaces server-side validation rejections from the database', async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Database error saving new user: invalid full_name'),
    });
    const { signUp } = getSignUp();

    await expect(
      signUp('a@b.com', 'secret123', 'Jane Doe', '0712345678', 'sender'),
    ).rejects.toThrow(/invalid full_name/i);
  });

  it('rejects an invalid phone client-side without hitting the network', async () => {
    const { signUp } = getSignUp();
    await expect(
      signUp('a@b.com', 'secret123', 'Jane Doe', '123', 'sender'),
    ).rejects.toThrow(/valid Kenyan phone/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

