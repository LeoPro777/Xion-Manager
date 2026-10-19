import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  MapPin,
  Navigation,
  X,
  Check,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';

export interface LocationResult {
  lat: number;
  lng: number;
  address?: string;
}

export interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: LocationResult) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  title?: string;
}

import { placesService, PlaceResult } from '../services/geo/placesService';


export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialAddress,
  title = 'Ubicación del Negocio',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const defaultLat = Number.isFinite(initialLat) && initialLat !== 0 ? initialLat! : 10.6417;
  const defaultLng = Number.isFinite(initialLng) && initialLng !== 0 ? initialLng! : -71.6125;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress || '');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const isValidCoords = Number.isFinite(coords.lat) && Number.isFinite(coords.lng) && (coords.lat !== 0 || coords.lng !== 0);

  // Initialize or reset map whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const startLat = Number.isFinite(initialLat) && initialLat !== 0 ? initialLat! : 10.6417;
    const startLng = Number.isFinite(initialLng) && initialLng !== 0 ? initialLng! : -71.6125;
    setCoords({ lat: startLat, lng: startLng });
    setSearchQuery(initialAddress || '');
    setSelectedAddress(initialAddress || '');
    setSuggestions([]);
    setGpsError(null);

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Event handlers for fixed center pin (Uber/Rappi style)
      map.on('movestart', () => {
        setIsMapMoving(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCoords({ lat: center.lat, lng: center.lng });
      });

      map.on('moveend', () => {
        setIsMapMoving(false);
        const center = map.getCenter();
        setCoords({ lat: center.lat, lng: center.lng });
      });

      map.on('dragend', () => {
        setIsMapMoving(false);
        const center = map.getCenter();
        setCoords({ lat: center.lat, lng: center.lng });
      });

      mapInstanceRef.current = map;
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng, initialAddress]);

  // Priority Button: Geolocation GPS
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('La geolocalización no está soportada por su navegador.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Permiso de GPS denegado. Habilita el acceso en tu navegador.');
        } else {
          setGpsError('No se pudo obtener la señal GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Autocomplete search via decoupled GeoProvider (OSM/Google Strategy)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setGpsError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await placesService.searchPlaces(trimmed, { 
          limit: 5,
          lat: coords.lat,
          lng: coords.lng
        });
        setSuggestions(results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (place: PlaceResult) => {
    const lat = place.location.lat;
    const lng = place.location.lng;

    setSearchQuery(place.name || place.formattedAddress.split(',')[0]);
    setSelectedAddress(place.formattedAddress);
    setSuggestions([]);
    setCoords({ lat, lng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
  };

  const handleConfirm = () => {
    if (!isValidCoords) return;
    onConfirm({
      lat: coords.lat,
      lng: coords.lng,
      address: selectedAddress || searchQuery || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-400">Selecciona o ajusta la posición en el mapa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* 1. Botón Prioritario: Ubicación Actual */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Obteniendo ubicación del negocio...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-white" />
                <span>📍 Estoy en el negocio ahora mismo</span>
              </>
            )}
          </button>

          {gpsError && (
            <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1">
              {gpsError}
            </p>
          )}

          {/* 2. Buscador de Dirección con Autocompletado (Fallback 1) */}
          <div className="relative">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Escribe la dirección o nombre del negocio..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {isSearching && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 ml-1" />}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="text-slate-500 hover:text-slate-300 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-800/80">
                {suggestions.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(place)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 transition-colors flex items-start gap-2 text-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-100 truncate">
                        {place.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {place.formattedAddress}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Mini-Mapa Interactivo con Pin Fijo en el Centro (Ajuste Fino Uber/Rappi) */}
          <div className="relative w-full h-[280px] rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
            {/* The Map Div */}
            <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Uber/Rappi Fixed Center Pin Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[500] flex flex-col items-center select-none">
              <div
                className={`flex flex-col items-center transition-transform duration-200 ease-out ${
                  isMapMoving ? '-translate-y-3 scale-110' : 'translate-y-0 scale-100'
                }`}
              >
                {/* Visual Label */}
                <span className="bg-slate-900/90 text-cyan-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-lg mb-0.5 whitespace-nowrap">
                  Punto del Negocio
                </span>
                {/* Red Pin Icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 text-rose-500 drop-shadow-[0_8px_12px_rgba(234,67,53,0.5)]"
                  fill="currentColor"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              {/* Pin Contact Point Shadow */}
              <div
                className={`w-3.5 h-1.5 bg-black/60 rounded-full blur-[1px] transition-all duration-200 ${
                  isMapMoving ? 'scale-50 opacity-30' : 'scale-100 opacity-80'
                }`}
              />
            </div>

            {/* Quick Zoom Controls */}
            <div className="absolute right-2.5 bottom-2.5 z-[500] flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Acercar"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="h-[1px] bg-slate-800 w-full" />
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Alejar"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Texto de Instrucción Simple Debajo del Mapa */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300">
            <span className="text-cyan-400 font-bold shrink-0">📍 Ajuste fino:</span>
            <span>Mueve el mapa hasta que el punto quede sobre la entrada de tu negocio.</span>
          </div>
        </div>

        {/* Footer: Confirm Button (Disabled until coordinates are valid) */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValidCoords}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              isValidCoords
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Confirmar ubicación</span>
          </button>
        </div>

      </div>
    </div>
  );
};
