import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Truck, Eye, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// --- Firebase Imports ---
import {
  getFirestore,
  collection,
  query,
  getDocs,
  orderBy,
  where,
  Query,
  DocumentData,
  Firestore,
  Timestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

// Certifique-se de que o app Firebase já foi inicializado
let db: Firestore;
try {
  db = getFirestore(getApp());
} catch (e) {
  console.error("Erro ao inicializar Firebase ou obter Firestore: ", e);
  throw new Error("Firebase app not initialized or Firestore unavailable.");
}

// --- Interface para a Ordem de Serviço ---
interface OrdemServico {
  id: string;
  cadastroViatura: string;
  dataCriacao: Timestamp;
  dataOS: string;
  modeloViatura: string;
  numeroOS: string;
  observacao: string;
  oficinaResponsavel: string;
  placaViatura: string;
  valorOS: string;
  Arquivo: string;
  appIdAssociado: string;
  COMPLETO: boolean;
  numeroOficina: string;
}

// --- Helpers para a data ---
const getMonthYearOptions = () => {
  const options = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 24; i++) { // Últimos 24 meses
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    });
  }
  return options;
};

const OrdemServicoPage = () => {
  // --- Estados para os dados e UI ---
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Estados para Filtros ---
  const [searchViatura, setSearchViatura] = useState('');
  const [searchDefeito, setSearchDefeito] = useState('');
  const [searchNumeroOS, setSearchNumeroOS] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedMonthYear, setSelectedMonthYear] = useState('all');
  const monthYearOptions = useMemo(() => getMonthYearOptions(), []);

  // --- Estado para o Modal de Detalhes ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  
  // --- Estados para o Modal de Confirmação de Exclusão ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [osToDelete, setOsToDelete] = useState<OrdemServico | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // A função fetchOrdensServico agora só aplica filtros e ordenação, sem limite
  const fetchOrdensServico = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q: Query<DocumentData> = collection(db, 'ordensDeServico');

      // Remover o filtro de appIdAssociado para mostrar todas as OS's

      // --- FILTRO DE DATAS ---
      if (dateRange.from && dateRange.to) {
        const startDateString = format(dateRange.from, 'yyyy-MM-dd');
        const endDateString = format(dateRange.to, 'yyyy-MM-dd');
        q = query(q, where('dataOS', '>=', startDateString), where('dataOS', '<=', endDateString));
      } else if (selectedMonthYear && selectedMonthYear !== 'all') {
        const [year, month] = selectedMonthYear.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        const startDateString = format(startDate, 'yyyy-MM-dd');
        const endDateString = format(endDate, 'yyyy-MM-dd');
        q = query(q, where('dataOS', '>=', startDateString), where('dataOS', '<=', endDateString));
      }
      
      // Ordena por dataCriacao (IMPORTANTE para garantir ordem consistente)
      q = query(q, orderBy('dataCriacao', 'desc'));

      // *** REMOVIDO O limit() AQUI ***
      const snapshot = await getDocs(q); 
      const fetchedDocs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Mapear defeitoRelatado para observacao se não existir observacao
          observacao: data.observacao || data.defeitoRelatado || ''
        } as OrdemServico;
      });

      // Filtragem client-side para "contém" (mantida)
      let filteredDocs = fetchedDocs;
      const lowerSearchViatura = searchViatura.trim().toLowerCase();
      const lowerSearchDefeito = searchDefeito.trim().toLowerCase();
      const lowerSearchNumeroOS = searchNumeroOS.trim().toLowerCase();

      if (lowerSearchViatura || lowerSearchDefeito || lowerSearchNumeroOS) {
        filteredDocs = fetchedDocs.filter(os => {
          const viaturaData = `${os.cadastroViatura || ''} ${os.modeloViatura || ''} ${os.placaViatura || ''}`.toLowerCase();
          const observacaoData = (os.observacao || '').toLowerCase();
          const numeroOSData = (os.numeroOS || '').toLowerCase();

          const viaturaMatch = lowerSearchViatura === '' || viaturaData.includes(lowerSearchViatura);
          const defeitoMatch = lowerSearchDefeito === '' || observacaoData.includes(lowerSearchDefeito);
          const numeroOSMatch = lowerSearchNumeroOS === '' || numeroOSData.includes(lowerSearchNumeroOS);

          return (lowerSearchViatura === '' || viaturaMatch) && 
                 (lowerSearchDefeito === '' || defeitoMatch) && 
                 (lowerSearchNumeroOS === '' || numeroOSMatch);
        });
      }

      setOrdensServico(filteredDocs);

    } catch (err: any) {
      console.error("Erro ao buscar Ordens de Serviço:", err);
      setError("Não foi possível carregar as Ordens de Serviço. Verifique sua conexão ou as permissões do Firebase.");
    } finally {
      setLoading(false);
    }
  }, [
      // As dependências agora são apenas os estados dos filtros
      searchViatura,
      searchDefeito,
      searchNumeroOS,
      dateRange,
      selectedMonthYear
  ]);

  // useEffect agora apenas dispara fetchOrdensServico quando os filtros mudam
  useEffect(() => {
    fetchOrdensServico();
  }, [fetchOrdensServico, searchViatura, searchDefeito, searchNumeroOS, dateRange, selectedMonthYear]);


  const openModal = (os: OrdemServico) => {
    setSelectedOS(os);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOS(null);
  };

  const openDeleteModal = (os: OrdemServico) => {
    setOsToDelete(os);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setOsToDelete(null);
    setDeletePassword('');
    setIsDeleting(false);
  };

  const handleDeleteOS = async () => {
    if (!osToDelete || !deletePassword.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite a senha para confirmar a exclusão.",
        variant: "destructive",
      });
      return;
    }

    // Obter dados do usuário logado
    const userData = localStorage.getItem('user');
    if (!userData) {
      toast({
        title: "Erro",
        description: "Usuário não logado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    const usuarioLogado = JSON.parse(userData);
    
    // Validar senha do usuário logado
    let senhaValida = false;
    if (usuarioLogado.primeiroAcesso !== false || !usuarioLogado.senha) {
      // Se é primeiro acesso, a senha deve ser a matrícula
      senhaValida = deletePassword === usuarioLogado.Matrícula;
    } else {
      // Se não é primeiro acesso, verificar senha cadastrada
      senhaValida = deletePassword === usuarioLogado.senha;
    }

    if (!senhaValida) {
      toast({
        title: "Erro",
        description: "Senha incorreta.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'ordensDeServico', osToDelete.id));
      
      // Remove da lista local
      setOrdensServico(prev => prev.filter(os => os.id !== osToDelete.id));
      
      toast({
        title: "Sucesso",
        description: `OS ${osToDelete.numeroOS} foi excluída com sucesso.`,
      });
      
      closeDeleteModal();
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir a OS. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Renderização condicional para estados de carregamento e erro iniciais
  if (loading && ordensServico.length === 0) {
    return (
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader><CardTitle className="text-foreground">GESTÃO DE ORDENS DE SERVIÇO (OS's)</CardTitle></CardHeader>
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">Carregando Ordens de Serviço...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader><CardTitle className="text-foreground">GESTÃO DE ORDENS DE SERVIÇO (OS's)</CardTitle></CardHeader>
        <CardContent className="text-center p-8 text-destructive">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5" /> GESTÃO DE ORDENS DE SERVIÇO (OS's)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">
          Visualize e gerencie todas as Ordens de Serviço.
        </p>

        {/* --- Filtros --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Buscar por Número de OS..."
            value={searchNumeroOS}
            onChange={(e) => setSearchNumeroOS(e.target.value)}
            className="col-span-full md:col-span-1 lg:col-span-1"
          />
          <Input
            placeholder="Buscar por Viatura (cadastro, modelo, placa)..."
            value={searchViatura}
            onChange={(e) => setSearchViatura(e.target.value)}
            className="col-span-full md:col-span-1 lg:col-span-1"
          />
          <Input
            placeholder="Buscar por Defeito ou Viatura (detalhado)..."
            value={searchDefeito}
            onChange={(e) => setSearchDefeito(e.target.value)}
            className="col-span-full md:col-span-2 lg:col-span-2"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "PPP", { locale: ptBR })} - ${format(dateRange.to, "PPP", { locale: ptBR })}`
                  ) : (
                    format(dateRange.from, "PPP", { locale: ptBR })
                  )
                ) : (
                  <span>Intervalo de Data da OS</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => { setDateRange({ from: range?.from, to: range?.to }); }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por Mês/Ano da OS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Meses</SelectItem>
              {monthYearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* REMOVIDO: Seletor de Itens por Página */}

          <Button
            onClick={() => {
              setSearchViatura('');
              setSearchDefeito('');
              setSearchNumeroOS('');
              setDateRange({ from: undefined, to: undefined });
              setSelectedMonthYear('all');
              fetchOrdensServico(); // Dispara a busca com filtros limpos
            }}
            variant="secondary"
            className="col-span-full lg:col-span-1"
          >
            Limpar Filtros
          </Button>
        </div>

        {/* --- Tabela de Ordens de Serviço --- */}
        <div className="rounded-md border bg-background text-foreground shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted/90">
                <TableHead className="w-[120px]">Nº OS</TableHead>
                <TableHead>Data OS</TableHead>
                <TableHead>Viatura</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Oficina</TableHead>
                <TableHead>Defeito Observado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Completo</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordensServico.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Nenhuma Ordem de Serviço encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                ordensServico.map((os) => (
                  <TableRow key={os.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-medium">{os.numeroOS || 'N/D'}</TableCell>
                    <TableCell>{os.dataOS && isValid(parseISO(os.dataOS)) ? format(parseISO(os.dataOS), 'dd/MM/yyyy') : 'N/D'}</TableCell>
                    <TableCell>
                      {os.cadastroViatura || 'N/D'}
                    </TableCell>
                    <TableCell>{os.placaViatura || 'N/D'}</TableCell>
                    <TableCell>{os.oficinaResponsavel || 'N/D'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{os.observacao || 'N/D'}</TableCell>
                    <TableCell className="text-right">{os.valorOS || 'N/D'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={os.COMPLETO ? 'default' : 'destructive'}>
                        {os.COMPLETO ? 'SIM' : 'NÃO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openModal(os)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteModal(os)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mensagem de status */}
        {ordensServico.length > 0 && (
            <div className="flex justify-end items-center mt-6 text-sm text-muted-foreground">
                Exibindo {ordensServico.length} Ordens de Serviço.
            </div>
        )}
      </CardContent>

      {/* --- Modal de Confirmação de Exclusão --- */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card text-foreground border-border shadow-tactical">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir permanentemente a OS #{osToDelete?.numeroOS || 'N/D'}.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="delete-password" className="text-sm font-medium">
                Digite a senha para confirmar:
              </label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Senha de administrador"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDeleteModal} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteOS} 
              disabled={isDeleting || !deletePassword.trim()}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir OS'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Modal de Detalhes da OS (sem alterações) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-foreground border-border shadow-tactical">
          {selectedOS ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Detalhes da Ordem de Serviço</DialogTitle>
                <DialogDescription>Informações completas sobre a OS #{selectedOS.numeroOS || 'N/D'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-sm">
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Nº OS:</p>
                  <p className="col-span-3 font-medium">{selectedOS.numeroOS || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Data OS:</p>
                  <p className="col-span-3">{selectedOS.dataOS && isValid(parseISO(selectedOS.dataOS)) ? format(parseISO(selectedOS.dataOS), 'dd/MM/yyyy') : 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Viatura:</p>
                  <p className="col-span-3">{selectedOS.modeloViatura || 'N/D'} {selectedOS.cadastroViatura && selectedOS.cadastroViatura !== selectedOS.modeloViatura ? `(${selectedOS.cadastroViatura})` : ''}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Placa:</p>
                  <p className="col-span-3">{selectedOS.placaViatura || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Oficina:</p>
                  <p className="col-span-3">{selectedOS.oficinaResponsavel || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Defeito:</p>
                  <p className="col-span-3">{selectedOS.observacao || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Valor:</p>
                  <p className="col-span-3">{selectedOS.valorOS || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Arquivo:</p>
                  <p className="col-span-3">{selectedOS.numeroOficina || selectedOS.Arquivo || 'N/D'}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Data Criação:</p>
                  <p className="col-span-3">
                    {selectedOS.dataCriacao && typeof selectedOS.dataCriacao.toDate === 'function' ? format(selectedOS.dataCriacao.toDate(), 'dd/MM/yyyy HH:mm') : 'N/D'}
                  </p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="col-span-1 text-muted-foreground font-semibold">Completo:</p>
                  <div className="col-span-3">
                    <Badge variant={selectedOS.COMPLETO ? 'default' : 'destructive'}>
                      {selectedOS.COMPLETO ? 'SIM' : 'NÃO'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Carregando detalhes...</div>
          )}
          <div className="flex justify-end">
            <Button onClick={closeModal}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OrdemServicoPage;
