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

// Função de transformação de dados
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

const normalizarString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let cidadeNome: string | null = searchParams.get("cidade");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

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
    const parser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: true,
    });

    if (lat && lon) {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const geoResponse = await fetch(nominatimUrl, {
        headers: { "User-Agent": "AplicacaoDePrevisaoDoTempo/1.0" },
      });
      if (!geoResponse.ok)
        throw new Error("Falha ao buscar nome do local via geocodificação.");
      const geoData = await geoResponse.json();
      const nomeEncontrado =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.suburb;
      if (!nomeEncontrado)
        throw new Error("Nenhuma cidade encontrada para o local selecionado.");
      cidadeNome = nomeEncontrado;
    }

    if (!cidadeNome)
      throw new Error("Nome da cidade não pôde ser determinado.");

    const cidadeNomeNormalizado = normalizarString(cidadeNome);
    const listaCidadesUrl = `http://servicos.cptec.inpe.br/XML/listaCidades?city=${encodeURIComponent(cidadeNomeNormalizado)}`;
    const cidadesResponse = await fetch(listaCidadesUrl);
    if (!cidadesResponse.ok)
      throw new Error("API de busca de cidades do INPE falhou.");
    const cidadesXml = await cidadesResponse.text();
    const cidadesJson = parser.parse(cidadesXml);

    if (!cidadesJson?.cidades?.cidade) {
      throw new Error(
        `Cidade "${cidadeNome}" não encontrada na base de dados do INPE.`
      );
    }
    const primeiraCidadeEncontrada: InpeCidadeInfo = Array.isArray(
      cidadesJson.cidades.cidade
    )
      ? cidadesJson.cidades.cidade[0]
      : cidadesJson.cidades.cidade;
    const cityCode = primeiraCidadeEncontrada.id;

    // USANDO O ENDPOINT DE PREVISÃO DE CURTO PRAZO (MAIS ESTÁVEL E COM IUV)
    const previsaoUrl = `http://servicos.cptec.inpe.br/XML/cidade/${cityCode}/previsao.xml`;
    const previsaoResponse = await fetch(previsaoUrl, {
      next: { revalidate: 3600 },
    });
    if (!previsaoResponse.ok)
      throw new Error("API de previsão de tempo do INPE falhou.");
    const previsaoXml = await previsaoResponse.text();
    const previsaoJson: InpeApiPrevisaoResponse = parser.parse(previsaoXml);

    if (!previsaoJson?.cidade?.previsao) {
      throw new Error("INPE não retornou dados de previsão para esta cidade.");
    }

    const dadosFinais = transformarDadosInpe(previsaoJson);
    return NextResponse.json({ success: true, data: dadosFinais });
  } catch (error: unknown) {
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
