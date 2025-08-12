import { responderConsultaViatura } from './responderConsultaViatura';
import { handleEntradaOficina, handleSaidaOficina, listarViaturasNaOficina, buscarServicosPorTipo, consultarOSPorNumero } from './oficinaHandler';
import type { BotResponse } from './types';

export interface Intent {
  name: string;
  patterns: string[];
  handler: (input: string) => Promise<BotResponse> | BotResponse;
}

export const intents: Intent[] = [
  {
    name: 'consulta_viatura',
    patterns: ['dados da', 'mostrar viatura', 'cavalaria', 'cav-'],
    handler: responderConsultaViatura,
  },
  {
    name: 'entrada_oficina',
    patterns: ['registrar entrada', 'entrada oficina', 'levar oficina', 'deixar oficina', 'entrada na oficina', 'colocar oficina', 'mandar oficina'],
    handler: handleEntradaOficina,
  },
  {
    name: 'saida_oficina', 
    patterns: ['registrar saída', 'saída oficina', 'retirar oficina', 'buscar oficina', 'saída da oficina', 'pegar oficina', 'finalizar serviço'],
    handler: handleSaidaOficina,
  },
  {
    name: 'listar_oficina',
    patterns: ['viaturas na oficina', 'listar oficina', 'consultar oficina', 'status oficina'],
    handler: async () => {
      const lista = await listarViaturasNaOficina();
      return { type: 'text', text: lista };
    },
  },
  {
    name: 'buscar_servico',
    patterns: ['buscar serviço', 'procurar serviço', 'serviços de', 'buscar por'],
    handler: async (input: string) => {
      // Extrair o tipo de serviço da entrada
      const match = input.match(/(?:buscar|procurar|serviços de|buscar por)\s+(.+)/i);
      if (match) {
        const tipoServico = match[1].trim();
        const resultado = await buscarServicosPorTipo(tipoServico);
        return { type: 'text', text: resultado };
      }
      return { type: 'text', text: 'Por favor, especifique o tipo de serviço que deseja buscar. Exemplo: "buscar serviço bateria"' };
    },
  },
  {
    name: 'consultar_os',
    patterns: ['consultar os', 'ordem de serviço', 'os número', 'os '],
    handler: async (input: string) => {
      const inputLower = input.toLowerCase();
      
      // Se for apenas "consultar os", pedir o número
      if (inputLower.trim() === 'consultar os' || inputLower.trim() === 'consultar ordem de serviço') {
        return { type: 'text', text: 'Por favor, informe o número da OS que deseja consultar.\nExemplo: "consultar OS 45646"' };
      }
      
      // Extrair número da OS - tentativas múltiplas de regex
      let numeroOS = null;
      
      // Tenta vários padrões
      const patterns = [
        /(?:os|ordem)\s*(\d+)/i,           // "os 123" ou "ordem 123"
        /(?:número|numero)\s*(\d+)/i,      // "número 123"
        /(\d+)/                           // qualquer número na string
      ];
      
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          numeroOS = match[1];
          break;
        }
      }
      
      if (numeroOS) {
        const resultado = await consultarOSPorNumero(numeroOS);
        return { type: 'text', text: resultado };
      }
      
      return { type: 'text', text: 'Por favor, informe o número da OS. Exemplo: "consultar OS 45646"' };
    },
  },
];
