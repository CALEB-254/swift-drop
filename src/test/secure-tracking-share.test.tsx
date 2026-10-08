import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SecureTrackingShare } from '@/components/SecureTrackingShare';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('secured tracking sharing', () => {
  it('shares only the token-based secured URL returned by link creation', async () => {
    rpc.mockResolvedValue({ data: { token: 'secure-token-123' }, error: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<SecureTrackingShare packageId="package-1" trackingNumber="SWF-TEST-123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create secured link' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('create_tracking_link', {
      _package_id: 'package-1', _pin: null, _expires_at: null,
    }));
    fireEvent.click(await screen.findByRole('button', { name: 'Share secured link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/secure-token-123`));
    expect(writeText.mock.calls[0][0]).not.toContain('/t/');
  });
});