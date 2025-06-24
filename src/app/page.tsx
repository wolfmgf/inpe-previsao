'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';
import React from 'react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sun, Cloudy, CloudSun, CloudRain, Zap, Snowflake, Haze, CloudDrizzle } from 'lucide-react';

// ===== Tipos de dados usados na previsão =====
interface PrevisaoDiaria {
  semana: number;
  temperatura_minima: number;
  temperatura_maxima: number;
  dia: string;
  tempo: string;
  radiacao_uv: number;
}
interface ApiResponse {
  localidade_aproximada: string;
  data_geracao: string;
  previsoes: PrevisaoDiaria[];
}

// ===== Dicionário de condições climáticas e helpers =====
const weatherCodeMap: { [key: string]: { description: string; icon: JSX.Element } } = {
  'ec': { description: 'Encoberto com Chuvas Isoladas', icon: <CloudRain /> },
  'ci': { description: 'Chuvas Isoladas', icon: <CloudRain /> },
  'c': { description: 'Chuva', icon: <CloudRain /> },
  'in': { description: 'Instável', icon: <Zap /> },
  'pp': { description: 'Poss. de Pancadas de Chuva', icon: <CloudDrizzle /> },
  'cm': { description: 'Chuva pela Manhã', icon: <CloudRain /> },
  'cn': { description: 'Chuva à Noite', icon: <CloudRain /> },
  'pt': { description: 'Pancadas de Chuva à Tarde', icon: <CloudDrizzle /> },
  'pm': { description: 'Pancadas de Chuva pela Manhã', icon: <CloudDrizzle /> },
  'np': { description: 'Nublado com Pancadas de Chuva', icon: <CloudRain /> },
  'pc': { description: 'Pancadas de Chuva', icon: <CloudDrizzle /> },
  'pn': { description: 'Parcialmente Nublado', icon: <CloudSun /> },
  'cv': { description: 'Chuvisco', icon: <CloudDrizzle /> },
  'ch': { description: 'Chuvoso', icon: <CloudRain /> },
  't': { description: 'Tempestade', icon: <Zap /> },
  'ps': { description: 'Predomínio de Sol', icon: <Sun /> },
  'e': { description: 'Encoberto', icon: <Cloudy /> },
  'n': { description: 'Nublado', icon: <Cloudy /> },
  'cl': { description: 'Céu Claro', icon: <Sun /> },
  'nv': { description: 'Nevoeiro', icon: <Haze /> },
  'g': { description: 'Geada', icon: <Snowflake /> },
  'ne': { description: 'Neve', icon: <Snowflake /> },
  'nd': { description: 'Não Definido', icon: <Cloudy /> },
  'pnt': { description: 'Pancadas de Chuva à Noite', icon: <CloudDrizzle /> },
  'psc': { description: 'Possibilidade de Chuva', icon: <CloudRain /> },
  'pcm': { description: 'Poss. de Chuva pela Manhã', icon: <CloudRain /> },
  'pct': { description: 'Poss. de Chuva à Tarde', icon: <CloudRain /> },
  'pcn': { description: 'Poss. de Chuva à Noite', icon: <CloudRain /> },
  'npt': { description: 'Nublado com Pancadas à Tarde', icon: <CloudRain /> },
  'npn': { description: 'Nublado com Pancadas à Noite', icon: <CloudRain /> },
  'ncn': { description: 'Nublado com Poss. de Chuva à Noite', icon: <CloudRain /> },
  'nct': { description: 'Nublado com Poss. de Chuva à Tarde', icon: <CloudRain /> },
  'ncm': { description: 'Nublado com Poss. de Chuva pela Manhã', icon: <CloudRain /> },
  'npm': { description: 'Nublado com Pancadas pela Manhã', icon: <CloudRain /> },
  'npp': { description: 'Nublado com Possibilidade de Chuva', icon: <CloudRain /> },
  'vn': { description: 'Variação de Nebulosidade', icon: <CloudSun /> },
  'ct': { description: 'Chuva à Tarde', icon: <CloudRain /> },
  'ppn': { description: 'Poss. de Panc. de Chuva à Noite', icon: <CloudDrizzle /> },
  'ppt': { description: 'Poss. de Panc. de Chuva à Tarde', icon: <CloudDrizzle /> },
  'ppm': { description: 'Poss. de Panc. de Chuva pela Manhã', icon: <CloudDrizzle /> },
};
const getWeatherInfo = (tempoSigla: string | undefined) => {
  const iconProps = { size: 24, className: 'mx-auto' };
  if (!tempoSigla || !weatherCodeMap[tempoSigla]) {
    return { description: 'Condição não informada', icon: <Cloudy {...iconProps} /> };
  }
  const weatherInfo = weatherCodeMap[tempoSigla];
  weatherInfo.icon = React.cloneElement(weatherInfo.icon, iconProps);
  return weatherInfo;
};
// Formata a data para exibição no eixo X dos gráficos e na tabela
const formatXAxis = (dateString: string) => {
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return `${String(adjustedDate.getDate()).padStart(2, '0')}/${String(adjustedDate.getMonth() + 1).padStart(2, '0')}`;
};

