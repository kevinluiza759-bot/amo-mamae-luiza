
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, Calendar } from 'lucide-react';
import { ViaturaFipe } from '@/types/fipe';
import { format } from 'date-fns';

interface ConfiguracaoFipeProps {
  viaturaFipe: ViaturaFipe | null;
  onSalvar: (valor: number) => Promise<boolean>;
  saving: boolean;
}

const ConfiguracaoFipe = ({ viaturaFipe, onSalvar, saving }: ConfiguracaoFipeProps) => {
  const [valorInput, setValorInput] = useState('');
  const { toast } = useToast();

  const formatarMoeda = (valor: string) => {
    // Remove tudo que não é dígito
    const numeros = valor.replace(/\D/g, '');
    
    // Converte para centavos
    const valorCentavos = parseInt(numeros) || 0;
    
    // Formata como moeda
    return (valorCentavos / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const valorFormatado = formatarMoeda(valor);
    setValorInput(valorFormatado);
  };

  const handleSalvar = async () => {
    if (!valorInput) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido.",
        variant: "destructive",
      });
      return;
    }

    // Converter para centavos
    const numeros = valorInput.replace(/\D/g, '');
    const valorCentavos = parseInt(numeros) || 0;

    if (valorCentavos < 100) {
      toast({
        title: "Erro", 
        description: "O valor deve ser maior que R$ 1,00.",
        variant: "destructive",
      });
      return;
    }

    const sucesso = await onSalvar(valorCentavos);
    
    if (sucesso) {
      toast({
        title: "Sucesso",
        description: "Valor FIPE atualizado com sucesso!",
      });
      setValorInput('');
    } else {
      toast({
        title: "Erro",
        description: "Erro ao salvar valor FIPE.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          Configuração Valor FIPE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {viaturaFipe ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-military-accent/10 border border-military-accent/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Atual FIPE</p>
                <p className="text-xl font-bold text-military-accent">
                  {(viaturaFipe.valorFipe / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
              </div>
              <div className="bg-card border border-border rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-military-olive" />
                  <span className="text-sm font-medium text-foreground">
                    {format(viaturaFipe.dataAtualizacao, 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <Label htmlFor="novo-valor-fipe" className="text-sm font-medium">
                Atualizar Valor FIPE
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="novo-valor-fipe"
                  placeholder="R$ 0,00"
                  value={valorInput}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSalvar} 
                  disabled={saving || !valorInput}
                  size="sm"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-military-warning/10 border border-military-warning/30 rounded-lg">
              <p className="text-sm text-military-warning font-semibold">
                <strong>Valor FIPE não configurado.</strong> Configure o valor da tabela FIPE para habilitar o controle de saldo anual.
              </p>
            </div>
            
            <div>
              <Label htmlFor="valor-fipe" className="text-sm font-medium">
                Valor FIPE da Viatura
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="valor-fipe"
                  placeholder="R$ 0,00"
                  value={valorInput}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSalvar} 
                  disabled={saving || !valorInput}
                  size="sm"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Configurar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfiguracaoFipe;
