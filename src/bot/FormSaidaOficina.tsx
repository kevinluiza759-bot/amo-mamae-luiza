import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { processarSaidaOficina } from './oficinaHandler';
import type { ViaturaNaOficina } from './types';

interface FormSaidaOficinaProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const FormSaidaOficina = ({ onClose, onSuccess }: FormSaidaOficinaProps) => {
  const [viaturasNaOficina, setViaturasNaOficina] = useState<ViaturaNaOficina[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cadastro: '',
    dataSaida: new Date().toISOString().split('T')[0], // Data atual
    observacaoServico: ''
  });

  useEffect(() => {
    fetchViaturasNaOficina();
  }, []);

  const fetchViaturasNaOficina = async () => {
    try {
      const q = query(
        collection(db, 'oficina'),
        where('status', '==', 'na-oficina')
      );
      const querySnapshot = await getDocs(q);
      const viaturasData: ViaturaNaOficina[] = [];
      querySnapshot.forEach((doc) => {
        viaturasData.push({ id: doc.id, ...doc.data() } as ViaturaNaOficina);
      });
      setViaturasNaOficina(viaturasData);
    } catch (error) {
      console.error('Erro ao buscar viaturas na oficina:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resultado = await processarSaidaOficina(
        formData.cadastro,
        formData.dataSaida,
        formData.observacaoServico
      );
      
      onSuccess(resultado);
      onClose();
    } catch (error) {
      console.error('Erro ao processar saída:', error);
      onSuccess('Erro ao registrar saída da oficina. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedViatura = viaturasNaOficina.find(v => v.cadastro === formData.cadastro);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-600">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-white text-lg">Registrar Saída da Oficina</CardTitle>
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
          {viaturasNaOficina.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-300 mb-4">Nenhuma viatura está atualmente na oficina.</p>
              <Button 
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="cadastro" className="text-gray-200">Viatura na Oficina</Label>
                <Select 
                  value={formData.cadastro} 
                  onValueChange={(value) => setFormData({...formData, cadastro: value})}
                  required
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione a viatura" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {viaturasNaOficina.map((viatura) => (
                      <SelectItem 
                        key={viatura.id} 
                        value={viatura.cadastro}
                        className="text-white hover:bg-gray-600"
                      >
                        {viatura.cadastro} - {viatura.placa} ({viatura.oficina})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedViatura && (
                <div className="bg-gray-700 p-3 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Informações da Viatura:</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><strong>Oficina:</strong> {selectedViatura.oficina}</p>
                    <p><strong>Entrada:</strong> {new Date(selectedViatura.dataEntrada).toLocaleDateString()}</p>
                    <p><strong>Serviço:</strong> {selectedViatura.servicoRealizar}</p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="dataSaida" className="text-gray-200">Data de Saída</Label>
                <Input
                  type="date"
                  value={formData.dataSaida}
                  onChange={(e) => setFormData({...formData, dataSaida: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="observacaoServico" className="text-gray-200">Serviço Realizado</Label>
                <Textarea
                  value={formData.observacaoServico}
                  onChange={(e) => setFormData({...formData, observacaoServico: e.target.value})}
                  placeholder="Descreva o serviço realizado na oficina..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  rows={3}
                  required
                />
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
                      Registrar Saída
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormSaidaOficina;