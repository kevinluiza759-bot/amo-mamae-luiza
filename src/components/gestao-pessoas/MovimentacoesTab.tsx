import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoveRight, Users, AlertTriangle } from 'lucide-react';
import { doc, deleteDoc, addDoc, collection } from 'firebase/firestore';
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

interface MovimentacoesTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const MovimentacoesTab: React.FC<MovimentacoesTabProps> = ({ policiais, onUpdate }) => {
  const [selectedPolicial, setSelectedPolicial] = useState<string>('');
  const [destino, setDestino] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleTransferirPolicial = async () => {
    if (!selectedPolicial || !destino) {
      toast({
        title: "Erro",
        description: "Selecione um policial e informe o destino",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === selectedPolicial);
      if (!policial) {
        throw new Error('Policial não encontrado');
      }

      // Criar registro na coleção de transferidos
      const transferidoData = {
        ...policial,
        dataTransferencia: new Date().toISOString(),
        destino,
        publicacao,
        unidadeOrigem: policial.Unidade
      };

      // Remover o campo 'id' do documento para evitar conflitos
      const { id, ...dadosSemId } = transferidoData;

      await addDoc(collection(db, 'policiais_transferidos'), dadosSemId);

      // Remover da coleção original
      await deleteDoc(doc(db, 'policiais', selectedPolicial));

      toast({
        title: "Sucesso",
        description: `${policial['Post/Grad']} ${policial.NOME} transferido para ${destino}`
      });

      // Reset form
      setSelectedPolicial('');
      setDestino('');
      setPublicacao('');
      setShowConfirmDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao transferir policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar transferência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPolicialData = policiais.find(p => p.id === selectedPolicial);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoveRight className="h-5 w-5" />
            Transferência de Policiais
          </CardTitle>
          <CardDescription>
            Transferir policiais para outras unidades (ação irreversível)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Transferência */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="policial">Selecionar Policial</Label>
                <Select value={selectedPolicial} onValueChange={setSelectedPolicial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um policial" />
                  </SelectTrigger>
                  <SelectContent>
                    {policiais.map(policial => (
                      <SelectItem key={policial.id} value={policial.id}>
                        {policial['Post/Grad']} {policial.NOME} - {policial.Unidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="destino">Unidade de Destino</Label>
                <Input
                  id="destino"
                  placeholder="Ex: 1º BPM, CPCHOQUE, etc."
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="publicacao">Publicação</Label>
                <Input
                  id="publicacao"
                  placeholder="Ex: Portaria nº 123/2024"
                  value={publicacao}
                  onChange={(e) => setPublicacao(e.target.value)}
                />
              </div>

              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!selectedPolicial || !destino || loading}
                className="w-full"
                variant="destructive"
              >
                Transferir Policial
              </Button>
            </div>

            {/* Dados do Policial Selecionado */}
            {selectedPolicialData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados do Policial</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Nome:</div>
                    <div>{selectedPolicialData.NOME}</div>
                    
                    <div className="font-medium">Post/Grad:</div>
                    <div>{selectedPolicialData['Post/Grad']}</div>
                    
                    <div className="font-medium">Matrícula:</div>
                    <div>{selectedPolicialData.Matrícula || 'N/A'}</div>
                    
                    <div className="font-medium">Situação:</div>
                    <div>
                      <Badge variant="outline">
                        {selectedPolicialData.SITUAÇÃO}
                      </Badge>
                    </div>
                    
                    <div className="font-medium">Função:</div>
                    <div>{selectedPolicialData['FUNÇÃO']}</div>
                    
                    <div className="font-medium">Unidade Atual:</div>
                    <div className="font-medium text-primary">
                      {selectedPolicialData.Unidade}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Atenção - Ação Irreversível</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ao transferir um policial, ele será removido da coleção atual e movido para 
                  a coleção "policiais_transferidos". Esta ação não pode ser desfeita através 
                  do sistema.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Transferência
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O policial será removido da unidade atual.
            </DialogDescription>
          </DialogHeader>

          {selectedPolicialData && (
            <div className="my-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Dados da Transferência:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Policial:</span> {selectedPolicialData['Post/Grad']} {selectedPolicialData.NOME}</p>
                <p><span className="font-medium">De:</span> {selectedPolicialData.Unidade}</p>
                <p><span className="font-medium">Para:</span> {destino}</p>
                {publicacao && <p><span className="font-medium">Publicação:</span> {publicacao}</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferirPolicial}
              disabled={loading}
            >
              {loading ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Policiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policiais.length}</div>
            <p className="text-xs text-muted-foreground">Na unidade atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {policiais.filter(p => 
                p.SITUAÇÃO === 'MONTADO - POLICIAMENTO OSTENSIVO' || 
                p.SITUAÇÃO === 'ATIVO'
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Para transferência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Situações Especiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {policiais.filter(p => 
                p.SITUAÇÃO?.includes('FÉRIAS') || 
                p.SITUAÇÃO?.includes('LICENÇA') ||
                p.SITUAÇÃO?.includes('LUTO') ||
                p.SITUAÇÃO?.includes('CURSANDO')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Férias, licenças, etc.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MovimentacoesTab;