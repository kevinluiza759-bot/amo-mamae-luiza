
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BotResponse, Viatura } from './types';

// Regex para capturar "cav", "cavalaria" + número
const viaturaRegex = /\bcav(?:alaria)?\s*-?\s*(\d{1,3})\b/i;

// Regex mais ampla para capturar diferentes formatos de cadastro
const cadastroRegex = /\b([A-Z]{2,4}[_\-\s]?\d{2,4}[_\-\s]?[A-Za-z]*)\b/i;

const keywords = [
  'mostrar', 'exibir', 'dados', 'informações', 'ficha', 'abrir', 'consultar', 'detalhes',
  'ver', 'pesquisar', 'localizar', 'status', 'situação', 'relatório', 'lista',
  'registro', 'visualizar', 'buscar', 'resumo', 'perfil'
];

function hasKeyword(text: string, keys: string[]): boolean {
  const textLower = text.toLowerCase();
  return keys.some(kw => textLower.includes(kw));
}

async function getViaturasFromFirestore(): Promise<Viatura[]> {
  const snapshot = await getDocs(collection(db, 'frota'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Viatura) }));
}

function verificarAutenticacao(input: string): boolean {
  // Verificar se o input solicita funcionalidades que requerem autenticação
  const funcionesRestritasOS = ['consultar os', 'buscar serviço', 'os número', 'ordem de serviço'];
  const funcionesRestritasPolicial = ['entrada', 'saída', 'oficina'];
  
  const inputLower = input.toLowerCase();
  
  if (funcionesRestritasOS.some(func => inputLower.includes(func))) {
    return false; // Requer autenticação GESTÃO E LOGÍSTICA
  }
  
  if (funcionesRestritasPolicial.some(func => inputLower.includes(func))) {
    return false; // Requer autenticação Portal do Policial
  }
  
  return true; // Função liberada
}

export async function responder(inputText: string): Promise<BotResponse> {
  console.log('Entrada do usuário:', inputText);
  
  // Verificar se a função requer autenticação
  if (!verificarAutenticacao(inputText)) {
    const inputLower = inputText.toLowerCase();
    
    if (['consultar os', 'buscar serviço'].some(func => inputLower.includes(func))) {
      return {
        type: 'text',
        text: '🔐 **Acesso Restrito**\n\nEsta funcionalidade requer autenticação.\n\nPor favor, informe:\n• Matrícula\n• Senha\n\nUsuário deve ter acesso ao **GESTÃO E LOGÍSTICA**'
      };
    }
    
    if (['entrada', 'saída', 'oficina'].some(func => inputLower.includes(func))) {
      return {
        type: 'text',
        text: '🔐 **Autenticação Necessária**\n\nPara acessar as funcionalidades de oficina, informe:\n• Matrícula\n• Senha\n\nAcesso através do **Portal do Policial** (todos os policiais têm acesso)'
      };
    }
  }

  // Tentar match com CAV primeiro
  let match = inputText.match(viaturaRegex);
  let cadastro = '';
  
  if (match) {
    const numero = match[1].padStart(2, '0');
    cadastro = `CAV - ${numero}`;
  } else {
    // Tentar match com outros tipos de cadastro
    match = inputText.match(cadastroRegex);
    if (match) {
      cadastro = match[1].replace(/[_\-\s]/g, '_').toUpperCase();
      // Corrigir formato específico para o caso problemático
      if (cadastro.includes('OII_6398_DESCARACTERIZADA')) {
        cadastro = 'OII_6398_Descaracterizada';
      }
    }
  }
  
  if (!cadastro) {
    return { 
      type: 'text', 
      text: 'Por favor, informe o identificador da viatura (ex: CAV-13, OII_6398_Descaracterizada).' 
    };
  }

  console.log('Cadastro processado:', cadastro);

  const viaturas = await getViaturasFromFirestore();
  console.log('Total de viaturas encontradas:', viaturas.length);

  const viaturaEncontrada = viaturas.find(v => {
    const viaturaCadastro = String(v.CADASTRO || '').trim();
    console.log('Comparando:', viaturaCadastro, 'com', cadastro);
    
    // Múltiplas comparações para aumentar chance de match
    return viaturaCadastro.toLowerCase() === cadastro.toLowerCase() ||
           viaturaCadastro.replace(/[\s\-_]/g, '').toLowerCase() === cadastro.replace(/[\s\-_]/g, '').toLowerCase() ||
           viaturaCadastro === cadastro;
  });

  if (!viaturaEncontrada) {
    console.log('Viatura não encontrada. Cadastros disponíveis:', viaturas.map(v => v.CADASTRO));
    return { 
      type: 'text', 
      text: `Não encontrei a viatura ${cadastro} na base de dados.\n\nVerifique se o cadastro está correto.` 
    };
  }

  console.log('Viatura encontrada:', viaturaEncontrada);

  if (hasKeyword(inputText, keywords)) {
    return { type: 'show_viatura_modal', viatura: viaturaEncontrada };
  } else {
    return {
      type: 'text',
      text: `Encontrei a viatura ${cadastro}. Se quiser ver os dados completos, diga "mostrar dados da ${cadastro}".`
    };
  }
}
