import {
  GeoProviderInterface,
  PlaceResult,
  PlaceDetails,
  AddressResult,
  SearchPlacesOptions,
} from '../types';

export class GoogleMapsAdapter implements GeoProviderInterface {
  readonly providerName = 'google';
  private apiKey: string;
  private readonly placesBaseUrl = 'https://places.googleapis.com/v1/places';
  private readonly geocodeBaseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Búsqueda de lugares usando la nueva Google Places API (Text Search)
   */
  async searchPlaces(query: string, options?: SearchPlacesOptions): Promise<PlaceResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (!this.apiKey) {
      console.warn(
        '[GoogleMapsAdapter] Clave GOOGLE_MAPS_API_KEY no configurada. Retornando resultado stub simulado para desarrollo.'
      );
      return [
        {
          id: 'mock-google-place-1',
          name: trimmed,
          formattedAddress: `${trimmed}, Ubicación verificada Google Maps (Simulado)`,
          location: {
            lat: options?.lat ?? 10.6417,
            lng: options?.lng ?? -71.6125,
          },
          rawProviderData: { isStub: true, notice: 'Configura VITE_GOOGLE_MAPS_API_KEY para habilitar llamadas reales' },
        },
      ];
    }

    try {
      const response = await fetch(`${this.placesBaseUrl}:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          textQuery: trimmed,
          maxResultCount: options?.limit || 5,
          ...(options?.lat !== undefined && options?.lng !== undefined
            ? {
                locationBias: {
                  circle: {
                    center: { latitude: options.lat, longitude: options.lng },
                    radius: 5000.0,
                  },
                },
              }
            : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const places = data.places || [];

      return places.map((place: any): PlaceResult => ({
        id: place.id,
        name: place.displayName?.text || trimmed,
        formattedAddress: place.formattedAddress || '',
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
        rawProviderData: place,
      }));
    } catch (err) {
      console.error('[GoogleMapsAdapter] Error en searchPlaces:', err);
      return [];
    }
  }

  /**
   * Obtener detalles de un lugar por Place ID con Google Places API v1
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    if (!this.apiKey) {
      return {
        id: placeId,
        name: 'Google Place Stub',
        formattedAddress: 'Dirección simulada Google Maps',
        location: { lat: 10.6417, lng: -71.6125 },
        rawProviderData: { isStub: true },
      };
    }

    try {
      const response = await fetch(`${this.placesBaseUrl}/${encodeURIComponent(placeId)}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Place Details error: ${response.status}`);
      }

      const data = await response.json();
      return {
        id: data.id || placeId,
        name: data.displayName?.text || 'Lugar Google',
        formattedAddress: data.formattedAddress || '',
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0,
        },
        rawProviderData: data,
      };
    } catch (err) {
      console.error('[GoogleMapsAdapter] Error en getPlaceDetails:', err);
      return {
        id: placeId,
        name: 'Lugar no encontrado',
        formattedAddress: '',
        location: { lat: 0, lng: 0 },
        rawProviderData: { error: String(err) },
      };
    }
  }

  /**
   * Geocodificación inversa con Google Geocoding API
   */
  async reverseGeocode(lat: number, lng: number): Promise<AddressResult> {
    if (!this.apiKey) {
      return {
        formattedAddress: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (Google Maps Stub)`,
        location: { lat, lng },
        rawProviderData: { isStub: true },
      };
    }

    try {
      const response = await fetch(
        `${this.geocodeBaseUrl}?latlng=${lat},${lng}&key=${encodeURIComponent(this.apiKey)}`
      );

      if (!response.ok) {
        throw new Error(`Google Geocoding error: ${response.status}`);
      }

      const data = await response.json();
      const firstResult = data.results?.[0];

      return {
        formattedAddress: firstResult?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        location: { lat, lng },
        rawProviderData: data,
      };
    } catch (err) {
      console.error('[GoogleMapsAdapter] Error en reverseGeocode:', err);
      return {
        formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        location: { lat, lng },
        rawProviderData: { error: String(err) },
      };
    }
  }
}
