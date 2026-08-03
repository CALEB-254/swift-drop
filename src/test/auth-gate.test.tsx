import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {}, from: () => ({}) } }));
const ctxRef = vi.hoisted(() => ({ current: {} as any }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ctxRef.current }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { ProtectedRoute } from '@/components/ProtectedRoute';
describe('verified-only access gate', () => {
  it('renders children when verified', () => {
    ctxRef.current = { loading: false, refresh: vi.fn(), user: { email: 'a@b.com', email_confirmed_at: 'x', app_metadata: {} }, profile: { role: 'sender' } };
    render(<MemoryRouter><ProtectedRoute><div>secret dashboard</div></ProtectedRoute></MemoryRouter>);
    expect(screen.getByText('secret dashboard')).toBeTruthy();
  });

  it('keeps signed-out visitors out of protected content', () => {
    ctxRef.current = { loading: false, refresh: vi.fn(), user: null, profile: null };
    render(<MemoryRouter><ProtectedRoute><div>secret dashboard</div></ProtectedRoute></MemoryRouter>);
    expect(screen.queryByText('secret dashboard')).toBeNull();
  });
});
