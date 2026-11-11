import { useEffect, useState } from 'react';
import type { ExtensionResult, RendererToMainInvocations } from 'src/ipc';
import { Button } from '@/components/ui/button';

type Action = RendererToMainInvocations['manage-extensions']['args'][0];
const request = (action: Action) =>
  window.electron.ipcRenderer.invoke('manage-extensions', action);

export function ExtensionsPanel() {
  const [result, setResult] = useState<ExtensionResult>({ extensions: [] });
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let mounted = true;
    request({ action: 'list' })
      .then((value) => {
        if (mounted) setResult(value);
      })
      .catch(() => {
        if (mounted)
          setResult({
            extensions: [],
            error: 'Could not read installed extensions.',
          });
      })
      .finally(() => {
        if (mounted) setBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function change(action: Action) {
    setBusy(true);
    try {
      setResult(await request(action));
    } catch {
      setResult((previous) => ({
        ...previous,
        error: 'Could not update extensions.',
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Button disabled={busy} onClick={() => change({ action: 'install' })}>
        Load unpacked…
      </Button>
      {result.error && <p role="alert">{result.error}</p>}
      {!busy && !result.error && !result.extensions.length && (
        <p>No extensions installed.</p>
      )}
      {result.extensions.map((item) => (
        <section
          key={item.id}
          className="space-y-2 border-t pt-3"
          aria-label={item.name}
        >
          <h2 className="font-medium">
            {item.name} · {item.version}
          </h2>
          <p>
            {item.error
              ? 'Could not load'
              : item.enabled
                ? 'Enabled'
                : 'Disabled'}
          </p>
          {item.error && <p role="alert">{item.error}</p>}
          <details>
            <summary>Permissions</summary>
            {item.permissions.length ? (
              <ul>
                {item.permissions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p>No permissions or website access requested.</p>
            )}
          </details>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                change({
                  action: item.enabled ? 'disable' : 'enable',
                  id: item.id,
                })
              }
            >
              {item.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => change({ action: 'remove', id: item.id })}
            >
              Remove
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
