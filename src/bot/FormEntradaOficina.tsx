
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { processarEntradaOficina, listarOficinas } from './oficinaHandler';
import type { Viatura, Oficina } from './types';

interface FormEntradaOficinaProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const FormEntradaOficina = ({ onClose, onSuccess }: FormEntradaOficinaProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cadastro: '',
    dataEntrada: new Date().toISOString().split('T')[0], // Data atual
    servicoRealizar: '',
    oficina: ''
  });

  useEffect(() => {
    fetchViaturas();
    fetchOficinas();
  }, []);

  const fetchViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Viatura;
        // Garantir que CADASTRO existe e é uma string
        if (data.CADASTRO) {
          viaturasData.push({ 
            id: doc.id, 
            ...data,
            CADASTRO: String(data.CADASTRO).trim()
          });
        }
      });
      
      // Ordenar por cadastro para facilitar localização
      viaturasData.sort((a, b) => String(a.CADASTRO).localeCompare(String(b.CADASTRO)));
      
      console.log('Viaturas carregadas:', viaturasData.length);
      setViaturas(viaturasData);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
    }
  };

  const fetchOficinas = async () => {
    try {
      const oficinasData = await listarOficinas();
      setOficinas(oficinasData);
    } catch (error) {
      console.error('Erro ao buscar oficinas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cadastro) {
      onSuccess('❌ Por favor, selecione uma viatura.');
      return;
    }
    
    setLoading(true);

    try {
      const resultado = await processarEntradaOficina(
        formData.cadastro,
        formData.dataEntrada,
        formData.servicoRealizar,
        formData.oficina
      );
      
      onSuccess(resultado);
      onClose();
    } catch (error) {
      console.error('Erro ao processar entrada:', error);
      onSuccess('Erro ao registrar entrada na oficina. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-600">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-white text-lg">Registrar Entrada na Oficina</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cadastro" className="text-gray-200">Viatura (Cadastro)</Label>
              <Select 
                value={formData.cadastro} 
                onValueChange={(value) => {
                  console.log('Viatura selecionada:', value);
                  setFormData({...formData, cadastro: value});
                }}
                required
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione a viatura" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-y-auto">
                  {viaturas.map((viatura) => {
                    const cadastroDisplay = String(viatura.CADASTRO || 'N/A');
                    const placaDisplay = String(viatura.PLACA || 'N/A');
                    const modeloDisplay = String(viatura.MODELO || 'N/A');
                    
                    return (
                      <SelectItem 
                        key={viatura.id} 
                        value={cadastroDisplay}
                        className="text-white hover:bg-gray-600 cursor-pointer"
                      >
                        {cadastroDisplay} - {placaDisplay} ({modeloDisplay})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.cadastro && (
                <p className="text-xs text-gray-400 mt-1">
                  Selecionado: {formData.cadastro}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="dataEntrada" className="text-gray-200">Data de Entrada</Label>
              <Input
                type="date"
                value={formData.dataEntrada}
                onChange={(e) => setFormData({...formData, dataEntrada: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="servicoRealizar" className="text-gray-200">Serviço a Realizar</Label>
              <Textarea
                value={formData.servicoRealizar}
                onChange={(e) => setFormData({...formData, servicoRealizar: e.target.value})}
                placeholder="Descreva o serviço a ser realizado..."
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="oficina" className="text-gray-200">Oficina</Label>
              <Select 
                value={formData.oficina} 
                onValueChange={(value) => setFormData({...formData, oficina: value})}
                required
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione a oficina" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {oficinas.map((oficina) => (
                    <SelectItem 
                      key={oficina.id} 
                      value={oficina.nome}
                      className="text-white hover:bg-gray-600"
                    >
                      {oficina.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>Registrando...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Registrar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormEntradaOficina;
