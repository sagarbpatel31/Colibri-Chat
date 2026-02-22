import { getCurrentLocation } from './location';
import { heartbeat, HeartbeatResult, RpcError } from './rpc';

export type HeartbeatHandler = (result: HeartbeatResult) => void;
export type HeartbeatErrorHandler = (error: RpcError) => void;

export type HeartbeatLoopOptions = {
  roomId: string;
  intervalMs?: number;
  onHeartbeat: HeartbeatHandler;
  onError?: HeartbeatErrorHandler;
};

export function startHeartbeatLoop(options: HeartbeatLoopOptions) {
  let stopped = false;
  const intervalMs = options.intervalMs ?? 25000;

  const tick = async () => {
    if (stopped) return;
    try {
      const location = await getCurrentLocation();
      const { data, error } = await heartbeat({
        roomId: options.roomId,
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
      });

      if (error) {
        options.onError?.(error);
        return;
      }

      if (data) {
        options.onHeartbeat(data);
      }
    } catch (error) {
      options.onError?.({
        code: 'unknown',
        message: error instanceof Error ? error.message : 'Heartbeat failed',
      });
    }
  };

  tick();
  const handle = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(handle);
  };
}
