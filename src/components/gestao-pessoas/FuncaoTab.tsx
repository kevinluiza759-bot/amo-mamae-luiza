import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Users, Search, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  funcaoOrigem?: string;
  Matrícula?: string;
}

interface FuncaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const FUNCOES_DISPONIVEIS = [
  'OFICIAL',
  'A DISP DE OUTROS',
  'RESP A PROCESSO (PAD/CD...)',
  'FERRADOR',
  'FISCAL DE DIA',
  'AUXILIAR 1ª SECAO',
  'MOTORISTA ADM',
  'FISCAL DE BAIA',
  'PROJETOS SOCIAIS',
  'SENTINELA CAVALARICO',
  'MONTADO - POLICIAMENTO OSTENSIVO',
  'AUXILIAR DE MEDICO VETERINARIO',
  'GUARDA DO QUARTEL',
  'DOMA',
  'LTS',
  'ARMEIRO',
  'MOTORISTA TA-TP',
  'AUXILIAR 5ª SECAO',
  'CORREEIRO',
  'VIATURA',
  'AUXILIAR DO DMV',
  'SELEIRO',
  'AUXILIAR 6ª SECAO',
  'RR AGUARDANDO',
  'TRATORISTA',
  'AUXILIAR 3ª SECAO',
  'AUXILIAR 4ª SECAO'
];

const FuncaoTab: React.FC<FuncaoTabProps> = ({ policiais, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [showEmptyFunctions, setShowEmptyFunctions] = useState(false);
  const [collapsedFunctions, setCollapsedFunctions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Filtrar policiais por busca
  const filteredPoliciais = useMemo(() => {
    if (!searchTerm) return policiais;
    return policiais.filter(policial => 
      policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [policiais, searchTerm]);

  // Organizar policiais por função (usando policiais filtrados)
  const policiaisPorFuncao = FUNCOES_DISPONIVEIS.reduce((acc, funcao) => {
    acc[funcao] = filteredPoliciais.filter(p => p['FUNÇÃO'] === funcao);
    return acc;
  }, {} as Record<string, Policial[]>);

  // Policiais sem função definida ou com função não listada (usando policiais filtrados)
  const policiaisSemFuncao = filteredPoliciais.filter(p => 
    !p['FUNÇÃO'] || !FUNCOES_DISPONIVEIS.includes(p['FUNÇÃO'])
  );

  // Funções para exibir (apenas com policiais ou se mostrar vazias estiver habilitado)
  const funcoesParaExibir = FUNCOES_DISPONIVEIS.filter(funcao => {
    const temPoliciais = policiaisPorFuncao[funcao]?.length > 0;
    const matchesFilter = !selectedFunction || funcao.toLowerCase().includes(selectedFunction.toLowerCase());
    return matchesFilter && (temPoliciais || showEmptyFunctions);
  });

  const toggleFunctionCollapse = (funcao: string) => {
    setCollapsedFunctions(prev => ({
      ...prev,
      [funcao]: !prev[funcao]
    }));
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Se foi solto no mesmo lugar
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const novaFuncao = destination.droppableId;
    const policialId = draggableId;

    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === policialId);
      if (!policial) return;

      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        'FUNÇÃO': novaFuncao,
        funcaoOrigem: novaFuncao // Atualizar função origem também
      });

      toast({
        title: "Sucesso",
        description: `${policial['Post/Grad']} ${policial.NOME} movido para ${novaFuncao}`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar função do policial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const PolicialCard = ({ policial, index }: { policial: Policial; index: number }) => (
    <Draggable draggableId={policial.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 border rounded-lg shadow-sm mb-2 flex items-center gap-2 transition-all duration-200 ${
            snapshot.isDragging 
              ? 'shadow-lg bg-blue-50 border-blue-300' 
              : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200'
          }`}
        >
          <GripVertical className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-blue-600 text-white">
                {policial['Post/Grad']}
              </Badge>
              <span className="font-medium text-sm text-blue-900">{policial.NOME}</span>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {policial.SITUAÇÃO}
            </div>
            {policial.Matrícula && (
              <div className="text-xs text-blue-600 mt-1">
                Mat: {policial.Matrícula}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestão de Funções - Drag & Drop
          </CardTitle>
          <CardDescription>
            Arraste os policiais entre as funções para reorganizar o efetivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Como usar:</strong> Clique e arraste os policiais pelos cartões para movê-los entre as diferentes funções. 
              A alteração será salva automaticamente no Firebase.
            </p>
          </div>

          {/* Filtros de Busca */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="search-policial">Buscar Policial</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-policial"
                  placeholder="Nome, graduação ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="filter-function">Filtrar por Função</Label>
              <div className="relative">
                <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-function"
                  placeholder="Ex: VIATURA, OFICIAL..."
                  value={selectedFunction}
                  onChange={(e) => setSelectedFunction(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>Opções de Visualização</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmptyFunctions(!showEmptyFunctions)}
                className="w-full"
              >
                {showEmptyFunctions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showEmptyFunctions ? 'Ocultar' : 'Mostrar'} Funções Vazias
              </Button>
            </div>
          </div>

          {searchTerm && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Resultado da busca:</strong> {filteredPoliciais.length} policial(is) encontrado(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* Policiais sem função definida */}
          {policiaisSemFuncao.length > 0 && (
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-800 font-bold">
                  ⚠️ Sem Função Definida ({policiaisSemFuncao.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="SEM_FUNCAO">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[120px] p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        snapshot.isDraggingOver 
                          ? 'bg-orange-200 border-orange-400' 
                          : 'bg-orange-100 border-orange-300'
                      }`}
                    >
                      {policiaisSemFuncao.map((policial, index) => (
                        <PolicialCard key={policial.id} policial={policial} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          )}

          {/* Funções organizadas - Layout vertical compacto */}
          <div className="space-y-3">
            {funcoesParaExibir.map(funcao => (
              <Collapsible
                key={funcao}
                open={!collapsedFunctions[funcao]}
                onOpenChange={() => toggleFunctionCollapse(funcao)}
              >
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-blue-800 font-bold">
                          {funcao} ({policiaisPorFuncao[funcao]?.length || 0})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {policiaisPorFuncao[funcao]?.length || 0} policiais
                          </Badge>
                          {collapsedFunctions[funcao] ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent>
                      <Droppable droppableId={funcao}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[80px] p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                              snapshot.isDraggingOver 
                                ? 'bg-blue-200 border-blue-400' 
                                : 'bg-blue-100 border-blue-300'
                            }`}
                          >
                            {policiaisPorFuncao[funcao]?.map((policial, index) => (
                              <PolicialCard key={policial.id} policial={policial} index={index} />
                            ))}
                            {provided.placeholder}
                            {(!policiaisPorFuncao[funcao] || policiaisPorFuncao[funcao].length === 0) && (
                              <div className="text-center text-blue-600 text-sm py-4 font-medium">
                                Arraste policiais aqui
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Funções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FUNCOES_DISPONIVEIS
              .filter(funcao => policiaisPorFuncao[funcao]?.length > 0)
              .map(funcao => (
                <div key={funcao} className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">
                    {policiaisPorFuncao[funcao]?.length || 0}
                  </div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">
                    {funcao.length > 20 ? `${funcao.substring(0, 17)}...` : funcao}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Atualizando função...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuncaoTab;