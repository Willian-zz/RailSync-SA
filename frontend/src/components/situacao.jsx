export function Situacao({ valor }) {
  const nomes = { ativo: 'Ativo', manutencao: 'Manutenção', inativo: 'Inativo' };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium etiqueta-${valor}`}>
      {nomes[valor] || '----'}
    </span>
  );
}
