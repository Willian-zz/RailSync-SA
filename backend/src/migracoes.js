export function migrarBanco(banco) {
  banco.exec('BEGIN');
  try {
    const usuarios = banco.prepare("SELECT sql FROM sqlite_master WHERE name = 'usuarios'").get();
    if (!/CHECK\s*\(\s*cargo\s+IN\s*\(\s*'usuario'\s*,\s*'operario'\s*,\s*'dev'/i.test(usuarios.sql)) {
      const sequencia = banco.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'usuarios'").get()?.seq ?? 0;
      banco.exec(`
        CREATE TABLE usuarios_cargos (
          id INTEGER PRIMARY KEY AUTOINCREMENT, fullname TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
          cargo TEXT NOT NULL DEFAULT 'usuario' CHECK (cargo IN ('usuario', 'operario', 'dev'))
        );
        INSERT INTO usuarios_cargos (id, fullname, email, senha_hash, cargo)
        SELECT id, fullname, email, senha_hash,
          CASE lower(cargo) WHEN 'dev' THEN 'dev' WHEN 'admin' THEN 'dev'
            WHEN 'operario' THEN 'operario' WHEN 'operário' THEN 'operario' ELSE 'usuario' END
        FROM usuarios;
        DROP TABLE usuarios;
        ALTER TABLE usuarios_cargos RENAME TO usuarios;
      `);
      const novaSequencia = banco.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'usuarios'").get()?.seq ?? 0;
      banco.prepare("DELETE FROM sqlite_sequence WHERE name = 'usuarios'").run();
      banco.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('usuarios', ?)").run(Math.max(sequencia, novaSequencia));
    }
    banco.exec(`
      CREATE TABLE IF NOT EXISTS rotas (
        id INTEGER PRIMARY KEY, nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
        origem TEXT NOT NULL, destino TEXT NOT NULL,
        situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'manutencao', 'inativo'))
      );
    `);
    const colunas = banco.prepare('PRAGMA table_info(linhas)').all().map(c => c.name);
    if (!colunas.includes('rota_id')) banco.exec('ALTER TABLE linhas ADD COLUMN rota_id INTEGER REFERENCES rotas(id) ON UPDATE CASCADE ON DELETE SET NULL');
    if (!colunas.includes('situacao')) banco.exec("ALTER TABLE linhas ADD COLUMN situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'manutencao', 'inativo'))");
    banco.exec(`
      CREATE TABLE IF NOT EXISTS horarios_linhas (
        id INTEGER PRIMARY KEY,
        linha_id INTEGER NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
        trem_id INTEGER NOT NULL REFERENCES trens(id) ON DELETE CASCADE,
        horario TEXT NOT NULL CHECK (length(horario) = 5 AND horario GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(horario,1,2) <= '23'),
        UNIQUE(trem_id, horario)
      );
      CREATE INDEX IF NOT EXISTS idx_linhas_rota ON linhas(rota_id);
      CREATE INDEX IF NOT EXISTS idx_horarios_linha ON horarios_linhas(linha_id, horario);
      CREATE TRIGGER IF NOT EXISTS validar_linha_horario_insert
      BEFORE INSERT ON horarios_linhas WHEN NOT EXISTS (
        SELECT 1 FROM trens WHERE id = NEW.trem_id AND linha_id = NEW.linha_id
      ) BEGIN SELECT RAISE(ABORT, 'O trem precisa pertencer à linha do horário.'); END;
      CREATE TRIGGER IF NOT EXISTS validar_linha_horario_update
      BEFORE UPDATE ON horarios_linhas WHEN NOT EXISTS (
        SELECT 1 FROM trens WHERE id = NEW.trem_id AND linha_id = NEW.linha_id
      ) BEGIN SELECT RAISE(ABORT, 'O trem precisa pertencer à linha do horário.'); END;
      CREATE TRIGGER IF NOT EXISTS limpar_horarios_trem_transferido
      AFTER UPDATE OF linha_id ON trens WHEN OLD.linha_id IS NOT NEW.linha_id
      BEGIN DELETE FROM horarios_linhas WHERE trem_id = NEW.id AND linha_id IS NOT NEW.linha_id; END;
      CREATE TABLE IF NOT EXISTS migracoes_dados (nome TEXT PRIMARY KEY);
    `);
    banco.exec('COMMIT');
  } catch (error) {
    if (banco.isTransaction) banco.exec('ROLLBACK');
    throw error;
  }
}
