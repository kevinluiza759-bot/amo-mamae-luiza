import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Shield, 
  Target, 
  Truck, 
  Users, 
  Bot,
  Eye,
  EyeOff,
  Key,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  Matrícula: number;
  FUNÇÃO: string;
  NUMERAL?: number;
  senha?: string;
  primeiroAcesso?: boolean;
  acessos?: {
    reservaArmamento?: boolean;
    guardaQuartel?: boolean;
    gestaoLogistica?: boolean;
    cavbot?: boolean;
  };
}

interface Sistema {
  id: string;
  nome: string;
  descricao: string;
  icon: any;
  cor: string;
}

const GestaoAcesso = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<Policial | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const sistemas: Sistema[] = [
    {
      id: 'reservaArmamento',
      nome: 'RESERVA DE ARMAMENTO',
      descricao: 'Controle e reserva de armamentos',
      icon: Target,
      cor: 'bg-red-500'
    },
    {
      id: 'guardaQuartel',
      nome: 'GUARDA DO QUARTEL',
      descricao: 'Sistema de controle da guarda',
      icon: Shield,
      cor: 'bg-blue-500'
    },
    {
      id: 'gestaoLogistica',
      nome: 'GESTÃO E LOGÍSTICA',
      descricao: 'Sistema administrativo completo',
      icon: Truck,
      cor: 'bg-green-500'
    },
    {
      id: 'cavbot',
      nome: 'CAVBOT',
      descricao: 'Assistente virtual inteligente',
      icon: Bot,
      cor: 'bg-purple-500'
    }
  ];

  useEffect(() => {
    // Carregar dados dos policiais do Firebase
    const carregarPoliciais = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'policiais'));
        const policiaisData: Policial[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Verificar se os dados essenciais existem
          if (data.NOME && data['Post/Grad'] && data.Matrícula) {
            policiaisData.push({
              id: doc.id,
              NOME: data.NOME,
              'Post/Grad': data['Post/Grad'],
              Matrícula: data.Matrícula,
              FUNÇÃO: data.FUNÇÃO || 'Não definida',
              NUMERAL: data.NUMERAL,
              primeiroAcesso: data.primeiroAcesso !== false, // Default true se não existir
              senha: data.senha,
              acessos: data.acessos || {
                reservaArmamento: false,
                guardaQuartel: false,
                gestaoLogistica: false,
                cavbot: false
              }
            });
          } else {
            console.warn('Dados incompletos para policial:', doc.id, data);
          }
        });
        
        setPoliciais(policiaisData);
      } catch (error) {
        console.error('Erro ao carregar policiais:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados dos policiais",
          variant: "destructive"
        });
      }
    };

    carregarPoliciais();
  }, [toast]);

  const filteredPoliciais = policiais.filter(policial => {
    if (!policial.NOME || !policial['Post/Grad'] || !policial.Matrícula) {
      return false;
    }
    
    return policial.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
           policial['Post/Grad'].toLowerCase().includes(searchTerm.toLowerCase()) ||
           policial.Matrícula.toString().includes(searchTerm);
  });

  const handleAcessoToggle = async (sistema: string, valor: boolean) => {
    if (!selectedPolicial) return;

    try {
      // Atualizar no Firebase
      const policialRef = doc(db, 'policiais', selectedPolicial.id);
      await updateDoc(policialRef, {
        [`acessos.${sistema}`]: valor
      });

      // Atualizar estado local
      const updatedPoliciais = policiais.map(p => 
        p.id === selectedPolicial.id 
          ? { 
              ...p, 
              acessos: { 
                ...p.acessos, 
                [sistema]: valor 
              } 
            }
          : p
      );

      setPoliciais(updatedPoliciais);
      setSelectedPolicial(prev => prev ? {
        ...prev,
        acessos: { ...prev.acessos, [sistema]: valor }
      } : null);

      toast({
        title: "Acesso Atualizado",
        description: `Acesso ao ${sistemas.find(s => s.id === sistema)?.nome} ${valor ? 'liberado' : 'removido'} para ${selectedPolicial.NOME}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão",
        variant: "destructive"
      });
    }
  };

  const resetarSenha = async () => {
    if (!selectedPolicial) return;

    try {
      // Atualizar no Firebase
      const policialRef = doc(db, 'policiais', selectedPolicial.id);
      await updateDoc(policialRef, {
        senha: null,
        primeiroAcesso: true
      });

      // Atualizar estado local
      const updatedPoliciais = policiais.map(p => 
        p.id === selectedPolicial.id 
          ? { ...p, senha: undefined, primeiroAcesso: true }
          : p
      );

      setPoliciais(updatedPoliciais);
      setSelectedPolicial(prev => prev ? {
        ...prev,
        senha: undefined,
        primeiroAcesso: true
      } : null);

      toast({
        title: "Senha Resetada",
        description: `Senha resetada para ${selectedPolicial.NOME}. Próximo login será com a matrícula.`,
      });
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      toast({
        title: "Erro",
        description: "Erro ao resetar senha",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            GESTÃO DE ACESSO AOS SISTEMAS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Policiais */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, posto ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPoliciais.map((policial) => (
                  <div
                    key={policial.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPolicial?.id === policial.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPolicial(policial)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{policial.NOME}</p>
                        <p className="text-sm text-muted-foreground">
                          {policial['Post/Grad']} {policial.NUMERAL || ''} - Mat: {policial.Matrícula}
                        </p>
                        <p className="text-xs text-muted-foreground">{policial.FUNÇÃO}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={policial.primeiroAcesso ? 'destructive' : 'default'}>
                          {policial.primeiroAcesso ? 'PRIMEIRO ACESSO' : 'ATIVO'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Object.values(policial.acessos || {}).filter(Boolean).length} sistemas
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalhes do Policial Selecionado */}
            <div className="space-y-4">
              {selectedPolicial ? (
                <>
                  <Card className="bg-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{selectedPolicial.NOME}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedPolicial['Post/Grad']} {selectedPolicial.NUMERAL || ''} - Matrícula: {selectedPolicial.Matrícula}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          <span className="text-sm">Status da Senha:</span>
                          <Badge variant={selectedPolicial.primeiroAcesso ? 'destructive' : 'default'}>
                            {selectedPolicial.primeiroAcesso ? 'PRIMEIRO ACESSO' : 'CONFIGURADA'}
                          </Badge>
                        </div>

                        {selectedPolicial.senha && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Senha atual:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-background px-2 py-1 rounded">
                                {showPassword ? selectedPolicial.senha : '••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetarSenha}
                          className="w-full"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Resetar Senha
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Acesso aos Sistemas</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Configure os sistemas que o policial pode acessar
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Acesso Policial - Sempre habilitado */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded">
                              <Users className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">ACESSO POLICIAL</p>
                              <p className="text-sm text-muted-foreground">Portal do policial</p>
                            </div>
                          </div>
                          <Badge variant="default">SEMPRE ATIVO</Badge>
                        </div>

                        {/* Outros sistemas */}
                        {sistemas.map((sistema) => (
                          <div key={sistema.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${sistema.cor} rounded`}>
                                <sistema.icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{sistema.nome}</p>
                                <p className="text-sm text-muted-foreground">{sistema.descricao}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={selectedPolicial.acessos?.[sistema.id as keyof typeof selectedPolicial.acessos] || false}
                                onCheckedChange={(checked) => handleAcessoToggle(sistema.id, checked)}
                              />
                              <Label className="text-sm">
                                {selectedPolicial.acessos?.[sistema.id as keyof typeof selectedPolicial.acessos] ? 'Ativo' : 'Inativo'}
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um policial para gerenciar seus acessos
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoAcesso;