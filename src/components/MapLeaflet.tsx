'use client';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import React from 'react';

// Criação do ícone customizado para o marcador do mapa
const icon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Tipagem das propriedades esperadas pelo componente de mapa
interface MapProps {
  position: LatLngExpression; // Coordenadas do marcador
  onMapClick: (coords: { lat: number; lon: number }) => void; // Função chamada ao clicar no mapa
}

// Componente auxiliar para capturar cliques no mapa e repassar as coordenadas para o componente pai
function MapClickHandler({ onMapClick }: { onMapClick: MapProps['onMapClick'] }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMapClick({ lat, lon: lng });
    },
  });
  return null;
}

// Componente auxiliar para atualizar a visualização do mapa quando o centro muda
function ChangeView({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
    // Corrige possíveis problemas de renderização ao mudar o centro
    setTimeout(() => { map.invalidateSize() }, 100);
  }, [center, map]);
  return null;
}

// Componente principal do mapa Leaflet
export default function MapLeaflet({ position, onMapClick }: MapProps) {
  return (
    <MapContainer
      center={position}
      zoom={10}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Atualiza a visualização do mapa ao mudar a posição */}
      <ChangeView center={position} />
      {/* Camada de tiles do OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Marcador na posição selecionada */}
      <Marker position={position} icon={icon} />
      {/* Handler para capturar cliques no mapa */}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}