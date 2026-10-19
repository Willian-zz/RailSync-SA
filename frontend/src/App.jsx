import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Cadastro from "./pages/sign-up";
import Index from "./pages/index";
import { RotaPublica } from "./components/routes/rotaPublica";
import { RotaProtegida } from "./components/routes/rotaProtegida";
import { RotaInicial } from "./components/routes/rotaInicial";

import DashboardLayout from "./components/dashboards/dashboard-layout";
import TrensGerenciamento from "./components/dashboards/trens/trens-gerenciamento";
import TrensFormulario from "./components/dashboards/trens/trens-formulario";

import SensoresGerenciamento from "./components/dashboards/sensores/sensores-gerenciamento";
import SensoresFormulario from "./components/dashboards/sensores/sensores-formulario";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<RotaInicial />} />

                <Route element={<RotaPublica/>}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/cadastro" element={<Cadastro />} />
                </Route>

                <Route element={<RotaProtegida/>}>
                    <Route path="/index" element={<Index />}>
                        {/* Página inicial */}
                        <Route index element={<DashboardLayout />} />

                        {/* Páginas internas */}
                        <Route path="trensGerenciamento" element={<TrensGerenciamento />} />
                        <Route path="trensGerenciamento/novo" element={<TrensFormulario />} />
                        <Route path="trensGerenciamento/editar/:id" element={<TrensFormulario />} />

                        <Route path="sensoresGerenciamento" element={<SensoresGerenciamento />} />
                        <Route path="sensoresGerenciamento/novo" element={<SensoresFormulario />} />
                        <Route path="sensoresGerenciamento/editar/:id" element={<SensoresFormulario />} />
                        

                        {/* <Route path="relatorios" element={<Relatorios />} />

                        <Route path="configuracoes" element={<Configuracoes />} /> */}
                    </Route>
                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;