export type Vector4<T = number> = [T, T, T, T];
export type Uniform = { type: string; value: number[] | number };
export type Uniforms = Record<string, Uniform>;
export type UniformType = keyof Uniforms;

export const UNIFORM_TIME = 'iTime';
export const UNIFORM_TIMEDELTA = 'iTimeDelta';
export const UNIFORM_DATE = 'iDate';
export const UNIFORM_FRAME = 'iFrame';
export const UNIFORM_MOUSE = 'iMouse';
export const UNIFORM_RESOLUTION = 'iResolution';
export const UNIFORM_CHANNEL = 'iChannel';
export const UNIFORM_CHANNELRESOLUTION = 'iChannelResolution';
export const UNIFORM_DEVICEORIENTATION = 'iDeviceOrientation';

export function isMatrixType(t: string, v: number[] | number): v is number[] {
  return t.includes('Matrix') && Array.isArray(v);
}

export function isVectorListType(
  t: string,
  v: number[] | number,
): v is number[] {
  return (
    t.includes('v') &&
    Array.isArray(v) &&
    v.length > Number.parseInt(t.charAt(0))
  );
}

export function isVectorType(t: string, v: number[] | number): v is Vector4 {
  return (
    !t.includes('v') &&
    Array.isArray(v) &&
    v.length > Number.parseInt(t.charAt(0))
  );
}

export const processUniform = <T extends UniformType>(
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation,
  t: T,
  value: number | number[],
) => {
  if (isVectorType(t, value)) {
    switch (t) {
      case '2f':
        return gl.uniform2f(location, value[0], value[1]);
      case '3f':
        return gl.uniform3f(location, value[0], value[1], value[2]);
      case '4f':
        return gl.uniform4f(location, value[0], value[1], value[2], value[3]);
      case '2i':
        return gl.uniform2i(location, value[0], value[1]);
      case '3i':
        return gl.uniform3i(location, value[0], value[1], value[2]);
      case '4i':
        return gl.uniform4i(location, value[0], value[1], value[2], value[3]);
    }
  }
  if (typeof value === 'number') {
    switch (t) {
      case '1i':
        return gl.uniform1i(location, value);
      default:
        return gl.uniform1f(location, value);
    }
  }
  switch (t) {
    case '1iv':
      return gl.uniform1iv(location, value);
    case '2iv':
      return gl.uniform2iv(location, value);
    case '3iv':
      return gl.uniform3iv(location, value);
    case '4iv':
      return gl.uniform4iv(location, value);
    case '1fv':
      return gl.uniform1fv(location, value);
    case '2fv':
      return gl.uniform2fv(location, value);
    case '3fv':
      return gl.uniform3fv(location, value);
    case '4fv':
      return gl.uniform4fv(location, value);
    case 'Matrix2fv':
      return gl.uniformMatrix2fv(location, false, value);
    case 'Matrix3fv':
      return gl.uniformMatrix3fv(location, false, value);
    case 'Matrix4fv':
      return gl.uniformMatrix4fv(location, false, value);
  }
};

export const uniformTypeToGLSLType = (t: string) => {
  switch (t) {
    case '1f':
      return 'float';
    case '2f':
      return 'vec2';
    case '3f':
      return 'vec3';
    case '4f':
      return 'vec4';
    case '1i':
      return 'int';
    case '2i':
      return 'ivec2';
    case '3i':
      return 'ivec3';
    case '4i':
      return 'ivec4';
    case '1iv':
      return 'int';
    case '2iv':
      return 'ivec2';
    case '3iv':
      return 'ivec3';
    case '4iv':
      return 'ivec4';
    case '1fv':
      return 'float';
    case '2fv':
      return 'vec2';
    case '3fv':
      return 'vec3';
    case '4fv':
      return 'vec4';
    case 'Matrix2fv':
      return 'mat2';
    case 'Matrix3fv':
      return 'mat3';
    case 'Matrix4fv':
      return 'mat4';
    default:
      console.error(
        log(
          `The uniform type "${t}" is not valid, please make sure your uniform type is valid`,
        ),
      );
  }
};

export type UniformEntry = {
  type: string;
  isNeeded: boolean;
  value?: number[] | number;
  arraySize?: string;
};

export type UniformMap = Record<string, UniformEntry>;

export function createDefaultUniforms(): UniformMap {
  return {
    [UNIFORM_TIME]: { type: 'float', isNeeded: false, value: 0 },
    [UNIFORM_TIMEDELTA]: { type: 'float', isNeeded: false, value: 0 },
    [UNIFORM_DATE]: { type: 'vec4', isNeeded: false, value: [0, 0, 0, 0] },
    [UNIFORM_MOUSE]: { type: 'vec4', isNeeded: false, value: [0, 0, 0, 0] },
    [UNIFORM_RESOLUTION]: { type: 'vec2', isNeeded: false, value: [0, 0] },
    [UNIFORM_FRAME]: { type: 'int', isNeeded: false, value: 0 },
    [UNIFORM_DEVICEORIENTATION]: {
      type: 'vec4',
      isNeeded: false,
      value: [0, 0, 0, 0],
    },
  };
}

const log = (text: string) => `react-shaders: ${text}`;
