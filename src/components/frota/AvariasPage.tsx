import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Link as LinkIcon,
  X,
  Plus,
  Camera,
  MapPin,
  Calendar,
  User,
  Save
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, onSnapshot } from 'firebase/firestore';
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

const AvariasPage = () => {
  const [viaturaAtual, setViaturaAtual] = useState<string>('');
  const [avariasData, setAvariasData] = useState<ViaturaAvarias[]>([]);
  const [viaturasFrota, setViaturasFrota] = useState<any[]>([]);
  const [anguloAtivo, setAnguloAtivo] = useState<'frontal' | 'traseira' | 'esquerdo' | 'direito'>('frontal');
  const [marcandoAvaria, setMarcandoAvaria] = useState(false);
  const [novaAvaria, setNovaAvaria] = useState({
    tipo: '',
    descricao: '',
    gravidade: 'LEVE' as const,
    responsavel: ''
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [modalLinkAberto, setModalLinkAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [avariaDetalhes, setAvariaDetalhes] = useState<Avaria | null>(null);
  const [linkImagem, setLinkImagem] = useState('');
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
      console.log('Viaturas carregadas:', viaturas);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas do banco de dados",
        variant: "destructive",
      });
    }
  };

  const salvarLinkImagem = async () => {
    if (!linkImagem || !viaturaAtual) return;

    try {
      const viaturaEncontrada = viaturasFrota.find(v => v.placa === viaturaAtual);
      if (!viaturaEncontrada) return;

      // Determinar o campo da imagem baseado no ângulo
      const campoImagem = `imagem${anguloAtivo.charAt(0).toUpperCase() + anguloAtivo.slice(1)}`;
      
      // Atualizar no Firebase Firestore (coleção frota)
      const viaturaRef = doc(db, 'frota', viaturaEncontrada.id);
      await updateDoc(viaturaRef, {
        [campoImagem]: linkImagem
      });

      // Atualizar estado local
      setViaturasFrota(prev => 
        prev.map(v => 
          v.id === viaturaEncontrada.id 
            ? { ...v, [campoImagem]: linkImagem }
            : v
        )
      );

      setAvariasData(prev => 
        prev.map(v => 
          v.placaViatura === viaturaAtual
            ? { ...v, [campoImagem]: linkImagem }
            : v
        )
      );

      toast({
        title: "Sucesso",
        description: "Link da imagem salvo com sucesso!",
      });

      setLinkImagem('');
      setModalLinkAberto(false);
    } catch (error) {
      console.error('Erro ao salvar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar link da imagem",
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

      const avaria: Avaria = {
        id: Date.now().toString(),
        x: posicaoTemporaria.x,
        y: posicaoTemporaria.y,
        tipo: novaAvaria.tipo,
        descricao: novaAvaria.descricao,
        data: new Date().toISOString().split('T')[0],
        gravidade: novaAvaria.gravidade,
        status: 'PENDENTE',
        responsavel: novaAvaria.responsavel || 'Admin',
        angulo: anguloAtivo
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

      toast({
        title: "Sucesso",
        description: "Avaria registrada com sucesso!",
      });

      // Reset
      setNovaAvaria({
        tipo: '',
        descricao: '',
        gravidade: 'LEVE',
        responsavel: ''
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

  const removerAvaria = (idAvaria: string) => {
    setAvariasData(prev =>
      prev.map(v =>
        v.placaViatura === viaturaAtual
          ? { ...v, avarias: v.avarias.filter(a => a.id !== idAvaria) }
          : v
      )
    );
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
            REGISTRO DE AVARIAS - ADMINISTRADOR
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
            <div className="space-y-6">
              {/* Mostrar todas as 4 fotos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'frontal' as const, label: 'Frente' },
                  { key: 'traseira' as const, label: 'Trás' },
                  { key: 'esquerdo' as const, label: 'Lado Esquerdo' },
                  { key: 'direito' as const, label: 'Lado Direito' }
                ].map((angulo) => {
                  const viaturaData = getViaturaAtualData();
                  const imagem = viaturaData ? (() => {
                    switch (angulo.key) {
                      case 'frontal': return viaturaData.imagemFrontal;
                      case 'traseira': return viaturaData.imagemTraseira;
                      case 'esquerdo': return viaturaData.imagemLadoEsquerdo;
                      case 'direito': return viaturaData.imagemLadoDireito;
                      default: return null;
                    }
                  })() : null;
                  
                  const avariasAngulo = viaturaData?.avarias.filter(a => a.angulo === angulo.key) || [];
                  
                  return (
                    <Card key={angulo.key} className="relative">
                      <CardHeader>
                        <CardTitle className="text-sm flex justify-between items-center">
                          {angulo.label}
                          <Badge variant="outline" className="text-xs">
                            {avariasAngulo.length} avarias
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                       <CardContent>
                         <div className="space-y-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               setAnguloAtivo(angulo.key);
                               setModalLinkAberto(true);
                             }}
                             className="w-full text-xs"
                           >
                             <LinkIcon className="h-3 w-3 mr-1" />
                             Adicionar Link
                           </Button>
                          
                          <div className="relative border border-dashed border-border rounded-lg min-h-[200px] flex items-center justify-center bg-muted/20">
                            {imagem ? (
                              <div className="relative w-full h-full">
                                <img
                                  ref={angulo.key === anguloAtivo ? imagemRef : undefined}
                                  src={imagem}
                                  alt={`Viatura - ${angulo.label}`}
                                  className={`w-full h-full object-contain rounded-lg ${
                                    marcandoAvaria && angulo.key === anguloAtivo ? 'cursor-crosshair' : 'cursor-default'
                                  }`}
                                  onClick={(e) => {
                                    setAnguloAtivo(angulo.key);
                                    if (marcandoAvaria) {
                                      handleImagemClick(e);
                                    }
                                  }}
                                />
                                
                                {/* Marcadores de Avarias */}
                                {avariasAngulo.map((avaria) => (
                                  <div
                                    key={avaria.id}
                                    className={`absolute w-3 h-3 rounded-full border border-white shadow-lg cursor-pointer ${getCorAvaria(avaria.gravidade)}`}
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
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground">
                                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Clique para carregar foto</p>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant={marcandoAvaria && angulo.key === anguloAtivo ? "destructive" : "default"}
                            size="sm"
                            onClick={() => {
                              setAnguloAtivo(angulo.key);
                              setMarcandoAvaria(!marcandoAvaria || angulo.key !== anguloAtivo);
                            }}
                            disabled={!imagem}
                            className="w-full text-xs"
                          >
                            {marcandoAvaria && angulo.key === anguloAtivo ? (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Cancelar
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Marcar
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Modal para adicionar link da imagem */}
              <Dialog open={modalLinkAberto} onOpenChange={setModalLinkAberto}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Link da Imagem - {anguloAtivo}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">URL da Imagem</label>
                      <Input
                        value={linkImagem}
                        onChange={(e) => setLinkImagem(e.target.value)}
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="mt-1"
                      />
                    </div>
                    {linkImagem && (
                      <div>
                        <label className="text-sm font-medium">Prévia:</label>
                        <img 
                          src={linkImagem} 
                          alt="Prévia" 
                          className="w-full max-h-40 object-contain border rounded mt-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setModalLinkAberto(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={salvarLinkImagem} disabled={!linkImagem}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {marcandoAvaria && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Modo de marcação ativo - Clique na imagem para marcar uma avaria no ângulo {anguloAtivo}
                    </span>
                  </div>
                </div>
              )}

              {/* Lista de Avarias de todos os ângulos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Todas as Avarias ({viaturaData?.avarias.length || 0})
                </h3>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {viaturaData?.avarias.map((avaria) => (
                    <Card key={avaria.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCorAvaria(avaria.gravidade)}`} />
                            <span className="font-medium text-sm">{avaria.tipo}</span>
                            <Badge variant="outline" className="text-xs">
                              {avaria.angulo}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerAvaria(avaria.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
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
                  )) || []}

                  {(!viaturaData?.avarias.length) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma avaria registrada</p>
                      <p className="text-sm">Carregue fotos e clique em "Marcar" para registrar avarias</p>
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

            <div>
              <label className="text-sm font-medium">Responsável pelo Registro</label>
              <Input
                value={novaAvaria.responsavel}
                onChange={(e) => setNovaAvaria(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="Nome do responsável..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarAvaria} disabled={!novaAvaria.tipo}>
                Salvar Avaria
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

export default AvariasPage;