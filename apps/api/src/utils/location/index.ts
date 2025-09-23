/**
 * ロケーション解決ユーティリティのエクスポート
 */

export { LocationResolver } from './location-resolver';
export type {
  CloudflareCfObject,
  LocationResolutionResult,
  LocationResolutionOptions,
} from './types';

// 定数の再エクスポート
export {
  SUPPORTED_LOCATIONS,
  DEFAULT_LOCATION,
  COLO_TO_VERTEX_REGION,
  COUNTRY_TO_VERTEX_REGION,
  CONTINENT_TO_VERTEX_REGION,
} from '@/const/location-mappings';