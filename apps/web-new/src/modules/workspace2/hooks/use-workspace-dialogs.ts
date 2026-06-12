import { useReducer, startTransition } from 'react';
import type { RenovacaoPendente, RenovacaoPlanilha, Cotacao } from '@/types/area-trabalho';
import type { WorkspaceRow } from '../types';
import type { ReenviarCadastroRow } from '../components/reenviar-cadastro-dialog';

interface DialogState {
  detalhesRenovacao: RenovacaoPendente | null;
  detalhesMounted: boolean;
  selectedRenovacaoConvertida: RenovacaoPlanilha | null;
  convertidaMounted: boolean;
  selectedCotacao: Cotacao | null;
  cotacaoMode: 'view' | 'edit';
  cotacaoMounted: boolean;
  novoSeguroOpen: boolean;
  novoSeguroMounted: boolean;
  prospectoRapidoOpen: boolean;
  prospectoRapidoMounted: boolean;
  endossoOpen: boolean;
  endossoMounted: boolean;
  cancelarRow: WorkspaceRow | null;
  cancelarMounted: boolean;
  subvendedoresOpen: boolean;
  transferirOpen: boolean;
  transferirMounted: boolean;
  comentariosRow: WorkspaceRow | null;
  reenviarCadastroRow: ReenviarCadastroRow | null;
}

type DialogAction =
  | { type: 'OPEN_DETALHES'; renovacao: RenovacaoPendente }
  | { type: 'CLOSE_DETALHES' }
  | { type: 'OPEN_CONVERTIDA'; renovacao: RenovacaoPlanilha }
  | { type: 'CLOSE_CONVERTIDA' }
  | { type: 'OPEN_COTACAO'; cotacao: Cotacao; mode: 'view' | 'edit' }
  | { type: 'SET_COTACAO_MODE'; mode: 'view' | 'edit' }
  | { type: 'CLOSE_COTACAO' }
  | { type: 'OPEN_NOVO_SEGURO' }
  | { type: 'SET_NOVO_SEGURO_OPEN'; open: boolean }
  | { type: 'OPEN_PROSPECTO_RAPIDO' }
  | { type: 'SET_PROSPECTO_RAPIDO_OPEN'; open: boolean }
  | { type: 'OPEN_ENDOSSO' }
  | { type: 'SET_ENDOSSO_OPEN'; open: boolean }
  | { type: 'OPEN_CANCELAR'; row: WorkspaceRow }
  | { type: 'CLOSE_CANCELAR' }
  | { type: 'SET_SUBVENDEDORES_OPEN'; open: boolean }
  | { type: 'OPEN_TRANSFERIR' }
  | { type: 'SET_TRANSFERIR_OPEN'; open: boolean }
  | { type: 'OPEN_COMENTARIOS'; row: WorkspaceRow }
  | { type: 'CLOSE_COMENTARIOS' }
  | { type: 'OPEN_REENVIAR_CADASTRO'; row: ReenviarCadastroRow }
  | { type: 'CLOSE_REENVIAR_CADASTRO' };

const initialState: DialogState = {
  detalhesRenovacao: null,
  detalhesMounted: false,
  selectedRenovacaoConvertida: null,
  convertidaMounted: false,
  selectedCotacao: null,
  cotacaoMode: 'view',
  cotacaoMounted: false,
  novoSeguroOpen: false,
  novoSeguroMounted: false,
  prospectoRapidoOpen: false,
  prospectoRapidoMounted: false,
  endossoOpen: false,
  endossoMounted: false,
  cancelarRow: null,
  cancelarMounted: false,
  subvendedoresOpen: false,
  transferirOpen: false,
  transferirMounted: false,
  comentariosRow: null,
  reenviarCadastroRow: null,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'OPEN_DETALHES':
      return { ...state, detalhesMounted: true, detalhesRenovacao: action.renovacao };
    case 'CLOSE_DETALHES':
      return { ...state, detalhesRenovacao: null };
    case 'OPEN_CONVERTIDA':
      return { ...state, convertidaMounted: true, selectedRenovacaoConvertida: action.renovacao };
    case 'CLOSE_CONVERTIDA':
      return { ...state, selectedRenovacaoConvertida: null };
    case 'OPEN_COTACAO':
      return { ...state, cotacaoMounted: true, selectedCotacao: action.cotacao, cotacaoMode: action.mode };
    case 'SET_COTACAO_MODE':
      return { ...state, cotacaoMode: action.mode };
    case 'CLOSE_COTACAO':
      return { ...state, selectedCotacao: null };
    case 'OPEN_NOVO_SEGURO':
      return { ...state, novoSeguroMounted: true, novoSeguroOpen: true };
    case 'SET_NOVO_SEGURO_OPEN':
      return { ...state, novoSeguroOpen: action.open };
    case 'OPEN_PROSPECTO_RAPIDO':
      return { ...state, prospectoRapidoMounted: true, prospectoRapidoOpen: true };
    case 'SET_PROSPECTO_RAPIDO_OPEN':
      return { ...state, prospectoRapidoOpen: action.open };
    case 'OPEN_ENDOSSO':
      return { ...state, endossoMounted: true, endossoOpen: true };
    case 'SET_ENDOSSO_OPEN':
      return { ...state, endossoOpen: action.open };
    case 'OPEN_CANCELAR':
      return { ...state, cancelarMounted: true, cancelarRow: action.row };
    case 'CLOSE_CANCELAR':
      return { ...state, cancelarRow: null };
    case 'SET_SUBVENDEDORES_OPEN':
      return { ...state, subvendedoresOpen: action.open };
    case 'OPEN_TRANSFERIR':
      return { ...state, transferirMounted: true, transferirOpen: true };
    case 'SET_TRANSFERIR_OPEN':
      return { ...state, transferirOpen: action.open };
    case 'OPEN_COMENTARIOS':
      return { ...state, comentariosRow: action.row };
    case 'CLOSE_COMENTARIOS':
      return { ...state, comentariosRow: null };
    case 'OPEN_REENVIAR_CADASTRO':
      return { ...state, reenviarCadastroRow: action.row };
    case 'CLOSE_REENVIAR_CADASTRO':
      return { ...state, reenviarCadastroRow: null };
  }
}

