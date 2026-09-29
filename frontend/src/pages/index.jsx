import { useNavigate } from "react-router-dom";

export default function index() {
    const navigate = useNavigate();
  async function logout() {

    const confirm = window.confirm("Tem certeza que deseja sair?");

    if (!confirm) return;

    try {
      const resposta = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        console.error(dados.message);
        return;
      }

      console.log(dados.message);

      navigate("/login");
    } catch (error) {
      console.error("Erro ao conectar com o servido: ", error);
    }
  }

  const estilos = {
    container: {
      fontFamily: "sans-serif",
      maxWidth: "600px",
      margin: "40px auto",
      padding: "20px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      backgroundColor: "#f9f9f9",
    },
    secao: {
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "1px solid #eee",
    },
    botao: {
      padding: "8px 16px",
      backgroundColor: "#0070f3",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      marginRight: "8px",
    },
    input: {
      padding: "8px",
      marginRight: "8px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      width: "200px",
    },
  };

  return (
    <button
      onClick={logout}
      style={{ ...estilos.botao, backgroundColor: "#a72828" }}
    >
      SAIR
    </button>
  );
}
