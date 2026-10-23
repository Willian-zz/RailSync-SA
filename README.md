# RailSync

![Banner RailSync](/frontend/src/assets/RailSync-banner.png)


Sistema web para acompanhamento e gerenciamento de trens, linhas, rotas, sensores e leituras. O projeto foi desenvolvido como atividade de conclusão do curso técnico e, neste estágio, funciona com dados armazenados no banco local e registros de teste.

> **Estado da integração com hardware:** a conexão com Arduino e com o brinquedo Ferrorama ainda não foi implementada. Essa etapa está em avaliação. As leituras exibidas hoje vêm dos registros de teste já cadastrados ou enviados pela API; elas não são recebidas de sensores físicos.

## Objetivo do projeto

O RailSync foi proposto como uma atividade do curso **Desenvolvimento de Sistemas**, da **Escola SESI / SENAI de referência**. A ideia inicial era avaliar se os alunos conseguiriam desenvolver o sistema de software como preparação para uma possível etapa prática com Arduino e um brinquedo Ferrorama. A realização dessa etapa física ainda será decidida.

O sistema permite acompanhar a situação dos trens, consultar linhas e horários, administrar rotas e linhas, registrar sensores e leituras, comparar medições com limites configurados e visualizar relatórios e alertas.

## Créditos

