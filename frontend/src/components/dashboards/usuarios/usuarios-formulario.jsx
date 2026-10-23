import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AvisoErro } from "@/components/aviso-erro";
import { Seletor } from "@/components/seletor-campo";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

export default function UsuariosFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, atualizarSessao } = useAuth();
  const [carregado, setCarregado] = useState(null);
  const [form, setForm] = useState(null);
  const [contaDev, setContaDev] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      try {
        const dados = await api(`/usuarios/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setForm({
          fullname: dados.fullname,
          email: dados.email,
          cargo: dados.cargo,
        });
        setContaDev(dados.cargo === "dev");
        setCarregado(id);
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

  async function salvar(event) {
    event.preventDefault();
    if (salvando || carregado !== id) return;
    setSalvando(true);
    setErro("");
    try {
      await api(`/usuarios/${id}`, { method: "PUT", body: form });
      if (Number(id) === usuario.id) await atualizarSessao();
      navigate("/index/usuariosGerenciamento");
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
        onClick={() => navigate("/index/usuariosGerenciamento")}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Editar usuário</h1>
        <p className="text-sm text-muted-foreground">
          Atualize o nome, o email e o cargo da conta.
        </p>
      </div>
      <AvisoErro mensagem={erro} />
      {carregado !== id ? (
        !erro && <p role="status">Carregando usuário...</p>
      ) : (
        <form onSubmit={salvar} className="w-full min-w-0 max-w-2xl">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="usuario-nome">Nome</FieldLabel>
              <Input
                id="usuario-nome"
                required
                maxLength={150}
                value={form.fullname}
                onChange={(event) => campo("fullname", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="usuario-email">Email</FieldLabel>
              <Input
                id="usuario-email"
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(event) => campo("email", event.target.value)}
              />
            </Field>
            {contaDev ? (
              <Field>
                <FieldLabel htmlFor="usuario-cargo">Cargo</FieldLabel>
                <Input id="usuario-cargo" value="Dev" disabled />
                <p className="text-xs text-muted-foreground">
                  O cargo desta conta é mantido. Esta página não concede nem
                  altera o cargo dev.
                </p>
              </Field>
            ) : (
              <Seletor
                id="usuario-cargo"
                label="Cargo"
                value={form.cargo}
                onChange={(event) => campo("cargo", event.target.value)}
              >
                <option value="usuario">Usuário</option>
                <option value="operario">Operário</option>
              </Seletor>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => navigate("/index/usuariosGerenciamento")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
