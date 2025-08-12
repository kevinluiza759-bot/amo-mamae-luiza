import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, Calendar, FileText, DollarSign } from 'lucide-react';

interface OrdemServico {
  id: string;
  numeroOS: string;
  placaViatura: string;
  modeloViatura: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
  dataCriacao: any;
}

const OrdensServicoPage = () => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<OrdemServico[]>([]);
  const [filtros, setFiltros] = useState({
    numeroOS: '',
    placa: '',
    mes: '',
    tipoServico: '',
    oficina: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrdensServico();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, ordensServico]);

  const fetchOrdensServico = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const osData: OrdemServico[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrdemServico[];
      
      // Ordenar por data mais recente
      const osSorted = osData.sort((a, b) => 
        new Date(b.dataOS).getTime() - new Date(a.dataOS).getTime()
      );
      
      setOrdensServico(osSorted);
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let ordens = [...ordensServico];

    if (filtros.numeroOS) {
      ordens = ordens.filter(os => 
        os.numeroOS.toLowerCase().includes(filtros.numeroOS.toLowerCase())
      );
    }

    if (filtros.placa) {
      ordens = ordens.filter(os => 
        os.placaViatura.toLowerCase().includes(filtros.placa.toLowerCase())
      );
    }

    if (filtros.mes) {
      ordens = ordens.filter(os => {
        const dataOS = new Date(os.dataOS);
        const mesAno = `${dataOS.getFullYear()}-${String(dataOS.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === filtros.mes;
      });
    }

    if (filtros.tipoServico) {
      ordens = ordens.filter(os => 
        os.observacao.toLowerCase().includes(filtros.tipoServico.toLowerCase())
      );
    }

    if (filtros.oficina) {
      ordens = ordens.filter(os => 
        os.oficinaResponsavel.toLowerCase().includes(filtros.oficina.toLowerCase())
      );
    }

    setOrdensFiltered(ordens);
  };

  const limparFiltros = () => {
    setFiltros({
      numeroOS: '',
      placa: '',
      mes: '',
      tipoServico: '',
      oficina: ''
    });
  };

  const getTipoServico = (observacao: string) => {
    const obs = observacao.toLowerCase();
    if (obs.includes('óleo') || obs.includes('oleo')) return 'MANUTENÇÃO';
    if (obs.includes('pneu') || obs.includes('roda')) return 'PNEUS';
    if (obs.includes('farol') || obs.includes('luz')) return 'ELÉTRICA';
    if (obs.includes('motor') || obs.includes('correia')) return 'MOTOR';
    if (obs.includes('freio') || obs.includes('pastilha')) return 'FREIOS';
    return 'OUTROS';
  };

  const getValorNumerico = (valorStr: string) => {
    return parseFloat(valorStr.replace(/[R$.,\s]/g, '')) || 0;
  };

  const totalGasto = ordensFiltered.reduce((total, os) => 
    total + getValorNumerico(os.valorOS), 0
  );

  if (loading) {
    return (
      <Card className="bg-card border-border shadow-tactical">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Carregando ordens de serviço...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ORDENS DE SERVIÇO
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Número da OS
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o número da OS..."
                    value={filtros.numeroOS}
                    onChange={(e) => setFiltros(prev => ({ ...prev, numeroOS: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Placa da Viatura
                </label>
                <Input
                  placeholder="Digite a placa..."
                  value={filtros.placa}
                  onChange={(e) => setFiltros(prev => ({ ...prev, placa: e.target.value }))}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Mês/Ano
                </label>
                <Input
                  type="month"
                  value={filtros.mes}
                  onChange={(e) => setFiltros(prev => ({ ...prev, mes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Tipo de Serviço
                </label>
                <Input
                  placeholder="Ex: óleo, pneu, farol..."
                  value={filtros.tipoServico}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoServico: e.target.value }))}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Oficina
                </label>
                <Input
                  placeholder="Nome da oficina..."
                  value={filtros.oficina}
                  onChange={(e) => setFiltros(prev => ({ ...prev, oficina: e.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={limparFiltros}
                  className="mb-0"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total de OS</p>
                    <p className="text-2xl font-bold">{ordensFiltered.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">R$ {totalGasto.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Médio</p>
                    <p className="text-2xl font-bold">
                      R$ {ordensFiltered.length > 0 ? (totalGasto / ordensFiltered.length).toLocaleString() : '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Oficina</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltered.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell className="font-medium">{os.numeroOS}</TableCell>
                    <TableCell>
                      {new Date(os.dataOS).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">{os.modeloViatura}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{os.placaViatura}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTipoServico(os.observacao)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {os.valorOS}
                    </TableCell>
                    <TableCell>{os.oficinaResponsavel}</TableCell>
                    <TableCell className="max-w-md truncate" title={os.observacao}>
                      {os.observacao}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {ordensFiltered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ordem de serviço encontrada com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdensServicoPage;