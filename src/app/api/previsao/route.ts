import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// ===== INTERFACES PARA TIPAGEM DOS DADOS DO INPE =====
interface InpeCidadeInfo {
  nome: string;
  uf: string;
  id: number;
}

interface InpePrevisaoDia {
  dia: string;
  tempo: string;
  maxima: number;
  minima: number;
  iuv: number;
}

interface InpeApiPrevisaoResponse {
  cidade: {
    nome: string;
    uf: string;
    atualizacao: string;
    previsao: InpePrevisaoDia | InpePrevisaoDia[];
  };
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Transforma os dados da API do INPE para o formato usado pela aplicação
const transformarDadosInpe = (dadosApi: InpeApiPrevisaoResponse) => {
  // Garante que previsoes seja sempre um array
  const previsoes = Array.isArray(dadosApi.cidade.previsao)
    ? dadosApi.cidade.previsao
    : [dadosApi.cidade.previsao];

  // Mapeia os dados para o formato esperado pelo frontend
  const dadosTransformados = previsoes.map((dia, index) => ({
    semana: index + 1,
    temperatura_minima: dia.minima,
    temperatura_maxima: dia.maxima,
    radiacao_uv: dia.iuv,
    dia: dia.dia,
    tempo: dia.tempo,
  }));

  return {
    localidade_aproximada: `${dadosApi.cidade.nome} - ${dadosApi.cidade.uf}`,
    data_geracao: new Date(dadosApi.cidade.atualizacao).toISOString(),
    previsoes: dadosTransformados,
  };
};

// Remove acentos e caracteres especiais para busca na API
const normalizarString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ===== HANDLER DA ROTA API =====
export async function GET(request: Request) {
  // Extrai parâmetros da requisição
  const { searchParams } = new URL(request.url);
  let cidadeNome: string | null = searchParams.get("cidade");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // Validação: exige cidade ou coordenadas
  if (!cidadeNome && (!lat || !lon)) {
    return NextResponse.json(
      {
        success: false,
        message: "É necessário fornecer nome da cidade ou coordenadas.",
      },
      { status: 400 }
    );
  }

  try {
    // Configura parser XML para converter respostas do INPE
    const parser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: true,
    });

    // Se coordenadas foram fornecidas, faz geocodificação reversa
    if (lat && lon) {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const geoResponse = await fetch(nominatimUrl, {
        headers: { "User-Agent": "AplicacaoDePrevisaoDoTempo/1.0" },
      });

      if (!geoResponse.ok)
        throw new Error("Falha ao buscar nome do local via geocodificação.");

      const geoData = await geoResponse.json();

      // Tenta obter o nome da cidade dos diferentes campos possíveis
      const nomeEncontrado =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.suburb;

      if (!nomeEncontrado)
        throw new Error("Nenhuma cidade encontrada para o local selecionado.");

      cidadeNome = nomeEncontrado;
    }

    // Verifica se conseguiu determinar o nome da cidade
    if (!cidadeNome) {
      throw new Error("Nome da cidade não pôde ser determinado.");
    }

    // Busca o ID da cidade na API do INPE
    const cidadeNomeNormalizado = normalizarString(cidadeNome);
    const listaCidadesUrl = `http://servicos.cptec.inpe.br/XML/listaCidades?city=${encodeURIComponent(
      cidadeNomeNormalizado
    )}`;

    const cidadesResponse = await fetch(listaCidadesUrl);
    if (!cidadesResponse.ok)
      throw new Error("API de busca de cidades do INPE falhou.");

    const cidadesXml = await cidadesResponse.text();
    const cidadesJson = parser.parse(cidadesXml);

    // Verifica se encontrou a cidade
    if (!cidadesJson?.cidades?.cidade) {
      throw new Error(
        `Cidade "${cidadeNome}" não encontrada na base de dados do INPE.`
      );
    }

    // Seleciona a primeira cidade encontrada
    const primeiraCidadeEncontrada: InpeCidadeInfo = Array.isArray(
      cidadesJson.cidades.cidade
    )
      ? cidadesJson.cidades.cidade[0]
      : cidadesJson.cidades.cidade;

    const cityCode = primeiraCidadeEncontrada.id;

    // Busca a previsão do tempo para a cidade
    const previsaoUrl = `http://servicos.cptec.inpe.br/XML/cidade/${cityCode}/previsao.xml`;
    const previsaoResponse = await fetch(previsaoUrl, {
      next: { revalidate: 3600 }, // Cache por 1 hora
    });

    if (!previsaoResponse.ok)
      throw new Error("API de previsão de tempo do INPE falhou.");

    const previsaoXml = await previsaoResponse.text();
    const previsaoJson: InpeApiPrevisaoResponse = parser.parse(previsaoXml);

    // Verifica se a resposta contém dados de previsão
    if (!previsaoJson?.cidade?.previsao) {
      throw new Error("INPE não retornou dados de previsão para esta cidade.");
    }

    // Transforma os dados e retorna sucesso
    const dadosFinais = transformarDadosInpe(previsaoJson);
    return NextResponse.json({ success: true, data: dadosFinais });
  } catch (error: unknown) {
    // Tratamento de erros: loga no servidor e retorna erro amigável
    let errorMessage = "Falha ao processar a previsão.";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("[API_PREVISAO_ERRO]", error);
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
