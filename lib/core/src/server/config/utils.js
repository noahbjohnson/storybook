import path from 'path';
import { getEnvironment } from 'lazy-universal-dotenv';
import findUp from 'find-up';
import { getBabelLoaderIgnoreRegex } from 'are-you-es5/dist/babel-loader-regex-builder';
import { ModulesChecker } from 'are-you-es5/dist/modules-checker';

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
    result = result || __dirname.split('node-modules')[0];
  } catch (e) {
    //
  }

  return result || process.cwd();
};

// Memoize checker per project
const exclusionCache = {};

const getES5ModulesRegexp = () => {
  const corePath = path.join(findUp.sync('package.json', { cwd: __dirname }), '..');
  if (exclusionCache[corePath]) {
    return exclusionCache[corePath];
  }
  const config = {
    checkAllNodeModules: true,
    ignoreBabelAndWebpackPackages: true,
    logEs5Packages: false,
  };

  const checker = new ModulesChecker(corePath, config);
  const nonEs5Dependencies = checker.checkModules();

  const regexp = new RegExp(getBabelLoaderIgnoreRegex(nonEs5Dependencies).slice(1, -1));
  exclusionCache[corePath] = regexp;
  return regexp;
};

export const includePaths = [projectRoot()];
export const nodeModulesPaths = path.resolve('./node_modules');

// Run `npx are-you-es5 check lib/core -r`
// to get this regexp
export const excludePaths = [
  getES5ModulesRegexp(),
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
