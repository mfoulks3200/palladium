import { useEffect } from 'react';
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
  const router = createMemoryRouter(routes, {});

  useEffect(() => {
    router.navigate(path.replace('palladium://', '/'));
  }, [path]);

  return <RouterProvider router={router} />;
};
