import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/api';

export function useNotificacoes() {
  const { pathname } = useLocation();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ultimoPedido = 0;

    async function buscar() {
      const pedido = ++ultimoPedido;
      try {
        const resultado = await api('/notificacoes', { signal: controller.signal, cache: 'no-store' });
        if (!controller.signal.aborted && pedido === ultimoPedido) {
          setDados(resultado);
          setErro('');
        }
      } catch (error) {
        if (!controller.signal.aborted && pedido === ultimoPedido) setErro(error.message);
      } finally {
        if (!controller.signal.aborted && pedido === ultimoPedido) setCarregando(false);
      }
    }

    buscar();
    const timer = window.setInterval(buscar, 10000);
    window.addEventListener('focus', buscar);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', buscar);
    };
  }, [pathname, versao]);

  function atualizar() {
    setCarregando(true);
    setVersao(valor => valor + 1);
  }

  async function marcarLida(id) {
    try {
      await api(`/notificacoes/${id}/lida`, { method: 'POST' });
      atualizar();
    } catch (error) {
      setErro(error.message);
    }
  }

  async function marcarTodas() {
    if (!dados?.ultimo_id) return;
    try {
      await api('/notificacoes/ler-todas', { method: 'POST', body: { ate_id: dados.ultimo_id } });
      atualizar();
    } catch (error) {
      setErro(error.message);
    }
  }

  return { dados, erro, carregando, atualizar, marcarLida, marcarTodas };
}
