import { backgrounds } from '@/lib/backgrounds';
import { ReactShaderToy } from './agents-ui/react-shader-toy';
import { useSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { type ShaderBackground as ShaderBackgroundType } from '@/lib/backgrounds';

const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;

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

  const shaderObj: ShaderBackgroundType = backgrounds[shader];

  // console.log(shader, maxFps, speed);

  const normalizedSpeed = (speed + 1) / 2;

  const minSpeed = shaderObj.speed?.min ?? -1;
  const maxSpeed = shaderObj.speed?.max ?? 1;

  const adjustedSpeed = lerp(minSpeed, maxSpeed, normalizedSpeed);

  return (
    <>
      {lastShader === thisShader && (
        <ReactShaderToy
          fs={shaderObj.fs}
          timeMultiplier={adjustedSpeed}
          maxFPS={maxFps}
          precision="lowp"
        />
      )}
    </>
  );
};
