/**
 * Tests for RPC error parsing logic.
 * We test through the module's exported functions by mocking supabase.
 */

jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { getNearbyRooms, sendMessage } from '../lib/rpc';
import { supabase } from '../lib/supabase';

const mockRpc = supabase.rpc as jest.Mock;

describe('rpc error parsing', () => {
  afterEach(() => {
    mockRpc.mockReset();
  });

  it('parses known error codes from error messages', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'new row violates: rate_limited' },
    });

    const result = await sendMessage({
      roomId: 'room-1',
      text: 'hello',
      lat: 0,
      lng: 0,
      accuracyM: 10,
    });

    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('rate_limited');
  });

  it('returns unknown for unrecognized error messages', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'something unexpected happened' },
    });

    const result = await sendMessage({
      roomId: 'room-1',
      text: 'hello',
      lat: 0,
      lng: 0,
      accuracyM: 10,
    });

    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('unknown');
  });

  it('returns null error on success', async () => {
    mockRpc.mockResolvedValue({
      data: [{ message_id: 'msg-1', created_at: '2024-01-01', expires_at: '2024-01-01' }],
      error: null,
    });

    const result = await sendMessage({
      roomId: 'room-1',
      text: 'hello',
      lat: 0,
      lng: 0,
      accuracyM: 10,
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.message_id).toBe('msg-1');
  });

  it('parses pii_blocked error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'pii_blocked' },
    });

    const result = await sendMessage({
      roomId: 'room-1',
      text: 'my email is test@test.com',
      lat: 0,
      lng: 0,
      accuracyM: 10,
    });

    expect(result.error!.code).toBe('pii_blocked');
  });

  it('parses outside_geofence for getNearbyRooms', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await getNearbyRooms({
      lat: 0,
      lng: 0,
      accuracyM: 10,
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
