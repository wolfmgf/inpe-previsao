import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';

// Corrige um problema conhecido com o ícone padrão do Leaflet no React.
// Sem isso, o ícone do marcador pode não aparecer corretamente.
const icon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Tipagem das props esperadas pelo componente de mapa
interface MapProps {
  position: LatLngExpression; // Posição do marcador no mapa
  setCoords: (coords: { lat: number; lon: number }) => void; // Função para atualizar coordenadas no estado pai
}

// Componente auxiliar para lidar com os cliques no mapa
// Ao clicar no mapa, atualiza as coordenadas no componente pai
function MapClickHandler({ setCoords }: { setCoords: MapProps['setCoords'] }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lon: lng });
    },
  });
  return null;
}

// Componente principal do mapa Leaflet
export default function MapLeaflet({ position, setCoords }: MapProps) {
  return (
    <MapContainer
      center={position}
      zoom={5}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Camada de tiles do OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Marcador na posição selecionada */}
      <Marker position={position} icon={icon} />
      {/* Handler para atualizar coordenadas ao clicar no mapa */}
      <MapClickHandler setCoords={setCoords} />
    </MapContainer>
  );
}