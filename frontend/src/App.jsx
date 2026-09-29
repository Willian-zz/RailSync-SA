import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Cadastro from "./pages/sign-up";
import Index from "./pages/index";
import { RotaPublica } from "./components/routes/rotaPublica";
import { RotaProtegida } from "./components/routes/rotaProtegida";
import { RotaInicial } from "./components/routes/rotaInicial";

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
                    <Route path="/index" element={<Index />} />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;