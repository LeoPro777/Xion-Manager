export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface SearchPlacesOptions {
  limit?: number;
  lat?: number;
  lng?: number;
}

export interface PlaceResult {
  id: string;
  name: string;
  formattedAddress: string;
  location: GeoLocation;
  rawProviderData?: Record<string, unknown>;
}

export interface PlaceDetails {
  id: string;
  name: string;
  formattedAddress: string;
  location: GeoLocation;
  rawProviderData?: Record<string, unknown>;
}

export interface AddressResult {
  formattedAddress: string;
  location: GeoLocation;
  rawProviderData?: Record<string, unknown>;
}

export interface GeoProviderInterface {
  readonly providerName: string;
  searchPlaces(query: string, options?: SearchPlacesOptions): Promise<PlaceResult[]>;
  getPlaceDetails(placeId: string): Promise<PlaceDetails>;
  reverseGeocode(lat: number, lng: number): Promise<AddressResult>;
}

export type MapProviderType = 'osm' | 'google';
