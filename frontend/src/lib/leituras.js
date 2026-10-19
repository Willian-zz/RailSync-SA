export const tiposLeituras = [
  { tipo: "velocidade", label: "Velocidade", unidade: "km/h" },
  { tipo: "temperatura", label: "Temperatura", unidade: "°C" },
  { tipo: "consumo", label: "Consumo", unidade: "L/h" },
  { tipo: "vibracao", label: "Vibração", unidade: "mm/s" },
  { tipo: "capacidade", label: "Capacidade", unidade: "%" },
];

export function criarLimitesVazios() {
  return tiposLeituras.map(({ tipo, unidade }) => ({
    tipo,
    unidade,
    valor_minimo: "",
    valor_maximo: "",
  }));
}

const formatoNumero = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 12 });
const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

export function formatarNumero(valor, unidade = "") {
  return typeof valor === "number" && Number.isFinite(valor)
    ? `${formatoNumero.format(valor)}${unidade ? ` ${unidade}` : ""}`
    : "----";
}

export function formatarData(valor) {
  const data = valor ? new Date(valor) : null;
  return data && Number.isFinite(data.getTime()) ? formatoData.format(data) : "----";
}
