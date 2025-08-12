
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Calendar, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { SaldoAnual } from '@/types/fipe';

interface SaldoAnualCardProps {
  saldoAnual: SaldoAnual;
}

const SaldoAnualCard = ({ saldoAnual }: SaldoAnualCardProps) => {
  const dadosGrafico = [
    { 
      name: 'Usado', 
      value: saldoAnual.gastoUltimos12Meses, 
      fill: saldoAnual.percentualUsado > 80 ? '#ef4444' : '#f97316' 
    },
    { 
      name: 'Disponível', 
      value: saldoAnual.saldoDisponivel, 
      fill: '#22c55e' 
    }
  ];

  const getStatusIcon = () => {
    if (saldoAnual.percentualUsado > 90) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (saldoAnual.percentualUsado > 70) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    if (saldoAnual.percentualUsado > 90) return 'text-red-600';
    if (saldoAnual.percentualUsado > 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Saldo Últimos 12 Meses
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-military-accent/10 border border-military-accent/30 rounded-lg p-4">
          <p className="text-sm text-military-accent font-semibold mb-3">
            <strong>Limite Anual:</strong> 70% do valor FIPE para gastos em 12 meses
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Valor FIPE:</span>
              <div className="font-bold text-primary">
                R$ {saldoAnual.valorFipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Limite por OS:</span>
              <div className="font-bold text-military-olive">
                R$ {saldoAnual.limitePorOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Limite Anual (70%):</span>
            <span className="font-semibold text-blue-600">
              R$ {saldoAnual.limiteAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Gasto (12 meses):</span>
            <span className="font-semibold text-orange-600">
              R$ {saldoAnual.gastoUltimos12Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Saldo Restante:</span>
            <span className={`font-semibold ${getStatusColor()}`}>
              R$ {saldoAnual.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Percentual Usado:</span>
            <Badge 
              variant={saldoAnual.percentualUsado > 90 ? "destructive" : 
                     saldoAnual.percentualUsado > 70 ? "secondary" : "default"}
            >
              {saldoAnual.percentualUsado.toFixed(1)}%
            </Badge>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={dadosGrafico}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              dataKey="value"
            >
              {dadosGrafico.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => 
                `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              } 
            />
          </PieChart>
        </ResponsiveContainer>

        {saldoAnual.percentualUsado > 90 && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs text-red-800">
              <strong>Atenção:</strong> Saldo anual quase esgotado! Controle os gastos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SaldoAnualCard;
