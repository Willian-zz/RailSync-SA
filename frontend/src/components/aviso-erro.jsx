export function AvisoErro({ mensagem }) {
  if (!mensagem) return null;

  return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-sm text-destructive">{mensagem}</p>;
}
