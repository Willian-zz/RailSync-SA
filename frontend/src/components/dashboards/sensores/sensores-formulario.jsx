
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Opções de tipo e unidade de medida.
// Edite este array para adicionar, remover ou alterar opções.
const tiposSensores = [
  {
    tipo: "capacidade",
    unidade: "%",
    label: "Capacidade → %",
  },
  {
    tipo: "temperatura",
    unidade: "°C",
    label: "Temperatura → °C",
  },
  {
    tipo: "velocidade",
    unidade: "km/h",
    label: "Velocidade → km/h",
  },
  {
    tipo: "peso",
    unidade: "kg",
    label: "Peso → kg",
  },
  {
    tipo: "peso",
    unidade: "t",
    label: "Peso → t",
  },
  {
    tipo: "pressao",
    unidade: "bar",
    label: "Pressão → bar",
  },
  {
    tipo: "pressao",
    unidade: "psi",
    label: "Pressão → psi",
  },
  {
    tipo: "umidade",
    unidade: "%",
    label: "Umidade → %",
  },
];

export default function SensoresFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();

  const editando = Boolean(id);

  const [codigo, setCodigo] = useState("");
  const [tipoUnidade, setTipoUnidade] = useState("");
  const [tremId, setTremId] = useState("");

  const [trens, setTrens] = useState([]);

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Busca todos os trens para preencher o Select
  async function buscarTrens() {
    const resposta = await fetch(
      "http://localhost:3000/api/stmt/trains"
    );

    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      throw new Error(
        resultado?.message || "Não foi possível carregar os trens."
      );
    }

    if (!Array.isArray(resultado)) {
      throw new Error("A API de trens retornou um formato inválido.");
    }

    setTrens(resultado);
  }

  // Busca os dados de um sensor para edição
  async function buscarSensorPorId(sensorId) {
    const resposta = await fetch(
      `http://localhost:3000/api/stmt/sensors/${sensorId}`
    );

    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      throw new Error(
        resultado?.message || "Não foi possível buscar o sensor."
      );
    }

    return resultado;
  }

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");

      try {
        // Carrega os trens tanto no cadastro quanto na edição
        await buscarTrens();

        if (!ativo) return;

        // No cadastro, não há sensor para buscar
        if (!id) return;

        const sensor = await buscarSensorPorId(id);

        if (!ativo) return;

        if (!sensor) {
          throw new Error("Sensor não encontrado.");
        }

        setCodigo(sensor.codigo ?? "");
        setTremId(
          sensor.trem_id != null ? String(sensor.trem_id) : ""
        );

        // Seleciona a combinação de tipo e unidade existente
        const opcaoEncontrada = tiposSensores.find(
          (opcao) =>
            opcao.tipo === sensor.tipo &&
            opcao.unidade === sensor.unidade
        );

        if (opcaoEncontrada) {
          setTipoUnidade(
            `${opcaoEncontrada.tipo}|${opcaoEncontrada.unidade}`
          );
        } else {
          setTipoUnidade("");
          setErro(
            `O tipo "${sensor.tipo}" e a unidade "${sensor.unidade}" não estão nas opções disponíveis. Adicione essa combinação ao array tiposSensores.`
          );
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error.message || "Não foi possível carregar os dados."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [id]);

  // Salva um sensor novo ou atualiza um existente
  async function salvarSensor(e) {
    e.preventDefault();
    setErro("");

    if (!tipoUnidade) {
      setErro("Selecione o tipo de sensor e a unidade de medida.");
      return;
    }

    if (!tremId) {
      setErro("Selecione o trem associado ao sensor.");
      return;
    }

    const [tipo, unidade] = tipoUnidade.split("|");

    const dados = {
      codigo: codigo.trim(),
      tipo,
      unidade,
      trem_id: Number(tremId),
    };

    setSalvando(true);

    try {
      const resposta = await fetch(
        editando
          ? `http://localhost:3000/api/stmt/sensors/${id}`
          : "http://localhost:3000/api/stmt/sensors",
        {
          method: editando ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dados),
        }
      );

      const resultado = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(
          resultado?.message || "Não foi possível salvar o sensor."
        );
        return;
      }

      navigate("/index/sensoresGerenciamento");
    } catch (error) {
      console.error("Erro ao salvar sensor:", error);
      setErro(
        "Não foi possível conectar ao servidor. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">
        {editando ? "Editar sensor" : "Cadastrar sensor"}
      </h1>

      {carregando ? (
        <p>Carregando dados do sensor...</p>
      ) : (
        <form className="w-full max-w-sm" onSubmit={salvarSensor}>
          {erro && (
            <p className="mb-4 text-sm text-red-500" role="alert">
              {erro}
            </p>
          )}

          <FieldGroup>
            {/* Código do sensor */}
            <Field>
              <FieldLabel htmlFor="form-codigo">Código do sensor</FieldLabel>

              <Input
                id="form-codigo"
                type="text"
                placeholder="SEN-001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </Field>

            {/* Tipo e unidade de medida */}
            <Field>
              <FieldLabel htmlFor="form-tipo">
                Tipo e unidade de medida
              </FieldLabel>

              <Select value={tipoUnidade} onValueChange={setTipoUnidade}>
                <SelectTrigger id="form-tipo">
                  <SelectValue placeholder="Selecione o tipo">
                    {
                      tiposSensores.find(
                        (opcao) =>
                          `${opcao.tipo}|${opcao.unidade}` === tipoUnidade,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {tiposSensores.map((opcao) => (
                      <SelectItem
                        key={`${opcao.tipo}|${opcao.unidade}`}
                        value={`${opcao.tipo}|${opcao.unidade}`}
                      >
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {/* Trem associado */}
            <Field>
              <FieldLabel htmlFor="form-trem">Trem associado</FieldLabel>

              <Select value={tremId} onValueChange={setTremId}>
                <SelectTrigger id="form-trem">
                  <SelectValue placeholder="Selecione um trem">
                    {(() => {
                      const tremSelecionado = trens.find(
                        (trem) => String(trem.id) === tremId,
                      );

                      if (!tremSelecionado) return undefined;

                      return tremSelecionado.prefixo
                        ? `${tremSelecionado.prefixo} — ${tremSelecionado.modelo ?? ""}`
                        : tremSelecionado.modelo
                          ? `${tremSelecionado.modelo} (ID: ${tremSelecionado.id})`
                          : `Trem ${tremSelecionado.id}`;
                    })()}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {trens.map((trem) => (
                      <SelectItem key={trem.id} value={String(trem.id)}>
                        {trem.prefixo
                          ? `${trem.prefixo} — ${trem.modelo ?? ""}`
                          : trem.modelo
                            ? `${trem.modelo} (ID: ${trem.id})`
                            : `Trem ${trem.id}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {trens.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum trem cadastrado para associação.
                </p>
              )}
            </Field>

            {/* Botões */}
            <Field orientation="horizontal">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/sensoresGerenciamento")}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando || trens.length === 0}>
                {salvando
                  ? "Salvando..."
                  : editando
                    ? "Salvar alterações"
                    : "Cadastrar sensor"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
