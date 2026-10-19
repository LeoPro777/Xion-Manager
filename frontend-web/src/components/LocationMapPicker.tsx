import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Layers, 
  Plus, 
  Minus, 
  Maximize2, 
  ExternalLink, 
  Check, 
  Copy,
  Store,
  Monitor
} from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'branch' | 'register';
  status?: string;
  subtitle?: string;
}

export interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  address?: string;
  onChange?: (coords: { lat: number; lng: number; address?: string }) => void;
  readOnly?: boolean;
  height?: string;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  onMarkerSelect?: (marker: MapMarkerItem) => void;
  googleMapsApiKey?: string;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  address,
  onChange,
  readOnly = false,
  height = '360px',
  markers = [],
  selectedMarkerId,
  onMarkerSelect,
  googleMapsApiKey
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeMarkerRef = useRef<L.Marker | null>(null);
  const multiMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(latitude || 10.6417);
  const [currentLng, setCurrentLng] = useState<number>(longitude || -71.6125);
  const [searchQuery, setSearchQuery] = useState(address || '');
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [isLocating, setIsLocating] = useState(false);

  // OpenStreetMap Tile Layers
  const tileLayers = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  };

  const cityPresets = [
    { name: 'Maracaibo', lat: 10.6417, lng: -71.6125 },
    { name: 'Caracas', lat: 10.4806, lng: -66.9036 },
    { name: 'Valencia', lat: 10.1620, lng: -67.9944 },
    { name: 'Barquisimeto', lat: 10.0678, lng: -69.3474 },
    { name: 'Lago Mall', lat: 10.6698, lng: -71.5989 },
  ];

  // Primary Red Google Pin Icon
  const createGooglePin = (label?: string) => {
    return L.divIcon({
      className: 'google-maps-pin-marker',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
          <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="#EA4335">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          ${label ? `<div style="background: rgba(15,23,42,0.92); color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 6px; white-space: nowrap; margin-top: -6px; border: 1px solid rgba(255,255,255,0.2);">${label}</div>` : ''}
          <div style="width: 8px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px); margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });
  };

  // Branch or Register Marker
  const createSubMarker = (item: MapMarkerItem) => {
    const isBranch = item.type === 'branch';
    const color = isBranch ? '#0891b2' : '#10b981';
    return L.divIcon({
      className: 'google-maps-sub-marker',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
          <div style="background: ${color}; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); border: 2px solid #fff;">
            <span style="font-size: 11px; font-weight: 900;">${isBranch ? '🏢' : '🖥️'}</span>
          </div>
          <div style="background: rgba(15,23,42,0.9); color: #fff; font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px; white-space: nowrap; margin-top: 2px; border: 1px solid rgba(255,255,255,0.15);">
            ${item.name}
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = Number.isFinite(latitude) ? latitude : 10.6417;
    const initialLng = Number.isFinite(longitude) ? longitude : -71.6125;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Add Initial Layer
    const layer = L.tileLayer(tileLayers[mapType], {
      maxZoom: 19,
    }).addTo(map);
    currentTileLayerRef.current = layer;

    // Active Draggable / Click Pin
    const marker = L.marker([initialLat, initialLng], {
      icon: createGooglePin(),
      draggable: !readOnly
    }).addTo(map);

    if (!readOnly && onChange) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCurrentLat(pos.lat);
        setCurrentLng(pos.lng);
        onChange({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentLat(lat);
        setCurrentLng(lng);
        onChange({ lat, lng });
      });
    }

    activeMarkerRef.current = marker;
    mapInstanceRef.current = map;

    // Multi-marker Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    multiMarkersGroupRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync props change to marker position
  useEffect(() => {
    if (!mapInstanceRef.current || !activeMarkerRef.current) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    if (currentLat !== latitude || currentLng !== longitude) {
      setCurrentLat(latitude);
      setCurrentLng(longitude);
      activeMarkerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Sync Map Type Changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }
    const nextLayer = L.tileLayer(tileLayers[mapType], { maxZoom: 19 }).addTo(mapInstanceRef.current);
    currentTileLayerRef.current = nextLayer;
  }, [mapType]);

  // Sync Multi-Markers (Overview Mode)
  useEffect(() => {
    if (!multiMarkersGroupRef.current || !mapInstanceRef.current) return;
    multiMarkersGroupRef.current.clearLayers();

    if (markers.length > 0) {
      markers.forEach(m => {
        if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
        const subMarker = L.marker([m.lat, m.lng], {
          icon: createSubMarker(m)
        });

        subMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; min-width: 130px;">
            <b style="color: #0f172a; font-size: 12px;">${m.name}</b>
            <div style="color: #64748b; margin-top: 2px;">${m.type === 'branch' ? 'Sucursal Comercial' : 'Caja POS'}</div>
            ${m.subtitle ? `<div style="font-weight: bold; margin-top: 2px;">${m.subtitle}</div>` : ''}
            <div style="font-family: monospace; font-size: 10px; color: #0891b2; margin-top: 4px;">(${m.lat.toFixed(4)}, ${m.lng.toFixed(4)})</div>
          </div>
        `);

        if (onMarkerSelect) {
          subMarker.on('click', () => onMarkerSelect(m));
        }

        multiMarkersGroupRef.current?.addLayer(subMarker);
      });
    }
  }, [markers]);

  // Zoom Helpers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Reset Center
  const handleCenter = () => {
    if (mapInstanceRef.current && activeMarkerRef.current) {
      mapInstanceRef.current.setView([currentLat, currentLng], 15);
    }
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por su navegador.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentLat(lat);
        setCurrentLng(lng);
        activeMarkerRef.current?.setLatLng([lat, lng]);
        mapInstanceRef.current?.setView([lat, lng], 16);
        onChange?.({ lat, lng });
      },
      () => {
        setIsLocating(false);
        alert('No se pudo obtener la ubicación GPS.');
      },
      { timeout: 8000 }
    );
  };

  // Search Address or Coordinates
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if user entered "lat, lng" coordinates directly
    const coordsMatch = searchQuery.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[3]);
      setCurrentLat(lat);
      setCurrentLng(lng);
      activeMarkerRef.current?.setLatLng([lat, lng]);
      mapInstanceRef.current?.setView([lat, lng], 15);
      onChange?.({ lat, lng });
      return;
    }

    // Geocoding query
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setCurrentLat(lat);
          setCurrentLng(lng);
          activeMarkerRef.current?.setLatLng([lat, lng]);
          mapInstanceRef.current?.setView([lat, lng], 15);
          onChange?.({ lat, lng, address: data[0].display_name });
        } else {
          alert('No se encontraron coordenadas para esta dirección.');
        }
      }
    } catch {
      // Fallback preset lookup
      const found = cityPresets.find(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      if (found) {
        setCurrentLat(found.lat);
        setCurrentLng(found.lng);
        activeMarkerRef.current?.setLatLng([found.lat, found.lng]);
        mapInstanceRef.current?.setView([found.lat, found.lng], 15);
        onChange?.({ lat: found.lat, lng: found.lng });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGoogleMapsDirect = () => {
    window.open(`https://www.google.com/maps?q=${currentLat},${currentLng}`, '_blank');
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex flex-col group">
      {/* Google Maps Top Floating Search & Preset Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <form 
            onSubmit={handleSearch} 
            className="flex-1 flex items-center bg-white dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-cyan-500/30"
          >
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar en Google Maps o escribir dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400"
            />
            {isSearching ? (
              <span className="text-[10px] text-cyan-500 animate-pulse font-mono">Buscando...</span>
            ) : (
              <button
                type="submit"
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors ml-1"
              >
                Ir
              </button>
            )}
          </form>

          {/* Map Layer Selector (Mapa | Satélite | Oscuro) */}
          <div className="hidden sm:flex items-center bg-white dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setMapType('streets')}
              className={`px-2.5 py-1 rounded-lg transition-all ${mapType === 'streets' ? 'bg-cyan-500 text-white shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              Mapa
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-all ${mapType === 'satellite' ? 'bg-cyan-500 text-white shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              Satélite
            </button>
            <button
              type="button"
              onClick={() => setMapType('dark')}
              className={`px-2.5 py-1 rounded-lg transition-all ${mapType === 'dark' ? 'bg-cyan-500 text-white shadow-sm' : 'hover:text-slate-900 dark:hover:text-white'}`}
            >
              Oscuro
            </button>
          </div>
        </div>

        {/* Quick City Presets Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto">
          {cityPresets.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setCurrentLat(c.lat);
                setCurrentLng(c.lng);
                activeMarkerRef.current?.setLatLng([c.lat, c.lng]);
                mapInstanceRef.current?.setView([c.lat, c.lng], 15);
                onChange?.({ lat: c.lat, lng: c.lng });
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/90 dark:bg-slate-900/90 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm transition-all shrink-0"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ height }} 
        className="w-full z-10 cursor-crosshair"
      />

      {/* Google Maps Floating Controls (Right Side) */}
      <div className="absolute right-3 bottom-12 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleGetLocation}
          title="Usar mi ubicación actual (GPS)"
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-cyan-500 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'text-cyan-500 animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleCenter}
          title="Centrar en el marcador"
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-cyan-500 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <MapPin className="w-4 h-4 text-rose-500" />
        </button>

        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Coordinates & Google Maps Link Bar */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-mono text-[11px] text-cyan-400 font-semibold">
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </span>
          <button
            type="button"
            onClick={handleCopyCoords}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              * Haz clic o arrastra el marcador para fijar la ubicación
            </span>
          )}
          <button
            type="button"
            onClick={openGoogleMapsDirect}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 transition-all hover:scale-105"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
