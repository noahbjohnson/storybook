import path from 'path';
import { getEnvironment } from 'lazy-universal-dotenv';
import findUp from 'find-up';

const projectRoot = () => {
  let result;
  try {
    result = result || path.join(findUp.sync('.git', { type: 'directory' }), '..');
  } catch (e) {
    //
  }
  try {
    result = result || path.join(findUp.sync('.svn', { type: 'directory' }), '..');
  } catch (e) {
    //
  }
  try {
    result = result || __dirname.split('node_modules')[0];
  } catch (e) {
    //
  }

  return result || process.cwd();
};

export const includePaths = [projectRoot()];
export const nodeModulesPaths = path.resolve('./node_modules');

// Run `npx are-you-es5 check lib/core -r`
// to get this regexp
export const excludePaths = [
  /[\\/]node_modules[\\/](?!(@storybook\/node-logger|are-you-es5|better-opn|boxen|chalk|commander|find-cache-dir|find-up|fs-extra|json5|node-fetch|pkg-dir|resolve-from|semver)[\\/])/,
  // Never transpile again the following:
  /[\\/]node_modules[\\/]webpack/,
  /[\\/]node_modules[\\/]core-js/,
  /[\\/]node_modules[\\/]regenerator-runtime/,
];

const nodePathsToArray = (nodePath) =>
  nodePath
    .split(process.platform === 'win32' ? ';' : ':')
    .filter(Boolean)
    .map((p) => path.resolve('./', p));

// Load environment variables starts with STORYBOOK_ to the client side.
export function loadEnv(options = {}) {
  const defaultNodeEnv = options.production ? 'production' : 'development';

  const env = {
    NODE_ENV: process.env.NODE_ENV || defaultNodeEnv,
    NODE_PATH: process.env.NODE_PATH || '',
    // This is to support CRA's public folder feature.
    // In production we set this to dot(.) to allow the browser to access these assets
    // even when deployed inside a subpath. (like in GitHub pages)
    // In development this is just empty as we always serves from the root.
    PUBLIC_URL: options.production ? '.' : '',
  };

  Object.keys(process.env)
    .filter((name) => /^STORYBOOK_/.test(name))
    .forEach((name) => {
      env[name] = process.env[name];
    });

  const base = Object.entries(env).reduce(
    (acc, [k, v]) => Object.assign(acc, { [k]: JSON.stringify(v) }),
    {}
  );

  const { stringified, raw } = getEnvironment({ nodeEnv: env.NODE_ENV });

  const fullRaw = { ...env, ...raw };

  fullRaw.NODE_PATH = nodePathsToArray(fullRaw.NODE_PATH || '');

  return {
    stringified: { ...base, ...stringified },
    raw: fullRaw,
  };
}
