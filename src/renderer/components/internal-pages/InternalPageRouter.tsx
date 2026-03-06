import { useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { SettingsPage } from './settings';
import { EditorPage } from './editor';

const routes = [
  {
    path: '/',
    element: <div></div>,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/editor',
    element: <EditorPage />,
  },
];

export const InternalPageRouter = ({ path }: { path: string }) => {
  const [router] = useState(() =>
    createMemoryRouter(routes, {
      initialEntries: [path.replace('palladium://', '/')],
    }),
  );

  useEffect(() => {
    router.navigate(path.replace('palladium://', '/'));
  }, [path, router]);

  return <RouterProvider router={router} />;
};
