import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AvisoErro } from "@/components/aviso-erro";
import { Seletor } from "@/components/seletor-campo";
import { Situacao } from "@/components/situacao";
import { api } from "@/lib/api";

export default function RotasFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chave = id || "novo";
  const [carregado, setCarregado] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const [opcoes, rota] = await Promise.all([
          api("/rede/opcoes", { signal: controller.signal }),
          id
            ? api(`/rede/rotas/${encodeURIComponent(id)}`, {
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;

        setLinhas(opcoes.linhas);
        setForm({
          nome: rota?.nome || "",
          origem: rota?.origem || "",
          destino: rota?.destino || "",
          situacao: rota?.situacao_cadastro || "ativo",
          linha_ids: rota?.linhas.map((linha) => linha.id) || [],
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

  function selecionarLinha(linhaId) {
    setForm((atual) => ({
      ...atual,
      linha_ids: atual.linha_ids.includes(linhaId)
        ? atual.linha_ids.filter((valor) => valor !== linhaId)
        : [...atual.linha_ids, linhaId],
    }));
  }

  async function salvar(event) {
    event.preventDefault();
    if (salvando || carregado !== chave) return;
    setSalvando(true);
    setErro("");

    try {
      await api(`/rede/rotas${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: form,
      });
      navigate("/index/rotasGerenciamento");
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
        onClick={() => navigate("/index/rotasGerenciamento")}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">
          {id ? "Editar" : "Cadastrar"} rota
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina o sentido da rota e organize suas linhas.
        </p>
      </div>
      <AvisoErro mensagem={erro} />
      {carregado !== chave ? (
        !erro && <p role="status">Carregando formulário...</p>
      ) : (
        <form onSubmit={salvar} className="w-full min-w-0 max-w-2xl">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rota-nome">Nome da rota</FieldLabel>
              <Input
                id="rota-nome"
                required
                maxLength={150}
                value={form.nome}
                onChange={(event) => campo("nome", event.target.value)}
                placeholder="Ex.: Eixo Norte"
              />
            </Field>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="rota-origem">Origem</FieldLabel>
                <Input
                  id="rota-origem"
                  required
                  maxLength={150}
                  value={form.origem}
                  onChange={(event) => campo("origem", event.target.value)}
                  placeholder="Estação de origem"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rota-destino">
                  Destino / sentido
                </FieldLabel>
                <Input
                  id="rota-destino"
                  required
                  maxLength={150}
                  value={form.destino}
                  onChange={(event) => campo("destino", event.target.value)}
                  placeholder="Estação de destino"
                />
              </Field>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Seletor
                id="rota-situacao"
                label="Situação do cadastro"
                value={form.situacao}
                onChange={(event) => campo("situacao", event.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="manutencao">Manutenção</option>
                <option value="inativo">Inativo</option>
              </Seletor>
            </div>
            <p className="text-xs text-muted-foreground">
              Para operar, a rota e a linha precisam estar ativas e ter pelo
              menos um trem ativo. Cadastros sem vínculo ficam inativos na
              consulta.
            </p>
            <fieldset className="min-w-0 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">
                Linhas da rota
              </legend>
              <p className="mb-3 text-xs text-muted-foreground">
                Selecionar uma linha de outra rota transfere seu vínculo ao
                salvar.
              </p>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {linhas.map((linha) => (
                  <label
                    key={linha.id}
                    className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${form.linha_ids.includes(linha.id) ? "border-primary bg-muted/40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-current"
                      checked={form.linha_ids.includes(linha.id)}
                      onChange={() => selecionarLinha(linha.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{linha.nome}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {linha.rota?.nome || "Sem vínculo"}
                      </span>
                      <span className="mt-2 block">
                        <Situacao valor={linha.situacao} />
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {!linhas.length && (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro disponível. Você pode salvar e atribuir
                  depois.
                </p>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/rotasGerenciamento")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : id
                    ? "Salvar alterações"
                    : "Cadastrar rota"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
