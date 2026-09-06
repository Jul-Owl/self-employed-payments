import { getRuntimeConfiguration } from './app-environment';

describe('getRuntimeConfiguration', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uses local defaults for local development', () => {
    delete process.env.APP_ENV;
    delete process.env.WEB_URL;
    delete process.env.PORT;

    expect(getRuntimeConfiguration()).toEqual({
      appEnvironment: 'local',
      port: 3001,
      webUrl: 'http://localhost:3000',
    });
  });

  it('requires an explicit frontend origin outside local development', () => {
    process.env.APP_ENV = 'test';
    delete process.env.WEB_URL;

    expect(() => getRuntimeConfiguration()).toThrow(
      'WEB_URL must be set when APP_ENV is test or production',
    );
  });

  it('validates the configured environment and port', () => {
    process.env.APP_ENV = 'staging';
    expect(() => getRuntimeConfiguration()).toThrow(
      'APP_ENV must be one of: local, test, production',
    );

    process.env.APP_ENV = 'production';
    process.env.WEB_URL = 'https://self-made.online';
    process.env.PORT = 'invalid';
    expect(() => getRuntimeConfiguration()).toThrow(
      'PORT must be an integer between 1 and 65535',
    );
  });
});
