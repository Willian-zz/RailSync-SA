import { cn } from "cn"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { Link } from "react-router-dom";

export function LoginForm({
  className,
  ...props
}) {
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value.trim();

    let erros= {};

    const emailRegex = /^[a-zA-z0-9._]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;

    if(!email || email === "") {
      erros.email = "Informe o seu email.";
    } else if(emailRegex.test(email) != true) {
      erros.email = "Informe um email válido.";
    };

    if(!password || password === "") {
      erros.password = "Informe a sua senha.";
    } else if (password.length < 8) {
      erros.password = "A senha deve conter ao menos 8 caracteres."
    }

    if(Object.keys(erros).length > 0) {
      console.log(erros);
      return;
    }

    const userInfo = {
      email: email,
      senha: password
    };

    try {
      const resposta = await fetch(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },

          credentials: "include",

          body: JSON.stringify(userInfo)
        }
      );

      const dados = await resposta.json();

      if(!resposta.ok) {
        console.error(dados.message);
        return;
      }

      console.log(dados.message)

      navigate("/index", {replace: true}) //substitui a página anterior e não consegue voltar para login
    } catch(error) {
      console.error("Erro ao conectar com o servidor: ", error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Bem-vindo novamente</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Insera email e senha para conectar a sua conta
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Esqueceu sua senha?
            </a>
          </div>
          <Input id="password" type="password" required />
        </Field>
        <Field>
          <Button type="submit">Login</Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Não possui uma conta?{" "}
            <Link href="#" className="underline underline-offset-4" to="/cadastro">
              Criar conta
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
