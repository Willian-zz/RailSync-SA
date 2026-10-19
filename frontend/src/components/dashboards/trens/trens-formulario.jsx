import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { criarLimitesVazios, tiposLeituras } from "@/lib/leituras";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TrensFormulario() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [prefixo, setPrefixo] = useState("");
  const [modelo, setModelo] = useState("");
  const [situacao, setSituacao] = useState("ativo");
  const [ano, setAno] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [limites, setLimites] = useState(criarLimitesVazios);
  const [tremCarregado, setTremCarregado] = useState(null);

  const situacoes = [
    { label: "Ativo", value: "ativo" },
    { label: "Em manutenção", value: "manutencao" },
    { label: "Inativo", value: "inativo" },
  ];

  async function buscarTremPorId(id) {
    const resposta = await fetch(`http://localhost:3000/api/stmt/trains/${id}`);

    const resultado = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      throw new Error(resultado?.message || "Não foi possível buscar o trem.");
    }

    return resultado;
  }

  useEffect(() => {
    if (!id) return;

    let ativo = true;

    async function carregarTrem() {
      setCarregando(true);
      setErro("");

      try {
        const trem = await buscarTremPorId(id);

        if (!ativo) return;

        if (!trem) {
          throw new Error("Trem não encontrado.");
        }

        setPrefixo(trem.prefixo ?? "");
        setModelo(trem.modelo ?? "");
        setAno(trem.ano != null ? String(trem.ano) : "");
        setSituacao(trem.situacao ?? "ativo");
        setLimites(criarLimitesVazios().map((limite) => {
          const salvo = trem.limites?.find((item) => item.tipo === limite.tipo);
          return salvo ? {
            ...limite,
            unidade: salvo.unidade,
            valor_minimo: salvo.valor_minimo ?? "",
            valor_maximo: salvo.valor_maximo ?? "",
          } : limite;
        }));
        setTremCarregado(id);
      } catch (error) {
        if (ativo) {
          setErro(error.message || "Não foi possível carregar o trem.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarTrem();

    return () => {
      ativo = false;
    };
  }, [id]);

  async function salvarTrem(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const dados = {
      prefixo: prefixo.trim(),
      modelo: modelo.trim(),
      ano: Number(ano),
      situacao,
      limites: limites
        .filter((limite) => limite.valor_minimo !== "" || limite.valor_maximo !== "")
        .map((limite) => ({
          ...limite,
          unidade: limite.unidade.trim(),
          valor_minimo: limite.valor_minimo === "" ? null : Number(limite.valor_minimo),
          valor_maximo: limite.valor_maximo === "" ? null : Number(limite.valor_maximo),
        })),
    };

    try {
      const resposta = await fetch(
        editando
          ? `http://localhost:3000/api/stmt/trains/${id}`
          : "http://localhost:3000/api/stmt/trains",
        {
          method: editando ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dados),
        },
      );

      const resultado = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(resultado?.message || "Não foi possível salvar o trem.");
        return;
      }

      navigate("/index/trensGerenciamento");
    } catch (error) {
      console.error("Erro ao salvar trem:", error);
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarLimite(tipo, campo, valor) {
    setLimites((atuais) => atuais.map((limite) =>
      limite.tipo === tipo ? { ...limite, [campo]: valor } : limite,
    ));
  }

  return (
    <div className="min-w-0">
      <h1 className="mb-6 text-xl font-semibold">
        {editando ? "Editar trem" : "Cadastrar trem"}
      </h1>

      {carregando ? (
        <p>Carregando dados do trem...</p>
      ) : (
        <form className="w-full min-w-0 max-w-sm" onSubmit={salvarTrem}>
          {erro && (
            <p className="mb-4 text-sm text-red-500" role="alert">
              {erro}
            </p>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="form-prefix">Prefixo</FieldLabel>
              <Input
                id="form-prefix"
                type="text"
                placeholder="LOC-1001"
                value={prefixo}
                onChange={(e) => setPrefixo(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="form-model">Modelo</FieldLabel>
              <Input
                id="form-model"
                type="text"
                placeholder="GE AC44i"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="form-year">Ano</FieldLabel>
                <Input
                  id="form-year"
                  type="number"
                  step="1"
                  min="1900"
                  max="2100"
                  placeholder="2020"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="form-situacao">Situação</FieldLabel>
                <Select value={situacao} onValueChange={setSituacao}>
                  <SelectTrigger id="form-situacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      {situacoes.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <fieldset className="flex min-w-0 flex-col gap-4 rounded-md border p-4 text-left">
              <legend className="px-1 text-sm font-medium">Limites das leituras (opcional)</legend>
              <p className="text-xs text-muted-foreground">
                Use a mesma unidade cadastrada no sensor. Valores abaixo do mínimo ou acima
                do máximo geram avisos. Deixe os dois valores vazios para remover um limite.
              </p>

              {limites.map((limite) => (
                <div key={limite.tipo} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {tiposLeituras.find((item) => item.tipo === limite.tipo)?.label}
                    </span>
                    <Input
                      aria-label={`Unidade de ${limite.tipo}`}
                      className="h-8 w-24 text-center text-xs"
                      value={limite.unidade}
                      onChange={(event) => atualizarLimite(limite.tipo, "unidade", event.target.value)}
                      required={limite.valor_minimo !== "" || limite.valor_maximo !== ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor={`limite-${limite.tipo}-minimo`} className="text-xs">Mínimo</FieldLabel>
                      <Input
                        id={`limite-${limite.tipo}-minimo`}
                        type="number"
                        step="any"
                        placeholder="Sem mínimo"
                        value={limite.valor_minimo}
                        onChange={(event) => atualizarLimite(limite.tipo, "valor_minimo", event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`limite-${limite.tipo}-maximo`} className="text-xs">Máximo</FieldLabel>
                      <Input
                        id={`limite-${limite.tipo}-maximo`}
                        type="number"
                        step="any"
                        min={limite.valor_minimo === "" ? undefined : limite.valor_minimo}
                        placeholder="Sem máximo"
                        value={limite.valor_maximo}
                        onChange={(event) => atualizarLimite(limite.tipo, "valor_maximo", event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </fieldset>

            <Field orientation="horizontal" className="flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/trensGerenciamento")}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando || (editando && tremCarregado !== id)}>
                {salvando
                  ? "Salvando..."
                  : editando
                    ? "Salvar alterações"
                    : "Cadastrar trem"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
