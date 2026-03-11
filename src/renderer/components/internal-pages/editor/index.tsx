import { Workspace } from './Workspace';
import { useContext, useEffect } from 'react';
import { InternalTabMetaContext } from '@/lib/tab-meta';
import { Info } from 'lucide-react';

export const EditorPage = () => {
  const internalTabMeta = useContext(InternalTabMetaContext);

  useEffect(() => {
    if (internalTabMeta) {
      internalTabMeta.setTabMeta({
        title: `Mods - Editor`,
        icon: <Info />,
      });
    }
  }, []);

  return <Workspace />;
};
