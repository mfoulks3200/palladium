import { BrowserWindow, dialog, Session } from 'electron';

function origin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

// Decisions last for this browser session and never grant additional capabilities.
export function configureWebsitePermissions(session: Session) {
  const decisions = new Map<string, boolean>();
  const supported = new Set([
    'media',
    'geolocation',
    'notifications',
    'clipboard-read',
  ]);
  const key = (site: string, permission: string, media: string[] = []) =>
    JSON.stringify([site, permission, [...media].sort()]);

  session.setPermissionCheckHandler(
    (contents, permission, requestingOrigin, details) => {
      const site = origin(
        details.securityOrigin || details.requestingUrl || requestingOrigin,
      );
      if (
        !site ||
        !contents ||
        contents.isDestroyed() ||
        origin(contents.getURL()) !== site
      )
        return false;
      if (permission === 'media') {
        if (!['audio', 'video'].includes(details.mediaType ?? '')) return false;
        return (
          decisions.get(key(site, permission, [details.mediaType!])) === true
        );
      }
      return decisions.get(key(site, permission)) === true;
    },
  );

  session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      const site = origin(details.requestingUrl);
      const media =
        permission === 'media' && 'mediaTypes' in details
          ? (details.mediaTypes ?? [])
          : [];
      if (
        !site ||
        contents.isDestroyed() ||
        origin(contents.getURL()) !== site ||
        !supported.has(permission) ||
        (permission === 'media' &&
          (!media.length ||
            media.some((type) => !['audio', 'video'].includes(type))))
      ) {
        callback(false);
        return;
      }
      const keys =
        permission === 'media'
          ? media.map((type) => key(site, permission, [type]))
          : [key(site, permission)];
      if (keys.every((id) => decisions.has(id))) {
        callback(keys.every((id) => decisions.get(id) === true));
        return;
      }
      const parent =
        BrowserWindow.fromWebContents(contents) ??
        BrowserWindow.getAllWindows().find((win) =>
          win.contentView.children.some(
            (view) => 'webContents' in view && view.webContents === contents,
          ),
        );
      if (!parent || parent.isDestroyed()) {
        callback(false);
        return;
      }
      const url = contents.getURL();
      let navigated = false;
      const onNavigate = () => {
        navigated = true;
      };
      contents.on('did-start-navigation', onNavigate);
      void dialog
        .showMessageBox(parent, {
          type: 'question',
          title: 'Website permission',
          message: `${site} requests ${permission === 'media' ? media.join(' and ') : permission} access`,
          detail: 'Allow access for this browser session?',
          buttons: ['Deny', 'Allow'],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        })
        .then(
          ({ response }) => {
            contents.removeListener('did-start-navigation', onNavigate);
            if (
              navigated ||
              contents.isDestroyed() ||
              parent.isDestroyed() ||
              contents.getURL() !== url
            ) {
              callback(false);
              return;
            }
            const allowed = response === 1;
            keys.forEach((id) => decisions.set(id, allowed));
            callback(allowed);
          },
          () => {
            contents.removeListener('did-start-navigation', onNavigate);
            callback(false);
          },
        );
    },
  );
}
