import {
  SUPPORTED_LOCATIONS,
  DEFAULT_LOCATION,
  COLO_TO_VERTEX_REGION,
  COUNTRY_TO_VERTEX_REGION,
  CONTINENT_TO_VERTEX_REGION,
} from '@/const/location-mappings';
import type {
  CloudflareCfObject,
  LocationResolutionResult,
  LocationResolutionOptions,
} from './types';

/**
 * Google Cloud ロケーション解決ユーティリティ
 *
 * Cloudflareの地理情報から最適なGoogle Cloudロケーションを自動選択する
 * 汎用的なユーティリティクラスとして設計
 */
export class LocationResolver {
  /**
   * 最適なロケーションを解決する
   * @param options - 解決オプション
   * @returns 解決結果
   */
  static resolveOptimalLocation(options: LocationResolutionOptions): LocationResolutionResult {
    const { explicitLocation, request, debug } = options;

    if (debug) {
      console.log('[LocationResolver] ロケーション解決開始:', {
        hasExplicitLocation: !!explicitLocation,
        hasRequest: !!request,
      });
    }

    // 1. 明示的な設定がある場合（最優先）
    if (explicitLocation && explicitLocation.trim() !== '') {
      const validatedLocation = this.validateLocation(explicitLocation);
      if (debug) {
        console.log('[LocationResolver] 明示的設定を使用:', validatedLocation);
      }
      return {
        location: validatedLocation,
        resolutionMethod: 'explicit',
      };
    }

    // 2. Cloudflare地理情報からの自動選択
    if (request) {
      const autoLocationResult = this.detectLocationFromCloudflare(request, debug);
      if (autoLocationResult) {
        if (debug) {
          console.log('[LocationResolver] 地理情報ベースで選択:', autoLocationResult);
        }
        return autoLocationResult;
      }
    }

    // 3. デフォルト値を使用
    if (debug) {
      console.log('[LocationResolver] デフォルトロケーションを使用:', DEFAULT_LOCATION);
    }
    return {
      location: DEFAULT_LOCATION,
      resolutionMethod: 'default',
    };
  }

  /**
   * Cloudflareの地理情報からロケーションを検出する
   * @param request - リクエストオブジェクト
   * @param debug - デバッグモード
   * @returns 最適なVertex AIロケーション
   */
  private static detectLocationFromCloudflare(
    request: Request,
    debug = false
  ): LocationResolutionResult | null {
    const cf = (request as Request & { cf?: CloudflareCfObject }).cf;
    if (!cf) {
      if (debug) {
        console.log('[LocationResolver] Cloudflare CFオブジェクトが利用できません');
      }
      return null;
    }

    if (debug) {
      console.log('[LocationResolver] Cloudflare地理情報:', {
        country: cf.country,
        region: cf.region,
        city: cf.city,
        colo: cf.colo,
        continent: cf.continent,
      });
    }

    // 1. Coloコードからの直接マッピング（最も精度が高い）
    if (cf.colo && COLO_TO_VERTEX_REGION[cf.colo]) {
      const mappedLocation = COLO_TO_VERTEX_REGION[cf.colo];
      if (debug) {
        console.log('[LocationResolver] Coloベースマッピング:', {
          colo: cf.colo,
          mappedLocation,
        });
      }
      return {
        location: mappedLocation,
        resolutionMethod: 'colo',
        geographicInfo: {
          country: cf.country,
          colo: cf.colo,
          continent: cf.continent,
        },
      };
    }

    // 2. 国コードからのマッピング
    if (cf.country && COUNTRY_TO_VERTEX_REGION[cf.country]) {
      const mappedLocation = COUNTRY_TO_VERTEX_REGION[cf.country];
      if (debug) {
        console.log('[LocationResolver] 国ベースマッピング:', {
          country: cf.country,
          mappedLocation,
        });
      }
      return {
        location: mappedLocation,
        resolutionMethod: 'country',
        geographicInfo: {
          country: cf.country,
          colo: cf.colo,
          continent: cf.continent,
        },
      };
    }

    // 3. 大陸レベルのフォールバック
    if (cf.continent && CONTINENT_TO_VERTEX_REGION[cf.continent]) {
      const mappedLocation = CONTINENT_TO_VERTEX_REGION[cf.continent];
      if (debug) {
        console.log('[LocationResolver] 大陸ベースマッピング:', {
          continent: cf.continent,
          mappedLocation,
        });
      }
      return {
        location: mappedLocation,
        resolutionMethod: 'continent',
        geographicInfo: {
          country: cf.country,
          colo: cf.colo,
          continent: cf.continent,
        },
      };
    }

    if (debug) {
      console.log('[LocationResolver] 地理情報からのマッピングに失敗');
    }
    return null;
  }

  /**
   * ロケーションの検証
   * @param location - 検証するロケーション
   * @returns 有効なロケーション
   * @throws Error 無効なロケーションの場合
   */
  static validateLocation(location: string): string {
    // サポートされているロケーションかチェック
    if (!SUPPORTED_LOCATIONS.includes(location as typeof SUPPORTED_LOCATIONS[number])) {
      throw new Error(
        `Invalid Google Cloud location: ${location}. Supported locations: ${SUPPORTED_LOCATIONS.join(', ')}`
      );
    }
    return location;
  }

  /**
   * サポートされているロケーション一覧を取得
   * @returns サポートされているロケーション配列
   */
  static getSupportedLocations(): readonly string[] {
    return SUPPORTED_LOCATIONS;
  }

  /**
   * デフォルトロケーションを取得
   * @returns デフォルトロケーション
   */
  static getDefaultLocation(): string {
    return DEFAULT_LOCATION;
  }

  /**
   * 特定の国コードに対応するロケーションを取得
   * @param countryCode - 国コード
   * @returns 対応するロケーション（存在しない場合はnull）
   */
  static getLocationByCountry(countryCode: string): string | null {
    return COUNTRY_TO_VERTEX_REGION[countryCode] || null;
  }

  /**
   * 特定のColoコードに対応するロケーションを取得
   * @param coloCode - Coloコード
   * @returns 対応するロケーション（存在しない場合はnull）
   */
  static getLocationByColo(coloCode: string): string | null {
    return COLO_TO_VERTEX_REGION[coloCode] || null;
  }
}