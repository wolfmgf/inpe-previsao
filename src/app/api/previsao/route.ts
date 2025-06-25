import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// --- INTERFACES PARA OS DADOS DO INPE ---
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
// Novas interfaces para os dados de condições atuais (METAR)
interface InpeMetarCapital {
  codigo: string;
  atualizacao: string;
  pressao: number;
  temperatura: number;
  tempo_desc: string;
  umidade: number;
  vento_dir: number;
  vento_int: number;
  visibilidade: string;
}
interface InpeApiCapitaisResponse {
  capitais: { metar: InpeMetarCapital[] };
}

// --- FUNÇÃO DE TRANSFORMAÇÃO ATUALIZADA ---
const transformarDadosInpe = (
  dadosPrevisao: InpeApiPrevisaoResponse,
  dadosCondicionais?: InpeMetarCapital
) => {
  const previsoes = Array.isArray(dadosPrevisao.cidade.previsao)
    ? dadosPrevisao.cidade.previsao
    : [dadosPrevisao.cidade.previsao];

  const dadosDiarios = previsoes.map((dia, index) => ({
    semana: index + 1,
    temperatura_minima: dia.minima,
    temperatura_maxima: dia.maxima,
    radiacao_uv: dia.iuv,
    dia: dia.dia,
    tempo: dia.tempo,
  }));

  return {
    localidade_aproximada: `${dadosPrevisao.cidade.nome} - ${dadosPrevisao.cidade.uf}`,
    data_geracao: new Date(dadosPrevisao.cidade.atualizacao).toISOString(),
    // Novo objeto com as condições atuais da capital
    condicoes_atuais: {
      temperatura: dadosCondicionais?.temperatura ?? "N/D",
      umidade: dadosCondicionais?.umidade ?? "N/D",
      vento_velocidade: dadosCondicionais?.vento_int ?? "N/D",
      vento_direcao: dadosCondicionais?.vento_dir ?? 0,
      pressao: dadosCondicionais?.pressao ?? "N/D",
      visibilidade: dadosCondicionais?.visibilidade ?? "N/D",
      condicao_atual_desc: dadosCondicionais?.tempo_desc ?? "Não disponível",
    },
    previsoes: dadosDiarios,
  };
};

const normalizarString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Mapeamento de UF para código ICAO da capital, baseado na documentação
const capitalIcaoMap: { [key: string]: string } = {
  AC: "SBRB",
  AL: "SBMO",
  AP: "SBMQ",
  AM: "SBEG",
  BA: "SBSV",
  CE: "SBFZ",
  DF: "SBBR",
  ES: "SBVT",
  GO: "SBGO",
  MA: "SBSL",
  MT: "SBCY",
  MS: "SBCG",
  MG: "SBBH",
  PA: "SBBE",
  PB: "SBJP",
  PR: "SBCT",
  PE: "SBRF",
  PI: "SBTE",
  RJ: "SBGL",
  RN: "SBSG",
  RS: "SBPA",
  RO: "SBPV",
  RR: "SBBV",
  SC: "SBFL",
  SP: "SBGR",
  SE: "SBAR",
  TO: "SBPJ",
};

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
      if (!geoResponse.ok) throw new Error("Falha ao buscar nome do local.");
      const geoData = await geoResponse.json();
      const nomeEncontrado =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.suburb;
      if (!nomeEncontrado)
        throw new Error("Nenhuma cidade encontrada para o local.");
      cidadeNome = nomeEncontrado;
    }

    if (!cidadeNome)
      throw new Error("Nome da cidade não pôde ser determinado.");

    const cidadeNomeNormalizado = normalizarString(cidadeNome);
    const listaCidadesUrl = `http://servicos.cptec.inpe.br/XML/listaCidades?city=${encodeURIComponent(
      cidadeNomeNormalizado
    )}`;
    const cidadesResponse = await fetch(listaCidadesUrl);
    if (!cidadesResponse.ok)
      throw new Error("API de busca de cidades do INPE falhou.");
    const cidadesXml = await cidadesResponse.text();
    const cidadesJson = parser.parse(cidadesXml);
    if (!cidadesJson?.cidades?.cidade)
      throw new Error(`Cidade "${cidadeNome}" não encontrada no INPE.`);
    const primeiraCidadeEncontrada: InpeCidadeInfo = Array.isArray(
      cidadesJson.cidades.cidade
    )
      ? cidadesJson.cidades.cidade[0]
      : cidadesJson.cidades.cidade;
    const cityCode = primeiraCidadeEncontrada.id;
    const cityUF = primeiraCidadeEncontrada.uf;

    const previsaoUrl = `http://servicos.cptec.inpe.br/XML/cidade/${cityCode}/previsao.xml`;
    const capitaisUrl = `http://servicos.cptec.inpe.br/XML/capitais/condicoesAtuais.xml`;

    const [previsaoResponse, capitaisResponse] = await Promise.all([
      fetch(previsaoUrl, { next: { revalidate: 3600 } }),
      fetch(capitaisUrl, { next: { revalidate: 900 } }),
    ]);

    if (!previsaoResponse.ok)
      throw new Error("API de previsão de tempo do INPE falhou.");
    const previsaoXml = await previsaoResponse.text();
    const previsaoJson: InpeApiPrevisaoResponse = parser.parse(previsaoXml);
    if (!previsaoJson?.cidade?.previsao)
      throw new Error("INPE não retornou dados de previsão para esta cidade.");

    let dadosCondicionaisDaCapital: InpeMetarCapital | undefined;
    if (capitaisResponse.ok) {
      const capitaisXml = await capitaisResponse.text();
      const capitaisJson: InpeApiCapitaisResponse = parser.parse(capitaisXml);
      const icaoCapital = capitalIcaoMap[cityUF];
      if (capitaisJson?.capitais?.metar) {
        dadosCondicionaisDaCapital = capitaisJson.capitais.metar.find(
          (capital) => capital.codigo === icaoCapital
        );
      }
    } else {
      console.warn(
        "API de condições das capitais falhou, os dados de umidade e vento não estarão disponíveis."
      );
    }

    const dadosFinais = transformarDadosInpe(
      previsaoJson,
      dadosCondicionaisDaCapital
    );
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
