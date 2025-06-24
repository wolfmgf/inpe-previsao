import { NextResponse } from "next/server";

// --- SIMULADOR DA API DO INPE ---
// Função que simula dados de previsão semanal para uma determinada latitude e longitude
function simularDadosINPE(lat: number, lon: number) {
  const previsoes = [];

  // Gera previsões para 4 semanas
  for (let i = 1; i <= 4; i++) {
    // Lógica para simular temperaturas mais realistas
    const baseMin = 18;
    const baseMax = 28;
    // Temperatura mínima simulada com pequena variação
    const tempMin = Math.floor(baseMin + (Math.random() - 0.5) * 5);
    // Temperatura máxima simulada com pequena variação
    const tempMax = Math.floor(baseMax + (Math.random() - 0.5) * 7);

    previsoes.push({
      semana: i,
      // Anomalia de temperatura simulada entre -2.5 e +2.5
      anomalia_temperatura: parseFloat(((Math.random() - 0.5) * 5).toFixed(2)),
      // Anomalia de precipitação simulada entre -50 e +50
      anomalia_precipitacao: parseFloat(
        ((Math.random() - 0.5) * 100).toFixed(2)
      ),
      // Temperatura mínima simulada
      temperatura_minima: tempMin,
      // Temperatura máxima sempre maior que a mínima
      temperatura_maxima: tempMax > tempMin ? tempMax : tempMin + 3,
      // Índice de radiação UV entre 1 e 11
      radiacao_uv: parseFloat((Math.random() * 10 + 1).toFixed(1)),
    });
  }
  // Retorna objeto simulando resposta da API do INPE
  return {
    localidade_aproximada: `Local Próximo a Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`,
    data_geracao: new Date().toISOString(),
    previsoes,
  };
}
// --- FIM DO SIMULADOR ---

// Handler para requisições GET na rota /api/previsao
export async function GET(request: Request) {
  // Extrai parâmetros de latitude e longitude da URL
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // Validação: ambos os parâmetros são obrigatórios
  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Latitude (lat) e Longitude (lon) são obrigatórias." },
      { status: 400 }
    );
  }

  // Simula um pequeno delay para a resposta da API (1 segundo)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Gera dados simulados com base nas coordenadas recebidas
    const dadosSimulados = simularDadosINPE(parseFloat(lat), parseFloat(lon));
    return NextResponse.json(dadosSimulados);
  } catch (error) {
    // Em caso de erro inesperado, retorna erro 500
    console.error("[API_PREVISAO_ERRO]", error);
    return NextResponse.json(
      { error: "Não foi possível obter os dados da previsão." },
      { status: 500 }
    );
  }
}
