import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Mail } from 'lucide-react';
import cpchoqueLogo from '@/assets/cpchoque-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication logic
    if (email.includes('admin')) {
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
                alt="CPCHOQUE Logo" 
                className="w-full h-full object-contain filter brightness-200"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-wide">
            CAVALARIA - CPCHOQUE
          </CardTitle>
          <p className="text-muted-foreground text-sm font-medium">
            SISTEMA ADMINSTRATIVO P4
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-MAIL
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
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
            <p className="text-xs text-muted-foreground">
              SISTEMA RESTRITO - CAVALARIA - CPCHOQUE
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;