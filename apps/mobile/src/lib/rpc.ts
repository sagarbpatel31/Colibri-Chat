import { supabase } from './supabase';

export type RpcErrorCode =
  | 'not_authenticated'
  | 'room_not_found'
  | 'room_not_active'
  | 'outside_geofence'
  | 'invalid_accuracy'
  | 'low_accuracy'
  | 'rate_limited'
  | 'message_too_long'
  | 'empty_message'
  | 'pii_blocked'
  | 'content_blocked'
  | 'shadow_muted'
  | 'not_a_member'
  | 'message_not_found'
  | 'user_timed_out';

const KNOWN_ERRORS = new Set<RpcErrorCode>([
  'not_authenticated',
  'room_not_found',
  'room_not_active',
  'outside_geofence',
  'invalid_accuracy',
  'low_accuracy',
  'rate_limited',
  'message_too_long',
  'empty_message',
  'pii_blocked',
  'content_blocked',
  'shadow_muted',
  'not_a_member',
  'message_not_found',
  'user_timed_out',
]);

export type RpcError = {
  code: RpcErrorCode | 'unknown';
  message: string;
};

function parseRpcError(error: { message?: string } | null): RpcError | null {
  if (!error) return null;
  const message = error.message ?? 'Unknown error';
  const code = Array.from(KNOWN_ERRORS).find((known) => message.includes(known));
  return { code: code ?? 'unknown', message };
}

export type NearbyRoom = {
  id: string;
  room_type: 'neighborhood' | 'event';
  name: string;
  radius_m: number;
  tolerance_m: number;
  starts_at: string | null;
  ends_at: string | null;
  distance_m: number;
  is_active: boolean;
  member_count: number;
};

export async function getNearbyRooms(params: {
  lat: number;
  lng: number;
  accuracyM: number;
  limit?: number;
}): Promise<{ data: NearbyRoom[] | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('get_nearby_rooms', {
    p_lat: params.lat,
    p_lng: params.lng,
    p_accuracy_m: params.accuracyM,
    p_limit: params.limit ?? 20,
  });

  return { data, error: parseRpcError(error) };
}

export type JoinRoomResult = {
  room_id: string;
  user_id: string;
  alias: string;
};

export async function joinRoom(params: {
  roomId: string;
  lat: number;
  lng: number;
  accuracyM: number;
}): Promise<{ data: JoinRoomResult | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('join_room', {
    p_room_id: params.roomId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_accuracy_m: params.accuracyM,
  });

  const row = data?.[0] ?? null;
  const mapped: JoinRoomResult | null = row
    ? { room_id: row.out_room_id ?? row.room_id, user_id: row.out_user_id ?? row.user_id, alias: row.out_alias ?? row.alias }
    : null;
  return { data: mapped, error: parseRpcError(error) };
}

export type HeartbeatResult = {
  room_id: string;
  user_id: string;
  is_present: boolean;
  distance_m: number;
};

export async function heartbeat(params: {
  roomId: string;
  lat: number;
  lng: number;
  accuracyM: number;
}): Promise<{ data: HeartbeatResult | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('heartbeat', {
    p_room_id: params.roomId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_accuracy_m: params.accuracyM,
  });

  const hbRow = data?.[0] ?? null;
  const hbMapped: HeartbeatResult | null = hbRow
    ? { room_id: hbRow.out_room_id ?? hbRow.room_id, user_id: hbRow.out_user_id ?? hbRow.user_id, is_present: hbRow.is_present, distance_m: hbRow.distance_m }
    : null;
  return { data: hbMapped, error: parseRpcError(error) };
}

export type SendMessageResult = {
  message_id: string;
  created_at: string;
  expires_at: string;
};

export async function sendMessage(params: {
  roomId: string;
  text: string;
  lat: number;
  lng: number;
  accuracyM: number;
}): Promise<{ data: SendMessageResult | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('send_message', {
    p_room_id: params.roomId,
    p_text: params.text,
    p_lat: params.lat,
    p_lng: params.lng,
    p_accuracy_m: params.accuracyM,
  });

  const smRow = data?.[0] ?? null;
  const smMapped: SendMessageResult | null = smRow
    ? { message_id: smRow.out_message_id ?? smRow.message_id, created_at: smRow.out_created_at ?? smRow.created_at, expires_at: smRow.out_expires_at ?? smRow.expires_at }
    : null;
  return { data: smMapped, error: parseRpcError(error) };
}

export type CreateRoomResult = {
  room_id: string;
  name: string;
  room_type: string;
};

export async function createRoom(params: {
  name: string;
  roomType: 'neighborhood' | 'event';
  lat: number;
  lng: number;
  radiusM?: number;
  startsAt?: string;
  endsAt?: string;
}): Promise<{ data: CreateRoomResult | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('create_room', {
    p_name: params.name,
    p_room_type: params.roomType,
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_m: params.radiusM ?? 200,
    p_starts_at: params.startsAt ?? null,
    p_ends_at: params.endsAt ?? null,
  });

  return { data: data?.[0] ?? null, error: parseRpcError(error) };
}

export type ReportMessageResult = {
  report_id: string;
  shadow_muted: boolean;
};

export async function reportMessage(params: {
  roomId: string;
  messageId: string;
  reason: string;
}): Promise<{ data: ReportMessageResult | null; error: RpcError | null }> {
  const { data, error } = await supabase.rpc('report_message', {
    p_room_id: params.roomId,
    p_message_id: params.messageId,
    p_reason: params.reason,
  });

  const rpRow = data?.[0] ?? null;
  const rpMapped: ReportMessageResult | null = rpRow
    ? { report_id: rpRow.out_report_id ?? rpRow.report_id, shadow_muted: rpRow.out_shadow_muted ?? rpRow.shadow_muted }
    : null;
  return { data: rpMapped, error: parseRpcError(error) };
}
