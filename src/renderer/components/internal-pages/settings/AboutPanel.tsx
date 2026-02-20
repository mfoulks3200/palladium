import PackageJson from '../../../../../package.json';

import iconImage from '../../../../../assets/icon.png';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const AboutPanel = () => {
  const [iconLoaded, setIconLoaded] = useState(false);

  const onLoad = () => {
    if (!iconLoaded) {
      setIconLoaded(true);
    }
  };

  return (
    <div className="flex h-96 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl">
      <img
        src={iconImage}
        onLoad={onLoad}
        draggable="false"
        className={cn(
          'relative max-h-1/2 min-h-1/2 pb-8 opacity-0 transition-all duration-500 ease-in-out select-none',
          'hover:scale-110 hover:rotate-3',
          {
            ['top-0 scale-100 opacity-100']: iconLoaded,
            ['top-2 scale-95']: !iconLoaded,
          },
        )}
      />
      <div className="flex select-none">
        <div className="text-6xl font-light">Palladium</div>
        <div className="text-sm font-light">Alpha</div>
      </div>
      <div className="text-muted flex gap-1 font-medium">
        <span className="select-none">Version</span>
        <span>{PackageJson.version}</span>
      </div>
    </div>
  );
};
