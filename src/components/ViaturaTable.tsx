import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, AlertTriangle } from 'lucide-react';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  SALDO: number;
}

const ViaturaTable = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [newKm, setNewKm] = useState('');
  const [newKmOleo, setNewKmOleo] = useState('');
  const [newSaldo, setNewSaldo] = useState('');
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [editValues, setEditValues] = useState<{
    [id: string]: { KM: number; KMOLEO: number; SALDO: number };
  }>({});

  useEffect(() => {
    const fetchViaturas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'frota'));
        const viaturasFirebase: Viatura[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Viatura[];

        setViaturas(viaturasFirebase);

        const initialEditValues: { [id: string]: { KM: number; KMOLEO: number; SALDO: number } } = {};
        viaturasFirebase.forEach((v) => {
          initialEditValues[v.id] = {
            KM: v.KM,
            KMOLEO: v.KMOLEO,
            SALDO: v.SALDO,
          };
        });
        setEditValues(initialEditValues);
      } catch (error) {
        console.error('Erro ao buscar viaturas:', error);
      }
    };

    fetchViaturas();
  }, []);

  const getStatusBadge = (viatura: Viatura) => {
    const kmRestante = (viatura.KMOLEO ?? 0) - (viatura.KM ?? 0);

    if (kmRestante <= 1000 || (viatura.SALDO ?? 0) < 1000) {
      return <Badge variant="destructive">CRÍTICO</Badge>;
    } else if (kmRestante <= 3000 || (viatura.SALDO ?? 0) < 2000) {
      return <Badge variant="secondary">ATENÇÃO</Badge>;
    }
    return <Badge variant="default">OK</Badge>;
  };

  const handleUpdateSingle = async () => {
    if (!selectedViatura || !newKm || !newKmOleo || !newSaldo) return;

    const updatedKm = parseInt(newKm);
    const updatedKmOleo = parseInt(newKmOleo);
    const updatedSaldo = parseFloat(newSaldo);

    setViaturas((prev) =>
      prev.map((v) =>
        v.id === selectedViatura.id
          ? { ...v, KM: updatedKm, KMOLEO: updatedKmOleo, SALDO: updatedSaldo }
          : v
      )
    );

    try {
      const viaturaRef = doc(db, 'frota', selectedViatura.id);
      await updateDoc(viaturaRef, {
        KM: updatedKm,
        KMOLEO: updatedKmOleo,
        SALDO: updatedSaldo,
      });
    } catch (error) {
      console.error('Erro ao atualizar dados no Firestore:', error);
    }

    setSelectedViatura(null);
    setNewKm('');
    setNewKmOleo('');
    setNewSaldo('');
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        viaturas.map(async (v) => {
          const edited = editValues[v.id];
          if (
            edited &&
            (edited.KM !== v.KM ||
              edited.KMOLEO !== v.KMOLEO ||
              edited.SALDO !== v.SALDO)
          ) {
            const viaturaRef = doc(db, 'frota', v.id);
            await updateDoc(viaturaRef, {
              KM: edited.KM,
              KMOLEO: edited.KMOLEO,
              SALDO: edited.SALDO,
            });
          }
        })
      );

      setViaturas((prev) =>
        prev.map((v) => ({
          ...v,
          KM: editValues[v.id]?.KM ?? v.KM,
          KMOLEO: editValues[v.id]?.KMOLEO ?? v.KMOLEO,
          SALDO: editValues[v.id]?.SALDO ?? v.SALDO,
        }))
      );

      setIsEditingAll(false);
    } catch (error) {
      console.error('Erro ao salvar edição em massa:', error);
    }
  };

  const handleEditValueChange = (
    id: string,
    field: 'KM' | 'KMOLEO' | 'SALDO',
    value: string
  ) => {
    let parsedValue: number;
    if (field === 'SALDO') {
      parsedValue = parseFloat(value);
    } else {
      parsedValue = parseInt(value);
    }
    if (isNaN(parsedValue)) parsedValue = 0;

    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: parsedValue },
    }));
  };

  // 🔴 Aqui filtramos apenas viaturas com problemas
  const viaturasFiltradas = viaturas.filter((v) => {
    const kmRestante = (v.KMOLEO ?? 0) - (v.KM ?? 0);
    return kmRestante <= 3000 || (v.SALDO ?? 0) < 2000;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button onClick={() => (isEditingAll ? handleSaveAll() : setIsEditingAll(true))}>
          {isEditingAll ? 'Salvar Todos' : 'Editar Todos'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MODELO</TableHead>
            <TableHead>PLACA</TableHead>
            <TableHead>KM ATUAL</TableHead>
            <TableHead>TROCA ÓLEO</TableHead>
            <TableHead>SALDO</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viaturasFiltradas.map((viatura) => (
            <TableRow
              key={viatura.id}
              className={
                ((viatura.KMOLEO ?? 0) - (viatura.KM ?? 0) <= 3000 ||
                  (viatura.SALDO ?? 0) < 2000) &&
                'bg-destructive/10 border-destructive/20'
              }
            >
              <TableCell className="font-medium">{viatura.MODELO}</TableCell>
              <TableCell>{viatura.PLACA}</TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.KM ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'KM', e.target.value)
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {viatura.KM.toLocaleString()} km
                    {(viatura.KMOLEO - viatura.KM <= 3000) && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.KMOLEO ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'KMOLEO', e.target.value)
                    }
                  />
                ) : (
                  `${viatura.KMOLEO.toLocaleString()} km`
                )}
              </TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.SALDO ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'SALDO', e.target.value)
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    R$ {viatura.SALDO.toLocaleString()}
                    {viatura.SALDO < 2000 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </TableCell>

              <TableCell>{getStatusBadge(viatura)}</TableCell>

              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedViatura(viatura);
                        setNewKm(viatura.KM.toString());
                        setNewKmOleo(viatura.KMOLEO.toString());
                        setNewSaldo(viatura.SALDO.toString());
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Atualizar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atualizar Quilometragem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Viatura: {selectedViatura?.MODELO} - {selectedViatura?.PLACA}
                      </p>
                      <div>
                        <label className="text-sm font-medium">Nova Quilometragem:</label>
                        <Input
                          type="number"
                          value={newKm}
                          onChange={(e) => setNewKm(e.target.value)}
                          placeholder="Digite a nova quilometragem"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Próxima troca de óleo (KM):</label>
                        <Input
                          type="number"
                          value={newKmOleo}
                          onChange={(e) => setNewKmOleo(e.target.value)}
                          placeholder="Ex: 120000"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Saldo disponível (R$):</label>
                        <Input
                          type="number"
                          value={newSaldo}
                          onChange={(e) => setNewSaldo(e.target.value)}
                          placeholder="Ex: 2500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedViatura(null)}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleUpdateSingle}>Atualizar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ViaturaTable;
