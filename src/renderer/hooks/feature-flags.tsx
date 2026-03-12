import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeatureFlagValue = string | boolean;

interface FeatureFlagContextState {
  /** All flags keyed by name. Values are `true`/`false` for boolean flags or a
   *  variant string for multivariate flags. */
  flags: Record<string, FeatureFlagValue>;
  /** Force a fresh fetch of feature flags from PostHog. */
  refreshFlags: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FeatureFlagContext = createContext<FeatureFlagContextState>({
  flags: {},
  refreshFlags: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Subscribes to feature-flag updates pushed from the Main process and exposes
 * them via React context.  Mount this once near the top of the component tree.
 *
 * On mount it sends a `feature-flags-sync` request so the Main process replies
 * with the latest cached flags. It also listens for subsequent pushes that
 * happen whenever the AnalyticsManager polls PostHog.
 */
export const FeatureFlagProvider = ({ children }: PropsWithChildren) => {
  const [flags, setFlags] = useState<Record<string, FeatureFlagValue>>({});

  const refreshFlags = useCallback(() => {
    window.electron.ipcRenderer.sendMessage('feature-flags-refresh');
  }, []);

  useEffect(() => {
    // Fetch initial flags via invoke, then subscribe to push updates.
    window.electron.ipcRenderer
      .invoke('get-feature-flags')
      .then((data) => setFlags(data.flags))
      .catch(console.error);

    const removeListener = window.electron.ipcRenderer.on(
      'feature-flags-sync',
      (data) => {
        setFlags(data.flags);
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, refreshFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the value of a single feature flag.
 *
 * - Boolean flags return `true` / `false`.
 * - Multivariate flags return the variant string.
 * - Unknown / not-yet-loaded flags return `undefined`.
 *
 * @example
 * ```tsx
 * const isEnabled = useFeatureFlag('new-settings-ui');
 * if (isEnabled) { … }
 * ```
 */
export const useFeatureFlag = (key: string): FeatureFlagValue | undefined => {
  const { flags } = useContext(FeatureFlagContext);
  return flags[key];
};

/**
 * Returns the full map of all feature flags.
 *
 * @example
 * ```tsx
 * const flags = useFeatureFlags();
 * console.log(flags); // { 'new-ui': true, 'experiment-variant': 'control' }
 * ```
 */
export const useFeatureFlags = (): Record<string, FeatureFlagValue> => {
  const { flags } = useContext(FeatureFlagContext);
  return flags;
};

/**
 * Returns a function that forces a fresh fetch of feature flags from PostHog.
 * The updated flags will flow back through the context automatically.
 *
 * @example
 * ```tsx
 * const refresh = useRefreshFeatureFlags();
 * <button onClick={refresh}>Refresh flags</button>
 * ```
 */
export const useRefreshFeatureFlags = (): (() => void) => {
  const { refreshFlags } = useContext(FeatureFlagContext);
  return refreshFlags;
};
