import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Plus,
  Camera,
  MapPin,
  Calendar,
  User,
  X
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Avaria {
  id: string;
  x: number;
  y: number;
  tipo: string;
  descricao: string;
  data: string;
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  status: 'PENDENTE' | 'EM_REPARO' | 'RESOLVIDA';
  responsavel: string;
  angulo: 'frontal' | 'traseira' | 'esquerdo' | 'direito';
  reportadoPorPolicial: boolean;
}

interface ViaturaAvarias {
  placaViatura: string;
  modeloViatura: string;
  cadastroViatura: string;
  imagemFrontal?: string;
  imagemTraseira?: string;
  imagemLadoEsquerdo?: string;
  imagemLadoDireito?: string;
  avarias: Avaria[];
}

const UserViaturaAvarias = () => {
  const [viaturaAtual, setViaturaAtual] = useState<string>('');
  const [avariasData, setAvariasData] = useState<ViaturaAvarias[]>([]);
  const [viaturasFrota, setViaturasFrota] = useState<any[]>([]);
  const [anguloAtivo, setAnguloAtivo] = useState<'frontal' | 'traseira' | 'esquerdo' | 'direito'>('frontal');
  const [marcandoAvaria, setMarcandoAvaria] = useState(false);
  const [novaAvaria, setNovaAvaria] = useState({
    tipo: '',
    descricao: '',
    gravidade: 'LEVE' as const,
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [avariaDetalhes, setAvariaDetalhes] = useState<Avaria | null>(null);
  const [posicaoTemporaria, setPosicaoTemporaria] = useState<{x: number, y: number} | null>(null);
  const imagemRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    carregarViaturasFrota();
  }, []);

  const carregarViaturasFrota = async () => {
    try {
      const frotaRef = collection(db, 'frota');
      const snapshot = await getDocs(frotaRef);
      
      const viaturas: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        viaturas.push({
          id: doc.id,
          cadastro: data.CADASTRO,
          placa: data.PLACA,
          modelo: data.MODELO,
          imagemFrontal: data.imagemFrontal || '',
          imagemTraseira: data.imagemTraseira || '',
          imagemLadoEsquerdo: data.imagemEsquerdo || data.imagemLadoEsquerdo || '',
          imagemLadoDireito: data.imagemDireito || data.imagemLadoDireito || '',
          avarias: data.avarias || []
        });
      });
      
      setViaturasFrota(viaturas);
      
      // Converter para formato de avarias
      const dadosAvarias: ViaturaAvarias[] = viaturas.map(v => ({
        placaViatura: v.placa,
        modeloViatura: v.modelo,
        cadastroViatura: v.cadastro,
        imagemFrontal: v.imagemFrontal,
        imagemTraseira: v.imagemTraseira,
        imagemLadoEsquerdo: v.imagemLadoEsquerdo,
        imagemLadoDireito: v.imagemLadoDireito,
        avarias: v.avarias
      }));
      
      setAvariasData(dadosAvarias);
      console.log('Viaturas carregadas no usuário:', viaturas);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas do banco de dados",
        variant: "destructive",
      });
    }
  };

  const handleImagemClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!marcandoAvaria || !imagemRef.current) return;

    const rect = imagemRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setPosicaoTemporaria({ x, y });
    setModalAberto(true);
  };

  const handleAvariaClick = (avaria: Avaria) => {
    setAvariaDetalhes(avaria);
    setModalDetalhesAberto(true);
  };

  const salvarAvaria = async () => {
    if (!posicaoTemporaria || !viaturaAtual || !novaAvaria.tipo) return;

    try {
      const viaturaEncontrada = viaturasFrota.find(v => v.placa === viaturaAtual);
      if (!viaturaEncontrada) return;

      const policialNome = 'CABO JOÃO DA SILVA'; // Em produção, vem do contexto do usuário logado

      const avaria: Avaria = {
        id: Date.now().toString(),
        x: posicaoTemporaria.x,
        y: posicaoTemporaria.y,
        tipo: novaAvaria.tipo,
        descricao: novaAvaria.descricao,
        data: new Date().toISOString().split('T')[0],
        gravidade: novaAvaria.gravidade,
        status: 'PENDENTE',
        responsavel: policialNome,
        angulo: anguloAtivo,
        reportadoPorPolicial: true
      };

      // Atualizar avarias da viatura
      const avariasAtualizadas = [...(viaturaEncontrada.avarias || []), avaria];

      // Salvar no Firebase (coleção frota)
      const viaturaRef = doc(db, 'frota', viaturaEncontrada.id);
      await updateDoc(viaturaRef, {
        avarias: avariasAtualizadas
      });

      // Atualizar estado local
      setViaturasFrota(prev => 
        prev.map(v => 
          v.id === viaturaEncontrada.id 
            ? { ...v, avarias: avariasAtualizadas }
            : v
        )
      );

      setAvariasData(prev => 
        prev.map(v => 
          v.placaViatura === viaturaAtual
            ? { ...v, avarias: avariasAtualizadas }
            : v
        )
      );

      // Notificar administradores
      toast({
        title: "Avaria Registrada",
        description: `Nova avaria registrada pelo policial ${policialNome} na viatura ${viaturaAtual}`,
      });

      // Reset
      setNovaAvaria({
        tipo: '',
        descricao: '',
        gravidade: 'LEVE',
      });
      setPosicaoTemporaria(null);
      setModalAberto(false);
      setMarcandoAvaria(false);
    } catch (error) {
      console.error('Erro ao salvar avaria:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaria",
        variant: "destructive",
      });
    }
  };

  const getViaturaAtualData = () => {
    return avariasData.find(v => v.placaViatura === viaturaAtual);
  };

  const getImagemAtual = () => {
    const viatura = getViaturaAtualData();
    if (!viatura) return null;
    
    switch (anguloAtivo) {
      case 'frontal': return viatura.imagemFrontal;
      case 'traseira': return viatura.imagemTraseira;
      case 'esquerdo': return viatura.imagemLadoEsquerdo;
      case 'direito': return viatura.imagemLadoDireito;
      default: return null;
    }
  };

  const getAvariasAnguloAtual = () => {
    const viatura = getViaturaAtualData();
    return viatura?.avarias.filter(a => a.angulo === anguloAtivo) || [];
  };

  const getCorAvaria = (gravidade: string) => {
    switch (gravidade) {
      case 'LEVE': return 'bg-yellow-500';
      case 'MODERADA': return 'bg-orange-500';
      case 'GRAVE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCorStatus = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'destructive';
      case 'EM_REPARO': return 'secondary';
      case 'RESOLVIDA': return 'default';
      default: return 'outline';
    }
  };

  const viaturaData = getViaturaAtualData();
  const imagemAtual = getImagemAtual();
  const avariasAnguloAtual = getAvariasAnguloAtual();

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            REGISTRO DE AVARIAS - POLICIAL
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Seletor de Viatura */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selecionar Viatura
            </label>
            <Select value={viaturaAtual} onValueChange={setViaturaAtual}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Escolha uma viatura..." />
              </SelectTrigger>
              <SelectContent>
                {viaturasFrota.map((viatura) => (
                  <SelectItem key={viatura.placa} value={viatura.placa}>
                    {viatura.cadastro} - {viatura.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viaturaAtual && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Área da Imagem */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {/* Seletor de Ângulo */}
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium text-foreground mr-2">Ângulo:</span>
                    {[
                      { key: 'frontal' as const, label: 'Frente' },
                      { key: 'traseira' as const, label: 'Trás' },
                      { key: 'esquerdo' as const, label: 'Lado Esquerdo' },
                      { key: 'direito' as const, label: 'Lado Direito' }
                    ].map((angulo) => (
                      <Button
                        key={angulo.key}
                        variant={anguloAtivo === angulo.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnguloAtivo(angulo.key)}
                      >
                        {angulo.label}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={marcandoAvaria ? "destructive" : "default"}
                      onClick={() => setMarcandoAvaria(!marcandoAvaria)}
                      disabled={!imagemAtual}
                      className="flex items-center gap-2"
                    >
                      {marcandoAvaria ? (
                        <>
                          <X className="h-4 w-4" />
                          Cancelar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Marcar Avaria
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative border-2 border-dashed border-border rounded-lg min-h-[400px] flex items-center justify-center bg-muted/20">
                    {imagemAtual ? (
                      <div className="relative w-full h-full">
                        <img
                          ref={imagemRef}
                          src={imagemAtual}
                          alt={`Viatura - ${anguloAtivo}`}
                          className={`w-full h-full object-contain rounded-lg ${
                            marcandoAvaria ? 'cursor-crosshair' : 'cursor-default'
                          }`}
                          onClick={handleImagemClick}
                        />
                        
                        {/* Marcadores de Avarias do ângulo atual */}
                        {avariasAnguloAtual.map((avaria) => (
                          <div
                            key={avaria.id}
                            className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer ${getCorAvaria(avaria.gravidade)} ${
                              avaria.reportadoPorPolicial ? 'ring-2 ring-blue-400' : ''
                            }`}
                            style={{
                              left: `${avaria.x}%`,
                              top: `${avaria.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            title={`${avaria.tipo} - ${avaria.gravidade}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAvariaClick(avaria);
                            }}
                          >
                            <div className="w-full h-full rounded-full animate-pulse" />
                          </div>
                        ))}

                        {/* Marcador temporário */}
                        {posicaoTemporaria && (
                          <div
                            className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-bounce"
                            style={{
                              left: `${posicaoTemporaria.x}%`,
                              top: `${posicaoTemporaria.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Foto não disponível para este ângulo</p>
                        <p className="text-sm mt-2">Solicite o upload das fotos ao administrador</p>
                      </div>
                    )}
                  </div>

                  {marcandoAvaria && imagemAtual && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Modo de marcação ativo - Clique na imagem para marcar uma avaria
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Avarias */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Avarias - {anguloAtivo.charAt(0).toUpperCase() + anguloAtivo.slice(1)} ({avariasAnguloAtual.length})
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {avariasAnguloAtual.map((avaria) => (
                    <Card key={avaria.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCorAvaria(avaria.gravidade)}`} />
                            <span className="font-medium text-sm">{avaria.tipo}</span>
                            {avaria.reportadoPorPolicial && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                POLICIAL
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={getCorStatus(avaria.status)} className="text-xs">
                            {avaria.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {avaria.gravidade}
                          </Badge>
                        </div>
                        
                        {avaria.descricao && (
                          <p className="text-xs text-muted-foreground">{avaria.descricao}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(avaria.data).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {avaria.responsavel}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {(!avariasAnguloAtual.length) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma avaria registrada neste ângulo</p>
                      <p className="text-sm">Clique em "Marcar Avaria" para registrar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Nova Avaria */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nova Avaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Avaria</label>
              <Select
                value={novaAvaria.tipo}
                onValueChange={(value) => setNovaAvaria(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Risco na Pintura">Risco na Pintura</SelectItem>
                  <SelectItem value="Amassado">Amassado</SelectItem>
                  <SelectItem value="Quebrado">Quebrado</SelectItem>
                  <SelectItem value="Desgaste">Desgaste</SelectItem>
                  <SelectItem value="Oxidação">Oxidação</SelectItem>
                  <SelectItem value="Falta de Peça">Falta de Peça</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Gravidade</label>
              <Select
                value={novaAvaria.gravidade}
                onValueChange={(value: any) => setNovaAvaria(prev => ({ ...prev, gravidade: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEVE">Leve</SelectItem>
                  <SelectItem value="MODERADA">Moderada</SelectItem>
                  <SelectItem value="GRAVE">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição (Opcional)</label>
              <Textarea
                value={novaAvaria.descricao}
                onChange={(e) => setNovaAvaria(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva a avaria em detalhes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarAvaria} disabled={!novaAvaria.tipo}>
                Registrar Avaria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Detalhes da Avaria */}
      <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Avaria</DialogTitle>
          </DialogHeader>
          {avariaDetalhes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-sm font-semibold">{avariaDetalhes.tipo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gravidade</label>
                  <Badge variant="outline" className={`text-xs ${getCorAvaria(avariaDetalhes.gravidade)}`}>
                    {avariaDetalhes.gravidade}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={getCorStatus(avariaDetalhes.status)} className="text-xs">
                    {avariaDetalhes.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ângulo</label>
                  <p className="text-sm">{avariaDetalhes.angulo}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {avariaDetalhes.descricao || 'Sem descrição fornecida'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{avariaDetalhes.responsavel}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{new Date(avariaDetalhes.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {avariaDetalhes.reportadoPorPolicial && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Avaria reportada por policial</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setModalDetalhesAberto(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserViaturaAvarias;