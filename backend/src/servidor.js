import express from "express"; //chamando o express do express baixado
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "../routes/authRoutes.js"
import banco from "./banco.js";

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json()); //Para transmitir os dados sempre por json;
app.use(cookieParser()); //Enviar cookies e salvar sessão

app.use("/api/auth", authRoutes);

app.listen(3000, () => { //Ao rodar vai abrir o servidor na porta 3000
    console.log("Servidor rodando em http://localhost:3000");
});