import type { UniformMap } from './uniform-manager';

export const PRECISIONS = ['lowp', 'mediump', 'highp'];

export const FS_MAIN_SHADER = `\nvoid main(void){
    vec4 color = vec4(0.0,0.0,0.0,1.0);
    mainImage( color, gl_FragCoord.xy );
    gl_FragColor = color;
}`;

export const BASIC_FS = `void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord/iResolution.xy;
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    fragColor = vec4(col,1.0);
}`;

export const BASIC_VS = `attribute vec3 aVertexPosition;
void main(void) {
    gl_Position = vec4(aVertexPosition, 1.0);
}`;

const log = (text: string) => `react-shaders: ${text}`;

const insertStringAtIndex = (
  currentString: string,
  string: string,
  index: number,
) =>
  index > 0
    ? currentString.substring(0, index) +
      string +
      currentString.substring(index, currentString.length)
    : string + currentString;

export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  shaderCodeAsText: string,
  onWarning?: (msg: string) => void,
  onError?: (msg: string) => void,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, shaderCodeAsText);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    onWarning?.(log(`Error compiling the shader:\n${shaderCodeAsText}`));
    const compilationLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    onError?.(log(`Shader compiler log: ${compilationLog}`));
  }
  return shader;
}

export function preProcessFragment(
  fragment: string,
  uniforms: UniformMap,
  precision: string,
  devicePixelRatio: number,
): string {
  const isValidPrecision = PRECISIONS.includes(precision ?? 'highp');
  const precisionString = `precision ${isValidPrecision ? precision : PRECISIONS[1]} float;\n`;

  const extensionMatches = fragment.match(/^\s*#extension.*\n/gm) || [];
  const cleanFragment = fragment.replace(/^\s*#extension.*\n/gm, '');

  let fragmentShader = extensionMatches
    .join('')
    .concat(precisionString)
    .concat(`#define DPR ${devicePixelRatio.toFixed(1)}\n`)
    .concat(cleanFragment.replace(/texture\(/g, 'texture2D('));

  for (const uniform of Object.keys(uniforms)) {
    if (fragment.includes(uniform)) {
      const u = uniforms[uniform];
      if (!u) continue;
      fragmentShader = insertStringAtIndex(
        fragmentShader,
        `uniform ${u.type} ${uniform}${u.arraySize || ''}; \n`,
        fragmentShader.lastIndexOf(precisionString) + precisionString.length,
      );
      u.isNeeded = true;
    }
  }

  const isShadertoy = fragment.includes('mainImage');
  if (isShadertoy) fragmentShader = fragmentShader.concat(FS_MAIN_SHADER);
  return fragmentShader;
}
