import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {}, from: () => ({}) },
}));
const ctxRef = vi.hoisted(() => ({ current: {} as any }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ctxRef.current,
  AuthProvider: ({ children }: any) => children,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/EmailVerificationBlock', () => ({
  EmailVerificationBlock: ({ email }: { email: string }) => <div>verify {email}</div>,
}));

import { ProtectedRoute } from '@/components/ProtectedRoute';

describe('verified-only access gate', () => {
  const renderGate = (ctx: any) => {
    ctxRef.current = {
      signOut: vi.fn(), refresh: vi.fn(), signIn: vi.fn(), signUp: vi.fn(),
      session: null, ...ctx,
    };
    return render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>secret dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
  };

  it('blocks unverified email users from protected content', () => {
    renderGate({
      loading: false,
      user: { id: 'u1', email: 'a@b.com', email_confirmed_at: null, app_metadata: {} },
      profile: null,
    });
    expect(screen.queryByText('secret dashboard')).toBeNull();
    expect(screen.getByText(/verify a@b.com/i)).toBeTruthy();
  });

  it('lets verified users through', () => {
    renderGate({
      loading: false,
      user: { id: 'u1', email: 'a@b.com', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {} },
      profile: { role: 'sender' },
    });
    expect(screen.getByText('secret dashboard')).toBeTruthy();
  });

  it('redirects signed-out visitors away from protected content', () => {
    renderGate({ loading: false, user: null, profile: null });
    expect(screen.queryByText('secret dashboard')).toBeNull();
  });
});
