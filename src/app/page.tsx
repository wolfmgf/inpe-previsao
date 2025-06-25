'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';
import React from 'react';

// Imports de UI e Ícones
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sun, Cloudy, CloudSun, CloudRain, Zap, Snowflake, Haze, CloudDrizzle, Wind, Droplets, Compass, Eye, Gauge } from 'lucide-react';

// Tipagem final e completa dos dados
interface PrevisaoDiaria { semana: number; temperatura_minima: number; temperatura_maxima: number; dia: string; tempo: string; radiacao_uv: number; }
interface CondicoesAtuais { temperatura: number | string; umidade: number | string; vento_velocidade: number | string; vento_direcao: number; pressao: number | string; visibilidade: string; condicao_atual_desc: string; }
interface ApiResponse { localidade_aproximada: string; data_geracao: string; previsoes: PrevisaoDiaria[]; condicoes_atuais: CondicoesAtuais; }

// Funções Helper
const getWeatherInfo = (tempoSigla: string | undefined) => { const iconProps = { size: 24, className: 'mx-auto' }; if (!tempoSigla || !weatherCodeMap[tempoSigla]) { return { description: 'Condição não informada', icon: <Cloudy {...iconProps} /> }; } const weatherInfo = { ...weatherCodeMap[tempoSigla] }; weatherInfo.icon = React.cloneElement(weatherInfo.icon, iconProps); return weatherInfo; };
const formatXAxis = (dateString: string) => { const date = new Date(dateString); const userTimezoneOffset = date.getTimezoneOffset() * 60000; const adjustedDate = new Date(date.getTime() + userTimezoneOffset); return `${String(adjustedDate.getDate()).padStart(2, '0')}/${String(adjustedDate.getMonth() + 1).padStart(2, '0')}`; };
const getWindDirection = (degrees: number) => { if (typeof degrees !== 'number') return ''; const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return directions[Math.round(degrees / 45) % 8]; };

