
export interface ViaturaFipe {
  id?: string;
  viaturaId: string;
  cadastro: string;
  placa: string;
  valorFipe: number; // Valor em centavos
  dataAtualizacao: Date;
  ativo: boolean;
  historico?: HistoricoFipe[];
}

export interface HistoricoFipe {
  valorAnterior: number;
  valorNovo: number;
  dataAlteracao: Date;
  usuario?: string;
}

export interface SaldoAnual {
  valorFipe: number;
  limiteAnual: number; // 70% do FIPE
  limitePorOS: number; // 20% do FIPE
  gastoUltimos12Meses: number;
  saldoDisponivel: number;
  percentualUsado: number;
}

export interface OrdemServicoAnual {
  id: string;
  placaViatura: string;
  numeroOS: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
}
