import { useEffect, useRef } from 'react';
import {
  AIRCRAFT_POSITION_POLL_MS,
  AircraftPosition,
  demoAircraftPosition,
  fetchAircraftPosition,
  tailToHex,
} from '@/lib/aircraft-position';

interface AircraftPositionPollOptions {
  /**
   * Spread (in degrees) of the demo position emitted for tail numbers without a
   * hex mapping. Omit to emit nothing for unmapped aircraft.
   */
  demoSpread?: number;
}

/**
 * Polls the live position of an in-flight tail number and hands each fix to
 * `onPosition`. Idle whenever `isInFlight` is false or no tail number is known.
 */
export function useAircraftPositionPolling(
  tailNumber: string | undefined,
  isInFlight: boolean,
  onPosition: (position: AircraftPosition) => void,
  options: AircraftPositionPollOptions = {},
) {
  const { demoSpread } = options;
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!tailNumber || !isInFlight) return;

    let cancelled = false;

    const update = async () => {
      if (!tailTracked(tailNumber)) {
        if (demoSpread !== undefined && !cancelled) {
          onPositionRef.current(demoAircraftPosition(demoSpread));
        }
        return;
      }
      const position = await fetchAircraftPosition(tailNumber);
      if (position && !cancelled) onPositionRef.current(position);
    };

    update();
    const interval = setInterval(update, AIRCRAFT_POSITION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tailNumber, isInFlight, demoSpread]);
}

function tailTracked(tailNumber: string): boolean {
  return tailToHex(tailNumber) !== '';
}
