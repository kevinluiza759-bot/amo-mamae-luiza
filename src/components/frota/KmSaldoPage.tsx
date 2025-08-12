import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ViaturaTableFull from '../ViaturaTableFull';

const KmSaldoPage = () => {
  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground text-center">CONTROLE KM/SALDO</CardTitle>
      </CardHeader>
      <CardContent>
        <ViaturaTableFull />
      </CardContent>
    </Card>
  );
};

export default KmSaldoPage;