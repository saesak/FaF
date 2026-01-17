import type { Platform } from './types';

export interface PlatformInfo {
  platform: Platform;
  isTouchDevice: boolean;
  hasKeyboard: boolean;
  isTauri: boolean;
  isCapacitor: boolean;
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      isTouchDevice: false,
      hasKeyboard: true,
      isTauri: false,
      isCapacitor: false,
    };
  }

  const isTauri = '__TAURI__' in window;

  const isCapacitor =
    'Capacitor' in window &&
    (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const minDimension = Math.min(screenWidth, screenHeight);

  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile'];
  const isMobileUA = mobileKeywords.some((kw) => userAgent.includes(kw));

  let platform: Platform;

  if (isTauri) {
    platform = 'desktop';
  } else if (isCapacitor) {
    platform = minDimension >= 768 ? 'tablet' : 'mobile';
  } else if (isMobileUA) {
    platform = minDimension >= 768 ? 'tablet' : 'mobile';
  } else {
    platform = 'desktop';
  }

  const hasKeyboard = platform === 'desktop' || !isTouchDevice || (isTouchDevice && minDimension >= 768);

  return {
    platform,
    isTouchDevice,
    hasKeyboard,
    isTauri,
    isCapacitor,
  };
}

let platformInfo: PlatformInfo | null = null;

export function getPlatformInfo(): PlatformInfo {
  if (!platformInfo) {
    platformInfo = detectPlatform();
  }
  return platformInfo;
}

export function isMobile(): boolean {
  return getPlatformInfo().platform === 'mobile';
}

export function isDesktop(): boolean {
  return getPlatformInfo().platform === 'desktop';
}

export function isTablet(): boolean {
  return getPlatformInfo().platform === 'tablet';
}

export function isTouchDevice(): boolean {
  return getPlatformInfo().isTouchDevice;
}

export function resetPlatformInfo(): void {
  platformInfo = null;
}
