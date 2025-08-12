import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar, Users, Bell, Search, Filter } from 'lucide-react';
import { doc, updateDoc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  Matrícula?: string;
  inicioSituacao?: string;
  fimSituacao?: string;
  observacaoSituacao?: string;
  funcaoOrigem?: string;
  publicacaoSituacao?: string;
}

interface SituacaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const SITUACOES_DISPONIVEIS = [
  'FÉRIAS',
  'READAPTAÇÃO FUNCIONAL',
  'LICENÇA TRATAMENTO DE SAUDE',
  'LICENÇA PATERNIDADE',
  'LICENÇA MATERNIDADE',
  'RECOMPENSA MILITAR',
  'NUPCIAS',
  'LUTO',
  'CURSANDO',
  'TRANSITO',
  'RESP. PROCESSO',
  'DESERTOR',
  'A DISP. DE OUTROS ORGÃOS',
  'RECOLHIDO PRES. MILITAR',
  'AGREGADO',
  'AGREGADO - AGUARDANDO RESERVA'
];

const SituacaoTab: React.FC<SituacaoTabProps> = ({ policiais, onUpdate }) => {
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [novaSituacao, setNovaSituacao] = useState('');
  const [inicioSituacao, setInicioSituacao] = useState('');
  const [fimSituacao, setFimSituacao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('all');
  
  const { toast } = useToast();

  // Policiais que NÃO estão em situação especial (montados)
  const policiaisDisponiveis = useMemo(() => {
    return policiais.filter(p => 
      p.SITUAÇÃO === 'MONTADO - POLICIAMENTO OSTENSIVO' ||
      !p.SITUAÇÃO ||
      p.SITUAÇÃO === 'VIATURA'
    );
  }, [policiais]);

  // Policiais em situação especial
  const policiaisEmSituacao = useMemo(() => {
    return policiais.filter(p => 
      p.SITUAÇÃO !== 'MONTADO - POLICIAMENTO OSTENSIVO' &&
      p.SITUAÇÃO !== 'VIATURA' &&
      p.SITUAÇÃO
    );
  }, [policiais]);

  // Policiais filtrados para disponíveis
  const policiaisDisponiveisFiltrados = useMemo(() => {
    return policiaisDisponiveis.filter(policial => {
      const matchesSearch = !searchTerm || 
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSituacao = filterSituacao === 'all' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      
      return matchesSearch && matchesSituacao;
    });
  }, [policiaisDisponiveis, searchTerm, filterSituacao]);

  // Policiais filtrados para em situação
  const policiaisEmSituacaoFiltrados = useMemo(() => {
    return policiaisEmSituacao.filter(policial => {
      const matchesSearch = !searchTerm || 
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSituacao = filterSituacao === 'all' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      
      return matchesSearch && matchesSituacao;
    });
  }, [policiaisEmSituacao, searchTerm, filterSituacao]);

  // Policiais com situações que têm data de fim próxima (próximos 7 dias)
  const alertasSituacao = policiaisEmSituacao.filter(policial => {
    if (!policial.fimSituacao) return false;
    try {
      const fimData = parseISO(policial.fimSituacao);
      const agora = new Date();
      const em7dias = addDays(agora, 7);
      return isWithinInterval(fimData, { start: agora, end: em7dias });
    } catch {
      return false;
    }
  });

  const handleSelectPolicial = (policialId: string, checked: boolean) => {
    if (checked) {
      setSelectedPoliciais([...selectedPoliciais, policialId]);
    } else {
      setSelectedPoliciais(selectedPoliciais.filter(id => id !== policialId));
    }
  };

  const handleColocarSituacao = async () => {
    if (selectedPoliciais.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um policial",
        variant: "destructive"
      });
      return;
    }

    if (!novaSituacao || !inicioSituacao) {
      toast({
        title: "Erro",
        description: "Informe a situação e data de início",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);

      for (const policialId of selectedPoliciais) {
        const policial = policiais.find(p => p.id === policialId);
        if (policial) {
          const policialRef = doc(db, 'policiais', policialId);
          batch.update(policialRef, {
            SITUAÇÃO: novaSituacao,
            inicioSituacao,
            fimSituacao: fimSituacao || null,
            observacaoSituacao: observacao || '',
            publicacaoSituacao: publicacao || '',
            funcaoOrigem: policial['FUNÇÃO'] || 'VIATURA'
          });

          // Salvar na coleção específica da situação
          const situacaoCollectionName = `situacao_${novaSituacao.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '')}`;
          const situacaoRef = collection(db, situacaoCollectionName);
          await addDoc(situacaoRef, {
            policialId,
            nome: policial.NOME,
            postGrad: policial['Post/Grad'],
            situacao: novaSituacao,
            dataEntrada: inicioSituacao,
            dataSaida: null,
            observacao: observacao || '',
            publicacao: publicacao || '',
            funcaoOrigem: policial['FUNÇÃO'] || 'VIATURA',
            status: 'ATIVO',
            createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();

      toast({
        title: "Sucesso",
        description: `${selectedPoliciais.length} policial(is) colocado(s) em ${novaSituacao}`
      });

      // Reset form
      setSelectedPoliciais([]);
      setNovaSituacao('');
      setInicioSituacao('');
      setFimSituacao('');
      setObservacao('');
      setPublicacao('');
      onUpdate();
    } catch (error) {
      console.error('Erro ao colocar policiais em situação:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetirarSituacao = async (policialId: string) => {
    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === policialId);
      if (!policial) return;

      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        SITUAÇÃO: 'MONTADO - POLICIAMENTO OSTENSIVO',
        'FUNÇÃO': policial.funcaoOrigem || 'VIATURA',
        inicioSituacao: null,
        fimSituacao: null,
        observacaoSituacao: null,
        publicacaoSituacao: null
      });

      // Atualizar na coleção específica da situação
      const situacaoAtual = policial.SITUAÇÃO;
      if (situacaoAtual) {
        const situacaoCollectionName = `situacao_${situacaoAtual.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '')}`;
        const situacaoRef = collection(db, situacaoCollectionName);
        await addDoc(situacaoRef, {
          policialId,
          nome: policial.NOME,
          postGrad: policial['Post/Grad'],
          situacao: situacaoAtual,
          dataEntrada: policial.inicioSituacao || '',
          dataSaida: new Date().toISOString().split('T')[0],
          observacao: policial.observacaoSituacao || '',
          publicacao: policial.publicacaoSituacao || '',
          funcaoOrigem: policial.funcaoOrigem || 'VIATURA',
          status: 'INATIVO',
          createdAt: new Date().toISOString()
        });
      }

      toast({
        title: "Sucesso",
        description: `${policial.NOME} retirado da situação`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao retirar policial da situação:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeVariant = (situacao: string) => {
    if (situacao.includes('FÉRIAS')) return 'secondary';
    if (situacao.includes('LICENÇA')) return 'destructive';
    if (situacao.includes('CURSANDO')) return 'default';
    if (situacao.includes('LUTO') || situacao.includes('DESERTOR')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Situações Próximas do Fim */}
      {alertasSituacao.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="h-5 w-5" />
              Alertas - Situações Terminando em Breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertasSituacao.map(policial => (
                <div key={policial.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-medium">{policial['Post/Grad']} {policial.NOME}</span>
                    <Badge variant="outline" className="ml-2">
                      {policial.SITUAÇÃO}
                    </Badge>
                  </div>
                  <Badge variant="destructive">
                    Termina em {policial.fimSituacao ? format(parseISO(policial.fimSituacao), 'dd/MM/yyyy') : 'Data não informada'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar por Nome/Graduação/Matrícula</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Filtrar por Situação</Label>
              <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="MONTADO - POLICIAMENTO OSTENSIVO">Montado</SelectItem>
                  {SITUACOES_DISPONIVEIS.map(situacao => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterSituacao('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colocar em Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Colocar em Situação
            </CardTitle>
            <CardDescription>
              Selecione os policiais e a situação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Situação</Label>
              <Select value={novaSituacao} onValueChange={setNovaSituacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma situação" />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES_DISPONIVEIS.map(situacao => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Data de Início</Label>
                <Input
                  id="inicio"
                  type="date"
                  value={inicioSituacao}
                  onChange={(e) => setInicioSituacao(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fim">Data de Fim (opcional)</Label>
                <Input
                  id="fim"
                  type="date"
                  value={fimSituacao}
                  onChange={(e) => setFimSituacao(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="publicacao">Publicação (opcional)</Label>
              <Input
                id="publicacao"
                placeholder="Ex: Portaria nº 123/2024"
                value={publicacao}
                onChange={(e) => setPublicacao(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Input
                id="observacao"
                placeholder="Observações adicionais"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2">
              <Label>Selecionar Policiais ({selectedPoliciais.length} selecionados)</Label>
              {policiaisDisponiveisFiltrados.map((policial) => (
                <div key={policial.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`policial-${policial.id}`}
                    checked={selectedPoliciais.includes(policial.id)}
                    onCheckedChange={(checked) => 
                      handleSelectPolicial(policial.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`policial-${policial.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {policial['Post/Grad']} {policial.NOME}
                    {policial.Matrícula && (
                      <span className="text-muted-foreground ml-2">({policial.Matrícula})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleColocarSituacao} 
              disabled={loading || selectedPoliciais.length === 0}
              className="w-full"
            >
              {loading ? "Processando..." : `Colocar ${selectedPoliciais.length} Policial(is) em Situação`}
            </Button>
          </CardContent>
        </Card>

        {/* Policiais em Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Policiais em Situação ({policiaisEmSituacaoFiltrados.length})
            </CardTitle>
            <CardDescription>
              Policiais atualmente em situação especial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {policiaisEmSituacaoFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum policial em situação especial no momento
                </p>
              ) : (
                policiaisEmSituacaoFiltrados.map((policial) => (
                  <div key={policial.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{policial['Post/Grad']} {policial.NOME}</p>
                      <Badge variant={getBadgeVariant(policial.SITUAÇÃO)} className="mt-1">
                        {policial.SITUAÇÃO}
                      </Badge>
                      <div className="flex gap-2 mt-2">
                        {policial.inicioSituacao && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(policial.inicioSituacao).toLocaleDateString()} 
                            {policial.fimSituacao && ` - ${new Date(policial.fimSituacao).toLocaleDateString()}`}
                          </Badge>
                        )}
                        {policial.publicacaoSituacao && (
                          <Badge variant="secondary" className="text-xs">
                            {policial.publicacaoSituacao}
                          </Badge>
                        )}
                      </div>
                      {policial.observacaoSituacao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {policial.observacaoSituacao}
                        </p>
                      )}
                      {policial.funcaoOrigem && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Função original: {policial.funcaoOrigem}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetirarSituacao(policial.id)}
                      disabled={loading}
                    >
                      Retirar da Situação
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


export default SituacaoTab;