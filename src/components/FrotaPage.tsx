import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Activity, AlertTriangle, Wrench, Tags } from 'lucide-react';
import FrotaDashboard from './frota/FrotaDashboard';
import KmSaldoPage from './frota/KmSaldoPage';
import AvariasPage from './frota/AvariasPage';
import OficinaPage from './frota/OficinaPage';
import CategoriaPage from './frota/CategoriaPage';

const FrotaPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground text-center">GESTÃO DE FROTA</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="categoria" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Categoria
            </TabsTrigger>
            <TabsTrigger value="km-saldo" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              KM/Saldo
            </TabsTrigger>
            <TabsTrigger value="avarias" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Avarias
            </TabsTrigger>
            <TabsTrigger value="oficina" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Oficina
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FrotaDashboard />
          </TabsContent>

          <TabsContent value="categoria">
            <CategoriaPage />
          </TabsContent>

          <TabsContent value="km-saldo">
            <KmSaldoPage />
          </TabsContent>

          <TabsContent value="avarias">
            <AvariasPage />
          </TabsContent>

          <TabsContent value="oficina">
            <OficinaPage />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FrotaPage;