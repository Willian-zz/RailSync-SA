export function fetchAutenticado(url, options = {}) {
  return fetch(url, { ...options, credentials: 'include' });
}
export async function api(caminho, options = {}) {
  const resposta = await fetchAutenticado(`http://localhost:3000/api${caminho}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw Object.assign(new Error(dados.message || 'Não foi possível concluir a solicitação.'), { status: resposta.status });
  return dados;
}
