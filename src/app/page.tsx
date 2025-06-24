'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ===== Tipagem dos dados de previsão semanal =====
interface PrevisaoSemanal {
  semana: number;
  anomalia_precipitacao: number;
  anomalia_temperatura: number;
  temperatura_minima: number;
  temperatura_maxima: number;
  radiacao_uv: number;
}

// ===== Tipagem da resposta da API =====
interface ApiResponse {
  localidade_aproximada: string;
  data_geracao: string;
  previsoes: PrevisaoSemanal[];
}

export default function HomePage() {
  // Estado para coordenadas selecionadas
  const [coords, setCoords] = useState({ lat: -15.793889, lon: -47.882778 });
  // Estado para resposta da API
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  // Estado de carregamento
  const [isLoading, setIsLoading] = useState(false);
  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Importa dinamicamente o componente de mapa sem SSR
  const MapWithNoSSR = useMemo(
    () =>
      dynamic(() => import('@/components/MapLeaflet'), {
        ssr: false,
        loading: () => (
          <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
            <p>Carregando mapa...</p>
          </div>
        ),
      }),
    []
  );

  // Função para buscar previsão na API com base nas coordenadas
  const buscarPrevisao = async () => {
    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    try {
      const response = await fetch(`/api/previsao?lat=${coords.lat}&lon=${coords.lon}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar previsão.');
      }
      const data: ApiResponse = await response.json();
      setApiResponse(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Posição do marcador no mapa
  const position: LatLngExpression = [coords.lat, coords.lon];

  // Formata a data de geração da previsão para exibição
  const formattedDate = useMemo(() => {
    if (!apiResponse?.data_geracao) return null;
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'medium',
    }).format(new Date(apiResponse.data_geracao));
  }, [apiResponse]);

  return (
    <main className="container mx-auto p-4 md:p-8">
      {/* Título e subtítulo */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Visualizador de Previsão Subsazonal</h1>
        <p className="text-muted-foreground mt-2">Dados (simulados) baseados na API do CPTEC/INPE</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Coluna de Controle e Mapa */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Local</CardTitle>
              <CardDescription>Use as coordenadas ou clique no mapa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inputs para latitude e longitude */}
              <div className="flex items-center gap-4">
                <div className="w-full space-y-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    value={coords.lat.toFixed(6)}
                    onChange={e => setCoords({ ...coords, lat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="w-full space-y-1">
                  <Label htmlFor="lon">Longitude</Label>
                  <Input
                    id="lon"
                    type="number"
                    value={coords.lon.toFixed(6)}
                    onChange={e => setCoords({ ...coords, lon: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {/* Mapa interativo para seleção de local */}
              <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                <MapWithNoSSR position={position} setCoords={setCoords} />
              </div>
              {/* Botão para buscar previsão */}
              <Button onClick={buscarPrevisao} disabled={isLoading} className="w-full text-lg py-6">
                {isLoading ? 'Buscando...' : 'Buscar Previsão'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna de Resultados */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Previsão</CardTitle>
              {/* Exibe localidade e data se houver resposta */}
              {apiResponse && (
                <CardDescription>
                  Para: {apiResponse.localidade_aproximada} <br />
                  Gerado em: {formattedDate}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center">
              {/* Mensagens de carregamento, erro ou instrução */}
              {isLoading && <p>Carregando dados...</p>}
              {error && <p className="text-red-500 font-semibold">{error}</p>}
              {!isLoading && !error && !apiResponse && (
                <p className="text-muted-foreground text-center">Aguardando seleção de local e busca.</p>
              )}

              {/* Exibe gráficos e tabela se houver resposta */}
              {apiResponse && (
                <div className="w-full h-full flex flex-col justify-start pt-4 space-y-8">

                  {/* Seção dos Gráficos */}
                  <div className="w-full grid grid-cols-1 gap-6">
                    {/* Gráfico de anomalia de precipitação */}
                    <div className='w-full h-[220px]'>
                      <h3 className="text-base font-semibold mb-1 text-center">Anomalia de Precipitação (mm/semana)</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={apiResponse.previsoes} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="semana" unit="ª sem" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="anomalia_precipitacao"
                            name="Precipitação"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Gráfico de anomalia de temperatura */}
                    <div className='w-full h-[220px]'>
                      <h3 className="text-base font-semibold mb-1 text-center">Anomalia de Temperatura (°C)</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={apiResponse.previsoes} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="semana" unit="ª sem" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="anomalia_temperatura"
                            name="Anomalia Temp."
                            stroke="#ef4444"
                            strokeWidth={2}
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Gráfico de radiação UV */}
                    <div className='w-full h-[220px]'>
                      <h3 className="text-base font-semibold mb-1 text-center">Índice de Radiação UV</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={apiResponse.previsoes} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="semana" unit="ª sem" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="radiacao_uv" name="Índice UV" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabela detalhada dos dados semanais */}
                  <div className="w-full pt-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">Dados Detalhados</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Semana</TableHead>
                            <TableHead className="text-center">Temp. Mín (°C)</TableHead>
                            <TableHead className="text-center">Temp. Máx (°C)</TableHead>
                            <TableHead className="text-center">Radiação UV</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Renderiza cada linha da tabela com os dados da previsão */}
                          {apiResponse.previsoes.map((previsao) => (
                            <TableRow key={previsao.semana}>
                              <TableCell className="font-medium text-center">{previsao.semana}</TableCell>
                              <TableCell className="text-center">{previsao.temperatura_minima}°</TableCell>
                              <TableCell className="text-center">{previsao.temperatura_maxima}°</TableCell>
                              <TableCell className="text-center">{previsao.radiacao_uv}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}