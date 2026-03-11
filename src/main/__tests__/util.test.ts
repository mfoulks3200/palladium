import { resolveHtmlPath } from '../util';

describe('resolveHtmlPath', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.PORT;
  });

  it('returns localhost URL in development', () => {
    process.env.NODE_ENV = 'development';
    const result = resolveHtmlPath('index.html');
    expect(result).toContain('http://localhost');
    expect(result).toContain('index.html');
  });

  it('uses default port 1212 in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PORT;
    const result = resolveHtmlPath('index.html');
    expect(result).toContain('1212');
  });

  it('uses custom port from env in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3000';
    const result = resolveHtmlPath('index.html');
    expect(result).toContain('3000');
  });

  it('returns file:// URL in production', () => {
    process.env.NODE_ENV = 'production';
    const result = resolveHtmlPath('index.html');
    expect(result).toMatch(/^file:\/\//);
    expect(result).toContain('index.html');
  });
});
