import { useContext } from 'react';
import { TemaContext } from '@/contexts/tema-context';

export function useTema() {
  return useContext(TemaContext);
}
