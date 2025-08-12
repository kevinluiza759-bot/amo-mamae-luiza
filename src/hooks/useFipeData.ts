
import { useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { ViaturaFipe, SaldoAnual, OrdemServicoAnual } from '@/types/fipe';
import { Viatura } from '@/bot/types';

export const useFipeData = (viatura: Viatura | null) => {
  const [viaturaFipe, setViaturaFipe] = useState<ViaturaFipe | null>(null);
  const [saldoAnual, setSaldoAnual] = useState<SaldoAnual | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (viatura) {
      fetchViaturaFipe();
    }
  }, [viatura]);

  useEffect(() => {
    if (viaturaFipe) {
      calcularSaldoAnual();
    }
  }, [viaturaFipe]);

  const fetchViaturaFipe = async () => {
    if (!viatura) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'viaturasFipe'),
        where('viaturaId', '==', viatura.id),
        where('ativo', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = { id: doc.id, ...doc.data() } as ViaturaFipe;
        data.dataAtualizacao = data.dataAtualizacao instanceof Date ? data.dataAtualizacao : new Date(data.dataAtualizacao);
        setViaturaFipe(data);
      } else {
        setViaturaFipe(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados FIPE:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarValorFipe = async (valorFipe: number) => {
    if (!viatura) return false;

    setSaving(true);
    try {
      const agora = new Date();
      
      if (viaturaFipe?.id) {
        // Atualizar existente
        const docRef = doc(db, 'viaturasFipe', viaturaFipe.id);
        const historico = viaturaFipe.historico || [];
        historico.push({
          valorAnterior: viaturaFipe.valorFipe,
          valorNovo: valorFipe,
          dataAlteracao: agora
        });

        await updateDoc(docRef, {
          valorFipe,
          dataAtualizacao: agora,
          historico
        });

        setViaturaFipe(prev => prev ? {
          ...prev,
          valorFipe,
          dataAtualizacao: agora,
          historico
        } : null);
      } else {
        // Criar novo
        const novoFipe: Omit<ViaturaFipe, 'id'> = {
          viaturaId: viatura.id,
          cadastro: viatura.CADASTRO || '',
          placa: viatura.PLACA,
          valorFipe,
          dataAtualizacao: agora,
          ativo: true,
          historico: []
        };

        const docRef = doc(collection(db, 'viaturasFipe'));
        await setDoc(docRef, novoFipe);

        setViaturaFipe({
          id: docRef.id,
          ...novoFipe
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar valor FIPE:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const calcularSaldoAnual = async () => {
    if (!viaturaFipe || !viatura) return;

    try {
      // Calcular período dos últimos 12 meses
      const agora = new Date();
      const dozeMesesAtras = new Date();
      dozeMesesAtras.setMonth(agora.getMonth() - 12);

      // Buscar todas as OS da viatura nos últimos 12 meses
      const q = query(
        collection(db, 'ordensDeServico'),
        where('placaViatura', '==', viatura.PLACA)
      );
      const querySnapshot = await getDocs(q);
      
      const ordensUltimos12Meses = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as OrdemServicoAnual)
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS >= dozeMesesAtras && dataOS <= agora;
        });

      // Calcular gasto total
      const gastoUltimos12Meses = ordensUltimos12Meses.reduce((total, os) => {
        const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
        return total + valor;
      }, 0);

      // Calcular limites e saldo
      const valorFipeReais = viaturaFipe.valorFipe / 100;
      const limiteAnual = valorFipeReais * 0.70;
      const limitePorOS = valorFipeReais * 0.20;
      const saldoDisponivel = Math.max(0, limiteAnual - gastoUltimos12Meses);
      const percentualUsado = limiteAnual > 0 ? (gastoUltimos12Meses / limiteAnual) * 100 : 0;

      setSaldoAnual({
        valorFipe: valorFipeReais,
        limiteAnual,
        limitePorOS,
        gastoUltimos12Meses,
        saldoDisponivel,
        percentualUsado
      });

      console.log('Saldo anual calculado:', {
        valorFipe: valorFipeReais,
        limiteAnual,
        limitePorOS,
        gastoUltimos12Meses,
        saldoDisponivel,
        percentualUsado,
        ordensCount: ordensUltimos12Meses.length
      });

    } catch (error) {
      console.error('Erro ao calcular saldo anual:', error);
    }
  };

  return {
    viaturaFipe,
    saldoAnual,
    loading,
    saving,
    salvarValorFipe,
    refetchFipe: fetchViaturaFipe
  };
};
