import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AvisoErro } from "@/components/aviso-erro";
import { Seletor } from "@/components/seletor-campo";
import { Situacao } from "@/components/situacao";
import { api } from "@/lib/api";

export default function LinhasFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chave = id || "novo";
  const [carregado, setCarregado] = useState(null);
  const [opcoes, setOpcoes] = useState(null);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const [op, linha] = await Promise.all([
          api("/rede/opcoes", { signal: controller.signal }),
          id
            ? api(`/rede/linhas/${encodeURIComponent(id)}`, {
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;

        setOpcoes(op);
        setForm({
          nome: linha?.nome || "",
          situacao: linha?.situacao_cadastro || "ativo",
          rota_id: linha?.rota_id ?? "",
          trem_ids: linha?.trens.map((trem) => trem.id) || [],
          horarios:
            linha?.horarios.map((horario) => ({
              trem_id: horario.trem_id,
              horario: horario.horario,
            })) || [],
        });
        setCarregado(id || "novo");
        setErro("");
      } catch (error) {
        if (!controller.signal.aborted) setErro(error.message);
      }
    }

    carregar();
    return () => controller.abort();
  }, [id]);

  function campo(nome, valor) {
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  function selecionarTrem(tremId) {
    setForm((atual) => {
      const tremIds = atual.trem_ids.includes(tremId)
        ? atual.trem_ids.filter((valor) => valor !== tremId)
        : [...atual.trem_ids, tremId];

      return {
        ...atual,
        trem_ids: tremIds,
        horarios: atual.horarios.filter((horario) =>
          tremIds.includes(Number(horario.trem_id)),
        ),
      };
    });
  }

  function mudarHorario(indice, nome, valor) {
    campo(
      "horarios",
      form.horarios.map((horario, posicao) =>
        posicao === indice ? { ...horario, [nome]: valor } : horario,
      ),
    );
  }

  async function salvar(event) {
    event.preventDefault();
    if (salvando || carregado !== chave) return;
    setSalvando(true);
    setErro("");

    const body = {
      nome: form.nome,
      situacao: form.situacao,
      rota_id: form.rota_id === "" ? null : Number(form.rota_id),
      trem_ids: form.trem_ids,
      horarios: form.horarios.map((horario) => ({
        ...horario,
        trem_id: Number(horario.trem_id),
      })),
    };

    try {
      await api(`/rede/linhas${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body,
      });
      navigate("/index/linhasGerenciamento");
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 text-left sm:p-6">
      <Button
        variant="ghost"
        className="w-fit"
        onClick={() => navigate("/index/linhasGerenciamento")}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">
          {id ? "Editar" : "Cadastrar"} linha
        </h1>
        <p className="text-sm text-muted-foreground">
          Associe uma rota, atribua trens e cadastre os horários de saída.
        </p>
      </div>
      <AvisoErro mensagem={erro} />
      {carregado !== chave ? (
        !erro && <p role="status">Carregando formulário...</p>
      ) : (
        <form onSubmit={salvar} className="w-full min-w-0 max-w-2xl">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="linha-nome">Nome da linha</FieldLabel>
              <Input
                id="linha-nome"
                required
                maxLength={150}
                value={form.nome}
                onChange={(event) => campo("nome", event.target.value)}
                placeholder="Ex.: Linha Central"
              />
            </Field>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Seletor
                id="linha-situacao"
                label="Situação do cadastro"
                value={form.situacao}
                onChange={(event) => campo("situacao", event.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="manutencao">Manutenção</option>
                <option value="inativo">Inativo</option>
              </Seletor>
              <Seletor
                id="linha-rota"
                label="Rota"
                value={form.rota_id}
                onChange={(event) => campo("rota_id", event.target.value)}
              >
                <option value="">Sem rota</option>
                {opcoes.rotas.map((rota) => (
                  <option key={rota.id} value={rota.id}>
                    {rota.nome} · {rota.origem} → {rota.destino}
                  </option>
                ))}
              </Seletor>
            </div>
            <p className="text-xs text-muted-foreground">
              Para operar, a rota e a linha precisam estar ativas e ter pelo
              menos um trem ativo. Cadastros sem vínculo ficam inativos na
              consulta.
            </p>
            <fieldset className="min-w-0 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">
                Trens da linha
              </legend>
              <p className="mb-3 text-xs text-muted-foreground">
                Selecionar um trem de outra linha o transfere ao salvar e remove
                seus horários anteriores.
              </p>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {opcoes.trens.map((trem) => (
                  <label
                    key={trem.id}
                    className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${form.trem_ids.includes(trem.id) ? "border-primary bg-muted/40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-current"
                      checked={form.trem_ids.includes(trem.id)}
                      onChange={() => selecionarTrem(trem.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{trem.prefixo}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {opcoes.linhas.find(
                          (linha) => linha.id === trem.linha_id,
                        )?.nome || "Sem vínculo"}
                      </span>
                      <span className="mt-2 block">
                        <Situacao valor={trem.situacao} />
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {!opcoes.trens.length && (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro disponível. Você pode salvar e atribuir
                  depois.
                </p>
              )}
            </fieldset>
            <fieldset className="min-w-0 space-y-4 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">
                Horários de saída
              </legend>
              <p className="text-xs text-muted-foreground">
                Saídas diárias no horário de Brasília. Cada horário precisa de
                um trem selecionado acima.
              </p>
              {form.horarios.map((horario, indice) => (
                <div
                  key={indice}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
                >
                  <Seletor
                    id={`horario-trem-${indice}`}
                    label="Trem"
                    value={horario.trem_id}
                    onChange={(event) =>
                      mudarHorario(indice, "trem_id", event.target.value)
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {opcoes.trens
                      .filter((trem) => form.trem_ids.includes(trem.id))
                      .map((trem) => (
                        <option key={trem.id} value={trem.id}>
                          {trem.prefixo}
                        </option>
                      ))}
                  </Seletor>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="sm:order-last"
                    aria-label={`Remover horário ${indice + 1}`}
                    onClick={() =>
                      campo(
                        "horarios",
                        form.horarios.filter(
                          (_, posicao) => posicao !== indice,
                        ),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Field className="col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor={`horario-hora-${indice}`}>
                      Horário
                    </FieldLabel>
                    <Input
                      type="time"
                      id={`horario-hora-${indice}`}
                      required
                      value={horario.horario}
                      onChange={(event) =>
                        mudarHorario(indice, "horario", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={!form.trem_ids.length}
                onClick={() =>
                  campo("horarios", [
                    ...form.horarios,
                    { trem_id: form.trem_ids[0], horario: "" },
                  ])
                }
              >
                <Plus className="size-4" />
                Adicionar horário
              </Button>
              {!form.horarios.length && (
                <p className="text-xs text-muted-foreground">
                  Sem horários cadastrados. A próxima saída aparecerá após o
                  cadastro.
                </p>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/linhasGerenciamento")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : id
                    ? "Salvar alterações"
                    : "Cadastrar linha"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
