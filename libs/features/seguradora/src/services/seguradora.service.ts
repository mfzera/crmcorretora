import * as repo from '../repositories/seguradora.repository';
import type { UpdateSeguradoraInput } from '../schemas';

export async function getDados(corretoraId: string) {
  const row = await repo.findWithPlano(corretoraId);
  if (!row) return null;

  const seguradora = row.corretora;
  const plano = row.plano;

  return {
    id: seguradora.id,
    razaoSocial: seguradora.razaoSocial,
    nomeFantasia: seguradora.nomeFantasia,
    cnpj: seguradora.cnpj,
    subdominio: seguradora.subdominio,
    emailContato: seguradora.emailContato,
    telefone: seguradora.telefone,
    cep: seguradora.cep,
    logradouro: seguradora.logradouro,
    numero: seguradora.numero,
    complemento: seguradora.complemento,
    bairro: seguradora.bairro,
    cidade: seguradora.cidade,
    uf: seguradora.uf,
    status: seguradora.status,
    dataInicioTrial: seguradora.dataInicioTrial,
    dataFimTrial: seguradora.dataFimTrial,
    logoUrl: seguradora.logoUrl,
    coresTema: seguradora.coresTema,
    plano: plano
      ? {
          id: plano.id,
          nome: plano.nomePlano,
          limiteUsuarios: plano.limiteUsuarios,
          limiteVendedores: plano.limiteVendedores,
          limiteClientes: plano.limiteClientes,
          limiteVendasMes: plano.limiteVendasMes,
        }
      : null,
    createdAt: seguradora.createdAt,
  };
}

export async function atualizar(corretoraId: string, data: UpdateSeguradoraInput) {
  return repo.update(corretoraId, data);
}

export async function getUso(corretoraId: string) {
  const row = await repo.findWithPlano(corretoraId);
  if (!row) return null;

  const seguradora = row.corretora;
  const plano = row.plano;

  const pct = (atual: number | null, limite: number | null) =>
    limite ? Math.round(((atual ?? 0) / limite) * 100) : null;

  return {
    usuarios: {
      atual: seguradora.usuariosAtivos ?? 0,
      limite: plano?.limiteUsuarios ?? null,
      percentual: pct(seguradora.usuariosAtivos, plano?.limiteUsuarios ?? null),
    },
    vendedores: {
      atual: seguradora.vendedoresAtivos ?? 0,
      limite: plano?.limiteVendedores ?? null,
      percentual: pct(seguradora.vendedoresAtivos, plano?.limiteVendedores ?? null),
    },
    clientes: {
      atual: seguradora.clientesCadastrados ?? 0,
      limite: plano?.limiteClientes ?? null,
      percentual: pct(seguradora.clientesCadastrados, plano?.limiteClientes ?? null),
    },
    vendasMes: {
      atual: seguradora.vendasMesAtual ?? 0,
      limite: plano?.limiteVendasMes ?? null,
      percentual: pct(seguradora.vendasMesAtual, plano?.limiteVendasMes ?? null),
    },
    plano: plano ? { nome: plano.nomePlano, valorMensal: plano.valorMensal } : null,
  };
}

export async function atualizarLogo(corretoraId: string, logoUrl: string) {
  return repo.updateLogo(corretoraId, logoUrl);
}
