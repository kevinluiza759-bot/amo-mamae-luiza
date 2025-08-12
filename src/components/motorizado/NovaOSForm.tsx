import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, FieldValue, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { buscarTodasViaturas, buscarViaturasLeves, buscarViaturasPesadas, isFroteLeve, isFrotePesada } from '@/lib/viaturaUtils';

interface Viatura {
  id: string;
  CADASTRO: string;
  MODELO: string;
  tipo?: 'leve' | 'pesada';
  [key: string]: any;
}

interface Oficina {
  id: string;
  nome: string;
  nomeFantasia: string;
}

interface Policial {
  id: string;
  AGÊNCIA?: number;
  BANCO?: string;
  Bairro?: string;
  CONTA?: string;
  CPF?: string;
  'DATA ATUAL'?: number;
  'E-MAIL'?: string;
  Endereço?: string;
  FUNÇÃO?: string;
  IDADE?: number;
  Matrícula?: string;
  'MÊS ANIVERSARIO'?: number;
  NASCIMENTO?: number;
  NOME: string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  ORD?: number;
  'PREVISAO FÉRIAS - AQUISITIVO 2024'?: string;
  'Post/Grad': string;
  'SITUAÇÃO': string;
  'ULTIMA PROMOÇÃO'?: number;
  UNIDADE?: string;
  __EMPTY?: number;
  'e-mail institucional'?: string;
  telefone?: number;
  [key: string]: any;
}

interface OrdemServico {
  cadastroViatura: string;
  modeloViatura: string;
  dataOS: string;
  defeitoRelatado: string;
  oficinaResponsavel: string;
  numeroOficina: string;
  numeroOS: string;
  valorOS: string;
  cotaMensal: string;
  saldoDisponivel: string;
  tipoFrota: string;
  placaViatura?: string;
  assinatura?: {
    policial: {
      NOME: string;
      'Post/Grad': string;
      CPF?: string;
      Matrícula?: string;
      'NOME DE GUERRA1'?: string;
      AGÊNCIA?: number;
      BANCO?: string;
      CONTA?: string;
    };
    funcao: string;
  };
  dataCriacao?: Timestamp | FieldValue;
  // NOVO CAMPO
  arquivo?: string;
}

interface NovaOSFormProps {
  onBack: () => void;
  prefilledData?: {
    cadastro?: string;
    servico?: string;
  };
}

interface ViaturaPendente {
  id: string;
  cadastro: string;
  servicoRealizar: string;
  dataEntrada: string;
  oficinaId: string;
}

