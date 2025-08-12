import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { BotResponse, Viatura } from './types';

export async function responderConsultaViatura(input: string): Promise<BotResponse> {
  // Suporta "CAV-13" e similares, e também cadastros como "OII_6398_Descaracterizada"
  const cavRegex = /cav(?:alaria)?[\s\-]?(\d{1,3})/i;
  const cadastroRegex = /\b([A-Z]{2,4}[_\-\s]?\d{2,4}[_\-\s]?[A-Za-z]*)\b/i;

  let cadastro = '';
  const cavMatch = input.match(cavRegex);
  if (cavMatch) {
    const numero = cavMatch[1].padStart(2, '0');
    cadastro = `CAV - ${numero}`; // Normalizado como utilizado na base
  } else {
    const cadMatch = input.match(cadastroRegex);
    if (cadMatch) {
      cadastro = cadMatch[1].replace(/[_\-\s]/g, '_').toUpperCase();
      if (cadastro.includes('OII_6398_DESCARACTERIZADA')) {
        cadastro = 'OII_6398_Descaracterizada';
      }
    }
  }

  if (!cadastro) {
    return { type: 'text', text: 'Por favor, informe o identificador da viatura (ex: CAV-13, OII_6398_Descaracterizada).' };
  }

  const querySnapshot = await getDocs(collection(db, 'frota'));
  const viaturas: Viatura[] = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Viatura, 'id'>)
  }));

  const normalize = (v: string) => String(v || '').replace(/[\s_\-]/g, '').toLowerCase();

  const viatura = viaturas.find(v => normalize((v as any).CADASTRO) === normalize(cadastro));

  if (!viatura) {
    return { type: 'text', text: `Não encontrei a viatura ${cadastro} na frota.` };
  }

  return { type: 'show_viatura_modal', viatura };
}
