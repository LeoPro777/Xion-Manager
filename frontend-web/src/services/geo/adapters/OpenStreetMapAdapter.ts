import { 
  GeoProviderInterface, 
  PlaceResult, 
  PlaceDetails, 
  AddressResult, 
  SearchPlacesOptions 
} from '../types';

interface NominatimRawPlace {
  place_id: number;
  osm_id?: number;
  osm_type?: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
  extratags?: Record<string, string>;
}

export class OpenStreetMapAdapter implements GeoProviderInterface {
  readonly providerName = 'osm';
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly photonUrl = 'https://photon.komoot.io/api';
  private readonly requestHeaders: HeadersInit = {
    'Accept': 'application/json',
  };

  /**
   * Búsqueda y autocompletado de lugares usando Nominatim / Photon
   */
  async searchPlaces(query: string, options?: SearchPlacesOptions): Promise<PlaceResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const limit = options?.limit || 5;

    try {
      let url = `${this.baseUrl}/search?format=json&q=${encodeURIComponent(trimmed)}&limit=${limit}&addressdetails=1`;
      
      if (options?.lat !== undefined && options?.lng !== undefined) {
        // Enfoque geográfico si se proporcionan coordenadas de referencia
        url += `&viewbox=${options.lng - 0.5},${options.lat + 0.5},${options.lng + 0.5},${options.lat - 0.5}`;
      }

      const response = await fetch(url, {
        headers: this.requestHeaders,
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[OpenStreetMapAdapter] Rate limit alcanzado en Nominatim, intentando fallback en Photon');
          return this.searchWithPhoton(trimmed, limit);
        }
        throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
      }

      const data: NominatimRawPlace[] = await response.json();
      return (data || []).map((item) => this.mapNominatimToPlaceResult(item));
    } catch (err) {
      console.warn('[OpenStreetMapAdapter] Error consultando Nominatim, recurriendo a Photon:', err);
      return this.searchWithPhoton(trimmed, limit);
    }
  }

  /**
   * Obtener detalles de un lugar por su identificador normalizado
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const response = await fetch(
        `${this.baseUrl}/details?place_id=${encodeURIComponent(placeId)}&format=json&addressdetails=1`,
        { headers: this.requestHeaders }
      );

      if (!response.ok) {
        throw new Error(`Nominatim details error: ${response.status}`);
      }

      const data = await response.json();
      const lat = parseFloat(data.lat || data.centroid?.coordinates?.[1] || '0');
      const lng = parseFloat(data.lon || data.centroid?.coordinates?.[0] || '0');
      const name = data.localname || data.names?.name || data.names?.['name:es'] || 'Ubicación seleccionada';

      return {
        id: String(data.place_id || placeId),
        name,
        formattedAddress: data.calculated_postcode 
          ? `${name}, ${data.calculated_postcode}` 
          : name,
        location: { lat, lng },
        rawProviderData: data,
      };
    } catch (err) {
      console.error('[OpenStreetMapAdapter] Error en getPlaceDetails:', err);
      return {
        id: placeId,
        name: 'Ubicación OSM',
        formattedAddress: 'Dirección no disponible',
        location: { lat: 0, lng: 0 },
        rawProviderData: { error: String(err) }
      };
    }
  }

  /**
   * Geocodificación inversa: obtener dirección legible desde latitud y longitud
   */
  async reverseGeocode(lat: number, lng: number): Promise<AddressResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: this.requestHeaders }
      );

      if (!response.ok) {
        throw new Error(`Nominatim reverse geocode error: ${response.status}`);
      }

      const data: NominatimRawPlace = await response.json();
      const formattedAddress = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      return {
        formattedAddress,
        location: { lat, lng },
        rawProviderData: data as unknown as Record<string, unknown>,
      };
    } catch (err) {
      console.warn('[OpenStreetMapAdapter] Error en reverseGeocode:', err);
      return {
        formattedAddress: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
        location: { lat, lng },
        rawProviderData: { error: String(err) },
      };
    }
  }

  /**
   * Fallback secundario de alta disponibilidad con Photon (Komoot)
   */
  private async searchWithPhoton(query: string, limit: number): Promise<PlaceResult[]> {
    try {
      const response = await fetch(`${this.photonUrl}?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.requestHeaders,
      });

      if (!response.ok) return [];

      const data = await response.json();
      const features = data.features || [];

      return features.map((feat: any, idx: number): PlaceResult => {
        const coords = feat.geometry?.coordinates || [0, 0];
        const props = feat.properties || {};
        const name = props.name || props.street || query;
        const addressParts = [
          name,
          props.street,
          props.city,
          props.state,
          props.country
        ].filter(Boolean);

        return {
          id: `photon-${props.osm_id || idx}`,
          name,
          formattedAddress: addressParts.join(', ') || name,
          location: {
            lng: coords[0] || 0,
            lat: coords[1] || 0,
          },
          rawProviderData: feat,
        };
      });
    } catch {
      return [];
    }
  }

  private mapNominatimToPlaceResult(item: NominatimRawPlace): PlaceResult {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.name || item.display_name.split(',')[0].trim();

    return {
      id: String(item.place_id),
      name,
      formattedAddress: item.display_name,
      location: { lat, lng },
      rawProviderData: item as unknown as Record<string, unknown>,
    };
  }
}