export default function HomePage() {
  // Estado do input de cidade
  const [cidadeInput, setCidadeInput] = useState('São Paulo');
  // Estado das coordenadas selecionadas no mapa
  const [currentCoords, setCurrentCoords] = useState<LatLngExpression>([-23.55, -46.63]);
  // Estado da resposta da API
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  // Estado de carregamento
  const [isLoading, setIsLoading] = useState(false);
  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Importa o componente de mapa sem SSR (Server Side Rendering)
  const MapWithNoSSR = useMemo(
    () => dynamic(() => import('@/components/MapLeaflet'), {
      ssr: false,
      loading: () => (
        <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
          <p>Carregando mapa...</p>
        </div>
      )
    }),
    []
  );

  // Função para buscar previsão na API, por cidade ou coordenadas
  const buscarPrevisao = async (cidade?: string, coords?: { lat: number, lon: number }) => {
    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    try {
      let queryString = '';
      if (cidade) {
        queryString = `cidade=${encodeURIComponent(cidade)}`;
      }
      else if (coords) {
        queryString = `lat=${coords.lat}&lon=${coords.lon}`;
      }
      else {
        throw new Error("É necessário fornecer uma cidade ou coordenadas.");
      }
      const response = await fetch(`/api/previsao?${queryString}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Ocorreu um erro ao buscar a previsão.');
      }
      console.log("JSON DE RETORNO DA API:", result.data);
      setApiResponse(result.data);
      // Atualiza o input de cidade com o nome retornado pela API, se houver
      if (result.data?.localidade_aproximada) {
        setCidadeInput(result.data.localidade_aproximada.split(' - ')[0]);
      }
    } catch (err: unknown) {
      if (err instanceof Error) { setError(err.message); }
      else { setError('Ocorreu um erro desconhecido.'); }
    } finally { setIsLoading(false); }
  };

  // Handler para clique no mapa: atualiza coordenadas e busca previsão
  const handleMapClick = (coords: { lat: number, lon: number }) => {
    setCurrentCoords([coords.lat, coords.lon]);
    buscarPrevisao(undefined, coords);
  }

  // Formata a data de geração da previsão para exibição
  const formattedDate = useMemo(() => {
    if (!apiResponse?.data_geracao) return null;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'medium' }).format(new Date(apiResponse.data_geracao));
  }, [apiResponse]);

  return (
    <main className="container mx-auto p-4 md:p-8">
      {/* Título e subtítulo */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Previsão do Tempo (INPE)</h1>
        <p className="text-muted-foreground mt-2">Busque por nome ou clique no mapa</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Coluna do formulário e mapa */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecione um Local</CardTitle>
              <CardDescription>Digite o nome da cidade ou clique no mapa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input para buscar por cidade */}
              <div className="w-full space-y-1">
                <Label htmlFor="cidade">Nome da Cidade</Label>
                <div className="flex gap-2">
                  <Input
                    id="cidade"
                    type="text"
                    value={cidadeInput}
                    onChange={(e) => setCidadeInput(e.target.value)}
                    placeholder="Ex: Rio de Janeiro"
                  />
                  <Button onClick={() => buscarPrevisao(cidadeInput)} disabled={isLoading}>
                    {isLoading ? '...' : 'Buscar'}
                  </Button>
                </div>
              </div>
              {/* Mapa interativo para seleção de coordenadas */}
              <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                <MapWithNoSSR position={currentCoords} onMapClick={handleMapClick} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna dos resultados */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Previsão</CardTitle>
              {/* Exibe cidade e data se houver resposta */}
              {apiResponse && (
                <CardDescription>
                  Cidade: {apiResponse.localidade_aproximada} <br />
                  Atualizado em: {formattedDate}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center min-h-[500px]">
              {/* Mensagens de carregamento, erro ou instrução */}
              {isLoading && <p>Carregando dados...</p>}
              {error && <p className="text-red-500 font-semibold text-center">{error}</p>}
              {!isLoading && !error && !apiResponse && (
                <p className="text-muted-foreground text-center">Busque uma cidade ou clique no mapa.</p>
              )}
              {/* Exibe gráficos e tabela se houver resposta */}
              {apiResponse && (
                <div className="w-full h-full flex flex-col justify-start pt-4 space-y-8">
                  {/* Gráficos */}
                  <div className="w-full grid grid-cols-1 gap-6">
                    {/* Gráfico de temperatura mínima e máxima */}
                    <div className='w-full h-[220px]'>
                      <h3 className="text-base font-semibold mb-1 text-center">Temperatura (°C)</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={apiResponse.previsoes} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" fontSize={12} tickFormatter={formatXAxis} />
                          <YAxis fontSize={12} unit="°" />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="temperatura_maxima" name="Máxima" stroke="#ef4444" strokeWidth={2} />
                          <Line type="monotone" dataKey="temperatura_minima" name="Mínima" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Gráfico de índice de radiação UV */}
                    <div className='w-full h-[220px]'>
                      <h3 className="text-base font-semibold mb-1 text-center">Índice de Radiação UV</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={apiResponse.previsoes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" fontSize={12} tickFormatter={formatXAxis} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="radiacao_uv" name="Índice UV" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Tabela detalhada dos dados */}
                  <div className="w-full pt-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">Dados Detalhados</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Data</TableHead>
                            <TableHead className="text-center">Condição</TableHead>
                            <TableHead className="text-center">Mín</TableHead>
                            <TableHead className="text-center">Máx</TableHead>
                            <TableHead className="text-center">UV</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Renderiza cada linha da tabela com os dados da previsão */}
                          {apiResponse.previsoes.map((previsao) => {
                            const weather = getWeatherInfo(previsao.tempo);
                            return (
                              <TableRow key={previsao.dia}>
                                <TableCell className="font-medium text-center">{formatXAxis(previsao.dia)}</TableCell>
                                <TableCell title={weather.description}>{weather.icon}</TableCell>
                                <TableCell className="text-center">{previsao.temperatura_minima}°</TableCell>
                                <TableCell className="text-center">{previsao.temperatura_maxima}°</TableCell>
                                <TableCell className="text-center">{previsao.radiacao_uv}</TableCell>
                              </TableRow>
                            );
                          })}
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