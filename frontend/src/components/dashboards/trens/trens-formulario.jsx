import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">
        {editando ? "Editar trem" : "Cadastrar trem"}
      </h1>

      {carregando ? (
        <p>Carregando dados do trem...</p>
      ) : (
        <form className="w-full max-w-sm" onSubmit={salvarTrem}>
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

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="form-year">Ano</FieldLabel>
                <Input
                  id="form-year"
                  type="number"
                  step="1"
                  min="1800"
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

            <Field orientation="horizontal">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/trensGerenciamento")}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando}>
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
