import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@lyricsionary_last_crash';

export interface CrashReport {
  kind: 'render' | 'global' | 'rejection';
  message: string;
  stack?: string;
  componentStack?: string;
  at: string;
  fatal?: boolean;
  // Set once the crash screen has been shown, so a restart doesn't show it again
  shown?: boolean;
}

type Listener = (report: CrashReport) => void;
const listeners = new Set<Listener>();
let installed = false;

export const subscribeToCrashes = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const saveCrash = async (report: CrashReport) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(report));
  } catch {
    // Nothing more can be done if storage itself fails
  }
};

export const loadLastCrash = async (): Promise<CrashReport | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CrashReport) : null;
  } catch {
    return null;
  }
};

export const clearLastCrash = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

export const toReport = (error: unknown, kind: CrashReport['kind'], extra: Partial<CrashReport> = {}): CrashReport => {
  const err = error as { message?: string; stack?: string } | undefined;
  return {
    kind,
    message: err?.message ?? String(error),
    stack: err?.stack,
    at: new Date().toISOString(),
    ...extra,
  };
};

export const formatCrash = (report: CrashReport) =>
  [
    `${report.kind} error at ${report.at}${report.fatal ? ' (fatal)' : ''}`,
    report.message,
    report.stack ? `\nStack:\n${report.stack}` : '',
    report.componentStack ? `\nComponent stack:${report.componentStack}` : '',
  ].join('\n');

const publish = (report: CrashReport) => {
  void saveCrash(report);
  listeners.forEach((l) => l(report));
};

// Catches what a render boundary can't: errors thrown in handlers, timers and promises
export const installGlobalCrashHandlers = () => {
  if (installed) return;
  installed = true;
  const errorUtils = (globalThis as any).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      publish(toReport(error, 'global', { fatal: !!isFatal }));
      // In dev keep the red box; in release the default handler would just close the app
      if (__DEV__) previous?.(error, isFatal);
    });
  }
  const onUnhandled = (_id: unknown, error: unknown) => {
    // Rejections don't blank the app, so they are only kept to read later
    void saveCrash(toReport(error, 'rejection', { shown: false }));
  };
  try {
    const hermes = (globalThis as any).HermesInternal;
    if (hermes?.hasPromise?.() && hermes.enablePromiseRejectionTracker) {
      hermes.enablePromiseRejectionTracker({ allRejections: true, onUnhandled });
    } else {
      require('promise/setimmediate/rejection-tracking').enable({ allRejections: true, onUnhandled });
    }
  } catch {
    // Tracking is best effort
  }
};
