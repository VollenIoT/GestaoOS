const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Encontra a raiz do monorepo
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Observa os arquivos necessários e ignora diretórios temporários pesados de compilação
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Bloqueia a indexação da pasta target do Rust/Tauri, git e builds pesados
config.resolver.blockList = [
  /.*[/\\]apps[/\\]desktop[/\\]src-tauri[/\\]target[/\\].*/,
  /.*[/\\]apps[/\\]mobile[/\\]android[/\\].*/,
  /.*[/\\]apps[/\\]desktop[/\\]dist[/\\].*/,
  /.*[/\\]\.git[/\\].*/,
];

config.resolver.extraNodeModules = {
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
  '@react-native/assets-registry': path.resolve(workspaceRoot, 'node_modules/@react-native/assets-registry'),
  ...new Proxy(
    {},
    {
      get: (target, name) => path.join(process.cwd(), `node_modules/${name}`),
    }
  ),
};

module.exports = config;
