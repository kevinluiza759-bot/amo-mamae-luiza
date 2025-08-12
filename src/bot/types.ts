export interface Viatura {
  id: string;
  CADASTRO: string;
  CHASSI: string;
  GOODCARD: string;
  KM: number;
  KMOLEO: number;
  MODELO: string;
  OBS: string;
  ORD: number;
  PLACA: string;
  PREFIXO: number;
  RADIO: number;
  RENAVAM: number;
  SALDO: number;
  SITUACAO: string;
  UTILIZACAO: string;
  tipo?: 'leve' | 'pesada';
}

export interface ViaturaNaOficina {
  id: string;
  cadastro: string;
  placa: string;
  modelo: string;
  dataEntrada: string;
  servicoRealizar: string;
  oficina: string;
  dataSaida?: string;
  observacaoServico?: string;
  status: 'na-oficina' | 'os-pendente';
  createdAt: string;
}

export interface Oficina {
  id: string;
  nome: string;
}

export type BotResponse =
  | { type: 'text'; text: string }
  | { type: 'show_viatura_modal'; viatura: Viatura }
  | { type: 'form_entrada_oficina' }
  | { type: 'form_saida_oficina' };