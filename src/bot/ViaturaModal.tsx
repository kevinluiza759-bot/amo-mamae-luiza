import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Viatura } from './types';

interface ViaturaModalProps {
  viatura: Viatura;
  onClose: () => void;
}

const ViaturaModal = ({ viatura, onClose }: ViaturaModalProps) => {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dados da Viatura {viatura.CADASTRO}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p><strong>CHASSI:</strong> {viatura.CHASSI}</p>
          <p><strong>GOODCARD:</strong> {viatura.GOODCARD}</p>
          <p><strong>KM:</strong> {viatura.KM.toLocaleString()}</p>
          <p><strong>PRÓXIMA TROCA DE ÓLEO (KMOLEO):</strong> {viatura.KMOLEO.toLocaleString()}</p>
          <p><strong>MODELO:</strong> {viatura.MODELO}</p>
          <p><strong>OBSERVAÇÃO:</strong> {viatura.OBS}</p>
          <p><strong>ORD:</strong> {viatura.ORD}</p>
          <p><strong>PLACA:</strong> {viatura.PLACA}</p>
          <p><strong>PREFIXO:</strong> {viatura.PREFIXO}</p>
          <p><strong>RÁDIO:</strong> {viatura.RADIO}</p>
          <p><strong>RENAVAM:</strong> {viatura.RENAVAM}</p>
          <p><strong>SALDO:</strong> R$ {viatura.SALDO.toLocaleString()}</p>
          <p><strong>SITUAÇÃO:</strong> {viatura.SITUACAO}</p>
          <p><strong>UTILIZAÇÃO:</strong> {viatura.UTILIZACAO}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViaturaModal;