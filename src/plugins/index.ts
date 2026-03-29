/**
 * Plugin System — public API barrel (S-4-03)
 */
export type { PluginContext, PluginFinding, PluginDefinition } from './types.js';
export type { PluginConfig, LoadedPlugins } from './loader.js';
export { loadPlugins } from './loader.js';
export { runPlugins } from './runner.js';
export {
  convertPluginFindings,
  mergePluginFindings,
  buildPluginFindingMap,
} from './integration.js';
