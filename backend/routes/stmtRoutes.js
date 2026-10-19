import express from "express";
import banco from "../src/banco.js";
import { listarLeituras, obterRelatorio, salvarLimites, tiposLeituras, validarLimites } from "../src/leituras.js";

const router = express.Router();

function emTransacao(operacao) {
    banco.exec("BEGIN");
    try {
        const resultado = operacao();
        banco.exec("COMMIT");
        return resultado;
    } catch (error) {
        banco.exec("ROLLBACK");
        throw error;
    }
}

//==========================
//LEITURAS
//==========================

router.get("/readings", (req, res) => {
    const pesquisa = req.query.pesquisa ?? "";
    const erro = req.query.erro ?? "";

    if (typeof pesquisa !== "string" || typeof erro !== "string" ||
        (erro && erro !== "todos" && !tiposLeituras.includes(erro))) {
        return res.status(400).json({ message: "Filtro de leituras inválido." });
    }

    try {
        res.json(listarLeituras(banco, { pesquisa: pesquisa.trim(), erro }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Não foi possível carregar as leituras." });
    }
});

router.get("/readings/:id/report", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Identificador de leitura inválido." });
    }
    try {
        const relatorio = obterRelatorio(banco, id);
        if (!relatorio) {
            return res.status(404).json({ message: "Leitura não encontrada." });
        }
        res.set("Cache-Control", "no-store").json(relatorio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Não foi possível gerar o relatório." });
    }
});

// Recebe os registros dos sensores; a página apenas consulta e atualiza a lista.
router.post("/readings", (req, res) => {
    const { sensor_id, valor, registrada_em } = req.body ?? {};

    if (!Number.isSafeInteger(sensor_id) || sensor_id <= 0 ||
        typeof valor !== "number" || !Number.isFinite(valor)) {
        return res.status(400).json({ message: "Informe um sensor e um valor numérico válidos." });
    }

    if (registrada_em !== undefined && (
        typeof registrada_em !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(registrada_em) ||
        !Number.isFinite(Date.parse(registrada_em))
    )) {
        return res.status(400).json({ message: "Informe a data em formato ISO com fuso horário." });
    }

    try {
        const sensor = banco.prepare("SELECT id FROM sensores WHERE id = ?").get(sensor_id);
        if (!sensor) {
            return res.status(404).json({ message: "Sensor não encontrado." });
        }

        const data = new Date(registrada_em ?? Date.now()).toISOString();
        const resultado = banco.prepare(`
            INSERT INTO leituras (sensor_id, valor, registrada_em) VALUES (?, ?, ?)
        `).run(sensor_id, valor, data);

        res.status(201).json({
            id: Number(resultado.lastInsertRowid),
            message: "Leitura registrada com sucesso.",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Não foi possível registrar a leitura." });
    }
});


//==========================
//TRENS
//==========================

router.get("/trains", async (req, res) => {
    try {
        const trens = banco.prepare(`SELECT * FROM trens`).all();

        res.json(trens);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.get("/trains/status", async (req, res) => {
    try {
        const situacao = banco.prepare(`SELECT situacao, COUNT(*) AS quantidade FROM trens GROUP BY situacao`).all();

        if(situacao.length <= 0) {
            return res.json({
                message: "Não há trens."
            })
        }

        const resultado = Object.fromEntries(
            situacao.map(item => [item.situacao, item.quantidade])
        );

        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.get("/trains/:id", async (req, res) => {
    try {
        const {id} = req.params;

        const trem = banco.prepare(`SELECT * FROM trens WHERE id = ?`).get(id);

        if(!trem) {
            return res.status(404).json({
                message : "Trem não encontrado."
            })
        }

        const limites = banco.prepare(
            "SELECT tipo, unidade, valor_minimo, valor_maximo FROM limites_trens WHERE trem_id = ?"
        ).all(id);

        res.json({ ...trem, limites });
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.post("/trains", async(req, res) => {
    try {
        const {prefixo, modelo, ano, situacao, limites} = req.body;

        if(!prefixo || !modelo || !ano || !situacao) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        const tremExistente = banco.prepare("SELECT id FROM trens WHERE prefixo = ?").get(prefixo);

        if(tremExistente) {
            return res.status(409).json({
                message: "Este trem já está cadastrado."
            });
        }

        const limitesValidados = limites === undefined ? [] : validarLimites(limites);

        const tremId = emTransacao(() => {
            const resultado = banco.prepare(`
                INSERT INTO trens (prefixo, modelo, ano, situacao) VALUES (?, ?, ?, ?)
            `).run(prefixo, modelo, ano, situacao);
            const id = Number(resultado.lastInsertRowid);
            salvarLimites(banco, id, limitesValidados);
            return id;
        });

        res.status(201).json({
            id: tremId,
            message: "Trem cadastrado com sucesso."
        });
    } catch(error) {
        console.error(error);

        res.status(error.status || 500).json({
            message: error.status === 400 ? error.message : "Erro ao criar o trem."
        });
    }
})

router.put("/trains/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { prefixo, modelo, ano, situacao, limites } = req.body;

        if (!prefixo || !modelo || !ano || !situacao) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        // Verifica se o trem existe
        const tremExistente = banco.prepare(
            "SELECT id FROM trens WHERE id = ?"
        ).get(id);

        if (!tremExistente) {
            return res.status(404).json({
                message: "Trem não encontrado."
            });
        }

        // Verifica se outro trem já utiliza prefixo
        const prefixoExistente = banco.prepare(
            "SELECT id FROM trens WHERE prefixo = ? AND id != ?"
        ).get(prefixo, id);

        if (prefixoExistente) {
            return res.status(409).json({
                message: "Este prefixo já está sendo utilizado por outro trem."
            });
        }

        const limitesValidados = limites === undefined ? undefined : validarLimites(limites);

        emTransacao(() => {
            banco.prepare(`
                UPDATE trens
                SET prefixo = ?, modelo = ?, ano = ?, situacao = ?
                WHERE id = ?
            `).run(prefixo, modelo, ano, situacao, id);

            // Clientes antigos que não enviam limites preservam a configuração.
            if (limitesValidados !== undefined) salvarLimites(banco, id, limitesValidados);
        });

        return res.status(200).json({
            message: "Trem atualizado com sucesso."
        });

    } catch (error) {
        console.error(error);

        return res.status(error.status || 500).json({
            message: error.status === 400 ? error.message : "Erro ao atualizar o trem."
        });
    }
});

router.delete("/trains/:id", (req, res) => {
    try {
        const {id} = req.params;

        const resultado = banco.prepare("DELETE FROM trens WHERE id = ?").run(id);

        if(resultado.changes === 0){
            return res.status(404).json({
                message: "Trem não encontrado." 
            });
        }

        res.json({
            message: "Trem excluído com sucesso."
        })
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao excluir o trem."
        });
    }
});

//==========================
//SENSORES
//==========================

router.get("/sensors", async (req, res) => {
    try {
        const sensores = banco.prepare(`SELECT * FROM sensores`).all();

        res.json(sensores);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.get("/sensors/:id", async (req, res) => {
    try {
        const {id} = req.params;

        const sensor = banco.prepare(`SELECT * FROM sensores WHERE id = ?`).get(id);

        if(!sensor) {
            return res.status(404).json({
                message : "Sensor não encontrado."
            })
        }

        res.json(sensor);
    } catch (error) {
        res.status(401).json({
            message: "Não foi possível fazer a pesquisa."
        })
    }
})

router.post("/sensors", async(req, res) => {
    try {
        const {codigo, tipo, unidade, trem_id} = req.body;

        if(!codigo || !tipo || !unidade || !trem_id) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        const sensorExistente = banco.prepare("SELECT id FROM sensores WHERE codigo = ?").get(codigo);

        if(sensorExistente) {
            return res.status(409).json({
                message: "Este sensor já está cadastrado."
            });
        }

        banco.prepare(`
            INSERT INTO sensores
            (codigo, tipo, unidade, trem_id)
            VALUES (?, ?, ?, ?)
            `)
            .run(codigo, tipo, unidade, trem_id);

        res.status(201).json({
            message: "Sensor cadastrado com sucesso."
        });
    } catch(error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao criar o sensor."
        });
    }
})

router.put("/sensors/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, tipo, unidade, trem_id } = req.body;

        if (!codigo || !tipo || !unidade || !trem_id) {
            return res.status(400).json({
                message: "Preencha todos os campos."
            });
        }

        // Verifica se o sensor existe
        const sensorExistente = banco.prepare(
            "SELECT id FROM sensores WHERE id = ?"
        ).get(id);

        if (!sensorExistente) {
            return res.status(404).json({
                message: "Trem não encontrado."
            });
        }

        // Verifica se outro sensor já utiliza codigo
        const codigoExistente = banco.prepare(
            "SELECT id FROM sensores WHERE codigo = ? AND id != ?"
        ).get(codigo, id);

        if (codigoExistente) {
            return res.status(409).json({
                message: "Este codigo já está sendo utilizado por outro sensor."
            });
        }

        // Atualiza os dados do sensor
        banco.prepare(`
            UPDATE sensores
            SET codigo = ?, tipo = ?, unidade = ?, trem_id = ?
            WHERE id = ?
        `).run(codigo, tipo, unidade, trem_id, id);

        return res.status(200).json({
            message: "Sensor atualizado com sucesso."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erro ao atualizar o sensor."
        });
    }
});

router.delete("/sensors/:id", (req, res) => {
    try {
        const {id} = req.params;

        const resultado = banco.prepare("DELETE FROM sensores WHERE id = ?").run(id);

        if(resultado.changes === 0){
            return res.status(404).json({
                message: "Sensor não encontrado." 
            });
        }

        res.json({
            message: "Sensor excluído com sucesso."
        })
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Erro ao excluir o sensor."
        });
    }
});

export default router;
