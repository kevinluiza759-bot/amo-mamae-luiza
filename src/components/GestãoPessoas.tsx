import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, UserCheck, UserX, TrendingUp, AlertTriangle } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, startOfMonth, endOfMonth, isWithinInterval, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import GestaoFeriasTab from './gestao-pessoas/GestaoFeriasTab';
import EfetivoTab from './gestao-pessoas/EfetivoTab';
import MovimentacoesTab from './gestao-pessoas/MovimentacoesTab';
import SituacaoTab from './gestao-pessoas/SituacaoTab';
import FuncaoTab from './gestao-pessoas/FuncaoTab';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  'Data de Nascimento': any;
  'PREVISAO FÉRIAS - AQUISITIVO 2024': string;
  inicioFerias?: string;
  fimFerias?: string;
  funcaoOrigem?: string;
  publicacaoFerias?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const GestãoPessoas: React.FC = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchPoliciais();
  }, []);

  const fetchPoliciais = async () => {
    try {
      setLoading(true);
      const policiaisRef = collection(db, 'policiais');
      const q = query(policiaisRef, orderBy('NOME'));
      const querySnapshot = await getDocs(q);
      
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Policial[];
      
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao buscar policiais:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados do Dashboard
  const currentDate = new Date();
  const currentMonth = startOfMonth(currentDate);
  const endCurrentMonth = endOfMonth(currentDate);

  // Aniversariantes do mês
  const aniversariantes = policiais.filter(policial => {
    if (!policial['Data de Nascimento']) return false;
    try {
      const dataNasc = typeof policial['Data de Nascimento'] === 'number' 
        ? new Date((policial['Data de Nascimento'] - 25569) * 86400 * 1000)
        : new Date(policial['Data de Nascimento']);
      return dataNasc.getMonth() === currentDate.getMonth();
    } catch {
      return false;
    }
  });

  // Policiais de férias
  const policiaisFerias = policiais.filter(p => 
    p.SITUAÇÃO?.toLowerCase().includes('férias') || 
    p.SITUAÇÃO?.toLowerCase().includes('ferias')
  );

  // Policiais em licença médica
  const policiaisLicencaMedica = policiais.filter(p => 
    p.SITUAÇÃO?.toLowerCase().includes('licença tratamento') ||
    p.SITUAÇÃO?.toLowerCase().includes('licenca tratamento')
  );

  // Próximos do fim das férias (próximos 7 dias)
  const proximosFimFerias = policiais.filter(p => {
    if (!p.fimFerias) return false;
    try {
      const fimFerias = parseISO(p.fimFerias);
      const em7Dias = addDays(currentDate, 7);
      return isWithinInterval(fimFerias, { start: currentDate, end: em7Dias });
    } catch {
      return false;
    }
  });

  // Dados para gráficos
  const situacaoData = policiais.reduce((acc, policial) => {
    const situacao = policial.SITUAÇÃO || 'Não informado';
    acc[situacao] = (acc[situacao] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(situacaoData).map(([name, value]) => ({
    name,
    value
  }));

  const postGradData = policiais.reduce((acc, policial) => {
    const postGrad = policial['Post/Grad'] || 'Não informado';
    acc[postGrad] = (acc[postGrad] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(postGradData).map(([name, value]) => ({
    name,
    value
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Pessoas</h1>
          <p className="text-muted-foreground">Sistema completo de gestão do efetivo policial</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Total: {policiais.length} policiais
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ferias">Férias</TabsTrigger>
          <TabsTrigger value="efetivo">Efetivo</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="situacao">Situação</TabsTrigger>
          <TabsTrigger value="funcao">Função</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Policiais</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{policiais.length}</div>
                <p className="text-xs text-muted-foreground">
                  Efetivo total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">De Férias</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{policiaisFerias.length}</div>
                <p className="text-xs text-muted-foreground">
                  Atualmente de férias
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Licença Médica</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{policiaisLicencaMedica.length}</div>
                <p className="text-xs text-muted-foreground">
                  Em tratamento de saúde
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aniversariantes</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{aniversariantes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Neste mês
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {proximosFimFerias.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas - Fim de Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proximosFimFerias.map(policial => (
                    <div key={policial.id} className="flex justify-between items-center">
                      <span className="font-medium">{policial.NOME}</span>
                      <Badge variant="destructive">
                        Férias terminam em {policial.fimFerias ? format(parseISO(policial.fimFerias), 'dd/MM/yyyy') : 'Data não informada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Situação</CardTitle>
                <CardDescription>Situação atual dos policiais</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Post/Graduação</CardTitle>
                <CardDescription>Efetivo por posto/graduação</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Aniversariantes do Mês */}
          {aniversariantes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aniversariantes do Mês - {format(currentDate, 'MMMM', { locale: ptBR })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aniversariantes.map(policial => {
                    const dataNasc = typeof policial['Data de Nascimento'] === 'number' 
                      ? new Date((policial['Data de Nascimento'] - 25569) * 86400 * 1000)
                      : new Date(policial['Data de Nascimento']);
                    
                    return (
                      <div key={policial.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <CalendarDays className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{policial.NOME}</p>
                          <p className="text-sm text-muted-foreground">
                            {policial['Post/Grad']} - {format(dataNasc, 'dd/MM')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ferias">
          <GestaoFeriasTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>

        <TabsContent value="efetivo">
          <EfetivoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>

        <TabsContent value="movimentacoes">
          <MovimentacoesTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>

        <TabsContent value="situacao">
          <SituacaoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>

        <TabsContent value="funcao">
          <FuncaoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestãoPessoas;