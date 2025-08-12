import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Package, 
  Target, 
  Truck, 
  Users, 
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight,
  FileText,
  AlertCircle
} from 'lucide-react';

interface TacticalSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isAdmin?: boolean;
}

const TacticalSidebar = ({ activeSection, onSectionChange, isAdmin = false }: TacticalSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const adminMenuItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: Home, badge: null },
    { id: 'patrimonio', label: 'PATRIMÔNIO', icon: Package, badge: null },
    { id: 'belico', label: 'BÉLICO', icon: Target, badge: null },
    { id: 'frota', label: 'FROTA', icon: Truck, badge: null },
    { id: 'policial', label: 'POLICIAL', icon: Users, badge: null },
    { id: 'gestao', label: 'GESTÃO', icon: Shield, badge: null },
    { id: 'gestao-pessoas', label: 'GESTÃO PESSOAS', icon: Users, badge: null },
    { id: 'documentos', label: 'DOCUMENTOS', icon: FileText, badge: null },
    { id: 'ordens-servico', label: 'OS\'s', icon: FileText, badge: null },
    { id: 'servicos', label: 'SERVIÇOS', icon: FileText, badge: null },
  ];

  const userMenuItems = [
    { id: 'dashboard', label: 'INFORMAÇÕES', icon: Home, badge: null },
    { id: 'reserva', label: 'RESERVA DE ARMAMENTO', icon: Target, badge: null },
    { id: 'avarias', label: 'AVARIAS', icon: AlertCircle, badge: null },
  ];

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-sidebar-background border-r border-sidebar-border transition-all duration-300 flex flex-col shadow-tactical`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sidebar-primary rounded">
                <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sidebar-foreground font-bold text-lg tracking-wide">
                  CAVALARIA
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'ADMIN' : 'POLICIAL'}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Button
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`w-full justify-start h-12 ${
                  activeSection === item.id 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-tactical-glow' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                } ${isCollapsed ? 'px-2' : 'px-4'}`}
                onClick={() => onSectionChange(item.id)}
              >
                <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left font-semibold tracking-wide">
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {activeSection === item.id && (
                      <ChevronRight className="h-4 w-4 ml-2" />
                    )}
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="mb-4 p-3 bg-tactical-medium rounded border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-foreground">SISTEMA ATIVO</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Versão 2.1.0 - OPERACIONAL
            </p>
          </div>
        )}
        
        <Button
          variant="ghost"
          className={`w-full justify-start text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground ${
            isCollapsed ? 'px-2' : 'px-4'
          }`}
          onClick={() => window.location.href = '/'}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="font-semibold">SAIR</span>}
        </Button>
      </div>
    </aside>
  );
};

export default TacticalSidebar;