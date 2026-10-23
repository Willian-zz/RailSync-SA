import { useEffect, useMemo, useState } from 'react';
import { TemaContext } from './tema-context';

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('railsync-tema') === 'escuro' ? 'escuro' : 'claro';
    } catch {
      return 'claro';
    }
  });

  // A classe no HTML também aplica o tema aos menus e modais fora do #root.
  useEffect(() => {
    const escuro = tema === 'escuro';
    document.documentElement.classList.toggle('dark', escuro);
    document.documentElement.style.colorScheme = escuro ? 'dark' : 'light';

    try {
      localStorage.setItem('railsync-tema', tema);
    } catch {
      // O tema continua funcionando se o navegador bloquear o armazenamento.
    }
  }, [tema]);

  const value = useMemo(() => ({ tema, setTema }), [tema]);
  return <TemaContext.Provider value={value}>{children}</TemaContext.Provider>;
}
