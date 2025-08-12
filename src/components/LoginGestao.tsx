import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, IdCard } from 'lucide-react';
import cpchoqueLogo from '@/assets/cpchoque-logo.png';

const LoginGestao = () => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication logic
    if (matricula.includes('admin') || matricula === '001') {
      navigate('/admin-dashboard');
    } else {
      navigate('/user-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-military">
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-background to-tactical-medium opacity-90"></div>
      
      <Card className="w-full max-w-md bg-card border-border shadow-tactical relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-tactical-medium rounded-full p-2 border-2 border-tactical-light">
              <img 
                src={cpchoqueLogo} 
                alt="CAVALARIA Logo" 
                className="w-full h-full object-contain filter brightness-200"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-wide">
            CAVALARIA
          </CardTitle>
          <p className="text-muted-foreground text-sm font-medium">
            GESTÃO E LOGÍSTICA
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="matricula" className="text-foreground font-semibold flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                MATRÍCULA
              </Label>
              <Input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Digite sua matrícula"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                SENHA
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-tactical-light text-primary-foreground font-bold py-3 shadow-tactical-glow transition-all duration-200"
            >
              ACESSAR SISTEMA
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Voltar ao menu principal
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Sistema restrito • CAVALARIA PM-CE
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginGestao;