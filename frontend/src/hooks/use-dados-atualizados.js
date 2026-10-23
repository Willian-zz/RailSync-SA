import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
export function useDadosAtualizados(caminho) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function buscar() {
      try {
        const resultado = await api(caminho, { signal: controller.signal, cache: 'no-store' });
        if (!controller.signal.aborted) { setDados(resultado); setErro(''); }
      } catch (error) {
        if (!controller.signal.aborted) setErro(error.message);
      } finally { if (!controller.signal.aborted) setCarregando(false); }
    }
    buscar();
    const timer = window.setInterval(buscar, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [caminho, versao]);
  function atualizar() { setCarregando(true); setVersao(v => v + 1); }
  return { dados, erro, carregando, atualizar };
}
