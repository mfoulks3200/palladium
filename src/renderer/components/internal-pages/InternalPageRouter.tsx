import { matchRoutes } from 'react-router-dom';
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
  const matches = matchRoutes(routes, path.replace('palladium://', '/'));
  return matches?.[0]?.route.element ?? null;
};
