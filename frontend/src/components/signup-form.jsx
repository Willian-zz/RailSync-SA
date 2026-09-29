import { cn } from "cn"
import { useNavigate } from "react-router-dom"

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

export function SignupForm({
  className,
  ...props
}) {

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    let erros = {};

    const emailRegex = /^[a-zA-z0-9._]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;

    if(!name || name === "") {
      erros.name = "Informe o seu nome.";
    }

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

    if(password !== confirmPassword) {
      erros.confirmPassword = "Confirme sua senha corretamente";
    } 

    if(Object.keys(erros).length > 0) {
      console.log(erros);
      return;
    }

    const userInfo = {
      fullname: name,
      email: email,
      senha: password
    };

    try {
      const resposta = await fetch(
        "http://localhost:3000/api/auth/register", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(userInfo)
       }
      );

      const dados = await resposta.json();

      if(!resposta.ok) {
        console.error(dados.message);
        return;
      }

      console.log(dados.message);

      navigate("/login")
    } catch(error) {
      console.error("Erro ao conectar com o servidor: ", error);
    }
  }

  return (

    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Preencha o formulário abaixo para se cadastrar
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">Nome completo</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
            className="bg-background"
          />
          <FieldDescription>
            Essa informação não será compatilhada.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-background"
          />
          <FieldDescription>
            Deve conter ao menos 8 caracteres.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirme sua senha</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="bg-background"
          />
          <FieldDescription>Por favor confirme sua senha.</FieldDescription>
        </Field>
        <Field>
          <Button type="submit">Criar conta</Button>
        </Field>
        <Field>
          <FieldDescription className="px-6 text-center">
            Já possui uma conta? <Link to="/login">Entrar</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
