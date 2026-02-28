import { backgrounds } from '@/lib/backgrounds';
import { ReactShaderToy } from './agents-ui/react-shader-toy';
import { useSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

export const ShaderBackground = () => {
  const [lastShader, setLastShader] = useState('');
  const [shader] = useSettings('personalization.background.id');
  const [maxFps] = useSettings('personalization.background.maxFps');
  const [speed] = useSettings('personalization.background.speed');
  const [thisShader] = useDebounce(
    JSON.stringify({ shader, maxFps, speed }),
    500,
  );

  useEffect(() => {
    if (lastShader !== thisShader) {
      setLastShader(thisShader);
    }
  }, [lastShader, thisShader]);

  // console.log(shader, maxFps, speed);

  return (
    <>
      {lastShader === thisShader && (
        <ReactShaderToy
          fs={backgrounds[shader].fs}
          timeMultiplier={speed}
          maxFPS={maxFps}
          precision="lowp"
        />
      )}
    </>
  );
};
