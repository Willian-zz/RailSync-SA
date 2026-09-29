import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

export function RotaProtegida() {
    const [carregando, setCarregando] = useState(true);
    const [autenticado, setAutenticado] = useState(false);

    useEffect(() => {
        async function verificarSessao() {
            try {
                const resposta = await fetch(
                    "http://localhost:3000/api/auth/check",
                    {
                        credentials: "include"
                    }
                );

                setAutenticado(resposta.ok);
            } catch (error) {
                setAutenticado(false);
            } finally {
                setCarregando(false);
            }
        }

        verificarSessao();
    }, []);

    if (carregando) {
        return <p>Verificando sessão...</p>;
    }

    if (!autenticado) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}