const NovaOSForm = ({ onBack, prefilledData }: NovaOSFormProps) => {
  const [formData, setFormData] = useState({
  cadastro: '',
  modelo: '',
  dataOS: '',
  defeito: '',
  oficina: '',
  numeroOficina: '',
  numeroOS: '',
  valorOS: '',
  cotaMensal: '',
  saldoDisponivel: '',
  tipoFrota: 'leve',
  placa: '',
  // NOVO CAMPO
  arquivo: ''
});;

  const [sugestoes, setSugestoes] = useState<Viatura[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const [oficinas, setOficinas] = useState<Oficina[]>([]);

  const [buscaOficina, setBuscaOficina] = useState('');
  const [sugestoesOficina, setSugestoesOficina] = useState<Oficina[]>([]);
  const [oficinaSelecionada, setOficinaSelecionada] = useState<string>('');

  const [modalCadastrarAberto, setModalCadastrarAberto] = useState(false);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [novaOficina, setNovaOficina] = useState({ nome: '', nomeFantasia: '' });

  const [modalAssinarAberto, setModalAssinarAberto] = useState(false);
  const [policiaisOficiais, setPoliciaisOficiais] = useState<Policial[]>([]);
  const [assinaturaSelecionada, setAssinaturaSelecionada] = useState<{ policial: Policial | null; funcao: string | null }>({
    policial: null,
    funcao: null,
  });

  const [viaturasPendentes, setViaturasPendentes] = useState<ViaturaPendente[]>([]);
  const [viaturasSelecionadas, setViaturasSelecionadas] = useState<string[]>([]);
  
  const [valoresOriginais, setValoresOriginais] = useState({
    cotaMensal: 0,
    saldoOriginal: 0
  });

  const [isUpdatingSaldos, setIsUpdatingSaldos] = useState(false);

  const funcoesAssinatura = [
    'Comandante do RPMON',
    'Subcomandante do RPMONT',
    'Respondendo pelo Comando do RPMONT',
    'Chefe do P1',
    'Chefe do P3',
    'Chefe do P4',
    'Chefe do P6',
    'Comandante do 1ºEsq/RPMONT',
    'Comandante do 2ºEsq/RPMONT',
    'Comandante do 3ªPel/2ªEsq/RPMONT',
  ];

  const handleAtualizarSaldos = async () => {
    setIsUpdatingSaldos(true);

    try {
      console.log('=== INICIANDO ATUALIZAÇÃO AUTOMÁTICA DE SALDOS ===');
      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      // Buscar todas as viaturas
      const todasViaturas = await buscarTodasViaturas();
      console.log('Total de viaturas encontradas:', todasViaturas.length);

      // Buscar todas as OS do mês atual
      const osSnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const ordensMesAtual = osSnapshot.docs
        .map(doc => ({
          id: doc.id,
          placa: doc.data().placaViatura,
          cadastro: doc.data().cadastroViatura,
          valorTotal: parseFloat(doc.data().valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100,
          dataOS: doc.data().dataOS
        }))
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() + 1 === mesAtual && dataOS.getFullYear() === anoAtual;
        });

      console.log('OS do mês atual encontradas:', ordensMesAtual.length);

      // Separar viaturas por tipo usando funções dinâmicas
      const viaturasPesadas = await buscarViaturasPesadas();
      const viaturasLeves = await buscarViaturasLeves();

      console.log('Viaturas pesadas:', viaturasPesadas.map(v => ({ cadastro: v.CADASTRO, placa: v.PLACA })));
      console.log('Viaturas leves:', viaturasLeves.map(v => ({ cadastro: v.CADASTRO, placa: v.PLACA })));

      // Calcular saldo usado da frota leve (soma de todas as OS das viaturas leves no mês)
      const placasLeves = viaturasLeves.map(v => v.PLACA);
      const cadastrosLeves = viaturasLeves.map(v => v.CADASTRO);
      
      const saldoUsadoFroteLeve = ordensMesAtual
        .filter(os => {
          const isPlacarLeve = placasLeves.includes(os.placa);
          const isCadastroLeve = cadastrosLeves.includes(os.cadastro);
          const isLeve = isPlacarLeve || isCadastroLeve;
          
          if (isLeve) {
            console.log('OS da frota leve encontrada:', {
              placa: os.placa,
              cadastro: os.cadastro,
              valor: os.valorTotal
            });
          }
          
          return isLeve;
        })
        .reduce((total, os) => total + (os.valorTotal || 0), 0);

      console.log('Saldo usado frota leve total:', saldoUsadoFroteLeve);

      // Buscar cota da frota leve
      const saldosViaturasSnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldoOficinaSnapshot = await getDocs(collection(db, 'saldoOficina'));

      const docFroteLeve = saldosViaturasSnapshot.docs.find(doc => doc.data().tipo === 'frota_leve');
      const cotaFroteLeve = docFroteLeve?.data()?.saldoMensal || 0;

      console.log('Cota mensal frota leve:', cotaFroteLeve);

      const mesReferenciaAtual = `${mesAtual.toString().padStart(2, '0')}/${anoAtual}`;

      // Criar/atualizar registros na coleção saldoOficina
      for (const viatura of todasViaturas) {
        let saldoUsado = 0;
        let saldoDisponivel = 0;
        let tipoSaldo = 'individual';

        if (isFrotePesada(viatura)) {
          // Para frota pesada, calcular gasto individual
          const placasPesadas = viaturasPesadas.map(v => v.PLACA);
          const cadastrosPesados = viaturasPesadas.map(v => v.CADASTRO);
          
          saldoUsado = ordensMesAtual
            .filter(os => {
              const isPlacarPesada = placasPesadas.includes(os.placa);
              const isCadastroPesada = cadastrosPesados.includes(os.cadastro);
              // Buscar por placa exata, cadastro, ou se a placa for "N/D" buscar por cadastro
              const isMatch = isPlacarPesada || isCadastroPesada || 
                             (os.placa === 'N/D' && os.cadastro === viatura.CADASTRO) ||
                             (os.placa === viatura.PLACA);
              
              if (isMatch) {
                console.log('OS da frota pesada encontrada:', {
                  viaturaCadastro: viatura.CADASTRO,
                  viaturaPlaca: viatura.PLACA,
                  osPlaca: os.placa,
                  osCadastro: os.cadastro,
                  valor: os.valorTotal
                });
              }
              
              return isMatch;
            })
            .reduce((total, os) => total + (os.valorTotal || 0), 0);
          
          saldoDisponivel = 999999; // Valor simbólico para saldo livre
          tipoSaldo = 'livre';
        } else if (isFroteLeve(viatura)) {
          // Para frota leve, usar o saldo coletivo
          saldoUsado = saldoUsadoFroteLeve;
          saldoDisponivel = cotaFroteLeve - saldoUsadoFroteLeve;
          tipoSaldo = 'compartilhado';
        } else {
          // Viatura sem categoria
          saldoUsado = ordensMesAtual
            .filter(os => os.placa === viatura.PLACA || os.cadastro === viatura.CADASTRO)
            .reduce((total, os) => total + (os.valorTotal || 0), 0);
          saldoDisponivel = 0;
          tipoSaldo = 'indefinido';
        }

        // Verificar se já existe um registro para esta placa no mês atual
        const registroExistente = saldoOficinaSnapshot.docs.find(doc => {
          const data = doc.data();
          return (data.placa === viatura.PLACA || data.cadastro === viatura.CADASTRO) && 
                 data.mesReferencia === mesReferenciaAtual;
        });

        const dadosAtualizacao = {
          placa: viatura.PLACA,
          cadastro: viatura.CADASTRO || '',
          modelo: viatura.MODELO,
          tipo: viatura.tipo || 'indefinido',
          tipoSaldo: tipoSaldo,
          saldoUsado: saldoUsado,
          saldoDisponivel: saldoDisponivel,
          mesReferencia: mesReferenciaAtual,
          dataAtualizacao: new Date().toISOString(),
        };

        if (registroExistente) {
          // Atualizar registro existente
          await updateDoc(doc(db, 'saldoOficina', registroExistente.id), dadosAtualizacao);
        } else {
          // Criar novo registro
          await addDoc(collection(db, 'saldoOficina'), dadosAtualizacao);
        }
      }

      console.log('=== SALDOS ATUALIZADOS COM SUCESSO ===');

    } catch (error) {
      console.error('Erro ao atualizar saldos:', error);
    } finally {
      setIsUpdatingSaldos(false);
    }
  };

  useEffect(() => {
    const fetchOficinas = async () => {
      const snapshot = await getDocs(collection(db, 'oficinas'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Oficina)
      }));
      setOficinas(lista);
    };
    
    const fetchViaturasPendentes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'oficina'));
        const pendentes = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.status === 'os-pendente')
          .map(item => ({
            id: item.id,
            cadastro: item.cadastro,
            servicoRealizar: item.servicoRealizar || item.observacaoServico || '',
            dataEntrada: item.dataEntrada,
            oficinaId: item.oficinaId
          }));
        setViaturasPendentes(pendentes);
      } catch (error) {
        console.error('Erro ao buscar viaturas pendentes:', error);
      }
    };

    const initializeForm = async () => {
      await fetchOficinas();
      await fetchViaturasPendentes();
      
      // Atualizar saldos automaticamente quando abrir Nova OS
      await handleAtualizarSaldos();
      
      // Se houver dados preenchidos, buscar saldo específico
      if (prefilledData?.cadastro) {
        setFormData(prev => ({
          ...prev,
          cadastro: prefilledData.cadastro,
          defeito: prefilledData.servico || ''
        }));
        await buscarSaldoECota(prefilledData.cadastro, formData.dataOS);
      }
    };
    
    initializeForm();
  }, [prefilledData]);

  useEffect(() => {
    const fetchPoliciaisOficiais = async () => {
      const snapshot = await getDocs(collection(db, 'policiais'));
      let oficiais = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Policial))
        .filter(policial => {
          const situacaoNormalizada = policial['SITUAÇÃO']
            ? String(policial['SITUAÇÃO']).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim().toUpperCase()
            : '';
          return situacaoNormalizada === 'OFICIAL';
        });

      oficiais.sort((a, b) => {
        const patenteA = a['Post/Grad'] ? String(a['Post/Grad']).toUpperCase() : '';
        const patenteB = b['Post/Grad'] ? String(b['Post/Grad']).toUpperCase() : '';

        if (patenteA === 'TENCEL' && patenteB !== 'TENCEL') return -1;
        if (patenteA !== 'TENCEL' && patenteB === 'TENCEL') return 1;

        if (patenteA === 'CAP' && patenteB !== 'CAP') return -1;
        if (patenteA !== 'CAP' && patenteB === 'CAP') return 1;

        const nomeA = a.NOME ? String(a.NOME).toUpperCase() : '';
        const nomeB = b.NOME ? String(b.NOME).toUpperCase() : '';
        return nomeA.localeCompare(nomeB);
      });

      setPoliciaisOficiais(oficiais);
    };
    fetchPoliciaisOficiais();
  }, []);

  useEffect(() => {
    const buscarViaturas = async () => {
      if (formData.cadastro.trim().length < 2) {
        setSugestoes([]);
        return;
      }
      const snapshot = await getDocs(collection(db, 'frota'));
      const resultados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((viatura: any) =>
          typeof viatura.CADASTRO === 'string' &&
          viatura.CADASTRO.toLowerCase().includes(formData.cadastro.toLowerCase())
        );
      setSugestoes(resultados as Viatura[]);
      setShowSugestoes(true);
    };
    buscarViaturas();
  }, [formData.cadastro]);

  useEffect(() => {
    if (buscaOficina.trim().length < 1) {
      setSugestoesOficina([]);
      return;
    }
    const filtro = buscaOficina.toLowerCase();
    const filtradas = oficinas.filter(o =>
      o.nome.toLowerCase().includes(filtro) ||
      o.nomeFantasia.toLowerCase().includes(filtro)
    );
    setSugestoesOficina(filtradas);
  }, [buscaOficina, oficinas]);

  useEffect(() => {
    if (formData.cadastro && formData.dataOS) {
      buscarSaldoECota(formData.cadastro, formData.dataOS);
    }
  }, [formData.dataOS, formData.cadastro]);

  const handleSelectCadastro = async (viatura: Viatura) => {
    const tipoFrota = viatura.tipo === 'pesada' ? 'pesada' : 'leve';
    const placaEncontrada = (viatura as any).PLACA || (viatura as any).placa || 'N/D'; 
    
    setFormData(prev => ({
      ...prev,
      cadastro: viatura.CADASTRO,
      modelo: viatura.MODELO,
      tipoFrota: tipoFrota,
      placa: placaEncontrada
    }));
    setSugestoes([]);
    setShowSugestoes(false);

    await buscarSaldoECota(viatura.CADASTRO, formData.dataOS);
  };

  const buscarSaldoECota = async (cadastro: string, dataOS?: string) => {
    try {
      console.log('Buscando saldo para cadastro:', cadastro, 'Data OS:', dataOS);
      
      const frotaSnapshot = await getDocs(collection(db, 'frota'));
      const viatura = frotaSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find((v: any) => v.CADASTRO === cadastro || v.cadastro === cadastro);
      
      if (!viatura) {
        console.log('Viatura não encontrada na coleção frota');
        return;
      }

      console.log('Viatura encontrada:', viatura);
      const placaViatura = (viatura as any).PLACA || (viatura as any).placa;
      const tipoViatura = (viatura as any).tipo || 'leve';

      const dataReferencia = dataOS ? new Date(dataOS) : new Date();
      const mesReferencia = `${(dataReferencia.getMonth() + 1).toString().padStart(2, '0')}/${dataReferencia.getFullYear()}`;

      const saldoOficinaSnapshot = await getDocs(collection(db, 'saldoOficina'));
      const saldoOficina = saldoOficinaSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find((item: any) => 
          (item.placa === placaViatura || item.cadastro === cadastro) && 
          item.mesReferencia === mesReferencia
        );

      if (saldoOficina) {
        console.log('Saldo encontrado na saldoOficina:', saldoOficina);
        
        const saldosViaturasSnapshot = await getDocs(collection(db, 'saldosViaturas'));
        
        let cotaMensal = 0;
        if (tipoViatura === 'pesada') {
          const saldoFrotaPesada = saldosViaturasSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find((item: any) => item.tipo === 'frota_pesada');
          cotaMensal = (saldoFrotaPesada as any)?.saldoMensal || 0;
        } else {
          // Para frota leve, buscar saldo compartilhado
          const saldoFrotaLeve = saldosViaturasSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find((item: any) => item.tipo === 'frota_leve');
          cotaMensal = (saldoFrotaLeve as any)?.saldoMensal || 0;
        }

        setValoresOriginais({
          cotaMensal: cotaMensal,
          saldoOriginal: (saldoOficina as any).saldoDisponivel || 0
        });

        setFormData(prev => ({
          ...prev,
          cotaMensal: cotaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          saldoDisponivel: ((saldoOficina as any).saldoDisponivel || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          tipoFrota: tipoViatura
        }));

        console.log('Valores atualizados no formulário:', {
          cotaMensal: cotaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          saldoDisponivel: ((saldoOficina as any).saldoDisponivel || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          tipoFrota: tipoViatura
        });

      } else {
        console.log('Saldo não encontrado na saldoOficina para:', { placa: placaViatura, cadastro, mesReferencia });
        
        const saldosViaturasSnapshot = await getDocs(collection(db, 'saldosViaturas'));
        
        let saldoViatura;
        if (tipoViatura === 'pesada') {
          saldoViatura = saldosViaturasSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find((item: any) => item.tipo === 'frota_pesada');
        } else {
          // Para frota leve, buscar saldo compartilhado
          saldoViatura = saldosViaturasSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find((item: any) => item.tipo === 'frota_leve');
        }

        if (saldoViatura) {
          const cotaMensal = (saldoViatura as any).saldoMensal || 0;
          
          setValoresOriginais({
            cotaMensal: cotaMensal,
            saldoOriginal: cotaMensal
          });

          setFormData(prev => ({
            ...prev,
            cotaMensal: cotaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            saldoDisponivel: cotaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            tipoFrota: tipoViatura
          }));
        }
      }

    } catch (error) {
      console.error('Erro ao buscar saldo e cota:', error);
    }
  };

  const handleSelectOficina = (oficina: Oficina) => {
    setOficinaSelecionada(oficina.nomeFantasia || oficina.nome);
    setFormData(prev => ({ ...prev, oficina: oficina.nomeFantasia || oficina.nome }));
    setBuscaOficina('');
    setSugestoesOficina([]);
  };

  const formatarParaReal = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    const numeroFloat = parseFloat(numeros) / 100;
    if (isNaN(numeroFloat)) return '';
    return numeroFloat.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'cotaMensal' || name === 'saldoDisponivel') {
      return;
    }

    if (name === 'valorOS') {
      const valorFormatado = formatarParaReal(value);
      setFormData(prev => ({ ...prev, [name]: valorFormatado }));
      
      const valorNumerico = parseFloat(value.replace(/\D/g, '')) / 100 || 0;
      const novoSaldo = valoresOriginais.saldoOriginal - valorNumerico;
      
      setFormData(prev => ({
        ...prev,
        [name]: valorFormatado,
        saldoDisponivel: novoSaldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleChangeBuscaOficina = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuscaOficina(e.target.value);
  };

  const salvarNovaOficina = async () => {
    if (!novaOficina.nome.trim()) {
      alert('O nome da oficina é obrigatório');
      return;
    }
    try {
      await addDoc(collection(db, 'oficinas'), novaOficina);
      alert('Oficina cadastrada com sucesso!');
      setNovaOficina({ nome: '', nomeFantasia: '' });
      setModalCadastrarAberto(false);
      const snapshot = await getDocs(collection(db, 'oficinas'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Oficina),
      }));
      setOficinas(lista);
    } catch (error) {
      alert('Erro ao cadastrar oficina');
      console.error(error);
    }
  };

  const handleSelectSignatory = (policial: Policial) => {
    setAssinaturaSelecionada(prev => ({ ...prev, policial }));
  };

  const handleSelectFuncao = (funcao: string) => {
    setAssinaturaSelecionada(prev => ({ ...prev, funcao }));
  };

  const handleConfirmSignature = () => {
    if (!assinaturaSelecionada.policial || !assinaturaSelecionada.funcao) {
      alert('Por favor, selecione um policial e uma função para a assinatura.');
      return;
    }
    console.log('Assinatura confirmada. Dados completos para o documento:', assinaturaSelecionada);
    setModalAssinarAberto(false);
    alert('Assinatura selecionada com sucesso e pronta para uso no documento!');
  };

  const handleSubmit = async () => {
  if (!formData.numeroOS.trim()) {
    alert('Por favor, informe o número da Ordem de Serviço (OS).');
    return;
  }

  try {
    const numeroOS = formData.numeroOS;
    const osRef = collection(db, 'ordensDeServico');
    const q = query(osRef, where('numeroOS', '==', numeroOS));
    const querySnapshot = await getDocs(q);

    let osDataParaEnvio: OrdemServico;
    let osJaExistiaNoBD = false;

    if (!querySnapshot.empty) {
      const osDoc = querySnapshot.docs[0];
      osDataParaEnvio = osDoc.data() as OrdemServico;
      osJaExistiaNoBD = true;
      alert(`Atenção: A Ordem de Serviço número ${numeroOS} já existe no banco de dados! O documento será gerado com os dados existentes.`);
      console.log('OS existente encontrada:', osDataParaEnvio);
    } else {
      // Formate a placa para o campo 'arquivo'. Use 'N/D' se não houver placa.
      // Certifique-se de que formData.placa exista e não seja null/undefined
      const placaFormatada = (formData.placa && formData.placa !== 'N/D') ? formData.placa.replace(/\s/g, '').toUpperCase() : 'ND';

      // Gerar o valor do campo 'arquivo' usando formData.numeroOficina
      const arquivoGerado = `${formData.numeroOficina} - COLOG - ${placaFormatada} - OS ${formData.numeroOS}`;

      osDataParaEnvio = {
        cadastroViatura: formData.cadastro,
        modeloViatura: formData.modelo,
        dataOS: formData.dataOS,
        defeitoRelatado: formData.defeito,
        oficinaResponsavel: formData.oficina,
        numeroOficina: formData.numeroOficina,
        numeroOS: formData.numeroOS,
        valorOS: formData.valorOS,
        cotaMensal: formData.cotaMensal,
        saldoDisponivel: formData.saldoDisponivel,
        tipoFrota: formData.tipoFrota,
        placaViatura: formData.placa,
        // NOVO CAMPO ADICIONADO AQUI
        arquivo: arquivoGerado,
      };

      if (assinaturaSelecionada.policial && assinaturaSelecionada.funcao) {
        osDataParaEnvio.assinatura = {
          policial: {
            NOME: assinaturaSelecionada.policial.NOME,
            'Post/Grad': assinaturaSelecionada.policial['Post/Grad'] || '',
            CPF: assinaturaSelecionada.policial.CPF,
            Matrícula: assinaturaSelecionada.policial.Matrícula,
            'NOME DE GUERRA1': assinaturaSelecionada.policial['NOME DE GUERRA1'],
            AGÊNCIA: assinaturaSelecionada.policial.AGÊNCIA,
            BANCO: assinaturaSelecionada.policial.BANCO,
            CONTA: assinaturaSelecionada.policial.CONTA,
          },
          funcao: assinaturaSelecionada.funcao,
        };
      }

      const dadosParaSalvarNoFirestore = {
        ...osDataParaEnvio,
        dataCriacao: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'ordensDeServico'), dadosParaSalvarNoFirestore);
      console.log('Nova Ordem de Serviço salva com ID:', docRef.id);
      alert('Ordem de Serviço cadastrada com sucesso no Firebase!');
      
        if (viaturasSelecionadas.length > 0) {
          for (const viatura of viaturasSelecionadas) {
            const viaturaPendente = viaturasPendentes.find(v => v.cadastro === viatura);
            if (viaturaPendente) {
              const oficinaDocRef = doc(db, 'oficina', viaturaPendente.id);
              await updateDoc(oficinaDocRef, {
                status: 'completo',
                numeroOS: formData.numeroOS,
                dataOS: formData.dataOS
              });
            }
          }
          alert(`Status atualizado para ${viaturasSelecionadas.length} viatura(s) selecionada(s)!`);
        }
      }

      const functionsUrl = `https://gerarordemservicodocx-owvlmrnsjq-uc.a.run.app`;

      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(osDataParaEnvio),
      });

     if (response.ok) {
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  let filename = `${formData.numeroOficina} - COLOG - ${formData.placa} - OS ${formData.numeroOS}`

  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename="?(.+)"?/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1];
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${osDataParaEnvio.numeroOficina || '000'} - COLOG -${osDataParaEnvio.cadastroViatura || 'SEM-PLACA'} - OS ${osDataParaEnvio.numeroOS || 'sem-numero'}`;  // usar o nome do backend aqui
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  alert('Documento DOCX gerado e download iniciado!');
} else {
  const errorText = await response.text();
  alert(`Erro ao gerar o documento DOCX. Detalhes: ${errorText}`);
  console.error('Erro na geração do DOCX pela Cloud Function:', errorText);
}

    } catch (error) {
      console.error('Erro geral no processo:', error);
      alert('Ocorreu um erro ao processar a Ordem de Serviço ou gerar o documento. Verifique o console.');
    }
  };

  return (
    <div className="space-y-6 relative p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-foreground">Nova Ordem de Serviço</h2>
        <Button variant="secondary" onClick={onBack}>Voltar</Button>
      </div>

      <Card className="bg-muted">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <div className="relative">
            <Input
              name="cadastro"
              placeholder="CADASTRO"
              value={formData.cadastro}
              onChange={handleChange}
              autoComplete="off"
            />
            {showSugestoes && sugestoes.length > 0 && (
              <ul className="absolute z-10 bg-black border border-border mt-1 rounded w-full max-h-48 overflow-y-auto shadow">
                {sugestoes.map(item => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectCadastro(item)}
                  >
                    {item.CADASTRO} — {item.MODELO}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Input
            name="modelo"
            placeholder="MODELO"
            value={formData.modelo}
            onChange={handleChange}
            disabled
          />

          <Input
            name="dataOS"
            type="date"
            placeholder="DATA DA OS"
            value={formData.dataOS}
            onChange={handleChange}
          />

          <div className="relative md:col-span-2">
            <Input
              name="buscarOficina"
              placeholder="Buscar Oficina"
              value={buscaOficina}
              onChange={handleChangeBuscaOficina}
              autoComplete="off"
            />

            {sugestoesOficina.length > 0 && (
              <ul className="absolute z-10 bg-[#141414] text-white border border-gray-700 mt-1 rounded w-full max-h-48 overflow-y-auto shadow">
                {sugestoesOficina.map((oficina) => (
                  <li
                    key={oficina.id}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-800"
                    onClick={() => handleSelectOficina(oficina)}
                  >
                    {oficina.nome} {oficina.nomeFantasia ? `— ${oficina.nomeFantasia}` : ''}
                  </li>
                ))}
              </ul>
            )}

            {oficinaSelecionada && (
              <p className="mt-1 text-sm text-gray-300">
                Oficina selecionada: <span className="font-semibold">{oficinaSelecionada}</span>
              </p>
            )}
          </div>

          <Input
            name="numeroOficina"
            placeholder="Nº (OF.)"
            value={formData.numeroOficina}
            onChange={handleChange}
          />

          <Input
            name="numeroOS"
            placeholder="Nº (O.S)"
            value={formData.numeroOS}
            onChange={handleChange}
          />

          <Input
            name="valorOS"
            placeholder="VALOR DA OS (R$)"
            value={formData.valorOS}
            onChange={handleChange}
          />

          <Textarea
            name="defeito"
            placeholder="DEFEITO RELATADO"
            value={formData.defeito}
            onChange={handleChange}
            className="md:col-span-2"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">COTA MENSAL</label>
            <div className="p-3 bg-muted border rounded-md">
              <span className="font-semibold text-lg">{formData.cotaMensal || 'R$ 0,00'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SALDO DISPONÍVEL</label>
            <div className={`p-3 border rounded-md ${parseFloat(formData.saldoDisponivel?.replace(/[^\d,-]/g, '').replace(',', '.')) < 0 ? 'bg-red-100 border-red-300' : 'bg-muted'}`}>
              <span className={`font-semibold text-lg ${parseFloat(formData.saldoDisponivel?.replace(/[^\d,-]/g, '').replace(',', '.')) < 0 ? 'text-red-600' : ''}`}>
                {formData.saldoDisponivel || 'R$ 0,00'}
              </span>
              {parseFloat(formData.saldoDisponivel?.replace(/[^\d,-]/g, '').replace(',', '.')) < 0 && (
                <p className="text-xs text-red-600 mt-1">⚠️ Saldo insuficiente</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">TIPO DE FROTA</label>
            <div className="p-3 bg-muted border rounded-md">
              <span className="font-semibold text-lg capitalize">
                {formData.tipoFrota === 'pesada' ? 'Frota Pesada' : 'Frota Leve'}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Definido automaticamente pela viatura
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-1 md:col-span-2">
            <Button size="sm" onClick={() => setModalCadastrarAberto(true)}>Cadastrar Oficina</Button>
            <Button size="sm" variant="secondary" onClick={() => setModalVisualizarAberto(true)}>Visualizar Oficinas</Button>
          </div>
        </CardContent>
      </Card>

      {viaturasPendentes.length > 0 && (
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Viaturas com OS Pendente</h3>
            <div className="space-y-2">
              {viaturasPendentes.map((viatura) => (
                <div key={viatura.id} className="flex items-center space-x-3 p-3 bg-background rounded border">
                  <Checkbox
                    id={viatura.cadastro}
                    checked={viaturasSelecionadas.includes(viatura.cadastro)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setViaturasSelecionadas(prev => [...prev, viatura.cadastro]);
                      } else {
                        setViaturasSelecionadas(prev => prev.filter(v => v !== viatura.cadastro));
                      }
                    }}
                  />
                  <label htmlFor={viatura.cadastro} className="flex-1 cursor-pointer">
                    <div className="font-medium">{viatura.cadastro}</div>
                    <div className="text-sm text-muted-foreground">{viatura.servicoRealizar}</div>
                    <div className="text-xs text-muted-foreground">Data entrada: {new Date(viatura.dataEntrada).toLocaleDateString()}</div>
                  </label>
                </div>
              ))}
            </div>
            {viaturasSelecionadas.length > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded border">
                <p className="text-sm font-medium">
                  {viaturasSelecionadas.length} viatura(s) selecionada(s). O status será atualizado para "completo" após gerar a OS.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button onClick={handleSubmit}>Gerar OS e Documento</Button>
        <Button onClick={() => setModalAssinarAberto(true)} variant="outline">Assinar Documento</Button>
      </div>

      {modalCadastrarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-4">Cadastrar Nova Oficina</h3>

            <Input
              placeholder="Nome da Oficina"
              value={novaOficina.nome}
              onChange={e => setNovaOficina(prev => ({ ...prev, nome: e.target.value }))}
              className="mb-2"
            />

            <Input
              placeholder="Nome Fantasia (opcional)"
              value={novaOficina.nomeFantasia}
              onChange={e => setNovaOficina(prev => ({ ...prev, nomeFantasia: e.target.value }))}
              className="mb-4"
            />

            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setModalCadastrarAberto(false)}>Cancelar</Button>
              <Button onClick={salvarNovaOficina}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {modalVisualizarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-black rounded p-6 max-w-3xl w-full shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Oficinas Cadastradas</h3>

            <table className="w-full border-collapse border border-gray-300 text-left">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-black">Nome</th>
                  <th className="border border-gray-300 px-3 py-2 text-black">Nome Fantasia</th>
                </tr>
              </thead>
              <tbody>
                {oficinas.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">Nenhuma oficina cadastrada</td>
                  </tr>
                )}
                {oficinas.map(oficina => (
                  <tr key={oficina.id} className="even:bg-gray-700 text-white">
                    <td className="border border-gray-300 px-3 py-2">{oficina.nome}</td>
                    <td className="border border-gray-300 px-3 py-2">{oficina.nomeFantasia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <Button variant="secondary" onClick={() => setModalVisualizarAberto(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {modalAssinarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-black rounded p-6 w-full max-w-4xl shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-center">Selecionar Assinatura</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-3">Selecione o Oficial:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {policiaisOficiais.length === 0 ? (
                    <p className="text-gray-400">Nenhum oficial encontrado.</p>
                  ) : (
                    policiaisOficiais.map(policial => (
                      <Button
                        key={policial.id}
                        variant={assinaturaSelecionada.policial?.id === policial.id ? 'default' : 'outline'}
                        onClick={() => handleSelectSignatory(policial)}
                        className="w-full justify-start text-left"
                      >
                        {policial['NOME DE GUERRA1']} - {policial['Post/Grad']}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">Selecione a Função:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {funcoesAssinatura.map(funcao => (
                    <Button
                      key={funcao}
                      variant={assinaturaSelecionada.funcao === funcao ? 'default' : 'outline'}
                      onClick={() => handleSelectFuncao(funcao)}
                      className="w-full justify-start text-left"
                    >
                      {funcao}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {assinaturaSelecionada.policial && assinaturaSelecionada.funcao && (
              <div className="mt-6 p-4 border border-gray-700 rounded bg-gray-900 text-center">
                <p className="text-lg font-medium">Assinatura selecionada:</p>
                <p className="text-xl font-bold text-green-400">
                  {assinaturaSelecionada.policial['Post/Grad']} {assinaturaSelecionada.policial.NOME}
                </p>
                <p className="text-md text-gray-300">
                  {assinaturaSelecionada.funcao}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Todos os dados do oficial (CPF, matrícula, etc.) estão disponíveis para o documento.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => {
                setModalAssinarAberto(false);
                setAssinaturaSelecionada({ policial: null, funcao: null });
              }}>Cancelar</Button>
              <Button onClick={handleConfirmSignature}>Confirmar Assinatura</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovaOSForm;
