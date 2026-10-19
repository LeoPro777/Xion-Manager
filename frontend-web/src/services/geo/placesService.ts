import { GeoProviderInterface, MapProviderType } from './types';
import { OpenStreetMapAdapter } from './adapters/OpenStreetMapAdapter';
import { GoogleMapsAdapter } from './adapters/GoogleMapsAdapter';

export class GeoServiceFactory {
  private static cachedProvider: GeoProviderInterface | null = null;
  private static currentProviderType: MapProviderType | null = null;

  /**
   * Crea o retorna una instancia del proveedor geográfico configurado
   */
  static getProvider(forcedType?: MapProviderType): GeoProviderInterface {
    const envProvider = (
      (import.meta.env.VITE_MAP_PROVIDER as string) || 
      'osm'
    ).toLowerCase() as MapProviderType;

    const targetType: MapProviderType = forcedType || envProvider;

    // Si ya existe la instancia en caché para el mismo proveedor, reutilizarla
    if (this.cachedProvider && this.currentProviderType === targetType) {
      return this.cachedProvider;
    }

    let provider: GeoProviderInterface;

    switch (targetType) {
      case 'google':
        provider = new GoogleMapsAdapter();
        break;
      case 'osm':
      default:
        provider = new OpenStreetMapAdapter();
        break;
    }

    this.cachedProvider = provider;
    this.currentProviderType = targetType;
    return provider;
  }

  /**
   * Permite cambiar dinámicamente el proveedor (útil para pruebas o cambio en caliente)
   */
  static setProvider(type: MapProviderType): GeoProviderInterface {
    return this.getProvider(type);
  }
}

/**
 * Instancia singleton lista para usar en cualquier componente o servicio
 */
export const placesService: GeoProviderInterface = GeoServiceFactory.getProvider();
export * from './types';
export * from './adapters/OpenStreetMapAdapter';
export * from './adapters/GoogleMapsAdapter';
