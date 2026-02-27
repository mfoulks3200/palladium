import { backgrounds } from '@/lib/backgrounds';
import { ReactShaderToy } from './agents-ui/react-shader-toy';
import { useSettings } from '@/lib/settings';
import { useEffect, useMemo, useState } from 'react';

export const ShaderBackground = () => {
  const [lastShader, setLastShader] = useState('');
  const [shader] = useSettings('personalization.background.id');

  useEffect(() => {
    if (lastShader !== shader) {
      setLastShader(shader);
    }
  }, [shader]);

  return (
    <>
      {lastShader === shader && (
        <ReactShaderToy fs={backgrounds[shader].fs} precision="lowp" />
      )}
    </>
  );
};
