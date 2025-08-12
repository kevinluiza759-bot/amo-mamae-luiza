import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  Target, 
  Truck, 
  Users, 
  Bot, 
  Eye, 
  EyeOff, 
  Key,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

interface Sistema {
  id: string;
  nome: string;
  descricao: string;
  icon: any;
  cor: string;
  rota: string;
  acessoKey: string;
}

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  Matrícula: number;
  primeiroAcesso?: boolean;
  senha?: string;
  acessos?: {
    reservaArmamento?: boolean;
    guardaQuartel?: boolean;
    gestaoLogistica?: boolean;
    cavbot?: boolean;
  };
}

interface LoginSistemaProps {
  sistema: Sistema;
  onClose: () => void;
}

const LoginSistema = ({ sistema, onClose }: LoginSistemaProps) => {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simular verificação no Firebase
      const policial = await verificarCredenciais(matricula, senha);
      
      if (!policial) {
        setError('Matrícula ou senha incorreta');
        setLoading(false);
        return;
      }

      // Verificar se tem acesso ao sistema
      if (!verificarAcessoSistema(policial, sistema.acessoKey)) {
        setError('Você não tem acesso a este sistema. Contate o administrador.');
        setLoading(false);
        return;
      }

      // Verificar se é primeiro acesso
      if (policial.primeiroAcesso !== false || !policial.senha) {
        setPrimeiroAcesso(true);
        setLoading(false);
        return;
      }

      // Login bem-sucedido
      realizarLogin(policial);
      
    } catch (error) {
      setError('Erro interno do sistema. Tente novamente.');
      setLoading(false);
    }
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (novaSenha !== confirmSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    
    try {
      // Simular atualização no Firebase
      await atualizarSenha(matricula, novaSenha);
      
      toast({
        title: "Senha alterada com sucesso",
        description: "Sua senha foi atualizada. Faça login novamente.",
      });

      // Resetar estado
      setPrimeiroAcesso(false);
      setSenha('');
      setNovaSenha('');
      setConfirmSenha('');
      setError('');
      
    } catch (error) {
      setError('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const verificarCredenciais = async (mat: string, pass: string): Promise<Policial | null> => {
    try {
      console.log('Tentando login com matrícula:', mat, 'e senha:', pass);
      
      // Buscar policial no Firebase por matrícula (tentar como número e string)
      let querySnapshot = await getDocs(
        query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat)))
      );
      
      // Se não encontrou como número, tentar como string
      if (querySnapshot.empty) {
        console.log('Não encontrou como número, tentando como string');
        querySnapshot = await getDocs(
          query(collection(db, 'policiais'), where('Matrícula', '==', mat))
        );
      }
      
      if (querySnapshot.empty) {
        console.log('Policial não encontrado no Firebase');
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log('Dados do policial encontrado:', data);
      
      const policial: Policial = {
        id: doc.id,
        NOME: data.NOME,
        'Post/Grad': data['Post/Grad'],
        Matrícula: data.Matrícula,
        primeiroAcesso: data.primeiroAcesso !== false,
        senha: data.senha,
        acessos: data.acessos
      };

      // Se é primeiro acesso ou não tem senha definida, senha deve ser a matrícula
      if (data.primeiroAcesso !== false || !data.senha) {
        console.log('Primeiro acesso - comparando senha:', pass, 'com matrícula:', mat);
        if (pass === mat) {
          console.log('Login de primeiro acesso válido');
          return policial;
        }
      } else {
        console.log('Não é primeiro acesso - comparando senha:', pass, 'com senha salva:', data.senha);
        // Se não é primeiro acesso, verificar senha cadastrada
        if (data.senha === pass) {
          console.log('Login com senha válido');
          return policial;
        }
      }

      console.log('Credenciais inválidas');
      return null;
    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
      return null;
    }
  };

  const verificarAcessoSistema = (policial: Policial, sistemaKey: string) => {
    // Acesso policial é sempre liberado
    if (sistemaKey === 'acessoPolicial') return true;
    
    // Gestão e logística = admin
    if (sistemaKey === 'gestaoLogistica') return policial.acessos?.gestaoLogistica || false;
    
    // Outros sistemas - verificar se acessos existe
    return policial.acessos?.[sistemaKey as keyof typeof policial.acessos] || false;
  };

  const atualizarSenha = async (mat: string, novaSenha: string) => {
    try {
      // Buscar policial no Firebase por matrícula (tentar como número e string)
      let querySnapshot = await getDocs(
        query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat)))
      );
      
      // Se não encontrou como número, tentar como string
      if (querySnapshot.empty) {
        querySnapshot = await getDocs(
          query(collection(db, 'policiais'), where('Matrícula', '==', mat))
        );
      }
      
      if (querySnapshot.empty) throw new Error('Policial não encontrado');

      const docRef = querySnapshot.docs[0].ref;
      
      // Atualizar senha e marcar como não sendo mais primeiro acesso
      await updateDoc(docRef, {
        senha: novaSenha,
        primeiroAcesso: false
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  };

  const realizarLogin = (policial: Policial) => {
    // Salvar dados do usuário no localStorage ou context
    localStorage.setItem('user', JSON.stringify(policial));
    
    toast({
      title: "Login realizado com sucesso",
      description: `Bem-vindo, ${policial.NOME}!`,
    });

    // Navegar para a rota apropriada
    navigate(sistema.rota);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <sistema.icon className="h-5 w-5" />
            {sistema.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className={`inline-flex p-3 ${sistema.cor} rounded-lg mb-2`}>
              <sistema.icon className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">{sistema.descricao}</p>
          </div>

          {!primeiroAcesso ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  type="text"
                  placeholder="Digite sua matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'ACESSAR'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Este é seu primeiro acesso. É necessário criar uma nova senha.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleTrocarSenha} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="novaSenha"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmSenha">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmSenha"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmSenha}
                      onChange={(e) => setConfirmSenha(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Atualizando...' : 'ALTERAR SENHA'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginSistema;