import {
  preProcessFragment,
  PRECISIONS,
  BASIC_FS,
  BASIC_VS,
  FS_MAIN_SHADER,
} from '../shader-compiler';
import { createDefaultUniforms } from '../uniform-manager';

describe('shader constants', () => {
  it('exports valid precision values', () => {
    expect(PRECISIONS).toEqual(['lowp', 'mediump', 'highp']);
  });

  it('exports BASIC_FS with mainImage function', () => {
    expect(BASIC_FS).toContain('mainImage');
  });

  it('exports BASIC_VS with aVertexPosition attribute', () => {
    expect(BASIC_VS).toContain('aVertexPosition');
  });

  it('exports FS_MAIN_SHADER that calls mainImage', () => {
    expect(FS_MAIN_SHADER).toContain('mainImage');
    expect(FS_MAIN_SHADER).toContain('gl_FragColor');
  });
});

describe('preProcessFragment', () => {
  it('adds precision qualifier', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }',
      uniforms,
      'highp',
      1,
    );
    expect(result).toContain('precision highp float;');
  });

  it('falls back to mediump for invalid precision', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }',
      uniforms,
      'invalid',
      1,
    );
    expect(result).toContain('precision mediump float;');
  });

  it('adds DPR define', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }',
      uniforms,
      'highp',
      2,
    );
    expect(result).toContain('#define DPR 2.0');
  });

  it('marks used uniforms as needed', () => {
    const uniforms = createDefaultUniforms();
    preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(iTime); }',
      uniforms,
      'highp',
      1,
    );
    expect(uniforms.iTime!.isNeeded).toBe(true);
    expect(uniforms.iMouse!.isNeeded).toBe(false);
  });

  it('inserts uniform declarations for used uniforms', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(iResolution.x); }',
      uniforms,
      'highp',
      1,
    );
    expect(result).toContain('uniform vec2 iResolution;');
  });

  it('appends FS_MAIN_SHADER for shadertoy-style shaders', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void mainImage(out vec4 c, in vec2 f) { c = vec4(1.0); }',
      uniforms,
      'highp',
      1,
    );
    expect(result).toContain('gl_FragColor');
  });

  it('does not append FS_MAIN_SHADER for non-shadertoy shaders', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void main() { gl_FragColor = vec4(1.0); }',
      uniforms,
      'highp',
      1,
    );
    expect(result).not.toContain('mainImage');
  });

  it('replaces texture() with texture2D()', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      'void main() { gl_FragColor = texture(u_tex, v_uv); }',
      uniforms,
      'highp',
      1,
    );
    expect(result).toContain('texture2D(');
    expect(result).not.toContain('texture(');
  });

  it('preserves #extension directives at the top', () => {
    const uniforms = createDefaultUniforms();
    const result = preProcessFragment(
      '#extension GL_OES_standard_derivatives : enable\nvoid main() { gl_FragColor = vec4(1.0); }',
      uniforms,
      'highp',
      1,
    );
    expect(result.indexOf('#extension')).toBeLessThan(
      result.indexOf('precision'),
    );
  });
});
