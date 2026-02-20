import PackageJson from '../../../../../package.json';

import iconImage from '../../../../../assets/icon.png';

export const AboutPanel = () => {
  return (
    <div className="flex h-96 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl">
      <img
        src={iconImage}
        className="pointer-events-none max-h-1/2 min-h-1/2 pb-8 select-none"
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