export function useWorkspaceDialogs() {
  const [state, dispatch] = useReducer(dialogReducer, initialState);

  return {
    ...state,
    // As aberturas de dialogs lazy (carregados via React.lazy + Suspense) montam árvores
    // pesadas (react-hook-form, ag-grid). Marcá-las como transição mantém o clique
    // responsivo (INP) — o feedback pinta na hora e a montagem do dialog não bloqueia a
    // thread. Os `close` e `set*Open` ficam síncronos (devem ser imediatos).
    openDetalhes: (renovacao: RenovacaoPendente) => startTransition(() => dispatch({ type: 'OPEN_DETALHES', renovacao })),
    closeDetalhes: () => dispatch({ type: 'CLOSE_DETALHES' }),
    openConvertida: (renovacao: RenovacaoPlanilha) => startTransition(() => dispatch({ type: 'OPEN_CONVERTIDA', renovacao })),
    closeConvertida: () => dispatch({ type: 'CLOSE_CONVERTIDA' }),
    openCotacao: (cotacao: Cotacao, mode: 'view' | 'edit' = 'view') => startTransition(() => dispatch({ type: 'OPEN_COTACAO', cotacao, mode })),
    setCotacaoMode: (mode: 'view' | 'edit') => dispatch({ type: 'SET_COTACAO_MODE', mode }),
    closeCotacao: () => dispatch({ type: 'CLOSE_COTACAO' }),
    openNovoSeguro: () => startTransition(() => dispatch({ type: 'OPEN_NOVO_SEGURO' })),
    setNovoSeguroOpen: (open: boolean) => dispatch({ type: 'SET_NOVO_SEGURO_OPEN', open }),
    openProspectoRapido: () => startTransition(() => dispatch({ type: 'OPEN_PROSPECTO_RAPIDO' })),
    setProspectoRapidoOpen: (open: boolean) => dispatch({ type: 'SET_PROSPECTO_RAPIDO_OPEN', open }),
    openEndosso: () => startTransition(() => dispatch({ type: 'OPEN_ENDOSSO' })),
    setEndossoOpen: (open: boolean) => dispatch({ type: 'SET_ENDOSSO_OPEN', open }),
    openCancelar: (row: WorkspaceRow) => startTransition(() => dispatch({ type: 'OPEN_CANCELAR', row })),
    closeCancelar: () => dispatch({ type: 'CLOSE_CANCELAR' }),
    setSubvendedoresOpen: (open: boolean) => dispatch({ type: 'SET_SUBVENDEDORES_OPEN', open }),
    openTransferir: () => startTransition(() => dispatch({ type: 'OPEN_TRANSFERIR' })),
    setTransferirOpen: (open: boolean) => dispatch({ type: 'SET_TRANSFERIR_OPEN', open }),
    openComentarios: (row: WorkspaceRow) => startTransition(() => dispatch({ type: 'OPEN_COMENTARIOS', row })),
    closeComentarios: () => dispatch({ type: 'CLOSE_COMENTARIOS' }),
    openReenviarCadastro: (row: ReenviarCadastroRow) => dispatch({ type: 'OPEN_REENVIAR_CADASTRO', row }),
    closeReenviarCadastro: () => dispatch({ type: 'CLOSE_REENVIAR_CADASTRO' }),
  };
}
