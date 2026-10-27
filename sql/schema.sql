CREATE TABLE IF NOT EXISTS ars (
  id SERIAL PRIMARY KEY,
  atividade TEXT NOT NULL,
  setor TEXT,
  data_ar DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'rascunho',
  aprovado_por TEXT,
  conteudo JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
