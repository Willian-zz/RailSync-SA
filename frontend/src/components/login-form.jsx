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
        <FieldSeparator>Ou entre com</FieldSeparator>
        <Field>
          <Button variant="outline" type="button">
              <svg //svg google
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="size-5"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.5Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.54 13.59A5.87 5.87 0 0 1 6.23 12c0-.55.1-1.08.31-1.59V7.88H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.38l3.24-2.79Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.38c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.48 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.7 5.38l3.24 2.53C7.31 8.1 9.46 6.38 12 6.38Z"
                />
              </svg>
            Entrar com Google
          </Button>
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