- **Design:** Lara Gonçalves ([GitHub](https://github.com/laragoncalves2)), Mateus Borba Ramos ([GitHub](https://github.com/mateusb-ramos)) e Willian Zimmermann Junior ([GitHub](https://github.com/Willian-zz)).
- **Código:** Willian Zimmermann Junior ([GitHub](https://github.com/Willian-zz)).
- **Primeiro mock-up da ideia (Canva, mobile):** [visualizar protótipo](https://canva.link/20cylf9vjzemz7m).

## Funcionalidades

- Login, cadastro de conta e controle de acesso por cargo.
- Consulta pública autenticada de linhas, rotas, trens atribuídos e horários.
- Gerenciamento de trens, sensores, linhas e rotas para operários e desenvolvedores.
- Configuração de limites por trem para velocidade, temperatura, consumo, vibração e capacidade/carga.
- Lista de leituras pesquisável, relatórios individuais e gráficos de histórico por sensor.
- Identificação de medições fora dos limites e notificações para operários e desenvolvedores.
- Dashboard com totais de trens por situação e gráfico de erros por tipo.
- Área exclusiva de desenvolvedor para pesquisar, editar e remover usuários, além de alterar cargos permitidos.
- Preferência de tema claro/escuro e menus laterais que permanecem após navegar e atualizar a página.

### Cargos

| Cargo | Acesso |
| --- | --- |
| `usuario` | Consulta as linhas e informações de circulação. |
| `operario` | Consulta e acessa as páginas operacionais de gerenciamento, leituras, relatórios, dashboard e notificações. |
| `dev` | Acesso de operário e gerenciamento de usuários. O cargo `dev` não pode ser atribuído pela tela de edição de usuários. |

O servidor consulta o cargo atual no banco em cada requisição protegida. O cargo enviado pelo navegador ou guardado em um token antigo não concede permissões por si só.

## Tecnologias e bibliotecas

### Frontend

- **React 19** para componentes e interface.
- **Vite 8** para servidor de desenvolvimento e geração do build.
- **React Router 7** para navegação e proteção das páginas.
- **Tailwind CSS 4** e **`@tailwindcss/vite`** para estilos utilitários.
- **Base UI** (`@base-ui/react`) e componentes locais inspirados no **shadcn/ui** para elementos de interface.
- **Recharts 3** para gráficos de linhas e pizza.
- **Lucide React** e **HugeIcons** para ícones.
- **Figtree** (`@fontsource-variable/figtree`) para tipografia.
- **class-variance-authority**, **`cn`** e **`tw-animate-css`** para composição de classes, variantes e animações.
- **ESLint 10** e plugins React para análise estática.

### Backend e armazenamento

- **Node.js 24 ou superior**, incluindo o módulo SQLite integrado `node:sqlite` (`DatabaseSync`).
- **Express 5** para as rotas HTTP e middleware.
- **SQLite** em arquivo local (`trens.db` por padrão).
- **Argon2** para hash e verificação de senhas.
- **JSON Web Token** (`jsonwebtoken`) armazenado em cookie HTTP-only para sessão.
- **`cookie-parser`** para leitura do cookie de sessão e **CORS** para permitir a comunicação do frontend local com a API.
- **`dotenv`** para carregar variáveis de ambiente.
- **Node Test Runner** (`node --test`) para os testes do backend.

O backend atualmente usa `node:sqlite`; embora `better-sqlite3` apareça entre as dependências instaladas do projeto, não é o driver usado pelo código atual.

## Estrutura do repositório

```text
RailSync-SA/
├── backend/
│   ├── middleware/       # autenticação e autorização por cargo
│   ├── routes/           # endpoints Express agrupados por assunto
│   ├── scripts/          # utilitários administrativos
│   ├── src/              # banco, regras de negócio, migrações e servidor
│   └── tests/            # testes automatizados do backend
└── frontend/
    ├── public/            # arquivos públicos
    └── src/
        ├── components/    # páginas, layouts e componentes da interface
        ├── contexts/      # estado compartilhado de autenticação e tema
        ├── hooks/         # lógica reutilizável da interface
        ├── lib/           # chamadas à API e funções auxiliares
        └── pages/         # login, cadastro e estrutura principal
```

As páginas de gerenciamento ficam organizadas por assunto em `frontend/src/components/dashboards/`, por exemplo `trens/`, `sensores/`, `rotas/`, `linhas/`, `usuarios/` e `inicio/`.

## Como a aplicação funciona

O frontend React roda pelo Vite em `http://localhost:5173` e faz chamadas HTTP para a API Express em `http://localhost:3000`. As chamadas autenticadas enviam o cookie de sessão. O backend valida o token e busca o usuário e seu cargo atual no SQLite antes de liberar cada recurso.

O arquivo do banco é `backend/trens.db` quando o servidor é iniciado dentro da pasta `backend`. Na inicialização, o backend cria as tabelas que faltam, executa migrações compatíveis com o banco existente e instala os gatilhos usados para registrar notificações de mudanças de estado e de leituras fora dos limites. Em um banco novo, o projeto também insere dados de exemplo para facilitar a visualização das telas; esses registros são dados de teste, não telemetria de hardware.

Principais relações de dados:

- Um trem pode estar associado a uma linha e possui sensores e limites.
- Cada sensor pertence a um trem e tem tipo, unidade e código.
- Cada leitura pertence a um sensor e guarda valor e data/hora.
- Os limites são configurados por trem e tipo de medição.
- Linhas podem pertencer a rotas; horários associam trens às linhas.
- Notificações guardam eventos de mudança para manutenção e medições que ultrapassam os limites.

## API

Base local: `http://localhost:3000/api`. Os endpoints abaixo usam JSON. Salvo indicação em contrário, os recursos operacionais exigem sessão e cargo `operario` ou `dev`; o cargo `dev` também pode acessar os recursos de operário.

### Autenticação — `/auth`

| Método e caminho | Função | Acesso |
| --- | --- | --- |
| `POST /auth/register` | Cria conta com nome, email e senha (mínimo de 8 caracteres). O cargo inicial é sempre `usuario`. | Público |
| `POST /auth/login` | Confere email e senha e cria cookie de sessão HTTP-only. | Público |
| `POST /auth/logout` | Encerra a sessão removendo o cookie. | Público |
| `GET /auth/check` | Confere se existe sessão válida e devolve dados seguros da conta. | Autenticado |
| `GET /auth/me` | Devolve os dados do usuário da sessão atual. | Autenticado |

### Trens, sensores e leituras — `/stmt`

Todas as rotas deste grupo exigem cargo `operario` ou `dev`.

| Método e caminho | Função |
| --- | --- |
| `GET /stmt/trains` | Lista trens. |
| `GET /stmt/trains/status` | Conta trens por situação. |
| `GET /stmt/trains/:id` | Consulta um trem e seus limites. |
| `POST /stmt/trains` | Cadastra trem e, opcionalmente, seus limites. |
| `PUT /stmt/trains/:id` | Atualiza trem e limites enviados. |
| `DELETE /stmt/trains/:id` | Exclui trem. |
| `GET /stmt/sensors` | Lista sensores. |
| `GET /stmt/sensors/:id` | Consulta um sensor. |
| `POST /stmt/sensors` | Cadastra sensor. |
| `PUT /stmt/sensors/:id` | Atualiza sensor. |
| `DELETE /stmt/sensors/:id` | Exclui sensor. |
| `GET /stmt/readings?pesquisa=&erro=` | Pesquisa leituras e permite filtrar erros; `erro` pode ser `todos` ou um tipo de medição. |
| `GET /stmt/readings/:id/report` | Devolve relatório de uma leitura, limites aplicados e histórico para os gráficos. |
| `POST /stmt/readings` | Registra uma leitura com `sensor_id` e `valor`; `registrada_em` ISO com fuso é opcional. |

### Dashboard — `/dashboard`

Exige cargo `operario` ou `dev`.

| Método e caminho | Função |
| --- | --- |
| `GET /dashboard` | Devolve contagem de trens por situação e erros por tipo. |
| `GET /dashboard?escopo=historico` | Considera todas as leituras armazenadas (padrão). |
| `GET /dashboard?escopo=atuais` | Considera a leitura mais recente de cada sensor. |

### Rotas e linhas — `/rede`

| Método e caminho | Função | Acesso |
| --- | --- | --- |
| `GET /rede/consulta` | Consulta linhas, rotas, horários e trens associados. | Autenticado |
| `GET /rede/opcoes` | Devolve informações de rede e trens para formulários. | Operário ou dev |
| `GET /rede/rotas` e `GET /rede/linhas` | Lista rotas ou linhas. | Operário ou dev |
| `GET /rede/rotas/:id` e `GET /rede/linhas/:id` | Consulta um cadastro. | Operário ou dev |
| `POST /rede/rotas` e `POST /rede/linhas` | Cria cadastro. | Operário ou dev |
| `PUT /rede/rotas/:id` e `PUT /rede/linhas/:id` | Atualiza cadastro. | Operário ou dev |
| `DELETE /rede/rotas/:id` e `DELETE /rede/linhas/:id` | Exclui cadastro. | Operário ou dev |

### Notificações — `/notificacoes`

Exige cargo `operario` ou `dev`. As notificações são eventos internos persistidos no banco e consultados pelo frontend periodicamente; não são emails, notificações do sistema operacional nem alertas enviados por hardware.

| Método e caminho | Função |
| --- | --- |
| `GET /notificacoes` | Lista notificações e estado de leitura da conta atual. |
| `POST /notificacoes/:id/lida` | Marca uma notificação como lida. |
| `POST /notificacoes/ler-todas` | Marca como lidas as notificações até o identificador enviado em `ate_id`. |

### Usuários — `/usuarios`

Todas as rotas exigem cargo `dev`.

| Método e caminho | Função |
| --- | --- |
| `GET /usuarios` | Lista usuários sem expor hashes de senha. |
| `GET /usuarios/:id` | Consulta os dados de um usuário. |
| `PUT /usuarios/:id` | Atualiza nome, email e cargo permitido (`usuario` ou `operario`). |
| `DELETE /usuarios/:id` | Exclui usuário respeitando as proteções de conta própria e do último dev. |

## Executar localmente

### Requisitos

- Node.js **24 ou superior** (necessário para o módulo integrado `node:sqlite`).
- npm.

### 1. Configurar e iniciar o backend

No terminal:

```bash
cd backend
npm install
```

Crie `backend/.env` com uma chave privada para assinatura dos tokens:

```env
JWT_SECRET=coloque-uma-chave-longa-e-aleatoria-aqui
```

Opcionalmente, defina outro caminho para o banco:

```env
DATABASE_PATH=./trens.db
```

Inicie o servidor:

```bash
npm run dev
```

O backend fica disponível em `http://localhost:3000`.

### 2. Configurar e iniciar o frontend

Em outro terminal, na raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

Cadastre uma conta pela interface para começar como `usuario`. Para promover uma conta localmente a `operario` ou `dev`, use o utilitário do backend:

```bash
cd backend
npm run cargo -- email@exemplo.com dev
```

Também é possível substituir `dev` por `operario`. Esse utilitário altera a conta indicada no banco configurado para o backend.

## Testes e build

Para executar os testes automatizados do backend:

```bash
cd backend
npm test
```

Para verificar o build do frontend:

```bash
cd frontend
npm run build
```

O frontend também possui o script `npm run lint` para ESLint.

## Próxima etapa possível: Arduino e Ferrorama

A integração de hardware não faz parte do funcionamento implementado neste momento. Uma etapa futura poderá definir como o Arduino enviará leituras à API, qual protocolo será usado, como os sensores serão ligados ao Ferrorama e como serão validados os dados recebidos. Até essa decisão e implementação, a API aceita registros de leitura e a interface usa dados de teste armazenados no SQLite.
