import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { SystemMetaIpc } from '../../ipc';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SystemMetaContext = createContext<SystemMetaIpc | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Requests system metadata from the Main process on mount and exposes it via
 * React context. Mount this once near the top of the component tree.
 *
 * The metadata is fetched once (it never changes during the app lifecycle).
 */
export const SystemMetaProvider = ({ children }: PropsWithChildren) => {
  const [meta, setMeta] = useState<SystemMetaIpc | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke('get-system-meta')
      .then(setMeta)
      .catch(console.error);
  }, []);

  return (
    <SystemMetaContext.Provider value={meta}>
      {children}
    </SystemMetaContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the full system metadata object, or `null` if it hasn't been
 * received from the Main process yet.
 *
 * @example
 * ```tsx
 * const meta = useSystemMeta();
 * if (meta) {
 *   console.log(meta.platform, meta.osVersion);
 * }
 * ```
 */
export const useSystemMeta = (): SystemMetaIpc | null => {
  return useContext(SystemMetaContext);
};
