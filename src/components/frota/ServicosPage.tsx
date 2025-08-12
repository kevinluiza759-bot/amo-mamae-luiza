import { useEffect, useMemo, useState } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, FileSpreadsheet } from 'lucide-react';

interface ServicoDiario {
  id: string;
  viaturaId: string;
  cadastro?: string | null;
  placa?: string | null;
  motorista?: string | null; // Nome de Guerra 1 preferencialmente
  motoristaId?: string | null;
  area?: string | null;
  kmInicial?: number | null;
  kmFinal?: number | null;
  status?: 'aberto' | 'encerrado';
  iniciadoEm?: string; // ISO
  encerradoEm?: string; // ISO
}

interface AvariaResumo {
  responsavel?: string;
  data?: string; // ISO
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<ServicoDiario[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtroData, setFiltroData] = useState<string>(''); // yyyy-mm-dd
  const [filtroPolicial, setFiltroPolicial] = useState<string>('');
  const [filtroViatura, setFiltroViatura] = useState<string>('');
  const [avariasPorVtr, setAvariasPorVtr] = useState<Record<string, AvariaResumo[]>>({});

  useEffect(() => {
    const fetchServicos = async () => {
      setLoading(true);
      try {
        const col = collection(db, 'servicosDiarios');
        // Ordenar por data para melhor leitura
        const q = query(col, orderBy('iniciadoEm', 'desc'));
        const snap = await getDocs(q);
        const rows: ServicoDiario[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setServicos(rows);

        // Buscar avarias das viaturas listadas (para a coluna "Teve avaria")
        const uniqueVtrs = Array.from(new Set(rows.map(r => r.viaturaId).filter(Boolean)));
        const map: Record<string, AvariaResumo[]> = {};
        await Promise.all(uniqueVtrs.map(async (vid) => {
          const vRef = doc(db, 'frota', vid);
          const vSnap = await getDoc(vRef);
          if (vSnap.exists()) {
            const data: any = vSnap.data();
            map[vid] = Array.isArray(data.avarias) ? data.avarias.map((a: any) => ({ responsavel: a.responsavel, data: a.data })) : [];
          } else {
            map[vid] = [];
          }
        }));
        setAvariasPorVtr(map);
      } catch (e) {
        console.error('Erro ao carregar serviços:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchServicos();
  }, []);

  const mesmaData = (iso1?: string, iso2?: string) => {
    if (!iso1 || !iso2) return false;
    const d1 = new Date(iso1);
    const d2 = new Date(iso2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const rowsFiltrados = useMemo(() => {
    return servicos.filter(r => {
      const byDia = filtroData ? (mesmaData(r.iniciadoEm, `${filtroData}T00:00:00`)) : true;
      const byPol = filtroPolicial ? (String(r.motorista || '').toLowerCase().includes(filtroPolicial.toLowerCase())) : true;
      const labelVtr = `${r.cadastro || ''} ${r.placa || ''}`.trim();
      const byVtr = filtroViatura ? labelVtr.toLowerCase().includes(filtroViatura.toLowerCase()) : true;
      return byDia && byPol && byVtr;
    });
  }, [servicos, filtroData, filtroPolicial, filtroViatura]);

  const getTeveAvaria = (row: ServicoDiario): boolean => {
    const avs = avariasPorVtr[row.viaturaId] || [];
    // Se houver avaria na mesma data com o mesmo responsável (Nome de Guerra 1 gravado em motorista)
    return avs.some(a => (
      (!!row.motorista && !!a.responsavel && String(a.responsavel).toLowerCase() === String(row.motorista).toLowerCase()) &&
      (mesmaData(a.data, row.iniciadoEm) || mesmaData(a.data, row.encerradoEm))
    ));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Serviços Diários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar por policial (Nome de Guerra)" value={filtroPolicial} onChange={e => setFiltroPolicial(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Input placeholder="Filtrar por viatura (Cadastro/Placa)" value={filtroViatura} onChange={e => setFiltroViatura(e.target.value)} />
            </div>
          </div>

          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Policial (Nome de Guerra 1)</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>KM Inicial</TableHead>
                  <TableHead>KM Final</TableHead>
                  <TableHead>Avaria</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsFiltrados.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.iniciadoEm ? new Date(r.iniciadoEm).toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell>{r.motorista || '-'}</TableCell>
                    <TableCell>{r.cadastro || r.placa || '-'}</TableCell>
                    <TableCell>{r.area || '-'}</TableCell>
                    <TableCell>{r.kmInicial ?? '-'}</TableCell>
                    <TableCell>{r.kmFinal ?? '-'}</TableCell>
                    <TableCell>
                      {getTeveAvaria(r) ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'aberto' ? 'secondary' : 'default'}>
                        {r.status?.toUpperCase() || '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>{loading ? 'Carregando...' : `${rowsFiltrados.length} registro(s)`}</TableCaption>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
