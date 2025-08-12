import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, UserCheck, Users, Plus, Trash2, Search } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  Matrícula?: string;
  acessoGestao?: boolean;
  perfilGestao?: string;
}

const AcessoGestao: React.FC = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [policiaisComAcesso, setPoliciaisComAcesso] = useState<Policial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPolicial, setSelectedPolicial] = useState<string>('');
  const [perfilSelecionado, setPerfilSelecionado] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPoliciais();
  }, []);

  const fetchPoliciais = async () => {
    try {
      setLoading(true);
      const policiaisRef = collection(db, 'policiais');
      const querySnapshot = await getDocs(policiaisRef);
      
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Policial[];
      
      setPoliciais(policiaisData);
      setPoliciaisComAcesso(policiaisData.filter(p => p.acessoGestao));
    } catch (error) {
      console.error('Erro ao buscar policiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConcederAcesso = async () => {
    if (!selectedPolicial || !perfilSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um policial e um perfil",
        variant: "destructive"
      });
      return;
    }

    try {
      const policialRef = doc(db, 'policiais', selectedPolicial);
      await updateDoc(policialRef, {
        acessoGestao: true,
        perfilGestao: perfilSelecionado
      });

      toast({
        title: "Sucesso",
        description: "Acesso concedido com sucesso"
      });

      fetchPoliciais();
      setSelectedPolicial('');
      setPerfilSelecionado('');
    } catch (error) {
      console.error('Erro ao conceder acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao conceder acesso",
        variant: "destructive"
      });
    }
  };

  const handleRevogarAcesso = async (policialId: string) => {
    try {
      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        acessoGestao: false,
        perfilGestao: null
      });

      toast({
        title: "Sucesso",
        description: "Acesso revogado com sucesso"
      });

      fetchPoliciais();
    } catch (error) {
      console.error('Erro ao revogar acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao revogar acesso",
        variant: "destructive"
      });
    }
  };

  const policiaisSemAcesso = policiais.filter(p => !p.acessoGestao);
  const policiaisFiltrados = policiaisComAcesso.filter(p => 
    p.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadgeVariant = (perfil: string) => {
    switch (perfil) {
      case 'ADMINISTRADOR': return 'destructive';
      case 'GESTOR': return 'default';
      case 'OPERADOR': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Acesso - Gestão de Pessoas</h1>
          <p className="text-muted-foreground">Gerencie quem tem acesso ao sistema de gestão</p>
        </div>
        <Button onClick={() => window.location.href = '/admin-dashboard'} variant="outline">
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conceder Acesso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Conceder Acesso
            </CardTitle>
            <CardDescription>
              Selecione um policial e defina o perfil de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Policial</Label>
              <Select value={selectedPolicial} onValueChange={setSelectedPolicial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um policial" />
                </SelectTrigger>
                <SelectContent>
                  {policiaisSemAcesso.map(policial => (
                    <SelectItem key={policial.id} value={policial.id}>
                      {policial['Post/Grad']} {policial.NOME}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Perfil de Acesso</Label>
              <Select value={perfilSelecionado} onValueChange={setPerfilSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMINISTRADOR">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="GESTOR">Gestor (Leitura e Edição)</SelectItem>
                  <SelectItem value="OPERADOR">Operador (Apenas Leitura)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleConcederAcesso}
              disabled={!selectedPolicial || !perfilSelecionado}
              className="w-full"
            >
              Conceder Acesso
            </Button>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Estatísticas de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{policiaisComAcesso.length}</div>
                <div className="text-sm text-muted-foreground">Com Acesso</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{policiaisSemAcesso.length}</div>
                <div className="text-sm text-muted-foreground">Sem Acesso</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {policiaisComAcesso.filter(p => p.perfilGestao === 'ADMINISTRADOR').length}
                </div>
                <div className="text-sm text-muted-foreground">Administradores</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {policiaisComAcesso.filter(p => p.perfilGestao === 'GESTOR').length}
                </div>
                <div className="text-sm text-muted-foreground">Gestores</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Policiais com Acesso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Policiais com Acesso ({policiaisComAcesso.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou graduação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post/Grad</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policiaisFiltrados.map(policial => (
                <TableRow key={policial.id}>
                  <TableCell className="font-medium">{policial['Post/Grad']}</TableCell>
                  <TableCell>{policial.NOME}</TableCell>
                  <TableCell>{policial.Matrícula || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(policial.perfilGestao || '')}>
                      {policial.perfilGestao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevogarAcesso(policial.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revogar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {policiaisFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum policial encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcessoGestao;