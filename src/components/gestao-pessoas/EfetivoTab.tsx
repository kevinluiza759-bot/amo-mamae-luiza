import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Search, Filter } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  Matrícula?: string;
  [key: string]: any;
}

interface EfetivoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const EfetivoTab: React.FC<EfetivoTabProps> = ({ policiais, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('ALL_SITUATIONS');
  const [filterPostGrad, setFilterPostGrad] = useState('ALL_GRADUATIONS');
  const [editingPolicial, setEditingPolicial] = useState<Policial | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Função para ordenar por Post/Graduação (mesma lógica do PolicialTable)
  const getPostGradOrder = (postGrad: string): number => {
    const ordem = {
      'TEN CEL': 1, 'MAJ': 2, 'CAP': 3, '1º TEN': 4, '2º TEN': 5,
      '1º SGT': 6, '2º SGT': 7, '3º SGT': 8, 'CB': 9, 'SD': 10
    };
    return ordem[postGrad as keyof typeof ordem] || 999;
  };

  const hasCmtRpmont = (policial: Policial): boolean => {
    return policial['FUNÇÃO']?.includes('CMT RPMONT') || false;
  };

  const shouldCapComeFirst = (policial: Policial): boolean => {
    return policial['Post/Grad'] === 'CAP' && hasCmtRpmont(policial);
  };

  // Filtrar e ordenar policiais
  const filteredPoliciais = policiais
    .filter(policial => {
      const matchesSearch = !searchTerm || 
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSituacao = filterSituacao === 'ALL_SITUATIONS' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      const matchesPostGrad = filterPostGrad === 'ALL_GRADUATIONS' || !filterPostGrad || policial['Post/Grad'] === filterPostGrad;
      
      return matchesSearch && matchesSituacao && matchesPostGrad;
    })
    .sort((a, b) => {
      if (shouldCapComeFirst(a) && !shouldCapComeFirst(b)) return -1;
      if (!shouldCapComeFirst(a) && shouldCapComeFirst(b)) return 1;
      if (hasCmtRpmont(a) && !hasCmtRpmont(b)) return -1;
      if (!hasCmtRpmont(a) && hasCmtRpmont(b)) return 1;
      return getPostGradOrder(a['Post/Grad'] || '') - getPostGradOrder(b['Post/Grad'] || '');
    });

  // Obter valores únicos para filtros
  const situacoes = [...new Set(policiais.map(p => p.SITUAÇÃO).filter(Boolean))];
  const postGrads = [...new Set(policiais.map(p => p['Post/Grad']).filter(Boolean))];

  const handleEditPolicial = async (updatedData: Partial<Policial>) => {
    if (!editingPolicial) return;

    setLoading(true);
    try {
      const policialRef = doc(db, 'policiais', editingPolicial.id);
      await updateDoc(policialRef, updatedData);

      toast({
        title: "Sucesso",
        description: "Dados do policial atualizados com sucesso"
      });

      setEditingPolicial(null);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do policial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Efetivo Total ({filteredPoliciais.length} de {policiais.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, graduação ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-situacao">Situação</Label>
              <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_SITUATIONS">Todas as situações</SelectItem>
                  {situacoes.map(situacao => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-postgrad">Post/Graduação</Label>
              <Select value={filterPostGrad} onValueChange={setFilterPostGrad}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as graduações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_GRADUATIONS">Todas as graduações</SelectItem>
                  {postGrads.map(postGrad => (
                    <SelectItem key={postGrad} value={postGrad}>
                      {postGrad}
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
                  setFilterSituacao('ALL_SITUATIONS');
                  setFilterPostGrad('ALL_GRADUATIONS');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post/Grad</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoliciais.map((policial) => (
                  <TableRow key={policial.id}>
                    <TableCell className="font-medium">
                      {policial['Post/Grad']}
                    </TableCell>
                    <TableCell>{policial.NOME}</TableCell>
                    <TableCell>{policial.Matrícula || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        policial.SITUAÇÃO?.includes('FÉRIAS') ? 'secondary' :
                        policial.SITUAÇÃO?.includes('LICENÇA') ? 'destructive' :
                        'default'
                      }>
                        {policial.SITUAÇÃO}
                      </Badge>
                    </TableCell>
                    <TableCell>{policial['FUNÇÃO']}</TableCell>
                    <TableCell>{policial.Unidade}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPolicial(policial)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {editingPolicial?.id === policial.id && (
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Policial</DialogTitle>
                              <DialogDescription>
                                Edite os dados de {policial['Post/Grad']} {policial.NOME}
                              </DialogDescription>
                            </DialogHeader>
                            <EditPolicialForm
                              policial={editingPolicial}
                              onSave={handleEditPolicial}
                              onCancel={() => setEditingPolicial(null)}
                              loading={loading}
                            />
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPoliciais.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum policial encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para editar policial
const EditPolicialForm: React.FC<{
  policial: Policial;
  onSave: (data: Partial<Policial>) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ policial, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    NOME: policial.NOME || '',
    'Post/Grad': policial['Post/Grad'] || '',
    SITUAÇÃO: policial.SITUAÇÃO || '',
    'FUNÇÃO': policial['FUNÇÃO'] || '',
    Unidade: policial.Unidade || '',
    Matrícula: policial.Matrícula || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={formData.NOME}
            onChange={(e) => setFormData(prev => ({ ...prev, NOME: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="postgrad">Post/Graduação</Label>
          <Input
            id="postgrad"
            value={formData['Post/Grad']}
            onChange={(e) => setFormData(prev => ({ ...prev, 'Post/Grad': e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="situacao">Situação</Label>
          <Input
            id="situacao"
            value={formData.SITUAÇÃO}
            onChange={(e) => setFormData(prev => ({ ...prev, SITUAÇÃO: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="funcao">Função</Label>
          <Input
            id="funcao"
            value={formData['FUNÇÃO']}
            onChange={(e) => setFormData(prev => ({ ...prev, 'FUNÇÃO': e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="unidade">Unidade</Label>
          <Input
            id="unidade"
            value={formData.Unidade}
            onChange={(e) => setFormData(prev => ({ ...prev, Unidade: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="matricula">Matrícula</Label>
          <Input
            id="matricula"
            value={formData.Matrícula}
            onChange={(e) => setFormData(prev => ({ ...prev, Matrícula: e.target.value }))}
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default EfetivoTab;