import React, { useEffect, useRef } from 'react';

interface AttendanceMapProps {
  lat: number;
  lng: number;
  branchLat: number;
  branchLng: number;
  radiusMeters?: number;
}

export default function AttendanceMap({
  lat,
  lng,
  branchLat,
  branchLng,
  radiusMeters = 2000
}: AttendanceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.warn("Leaflet global library (window.L) is not loaded yet.");
      return;
    }

    try {
      // If the map has not been initialized yet, build it
      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([lat, lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
        }).addTo(mapRef.current);
      } else {
        // Map elements already exist, clear existing layer elements first
        mapRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Circle) {
            mapRef.current.removeLayer(layer);
          }
        });
      }

      const map = mapRef.current;

      // Draw the allowed geo-fence limit circle of 2KM
      const zoneColor = '#4f46e5'; // Premium Indigo
      const geofenceCircle = L.circle([branchLat, branchLng], {
        color: zoneColor,
        fillColor: '#818cf8',
        fillOpacity: 0.15,
        radius: radiusMeters,
        weight: 1.5,
        dashArray: '5, 5'
      }).addTo(map);

      // Branch/Outlet Marker Customization with custom popup text
      const branchMarker = L.marker([branchLat, branchLng]).addTo(map)
        .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><strong style="color: #4f46e5;">Oultet Laundry</strong><br/>Koordinat Pusat Geofence</div>`);

      // Employee current position Marker
      const employeeMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<div style="font-family: sans-serif; font-size: 11px;"><strong style="color: #64748b;">Lokasi Anda</strong><br/>Presensi Disini</div>`);

      // Automatically pad & scale viewport to show both points perfectly
      const bounds = L.featureGroup([branchMarker, employeeMarker]).getBounds();
      map.fitBounds(bounds.pad(0.2));

    } catch (error) {
      console.error("Failed to render Leaflet map:", error);
    }

    return () => {
      // In React Strict Mode, we can keep the map to avoid flickering since we handle re-render updates,
      // but let's handle simple cleanup if the parent components get demolished.
    };
  }, [lat, lng, branchLat, branchLng, radiusMeters]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Peta Visualisasi Radius Presensi (Leaflet Live)</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-indigo-600">Batas Toleransi: 2 KM</span>
        </div>
      </div>
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div ref={mapContainerRef} className="h-[210px] w-full" id="attendance-leaflet-view" />
        <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[9px] font-mono leading-none text-slate-800 font-extrabold border border-indigo-150 shadow-sm z-[1000] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time GPS Tracking</span>
        </div>
      </div>
    </div>
  );
}
