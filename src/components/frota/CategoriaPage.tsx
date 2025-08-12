import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Viatura {
  id: string;
  CADASTRO: string;
  MODELO: string;
  MARCA?: string;
  ANO?: string;
  PLACA?: string;
  tipo?: 'leve' | 'pesada';
  [key: string]: any;
}

interface CategoriaState {
  leve: Viatura[];
  pesada: Viatura[];
  semCategoria: Viatura[];
}

const CategoriaPage = () => {
  const [viaturas, setViaturas] = useState<CategoriaState>({
    leve: [],
    pesada: [],
    semCategoria: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const carregarViaturas = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'frota'));
      const todasViaturas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Viatura[];

      const categorizada: CategoriaState = {
        leve: todasViaturas.filter(v => v.tipo === 'leve'),
        pesada: todasViaturas.filter(v => v.tipo === 'pesada'),
        semCategoria: todasViaturas.filter(v => !v.tipo)
      };

      setViaturas(categorizada);
    } catch (error) {
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarViaturas();
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordenação dentro da mesma categoria
      const categoria = source.droppableId as keyof CategoriaState;
      const items = Array.from(viaturas[categoria]);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setViaturas(prev => ({
        ...prev,
        [categoria]: items
      }));
    } else {
      // Movimentação entre categorias
      const sourceCategoria = source.droppableId as keyof CategoriaState;
      const destCategoria = destination.droppableId as keyof CategoriaState;
      
      const sourceItems = Array.from(viaturas[sourceCategoria]);
      const destItems = Array.from(viaturas[destCategoria]);
      
      const [movedItem] = sourceItems.splice(source.index, 1);
      
      // Atualizar o tipo da viatura baseado na categoria de destino
      const updatedItem = {
        ...movedItem,
        tipo: destCategoria === 'semCategoria' ? undefined : destCategoria
      };
      
      destItems.splice(destination.index, 0, updatedItem);

      setViaturas(prev => ({
        ...prev,
        [sourceCategoria]: sourceItems,
        [destCategoria]: destItems
      }));
    }
  };

  const salvarAlteracoes = async () => {
    try {
      setSaving(true);
      
      // Atualizar todas as viaturas com seus novos tipos
      const promises: Promise<void>[] = [];
      
      [...viaturas.leve, ...viaturas.pesada, ...viaturas.semCategoria].forEach(viatura => {
        const viaturaRef = doc(db, 'frota', viatura.id);
        const updateData = viatura.tipo ? { tipo: viatura.tipo } : { tipo: null };
        promises.push(updateDoc(viaturaRef, updateData));
      });

      await Promise.all(promises);
      
      toast({
        title: "Sucesso",
        description: "Categorias atualizadas com sucesso!",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro", 
        description: "Erro ao salvar alterações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const ViaturaCard = ({ viatura, index }: { viatura: Viatura; index: number }) => (
    <Draggable draggableId={viatura.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-move transition-all ${
            snapshot.isDragging ? 'shadow-lg scale-105' : 'shadow-sm'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="font-semibold text-sm">{viatura.CADASTRO}</div>
                <div className="text-xs text-muted-foreground">{viatura.MODELO}</div>
                {viatura.MARCA && (
                  <div className="text-xs text-muted-foreground">{viatura.MARCA}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  const CategoriaContainer = ({ 
    categoria, 
    titulo, 
    cor, 
    viaturas 
  }: { 
    categoria: keyof CategoriaState;
    titulo: string;
    cor: string;
    viaturas: Viatura[];
  }) => (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${cor}`} />
          {titulo}
          <Badge variant="secondary" className="ml-auto">
            {viaturas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Droppable droppableId={categoria}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[500px] p-4 rounded-lg border-2 border-dashed transition-colors ${
                snapshot.isDraggingOver 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25'
              }`}
            >
              <div className="space-y-3">
                {viaturas.map((viatura, index) => (
                  <ViaturaCard key={viatura.id} viatura={viatura} index={index} />
                ))}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categorização de Viaturas</h2>
          <p className="text-muted-foreground">
            Arraste e solte as viaturas para categorizá-las como frota leve ou pesada
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={carregarViaturas}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={salvarAlteracoes}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CategoriaContainer
            categoria="leve"
            titulo="Frota Leve"
            cor="bg-green-500"
            viaturas={viaturas.leve}
          />
          
          <CategoriaContainer
            categoria="pesada"
            titulo="Frota Pesada"
            cor="bg-red-500"
            viaturas={viaturas.pesada}
          />
          
          <CategoriaContainer
            categoria="semCategoria"
            titulo="Sem Categoria"
            cor="bg-gray-500"
            viaturas={viaturas.semCategoria}
          />
        </div>
      </DragDropContext>
    </div>
  );
};

export default CategoriaPage;