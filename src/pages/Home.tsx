import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, MessageSquare, Truck, Target, Users, FileText, Bot } from 'lucide-react';
import cpchoqueLogo from '@/assets/cpchoque-logo.png';
import LoginSistema from '@/components/LoginSistema';

const Home = () => {
  const navigate = useNavigate();
  const [sistemaLogin, setSistemaLogin] = useState<any>(null);

  const systems = [
    {
      id: 'reserva-armamento',
      title: 'RESERVA DE ARMAMENTO',
      description: 'Controle e reserva de armamentos',
      icon: Target,
      route: '/reserva-armamento',
      acessoKey: 'reservaArmamento',
      cor: 'bg-red-500',
      requiresLogin: true
    },
    {
      id: 'guarda-quartel',
      title: 'GUARDA DO QUARTEL',
      description: 'Sistema de controle da guarda',
      icon: Shield,
      route: '/guarda-quartel',
      acessoKey: 'guardaQuartel',
      cor: 'bg-blue-500',
      requiresLogin: true
    },
    {
      id: 'gestao-logistica',
      title: 'GESTÃO E LOGÍSTICA',
      description: 'Sistema administrativo completo',
      icon: Truck,
      route: '/admin-dashboard',
      acessoKey: 'gestaoLogistica',
      cor: 'bg-green-500',
      requiresLogin: true
    },
    {
      id: 'gestao-pessoas',
      title: 'GESTÃO DE PESSOAS',
      description: 'Sistema de gestão de efetivo',
      icon: Users,
      route: '/gestao-pessoas',
      acessoKey: 'gestaoPessoas',
      cor: 'bg-blue-600',
      requiresLogin: false
    },
    {
      id: 'acesso-policial',
      title: 'ACESSO POLICIAL',
      description: 'Portal do policial',
      icon: Users,
      route: '/user-dashboard',
      acessoKey: 'acessoPolicial',
      cor: 'bg-primary',
      requiresLogin: true
    },
    {
      id: 'cavbot',
      title: 'CAVBOT',
      description: 'Assistente virtual inteligente',
      icon: Bot,
      route: '/cavbot',
      acessoKey: 'cavbot',
      cor: 'bg-purple-500',
      requiresLogin: false
    }
  ];

  const handleSystemAccess = (system: any) => {
    if (system.requiresLogin) {
      setSistemaLogin({
        id: system.acessoKey,
        nome: system.title,
        descricao: system.description,
        icon: system.icon,
        cor: system.cor,
        rota: system.route,
        acessoKey: system.acessoKey
      });
    } else {
      navigate(system.route);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-military">
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-background to-tactical-medium opacity-90"></div>
      
      <div className="max-w-6xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-tactical-medium rounded-full p-3 border-2 border-tactical-light">
              <img 
                src={cpchoqueLogo} 
                alt="CAVALARIA Logo" 
                className="w-full h-full object-contain filter brightness-200"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-wide mb-4">
            CAVALARIA
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            SISTEMA INTEGRADO DE GESTÃO OPERACIONAL
          </p>
        </div>

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((system) => (
            <Card 
              key={system.id} 
              className="bg-card border-border shadow-tactical hover:shadow-tactical-glow transition-all duration-300 cursor-pointer"
              onClick={() => handleSystemAccess(system)}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-tactical-medium rounded-lg p-3 border border-tactical-light">
                    <system.icon className="w-full h-full text-tactical-text" />
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-foreground tracking-wide">
                  {system.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-6">
                  {system.description}
                </p>
                <Button 
                  className="w-full bg-primary hover:bg-tactical-light text-primary-foreground font-bold py-3 shadow-tactical transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSystemAccess(system);
                  }}
                >
                  ACESSAR
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Login Modal */}
        {sistemaLogin && (
          <LoginSistema 
            sistema={sistemaLogin} 
            onClose={() => setSistemaLogin(null)} 
          />
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-muted-foreground">
            Sistema integrado • CAVALARIA PM-CE • DKCODE
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;