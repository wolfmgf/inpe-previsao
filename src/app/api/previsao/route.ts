import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// Interfaces para os dados do INPE
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

// Função para transformar os dados da resposta do INPE no formato usado pela aplicação
const transformarDadosInpe = (dadosApi: InpeApiPrevisaoResponse) => {
  const previsoes = Array.isArray(dadosApi.cidade.previsao)
    ? dadosApi.cidade.previsao
    : [dadosApi.cidade.previsao];

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

// Função utilitária para normalizar strings (remove acentos)
const normalizarString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Handler da rota GET para buscar previsão do tempo
export async function GET(request: Request) {
  // Extrai parâmetros da URL
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
    // Cria parser XML para converter respostas do INPE
    const parser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: true,
    });

    // Se coordenadas foram fornecidas, faz geocodificação reversa para obter o nome da cidade
    if (lat && lon) {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const geoResponse = await fetch(nominatimUrl, {
        headers: { "User-Agent": "AplicacaoDePrevisaoDoTempo/1.0" },
      });
      if (!geoResponse.ok)
        throw new Error("Falha ao buscar nome do local via geocodificação.");
      const geoData = await geoResponse.json();
      // Tenta obter o nome da cidade a partir dos campos possíveis
      const nomeEncontrado =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.suburb;
      if (!nomeEncontrado)
        throw new Error("Nenhuma cidade encontrada para o local selecionado.");
      cidadeNome = nomeEncontrado;
    }

    // Se ainda não tem nome da cidade, retorna erro
    if (!cidadeNome)
      throw new Error("Nome da cidade não pôde ser determinado.");

    // Normaliza o nome da cidade para busca na API do INPE
    const cidadeNomeNormalizado = normalizarString(cidadeNome);
    const listaCidadesUrl = `http://servicos.cptec.inpe.br/XML/listaCidades?city=${encodeURIComponent(cidadeNomeNormalizado)}`;
    const cidadesResponse = await fetch(listaCidadesUrl);
    if (!cidadesResponse.ok)
      throw new Error("API de busca de cidades do INPE falhou.");
    const cidadesXml = await cidadesResponse.text();
    const cidadesJson = parser.parse(cidadesXml);

    // Verifica se encontrou cidades na resposta
    if (!cidadesJson?.cidades?.cidade) {
      throw new Error(
        `Cidade "${cidadeNome}" não encontrada na base de dados do INPE.`
      );
    }
    // Seleciona a primeira cidade encontrada (caso haja mais de uma)
    const primeiraCidadeEncontrada: InpeCidadeInfo = Array.isArray(
      cidadesJson.cidades.cidade
    )
      ? cidadesJson.cidades.cidade[0]
      : cidadesJson.cidades.cidade;
    const cityCode = primeiraCidadeEncontrada.id;

    // Monta URL para buscar previsão de curto prazo da cidade
    const previsaoUrl = `http://servicos.cptec.inpe.br/XML/cidade/${cityCode}/previsao.xml`;
    const previsaoResponse = await fetch(previsaoUrl, {
      next: { revalidate: 3600 },
    });
    if (!previsaoResponse.ok)
      throw new Error("API de previsão de tempo do INPE falhou.");
    const previsaoXml = await previsaoResponse.text();
    const previsaoJson: InpeApiPrevisaoResponse = parser.parse(previsaoXml);

    // Verifica se a resposta contém previsões
    if (!previsaoJson?.cidade?.previsao) {
      throw new Error("INPE não retornou dados de previsão para esta cidade.");
    }

    // Transforma os dados para o formato esperado pela aplicação
    const dadosFinais = transformarDadosInpe(previsaoJson);
    return NextResponse.json({ success: true, data: dadosFinais });
  } catch (error: unknown) {
    // Em caso de erro, retorna mensagem amigável e loga no console
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