export default function HomePage() {
  const [cidadeInput, setCidadeInput] = useState('São Paulo');
  const [currentCoords, setCurrentCoords] = useState<LatLngExpression>([-23.55, -46.63]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MapWithNoSSR = useMemo(() => dynamic(() => import('@/components/MapLeaflet'), { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center"><p>Carregando mapa...</p></div> }), []);
  const buscarPrevisao = async (cidade?: string, coords?: { lat: number, lon: number }) => { setIsLoading(true); setError(null); setApiResponse(null); try { let queryString = ''; if (cidade) { queryString = `cidade=${encodeURIComponent(cidade)}`; } else if (coords) { queryString = `lat=${coords.lat}&lon=${coords.lon}`; } else { throw new Error("É necessário fornecer uma cidade ou coordenadas."); } const response = await fetch(`/api/previsao?${queryString}`); const result = await response.json(); if (!result.success) { throw new Error(result.message || 'Ocorreu um erro ao buscar a previsão.'); } setApiResponse(result.data); if (result.data?.localidade_aproximada) { setCidadeInput(result.data.localidade_aproximada.split(' - ')[0]); } } catch (err: unknown) { if (err instanceof Error) { setError(err.message); } else { setError('Ocorreu um erro desconhecido.'); } } finally { setIsLoading(false); } };
  const handleMapClick = (coords: { lat: number, lon: number }) => { setCurrentCoords([coords.lat, coords.lon]); buscarPrevisao(undefined, coords); };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8"> <h1 className="text-4xl font-bold tracking-tight">Painel Meteorológico (INPE)</h1> <p className="text-muted-foreground mt-2">Busque por nome ou clique no mapa</p> </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-6"> <Card> <CardHeader> <CardTitle>Selecione um Local</CardTitle> <CardDescription>Digite o nome da cidade ou clique no mapa.</CardDescription> </CardHeader> <CardContent className="space-y-4"> <div className="w-full space-y-1"> <Label htmlFor="cidade">Nome da Cidade</Label> <div className="flex gap-2"> <Input id="cidade" type="text" value={cidadeInput} onChange={(e) => setCidadeInput(e.target.value)} placeholder="Ex: Rio de Janeiro" /> <Button onClick={() => buscarPrevisao(cidadeInput)} disabled={isLoading}> {isLoading ? '...' : 'Buscar'} </Button> </div> </div> <div className="h-[400px] w-full rounded-lg overflow-hidden border"> <MapWithNoSSR position={currentCoords} onMapClick={handleMapClick} /> </div> </CardContent> </Card> </div>
        <div className="lg:col-span-3 space-y-6">
          {isLoading && <div className="flex justify-center items-center h-full pt-10"><p>Carregando dados...</p></div>}
          {error && <div className="flex justify-center items-center h-full pt-10"><p className="text-red-500 font-semibold text-center">{error}</p></div>}
          {!isLoading && !error && !apiResponse && <div className="flex justify-center items-center h-full pt-10"><p className="text-muted-foreground text-center">Busque uma cidade ou clique no mapa.</p></div>}

          {apiResponse && (
            <>
              <Card>
                <CardHeader> <CardTitle>Condições Atuais ({apiResponse.localidade_aproximada.split(' - ')[1]})</CardTitle> <CardDescription>{apiResponse.condicoes_atuais.condicao_atual_desc}</CardDescription> </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center"><Gauge size={28} className="text-blue-500" /><span className="font-bold">{apiResponse.condicoes_atuais.pressao} hPa</span><span className="text-xs text-muted-foreground">Pressão</span></div>
                  <div className="flex flex-col items-center"><Droplets size={28} className="text-sky-500" /><span className="font-bold">{apiResponse.condicoes_atuais.umidade}%</span><span className="text-xs text-muted-foreground">Umidade</span></div>
                  <div className="flex flex-col items-center"><Wind size={28} className="text-slate-500" /><span className="font-bold">{apiResponse.condicoes_atuais.vento_velocidade} km/h</span><span className="text-xs text-muted-foreground">{getWindDirection(apiResponse.condicoes_atuais.vento_direcao)}</span></div>
                  <div className="flex flex-col items-center"><Eye size={28} className="text-gray-600" /><span className="font-bold">{apiResponse.condicoes_atuais.visibilidade.replace('>', '')}m</span><span className="text-xs text-muted-foreground">Visibilidade</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader> <CardTitle>Previsão para os Próximos Dias</CardTitle> <CardDescription>Cidade: {apiResponse.localidade_aproximada}</CardDescription> </CardHeader>
                <CardContent className="w-full h-full flex flex-col justify-start pt-4 space-y-8">
                  <div className='w-full h-[220px]'>
                    <h3 className="text-sm font-semibold mb-1 text-center">Temperatura (°C) e Índice UV</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <>
                        <LineChart data={apiResponse.previsoes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" fontSize={12} tickFormatter={formatXAxis} />
                          <YAxis yAxisId="left" fontSize={12} unit="°" />
                          <YAxis yAxisId="right" orientation="right" fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="temperatura_maxima" name="Máx" stroke="#ef4444" />
                          <Line yAxisId="left" type="monotone" dataKey="temperatura_minima" name="Mín" stroke="#3b82f6" />
                          <Bar yAxisId="right" dataKey="radiacao_uv" name="Índice UV" fill="#8884d8" barSize={10} />
                        </LineChart>
                      </>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full"> <h3 className="text-lg font-semibold mb-2 text-center">Dados Detalhados da Previsão</h3> <div className="border rounded-md"> <Table>
                    <TableHeader><TableRow><TableHead className="text-center">Data</TableHead><TableHead className="text-center">Condição</TableHead><TableHead className="text-center">Temp.</TableHead><TableHead className="text-center">UV</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {apiResponse.previsoes.map((previsao) => {
                        const weather = getWeatherInfo(previsao.tempo);
                        return (<TableRow key={previsao.dia}><TableCell className="font-medium text-center">{formatXAxis(previsao.dia)}</TableCell> <TableCell className="text-center" title={weather.description}>{weather.icon}</TableCell> <TableCell className="text-center">{previsao.temperatura_minima}° / {previsao.temperatura_maxima}°</TableCell> <TableCell className="text-center">{previsao.radiacao_uv}</TableCell> </TableRow>)
                      })}
                    </TableBody>
                  </Table> </div> </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// O dicionário de tempo e outras funções helper devem ser incluídos aqui
const weatherCodeMap: { [key: string]: { description: string; icon: JSX.Element } } = { 'ec': { description: 'Encoberto com Chuvas Isoladas', icon: <CloudRain /> }, 'ci': { description: 'Chuvas Isoladas', icon: <CloudRain /> }, 'c': { description: 'Chuva', icon: <CloudRain /> }, 'in': { description: 'Instável', icon: <Zap /> }, 'pp': { description: 'Poss. de Pancadas de Chuva', icon: <CloudDrizzle /> }, 'cm': { description: 'Chuva pela Manhã', icon: <CloudRain /> }, 'cn': { description: 'Chuva à Noite', icon: <CloudRain /> }, 'pt': { description: 'Pancadas de Chuva à Tarde', icon: <CloudDrizzle /> }, 'pm': { description: 'Pancadas de Chuva pela Manhã', icon: <CloudDrizzle /> }, 'np': { description: 'Nublado com Pancadas de Chuva', icon: <CloudRain /> }, 'pc': { description: 'Pancadas de Chuva', icon: <CloudDrizzle /> }, 'pn': { description: 'Parcialmente Nublado', icon: <CloudSun /> }, 'cv': { description: 'Chuvisco', icon: <CloudDrizzle /> }, 'ch': { description: 'Chuvoso', icon: <CloudRain /> }, 't': { description: 'Tempestade', icon: <Zap /> }, 'ps': { description: 'Predomínio de Sol', icon: <Sun /> }, 'e': { description: 'Encoberto', icon: <Cloudy /> }, 'n': { description: 'Nublado', icon: <Cloudy /> }, 'cl': { description: 'Céu Claro', icon: <Sun /> }, 'nv': { description: 'Nevoeiro', icon: <Haze /> }, 'g': { description: 'Geada', icon: <Snowflake /> }, 'ne': { description: 'Neve', icon: <Snowflake /> }, 'nd': { description: 'Não Definido', icon: <Cloudy /> }, 'pnt': { description: 'Pancadas de Chuva à Noite', icon: <CloudDrizzle /> }, 'psc': { description: 'Possibilidade de Chuva', icon: <CloudRain /> }, 'pcm': { description: 'Poss. de Chuva pela Manhã', icon: <CloudRain /> }, 'pct': { description: 'Poss. de Chuva à Tarde', icon: <CloudRain /> }, 'pcn': { description: 'Poss. de Chuva à Noite', icon: <CloudRain /> }, 'npt': { description: 'Nublado com Pancadas à Tarde', icon: <CloudRain /> }, 'npn': { description: 'Nublado com Pancadas à Noite', icon: <CloudRain /> }, 'ncn': { description: 'Nublado com Poss. de Chuva à Noite', icon: <CloudRain /> }, 'nct': { description: 'Nublado com Poss. de Chuva à Tarde', icon: <CloudRain /> }, 'ncm': { description: 'Nublado com Poss. de Chuva pela Manhã', icon: <CloudRain /> }, 'npm': { description: 'Nublado com Pancadas pela Manhã', icon: <CloudRain /> }, 'npp': { description: 'Nublado com Possibilidade de Chuva', icon: <CloudRain /> }, 'vn': { description: 'Variação de Nebulosidade', icon: <CloudSun /> }, 'ct': { description: 'Chuva à Tarde', icon: <CloudRain /> }, 'ppn': { description: 'Poss. de Panc. de Chuva à Noite', icon: <CloudDrizzle /> }, 'ppt': { description: 'Poss. de Panc. de Chuva à Tarde', icon: <CloudDrizzle /> }, 'ppm': { description: 'Poss. de Panc. de Chuva pela Manhã', icon: <CloudDrizzle /> }, };