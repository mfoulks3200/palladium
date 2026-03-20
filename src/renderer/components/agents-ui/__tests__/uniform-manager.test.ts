import {
  uniformTypeToGLSLType,
  isMatrixType,
  isVectorType,
  isVectorListType,
  createDefaultUniforms,
  UNIFORM_TIME,
  UNIFORM_MOUSE,
  UNIFORM_RESOLUTION,
  UNIFORM_FRAME,
} from '../uniform-manager';

describe('uniformTypeToGLSLType', () => {
  it.each([
    ['1f', 'float'],
    ['2f', 'vec2'],
    ['3f', 'vec3'],
    ['4f', 'vec4'],
    ['1i', 'int'],
    ['2i', 'ivec2'],
    ['3i', 'ivec3'],
    ['4i', 'ivec4'],
    ['1fv', 'float'],
    ['2fv', 'vec2'],
    ['3fv', 'vec3'],
    ['4fv', 'vec4'],
    ['1iv', 'int'],
    ['2iv', 'ivec2'],
    ['3iv', 'ivec3'],
    ['4iv', 'ivec4'],
    ['Matrix2fv', 'mat2'],
    ['Matrix3fv', 'mat3'],
    ['Matrix4fv', 'mat4'],
  ])('maps %s to %s', (input, expected) => {
    expect(uniformTypeToGLSLType(input)).toBe(expected);
  });

  it('returns undefined for invalid type', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    expect(uniformTypeToGLSLType('invalid')).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('type guards', () => {
  describe('isMatrixType', () => {
    it('returns true for Matrix types with array values', () => {
      expect(isMatrixType('Matrix2fv', [1, 0, 0, 1])).toBe(true);
    });

    it('returns false for non-matrix types', () => {
      expect(isMatrixType('2f', [1, 2])).toBe(false);
    });

    it('returns false for scalar values', () => {
      expect(isMatrixType('Matrix2fv', 1)).toBe(false);
    });
  });

  describe('isVectorType', () => {
    it('returns true for vector types with matching array length', () => {
      expect(isVectorType('2f', [1, 2, 3])).toBe(true);
    });

    it('returns false for list types (with v suffix)', () => {
      expect(isVectorType('2fv', [1, 2, 3])).toBe(false);
    });
  });

  describe('isVectorListType', () => {
    it('returns true for list types with matching array length', () => {
      expect(isVectorListType('2fv', [1, 2, 3])).toBe(true);
    });

    it('returns false for non-list types', () => {
      expect(isVectorListType('2f', [1, 2, 3])).toBe(false);
    });
  });
});

describe('createDefaultUniforms', () => {
  it('creates all built-in uniforms', () => {
    const uniforms = createDefaultUniforms();
    expect(uniforms[UNIFORM_TIME]).toBeDefined();
    expect(uniforms[UNIFORM_MOUSE]).toBeDefined();
    expect(uniforms[UNIFORM_RESOLUTION]).toBeDefined();
    expect(uniforms[UNIFORM_FRAME]).toBeDefined();
  });

  it('sets all uniforms as not needed', () => {
    const uniforms = createDefaultUniforms();
    for (const key of Object.keys(uniforms)) {
      expect(uniforms[key]!.isNeeded).toBe(false);
    }
  });

  it('returns a fresh object each time', () => {
    const a = createDefaultUniforms();
    const b = createDefaultUniforms();
    expect(a).not.toBe(b);
    a[UNIFORM_TIME]!.isNeeded = true;
    expect(b[UNIFORM_TIME]!.isNeeded).toBe(false);
  });
});
