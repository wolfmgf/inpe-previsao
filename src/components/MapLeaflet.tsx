import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import React from 'react';

const icon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  position: LatLngExpression;
  onMapClick: (coords: { lat: number; lon: number }) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: MapProps['onMapClick'] }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMapClick({ lat, lon: lng });
    },
  });
  return null;
}

function ChangeView({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
    setTimeout(() => { map.invalidateSize() }, 100);
  }, [center, map]);
  return null;
}

export default function MapLeaflet({ position, onMapClick }: MapProps) {
  return (
    <MapContainer
      center={position}
      zoom={10}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <ChangeView center={position} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={icon} />
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}