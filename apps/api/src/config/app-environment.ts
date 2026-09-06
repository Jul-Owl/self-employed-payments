export type AppEnvironment = 'local' | 'test' | 'production';

const validEnvironments: AppEnvironment[] = ['local', 'test', 'production'];

export interface RuntimeConfiguration {
  appEnvironment: AppEnvironment;
  port: number;
  webUrl: string;
}

export function getRuntimeConfiguration(): RuntimeConfiguration {
  const appEnvironment = (process.env.APP_ENV ?? 'local') as AppEnvironment;

  if (!validEnvironments.includes(appEnvironment)) {
    throw new Error('APP_ENV must be one of: local, test, production');
  }

  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

  if (appEnvironment !== 'local' && !process.env.WEB_URL) {
    throw new Error('WEB_URL must be set when APP_ENV is test or production');
  }

  try {
    const parsedWebUrl = new URL(webUrl);
    if (!['http:', 'https:'].includes(parsedWebUrl.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('WEB_URL must be a valid HTTP(S) origin');
  }

  const portValue = process.env.PORT ?? '3001';
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return { appEnvironment, port, webUrl };
}
