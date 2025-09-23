import { describe, it, expect, vi } from 'vitest';
import { LocationResolver } from './location-resolver';
import type { LocationResolutionOptions } from './types';

describe('LocationResolver', () => {
  describe('resolveOptimalLocation', () => {
    it('明示的な設定がある場合は明示的設定を優先', () => {
      const options: LocationResolutionOptions = {
        explicitLocation: 'europe-west1',
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('europe-west1');
      expect(result.resolutionMethod).toBe('explicit');
    });

    it('Cloudflare Coloコードから最適なロケーションを選択（日本）', () => {
      const mockRequest = {
        cf: {
          country: 'JP',
          colo: 'NRT',
          continent: 'AS',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('asia-northeast1');
      expect(result.resolutionMethod).toBe('colo');
      expect(result.geographicInfo?.colo).toBe('NRT');
      expect(result.geographicInfo?.country).toBe('JP');
    });

    it('Cloudflare Coloコードから最適なロケーションを選択（米国）', () => {
      const mockRequest = {
        cf: {
          country: 'US',
          colo: 'DFW',
          continent: 'NA',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('us-central1');
      expect(result.resolutionMethod).toBe('colo');
      expect(result.geographicInfo?.colo).toBe('DFW');
    });

    it('Cloudflare Coloコードから最適なロケーションを選択（ヨーロッパ）', () => {
      const mockRequest = {
        cf: {
          country: 'GB',
          colo: 'LHR',
          continent: 'EU',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('europe-west2');
      expect(result.resolutionMethod).toBe('colo');
      expect(result.geographicInfo?.colo).toBe('LHR');
    });

    it('国コードからロケーションを選択（Coloがない場合）', () => {
      const mockRequest = {
        cf: {
          country: 'SG',
          continent: 'AS',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('asia-southeast1');
      expect(result.resolutionMethod).toBe('country');
      expect(result.geographicInfo?.country).toBe('SG');
    });

    it('大陸コードからロケーションを選択（国とColoがない場合）', () => {
      const mockRequest = {
        cf: {
          continent: 'EU',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('europe-west4');
      expect(result.resolutionMethod).toBe('continent');
      expect(result.geographicInfo?.continent).toBe('EU');
    });

    it('地理情報がない場合はデフォルト値を使用', () => {
      const mockRequest = {
        cf: {}
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('us-central1');
      expect(result.resolutionMethod).toBe('default');
    });

    it('Requestオブジェクトがない場合はデフォルト値を使用', () => {
      const options: LocationResolutionOptions = {};

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('us-central1');
      expect(result.resolutionMethod).toBe('default');
    });

    it('明示的な設定は地理情報より優先される', () => {
      const mockRequest = {
        cf: {
          country: 'JP',
          colo: 'NRT',
          continent: 'AS',
        }
      } as any;

      const options: LocationResolutionOptions = {
        explicitLocation: 'europe-west1',
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('europe-west1');
      expect(result.resolutionMethod).toBe('explicit');
    });

    it('未知の国コードの場合は大陸マッピングにフォールバック', () => {
      const mockRequest = {
        cf: {
          country: 'XX', // 未知の国コード
          continent: 'AS',
        }
      } as any;

      const options: LocationResolutionOptions = {
        request: mockRequest,
      };

      const result = LocationResolver.resolveOptimalLocation(options);

      expect(result.location).toBe('asia-northeast1');
      expect(result.resolutionMethod).toBe('continent');
      expect(result.geographicInfo?.continent).toBe('AS');
    });

    it('デバッグモードでログが出力される', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const options: LocationResolutionOptions = {
        explicitLocation: 'europe-west1',
        debug: true,
      };

      LocationResolver.resolveOptimalLocation(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LocationResolver]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateLocation', () => {
    it('有効なロケーションの場合は正常に返す', () => {
      expect(LocationResolver.validateLocation('us-central1')).toBe('us-central1');
      expect(LocationResolver.validateLocation('asia-northeast1')).toBe('asia-northeast1');
      expect(LocationResolver.validateLocation('europe-west2')).toBe('europe-west2');
    });

    it('無効なロケーションの場合はエラーをスロー', () => {
      expect(() => LocationResolver.validateLocation('invalid-location')).toThrow(
        'Invalid Google Cloud location: invalid-location'
      );
    });

    it('空文字列の場合はエラーをスロー', () => {
      expect(() => LocationResolver.validateLocation('')).toThrow(
        'Invalid Google Cloud location: '
      );
    });
  });

  describe('getSupportedLocations', () => {
    it('サポートされているロケーション一覧を返す', () => {
      const locations = LocationResolver.getSupportedLocations();
      expect(locations).toContain('us-central1');
      expect(locations).toContain('asia-northeast1');
      expect(locations).toContain('europe-west2');
      expect(locations.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultLocation', () => {
    it('デフォルトロケーションを返す', () => {
      expect(LocationResolver.getDefaultLocation()).toBe('us-central1');
    });
  });

  describe('getLocationByCountry', () => {
    it('日本の場合はasia-northeast1を返す', () => {
      expect(LocationResolver.getLocationByCountry('JP')).toBe('asia-northeast1');
    });

    it('アメリカの場合はus-central1を返す', () => {
      expect(LocationResolver.getLocationByCountry('US')).toBe('us-central1');
    });

    it('未知の国の場合はnullを返す', () => {
      expect(LocationResolver.getLocationByCountry('XX')).toBeNull();
    });
  });

  describe('getLocationByColo', () => {
    it('NRTの場合はasia-northeast1を返す', () => {
      expect(LocationResolver.getLocationByColo('NRT')).toBe('asia-northeast1');
    });

    it('DFWの場合はus-central1を返す', () => {
      expect(LocationResolver.getLocationByColo('DFW')).toBe('us-central1');
    });

    it('未知のColoの場合はnullを返す', () => {
      expect(LocationResolver.getLocationByColo('XXX')).toBeNull();
    });
  });
});