import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Car,
  Wrench,
  Calendar as CalendarIcon,
  DollarSign,
  Fuel,
  Battery,
  Circle,
  Edit,
  Save,
  X,
  Filter,
  Eye
} from 'lucide-react';

import { Viatura } from '@/bot/types';
import { isFroteLeve, isFrotePesada, getPlacasViaturasLeves } from '@/lib/viaturaUtils';
import { useFipeData } from '@/hooks/useFipeData';
import ConfiguracaoFipe from '@/components/ConfiguracaoFipe';
import SaldoAnualCard from '@/components/SaldoAnualCard';

interface OrdemServico {
  id: string;
  placaViatura: string;
  modeloViatura: string;
  numeroOS: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
}

interface ModalDetalhesViaturaProps {
  isOpen: boolean;
  onClose: () => void;
  viatura: Viatura | null;
}

const ModalDetalhesViatura = ({ isOpen, onClose, viatura }: ModalDetalhesViaturaProps) => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ cadastro: '', modelo: '', placa: '' });
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroAno, setFiltroAno] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [dataEspecifica, setDataEspecifica] = useState<Date | undefined>();
  const { toast } = useToast();

  // Novo hook para dados FIPE
  const { viaturaFipe, saldoAnual, loading: loadingFipe, saving: savingFipe, salvarValorFipe } = useFipeData(viatura);

  useEffect(() => {
    if (viatura && isOpen) {
      fetchOrdensServico();
      setEditData({
        cadastro: viatura.CADASTRO || '',
        modelo: viatura.MODELO || '',
        placa: viatura.PLACA || ''
      });
    }
  }, [viatura, isOpen]);

  useEffect(() => {
    aplicarFiltros();
  }, [ordensServico, filtroMes, filtroAno, dataInicio, dataFim, dataEspecifica]);

  const fetchOrdensServico = async () => {
    if (!viatura) return;
    
    setLoading(true);
    try {
      console.log('=== BUSCANDO OS PARA VIATURA ===');
      console.log('Viatura:', {
        cadastro: viatura.CADASTRO,
        placa: viatura.PLACA,
        tipo: viatura.tipo
      });

      const q = query(
        collection(db, 'ordensDeServico'),
        where('placaViatura', '==', viatura.PLACA)
      );
      const querySnapshot = await getDocs(q);
      const osData: OrdemServico[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrdemServico[];
      
      console.log('OS encontradas para a viatura:', osData.map(os => ({
        numeroOS: os.numeroOS,
        data: os.dataOS,
        valor: os.valorOS,
        valorNumerico: parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100
      })));

      // Ordenar por data mais recente
      osData.sort((a, b) => new Date(b.dataOS).getTime() - new Date(a.dataOS).getTime());
      setOrdensServico(osData);
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let ordemsFiltradas = [...ordensServico];

    if (filtroMes) {
      ordemsFiltradas = ordemsFiltradas.filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.getMonth() === parseInt(filtroMes);
      });
    }

    if (filtroAno) {
      ordemsFiltradas = ordemsFiltradas.filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.getFullYear() === parseInt(filtroAno);
      });
    }

    if (dataInicio && dataFim) {
      ordemsFiltradas = ordemsFiltradas.filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS >= dataInicio && dataOS <= dataFim;
      });
    }

    if (dataEspecifica) {
      ordemsFiltradas = ordemsFiltradas.filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.toDateString() === dataEspecifica.toDateString();
      });
    }

    setOrdensFiltered(ordemsFiltradas);
  };

  const handleEditViatura = async () => {
    if (!viatura) return;
    
    try {
      const docRef = doc(db, 'frota', viatura.id);
      await updateDoc(docRef, {
        cadastro: editData.cadastro,
        MODELO: editData.modelo,
        PLACA: editData.placa
      });
      
      toast({
        title: "Viatura atualizada",
        description: "Os dados da viatura foram atualizados com sucesso.",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar viatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar os dados da viatura.",
        variant: "destructive",
      });
    }
  };

  const limparFiltros = () => {
    setFiltroMes('');
    setFiltroAno('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setDataEspecifica(undefined);
  };

  const getOrdensComFiltro = (filtro: string) => {
    return ordensServico.filter(os => 
      os.observacao && os.observacao.toLowerCase().includes(filtro.toLowerCase())
    );
  };

  const formatarMoeda = (valor: string | number) => {
    let numero: number;
    if (typeof valor === 'string') {
      numero = parseFloat(valor.replace(/[R$.,\s]/g, '')) / 100;
    } else {
      numero = valor / 100;
    }
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calcularTotalGasto = (ordens: OrdemServico[]) => {
    return ordens.reduce((total, os) => {
      const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
      return total + valor;
    }, 0);
  };

  const calcularGraficoPizza = async () => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    console.log('=== CALCULANDO GRÁFICOS PARA VIATURA (SÓ MÊS ATUAL) ===');
    console.log('Viatura:', viatura?.CADASTRO, 'Placa:', viatura?.PLACA);
    
    // Verificar se é frota pesada usando função dinâmica
    const viaturaEhPesada = viatura ? isFrotePesada(viatura) : false;
    const viaturaEhLeve = viatura ? isFroteLeve(viatura) : false;
    
    console.log('Tipo da viatura:', {
      viaturaEhPesada,
      viaturaEhLeve,
      tipoArmazenado: viatura?.tipo
    });
    
    let saldoMensal = 0;
    let gastoMesAtual = 0;
    let tipoSaldo = '';
    
    if (viaturaEhPesada) {
      // Para frota pesada, saldo livre (sem limitação)
      tipoSaldo = 'livre';
      saldoMensal = 999999;
      
      // Gastos apenas desta viatura no mês atual
      gastoMesAtual = ordensServico
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
        })
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
          return total + valor;
        }, 0);

      console.log('Gasto frota pesada (mês atual):', gastoMesAtual);
    } else if (viaturaEhLeve) {
      // Para frota leve
      tipoSaldo = 'compartilhado';
      
      // Buscar saldo configurado da frota leve
      try {
        const saldosSnapshot = await getDocs(collection(db, 'saldosViaturas'));
        const saldoFroteLeve = saldosSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }) as any)
          .find((s: any) => s.tipo === 'frota_leve' && s.anoReferencia === anoAtual);
        
        saldoMensal = (saldoFroteLeve as any)?.saldoMensal || 45000;
        
        console.log('Saldo frota leve encontrado:', saldoFroteLeve);
        console.log('Saldo mensal configurado:', saldoMensal);
        
        // GASTO MENSAL: Toda a frota leve (buscar placas dinamicamente)
        const placasFroteLeve = await getPlacasViaturasLeves();
        console.log('Placas da frota leve (dinâmico):', placasFroteLeve);
        
        // Buscar todas as OS da frota leve no mês atual
        const qFroteLeve = query(collection(db, 'ordensDeServico'));
        const osFroteLeve = await getDocs(qFroteLeve);
        
        gastoMesAtual = osFroteLeve.docs
          .map(doc => ({ ...doc.data() }) as OrdemServico)
          .filter(os => {
            const dataOS = new Date(os.dataOS);
            const isMesAtual = dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
            const isFroteLeve = placasFroteLeve.includes(os.placaViatura);
            
            if (isMesAtual && isFroteLeve) {
              console.log('OS da frota leve no mês atual:', {
                placa: os.placaViatura,
                valor: os.valorOS,
                valorNumerico: parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100,
                data: os.dataOS
              });
            }
            
            return isMesAtual && isFroteLeve;
          })
          .reduce((total, os) => {
            const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
            return total + valor;
          }, 0);

        console.log('Gasto total frota leve (mês atual):', gastoMesAtual);
      } catch (error) {
        console.error('Erro ao buscar saldo da frota leve:', error);
      }
    } else {
      // Viatura sem categoria definida
      tipoSaldo = 'indefinido';
      saldoMensal = 0;
      gastoMesAtual = 0;
    }

    const saldoDisponivelMes = Math.max(0, saldoMensal - gastoMesAtual);

    console.log('Resultado dos cálculos (mês atual):', {
      saldoMensal,
      gastoMesAtual,
      saldoDisponivelMes,
      tipoSaldo
    });

    return {
      mes: [
        { name: 'Usado', value: gastoMesAtual, fill: '#ef4444' },
        { name: 'Disponível', value: saldoDisponivelMes, fill: '#22c55e' }
      ],
      totais: {
        saldoMensal,
        gastoMesAtual,
        saldoDisponivelMes,
        tipoSaldo
      }
    };
  };

  const [dadosGraficos, setDadosGraficos] = useState({
    mes: [
      { name: 'Usado', value: 0, fill: '#ef4444' },
      { name: 'Disponível', value: 0, fill: '#22c55e' }
    ],
    totais: {
      saldoMensal: 0,
      gastoMesAtual: 0,
      saldoDisponivelMes: 0,
      tipoSaldo: ''
    }
  });

  useEffect(() => {
    if (viatura && ordensServico.length >= 0) {
      calcularGraficoPizza().then(setDadosGraficos);
    }
  }, [viatura, ordensServico]);

  if (!viatura) return null;

  const ordensGerais = ordensServico;
  const ordensPneu = getOrdensComFiltro('pneu');
  const ordensBateria = getOrdensComFiltro('bateria');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Car className="h-6 w-6" />
            Detalhes da Viatura - {viatura.CADASTRO || viatura.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuração FIPE */}
          <ConfiguracaoFipe 
            viaturaFipe={viaturaFipe}
            onSalvar={salvarValorFipe}
            saving={savingFipe}
          />

          {/* Resumo de Saldos - MENSAL E ANUAL LADO A LADO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Saldo Mensal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {dadosGraficos.totais.tipoSaldo === 'livre' ? 'Saldo Livre (Mês Atual)' : 
                   dadosGraficos.totais.tipoSaldo === 'compartilhado' ? 'Saldo Mensal Compartilhado' : 
                   'Saldo Não Definido'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dadosGraficos.totais.tipoSaldo === 'livre' ? (
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold text-green-600 mb-2">SALDO LIVRE</div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Esta viatura não possui limitação de saldo
                    </p>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span>Gasto Este Mês:</span>
                      <span className="font-semibold text-blue-600">
                        R$ {dadosGraficos.totais.gastoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : dadosGraficos.totais.tipoSaldo === 'compartilhado' ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                      <p className="text-xs text-blue-800">
                        <strong>Saldo Compartilhado:</strong> Todas as viaturas da frota leve compartilham este saldo mensal
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Saldo Configurado:</span>
                      <span className="font-semibold text-green-600">
                        R$ {dadosGraficos.totais.saldoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gasto Frota Leve:</span>
                      <span className="font-semibold text-orange-600">
                        R$ {dadosGraficos.totais.gastoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Saldo Restante:</span>
                      <span className="font-semibold text-blue-600">
                        R$ {dadosGraficos.totais.saldoDisponivelMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={dadosGraficos.mes}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          dataKey="value"
                        >
                          {dadosGraficos.mes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-xl font-bold text-yellow-600 mb-2">CATEGORIA NÃO DEFINIDA</div>
                    <p className="text-sm text-muted-foreground">
                      Esta viatura não foi categorizada como frota leve ou pesada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saldo Anual */}
            {saldoAnual && (
              <SaldoAnualCard saldoAnual={saldoAnual} />
            )}
          </div>

          {/* Informações da Viatura */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Car className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      {isEditing ? (
                        <Input
                          value={editData.modelo}
                          onChange={(e) => setEditData(prev => ({ ...prev, modelo: e.target.value }))}
                          className="h-6 text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{viatura.MODELO}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-6 w-6 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cadastro</p>
                      {isEditing ? (
                        <Input
                          value={editData.cadastro}
                          onChange={(e) => setEditData(prev => ({ ...prev, cadastro: e.target.value }))}
                          className="h-6 text-sm font-semibold"
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-semibold hover:bg-transparent"
                          onClick={() => setShowCadastroModal(true)}
                        >
                          {viatura.CADASTRO || 'N/A'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Fuel className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">KM Atual</p>
                    <p className="font-semibold">{viatura.KM.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-6 w-6 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Óleo</p>
                    <p className="font-semibold">{viatura.KMOLEO.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Placa</p>
                      {isEditing ? (
                        <Input
                          value={editData.placa}
                          onChange={(e) => setEditData(prev => ({ ...prev, placa: e.target.value }))}
                          className="h-6 text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{viatura.PLACA}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditViatura}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}

          {/* Filtros para Ordens de Serviço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                Filtros de Ordens de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="filtro-mes">Mês</Label>
                  <Select value={filtroMes} onValueChange={setFiltroMes}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Janeiro</SelectItem>
                      <SelectItem value="1">Fevereiro</SelectItem>
                      <SelectItem value="2">Março</SelectItem>
                      <SelectItem value="3">Abril</SelectItem>
                      <SelectItem value="4">Maio</SelectItem>
                      <SelectItem value="5">Junho</SelectItem>
                      <SelectItem value="6">Julho</SelectItem>
                      <SelectItem value="7">Agosto</SelectItem>
                      <SelectItem value="8">Setembro</SelectItem>
                      <SelectItem value="9">Outubro</SelectItem>
                      <SelectItem value="10">Novembro</SelectItem>
                      <SelectItem value="11">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filtro-ano">Ano</Label>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataInicio}
                        onSelect={setDataInicio}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataFim}
                        onSelect={setDataFim}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Data Específica</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataEspecifica && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataEspecifica ? format(dataEspecifica, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataEspecifica}
                        onSelect={setDataEspecifica}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={limparFiltros}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs com Ordens de Serviço */}
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todas" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Todas ({ordensFiltered.length})
              </TabsTrigger>
              <TabsTrigger value="pneus" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Pneus ({ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('pneu')).length})
              </TabsTrigger>
              <TabsTrigger value="bateria" className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                Bateria ({ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('bateria')).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Ordens de Serviço</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensFiltered).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensFiltered} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pneus" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Serviços de Pneus</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('pneu'))).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('pneu'))} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bateria" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Serviços de Bateria</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('bateria'))).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensFiltered.filter(os => os.observacao && os.observacao.toLowerCase().includes('bateria'))} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal do Cadastro */}
        <Dialog open={showCadastroModal} onOpenChange={setShowCadastroModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Informações do Cadastro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {viatura?.CADASTRO || 'N/A'}
                  </div>
                  <p className="text-muted-foreground">Código de Cadastro da Viatura</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Modelo: {viatura?.MODELO}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Placa: {viatura?.PLACA}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

interface TabelaOrdensServicoProps {
  ordens: OrdemServico[];
  loading: boolean;
}

const TabelaOrdensServico = ({ ordens, loading }: TabelaOrdensServicoProps) => {
  const formatarMoeda = (valor: string) => {
    const numero = parseFloat(valor.replace(/[R$.,\s]/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ordens de serviço...</div>;
  }

  if (ordens.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhuma ordem de serviço encontrada</div>;
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº OS</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Oficina</TableHead>
            <TableHead>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordens.map((os) => (
            <TableRow key={os.id}>
              <TableCell className="font-medium">{os.numeroOS}</TableCell>
              <TableCell>
                {new Date(os.dataOS).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell className="font-semibold text-green-600">
                {formatarMoeda(os.valorOS)}
              </TableCell>
              <TableCell>{os.oficinaResponsavel}</TableCell>
              <TableCell className="max-w-xs truncate" title={os.observacao}>
                {os.observacao}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ModalDetalhesViatura;
