'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LeafletMap({
  latitude,
  longitude,
  storeName,
}: {
  latitude: number;
  longitude: number;
  storeName: string;
}) {
  useEffect(() => {
    const map = L.map('store-map', {
      center: [latitude, longitude],
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`<b>${storeName}</b>`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [latitude, longitude, storeName]);

  return <div id="store-map" className="h-full w-full" aria-label={`Peta lokasi ${storeName}`} />;
}
