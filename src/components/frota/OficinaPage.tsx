import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, AlertCircle, Building2 } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ViaturaNaOficina {
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

interface Viatura {
  id: string;
  CADASTRO: string;
  PLACA: string;
  MODELO: string;
}

interface Oficina {
  id: string;
  nome: string;
}

const OficinaPage = () => {
  const navigate = useNavigate();
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [viaturasNaOficina, setViaturasNaOficina] = useState<ViaturaNaOficina[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOficinaCadastroOpen, setIsOficinaCadastroOpen] = useState(false);
  const [isSaidaDialogOpen, setIsSaidaDialogOpen] = useState(false);
  const [selectedViatura, setSelectedViatura] = useState<ViaturaNaOficina | null>(null);
  
  const [formData, setFormData] = useState({
    cadastro: '',
    dataEntrada: '',
    servicoRealizar: '',
    oficina: ''
  });

  const [oficinaData, setOficinaData] = useState({
    nome: '',
    nomeFantasia: ''
  });

  const [saidaData, setSaidaData] = useState({
    dataSaida: '',
    observacaoServico: ''
  });

  useEffect(() => {
    fetchViaturas();
    fetchOficinas();
    fetchViaturasNaOficina();
  }, []);

  const fetchViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = [];
      querySnapshot.forEach((doc) => {
        viaturasData.push({ id: doc.id, ...doc.data() } as Viatura);
      });
      setViaturas(viaturasData);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
    }
  };

  const fetchOficinas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'oficinas'));
      const oficinasData: Oficina[] = [];
      querySnapshot.forEach((doc) => {
        oficinasData.push({ id: doc.id, nome: doc.data().nome } as Oficina);
      });
      setOficinas(oficinasData);
    } catch (error) {
      console.error('Erro ao buscar oficinas:', error);
    }
  };

  const fetchViaturasNaOficina = async () => {
    try {
      const q = query(collection(db, 'oficina'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const viaturasData: ViaturaNaOficina[] = [];
      querySnapshot.forEach((doc) => {
        viaturasData.push({ id: doc.id, ...doc.data() } as ViaturaNaOficina);
      });
      setViaturasNaOficina(viaturasData);
    } catch (error) {
      console.error('Erro ao buscar viaturas na oficina:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const viaturaSelecionada = viaturas.find(v => v.CADASTRO === formData.cadastro);
    if (!viaturaSelecionada) {
      toast({
        title: "Erro",
        description: "Viatura não encontrada",
        variant: "destructive"
      });
      return;
    }

    try {
      await addDoc(collection(db, 'oficina'), {
        cadastro: viaturaSelecionada.CADASTRO,
        placa: viaturaSelecionada.PLACA,
        modelo: viaturaSelecionada.MODELO,
        dataEntrada: formData.dataEntrada,
        servicoRealizar: formData.servicoRealizar,
        oficina: formData.oficina,
        status: 'na-oficina',
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Sucesso",
        description: "Viatura registrada na oficina com sucesso!"
      });

      setFormData({
        cadastro: '',
        dataEntrada: '',
        servicoRealizar: '',
        oficina: ''
      });
      setIsDialogOpen(false);
      fetchViaturasNaOficina();
    } catch (error) {
      console.error('Erro ao registrar viatura na oficina:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar viatura na oficina",
        variant: "destructive"
      });
    }
  };

  const handleSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedViatura) return;

    try {
      await updateDoc(doc(db, 'oficina', selectedViatura.id), {
        dataSaida: saidaData.dataSaida,
        observacaoServico: saidaData.observacaoServico,
        status: 'os-pendente'
      });

      toast({
        title: "Sucesso",
        description: "Saída da viatura registrada com sucesso!"
      });

      setSaidaData({
        dataSaida: '',
        observacaoServico: ''
      });
      setIsSaidaDialogOpen(false);
      setSelectedViatura(null);
      fetchViaturasNaOficina();
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar saída da viatura",
        variant: "destructive"
      });
    }
  };

  const handleCadastroOficina = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, 'oficinas'), {
        nome: oficinaData.nome,
        nomeFantasia: oficinaData.nomeFantasia
      });

      toast({
        title: "Sucesso",
        description: "Oficina cadastrada com sucesso!"
      });

      setOficinaData({
        nome: '',
        nomeFantasia: ''
      });
      setIsOficinaCadastroOpen(false);
      fetchOficinas();
    } catch (error) {
      console.error('Erro ao cadastrar oficina:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar oficina",
        variant: "destructive"
      });
    }
  };

  const handleCriarOS = (viatura: ViaturaNaOficina) => {
    // Redirecionar para página de nova OS - seção Documentos > Motorizado
    navigate('/admin-dashboard', { 
      state: { 
        activeSection: 'documentos',
        subSection: 'motorizado',
        novaOS: true,
        prefilledData: {
          cadastro: viatura.cadastro,
          servico: viatura.observacaoServico || viatura.servicoRealizar
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'na-oficina':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Na Oficina</Badge>;
      case 'os-pendente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">OS Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Separar viaturas com pendências das demais
  const viaturasComPendencia = viaturasNaOficina.filter(v => v.status === 'na-oficina' || v.status === 'os-pendente');
  const viaturasFinalizadas = viaturasNaOficina.filter(v => v.status !== 'na-oficina' && v.status !== 'os-pendente');

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Controle de Oficina</CardTitle>
          <div className="flex space-x-2">
            <Dialog open={isOficinaCadastroOpen} onOpenChange={setIsOficinaCadastroOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-secondary hover:bg-secondary/90">
                  <Building2 className="h-4 w-4 mr-2" />
                  Nova Oficina
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Entrada
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Viatura na Oficina</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cadastro">Viatura (Cadastro)</Label>
                  <Select value={formData.cadastro} onValueChange={(value) => setFormData({...formData, cadastro: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a viatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {viaturas.map((viatura) => (
                        <SelectItem key={viatura.id} value={viatura.CADASTRO}>
                          {viatura.CADASTRO} - {viatura.PLACA} ({viatura.MODELO})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dataEntrada">Data de Entrada</Label>
                  <Input
                    type="date"
                    value={formData.dataEntrada}
                    onChange={(e) => setFormData({...formData, dataEntrada: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="servicoRealizar">Serviço a Realizar</Label>
                  <Textarea
                    value={formData.servicoRealizar}
                    onChange={(e) => setFormData({...formData, servicoRealizar: e.target.value})}
                    placeholder="Descreva o serviço a ser realizado..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="oficina">Oficina</Label>
                  <Select value={formData.oficina} onValueChange={(value) => setFormData({...formData, oficina: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a oficina" />
                    </SelectTrigger>
                    <SelectContent>
                      {oficinas.map((oficina) => (
                        <SelectItem key={oficina.id} value={oficina.nome}>
                          {oficina.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar</Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {viaturasComPendencia.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-foreground">Pendências</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Data Entrada</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Data Saída</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viaturasComPendencia.map((viatura) => (
                    <TableRow key={viatura.id}>
                      <TableCell className="font-medium">{viatura.cadastro}</TableCell>
                      <TableCell>{viatura.placa}</TableCell>
                      <TableCell>{viatura.modelo}</TableCell>
                      <TableCell>{new Date(viatura.dataEntrada).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{viatura.servicoRealizar}</TableCell>
                      <TableCell>{viatura.oficina}</TableCell>
                      <TableCell>
                        {viatura.dataSaida ? new Date(viatura.dataSaida).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(viatura.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {viatura.status === 'na-oficina' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedViatura(viatura);
                                setIsSaidaDialogOpen(true);
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Saída
                            </Button>
                          )}
                          {viatura.status === 'os-pendente' && (
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => handleCriarOS(viatura)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Criar OS
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {viaturasFinalizadas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Histórico</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Data Entrada</TableHead>
                    <TableHead>Data Saída</TableHead>
                    <TableHead>Serviço Realizado</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viaturasFinalizadas.map((viatura) => (
                    <TableRow key={viatura.id}>
                      <TableCell className="font-medium">{viatura.cadastro}</TableCell>
                      <TableCell>{viatura.placa}</TableCell>
                      <TableCell>{viatura.modelo}</TableCell>
                      <TableCell>{new Date(viatura.dataEntrada).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {viatura.dataSaida ? new Date(viatura.dataSaida).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {viatura.observacaoServico || viatura.servicoRealizar}
                      </TableCell>
                      <TableCell>{viatura.oficina}</TableCell>
                      <TableCell>{getStatusBadge(viatura.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {viaturasNaOficina.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma viatura registrada na oficina
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar saída */}
      <Dialog open={isSaidaDialogOpen} onOpenChange={setIsSaidaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Saída da Oficina</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaida} className="space-y-4">
            <div>
              <Label htmlFor="dataSaida">Data de Saída</Label>
              <Input
                type="date"
                value={saidaData.dataSaida}
                onChange={(e) => setSaidaData({...saidaData, dataSaida: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="observacaoServico">Observação do Serviço Realizado</Label>
              <Textarea
                value={saidaData.observacaoServico}
                onChange={(e) => setSaidaData({...saidaData, observacaoServico: e.target.value})}
                placeholder="Descreva o serviço que foi realizado..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsSaidaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Saída</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para cadastrar oficina */}
      <Dialog open={isOficinaCadastroOpen} onOpenChange={setIsOficinaCadastroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Oficina</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCadastroOficina} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Oficina</Label>
              <Input
                type="text"
                value={oficinaData.nome}
                onChange={(e) => setOficinaData({...oficinaData, nome: e.target.value})}
                placeholder="Digite o nome completo da oficina..."
                required
              />
            </div>

            <div>
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input
                type="text"
                value={oficinaData.nomeFantasia}
                onChange={(e) => setOficinaData({...oficinaData, nomeFantasia: e.target.value})}
                placeholder="Digite o nome fantasia da oficina..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsOficinaCadastroOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar Oficina</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OficinaPage;