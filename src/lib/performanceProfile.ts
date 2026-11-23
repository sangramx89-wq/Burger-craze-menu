import { useEffect, useState } from 'react';

export interface PerformanceSignals {
  isMobileViewport: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface PerformanceProfile {
  /** True on phones, reduced-motion, Save-Data, slow networks, or older/low-RAM hardware */
  isLiteMode: boolean;
  /** True when network connection reports Save-Data or slow-2g/2g/3g */
  isSlowNetwork: boolean;
  /** False on Save-Data or slow cellular connections so idle prefetches don't waste bandwidth */
  shouldPrefetchSecondary: boolean;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export function evaluatePerformanceProfile(signals: PerformanceSignals): PerformanceProfile {
  const effective = (signals.effectiveType || '').toLowerCase();
  const isSlowNetwork = Boolean(
    signals.saveData ||
      effective === 'slow-2g' ||
      effective === '2g' ||
      effective === '3g'
  );

  const isLowPowerHardware = Boolean(
    (typeof signals.deviceMemory === 'number' && signals.deviceMemory <= 3) ||
      (typeof signals.hardwareConcurrency === 'number' && signals.hardwareConcurrency <= 4)
  );

  const isLiteMode = Boolean(
    signals.isMobileViewport ||
      signals.prefersReducedMotion ||
      isSlowNetwork ||
      isLowPowerHardware
  );

  return {
    isLiteMode,
    isSlowNetwork,
    shouldPrefetchSecondary: !isSlowNetwork,
  };
}

function readWindowPerformanceSignals(): PerformanceSignals {
  if (typeof window === 'undefined') {
    return {
      isMobileViewport: false,
      prefersReducedMotion: false,
      saveData: false,
    };
  }

  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    deviceMemory?: number;
  };

  return {
    isMobileViewport: window.matchMedia?.('(max-width: 767px)').matches ?? window.innerWidth < 768,
    prefersReducedMotion:
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: Boolean(nav.connection?.saveData),
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  };
}

export function getPerformanceProfile(): PerformanceProfile {
  return evaluatePerformanceProfile(readWindowPerformanceSignals());
}

export function usePerformanceProfile(): PerformanceProfile {
  const [profile, setProfile] = useState<PerformanceProfile>(() => getPerformanceProfile());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setProfile(getPerformanceProfile());
    const mobileQuery = window.matchMedia?.('(max-width: 767px)');
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const nav = navigator as Navigator & { connection?: NetworkInformationLike };

    mobileQuery?.addEventListener?.('change', update);
    motionQuery?.addEventListener?.('change', update);
    nav.connection?.addEventListener?.('change', update);

    return () => {
      mobileQuery?.removeEventListener?.('change', update);
      motionQuery?.removeEventListener?.('change', update);
      nav.connection?.removeEventListener?.('change', update);
    };
  }, []);

  return profile;
}
