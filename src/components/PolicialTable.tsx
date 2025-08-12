import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, User, Phone, MapPin, Calendar, CreditCard, Mail, Building, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface Policial {
  id: string;
  AGÊNCIA?: number;
  BANCO?: string;
  Bairro?: string;
  CONTA?: string;
  CPF?: string;
  'DATA ATUAL'?: number;
  'E-MAIL'?: string;
  Endereço?: string;
  FUNÇÃO?: string;
  IDADE?: number;
  'MUDANÇA COMPORTAMENTO'?: string;
  Matrícula?: string | number;
  'MÊS ANIVERSARIO'?: number;
  NASCIMENTO?: number;
  NOME?: string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  NUMERAL?: number;
  ORD?: number;
  'PREVISAO FÉRIAS - AQUISITIVO 2024'?: string;
  'Post/Grad'?: string;
  SITUAÇÃO?: string;
  'ULTIMA PROMOÇÃO'?: number;
  UNIDADE?: string;
  __EMPTY?: number;
  inclusão?: number;
  telefone?: string;
}

const PolicialTable = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<Policial | null>(null);

  useEffect(() => {
    const loadPoliciais = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'policiais'));
        const policiaisData: Policial[] = [];
        
        querySnapshot.forEach((doc) => {
          policiaisData.push({
            id: doc.id,
            ...doc.data()
          } as Policial);
        });
        
        setPoliciais(policiaisData);
        console.log('Policiais carregados:', policiaisData);
      } catch (error) {
        console.error('Erro ao carregar policiais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPoliciais();
  }, []);

  const getPostGradOrder = (postGrad: string) => {
    const hierarchy = {
      'CEL': 1,
      'TEN CEL': 2,
      'CAP': 3,
      '1º TEN': 4,
      '2º TEN': 5,
      'SUBTEN': 6,
      '1º SGT': 7,
      '2º SGT': 8,
      '3º SGT': 9,
      'CB': 10,
      'SD': 11
    };
    return hierarchy[postGrad as keyof typeof hierarchy] || 999;
  };

  const hasCmtRpmont = (policial: Policial) => {
    const funcao = policial.FUNÇÃO || '';
    return funcao.includes('CMT RPMONT');
  };

  const shouldCapComeFirst = (policial: Policial) => {
    const funcao = policial.FUNÇÃO || '';
    return funcao.includes('RESP SUBCOMANDO RPMONT') || funcao.includes('CMT');
  };

  const filteredPoliciais = policiais.filter(policial =>
    (policial.NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (policial.Matrícula?.toString() || '').includes(searchTerm) ||
    (policial['Post/Grad'] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (policial.NUMERAL?.toString() || '').includes(searchTerm)
  ).sort((a, b) => {
    // Primeiro: quem tem CMT RPMONT sempre no topo
    const aHasCmtRpmont = hasCmtRpmont(a);
    const bHasCmtRpmont = hasCmtRpmont(b);
    
    if (aHasCmtRpmont && !bHasCmtRpmont) return -1;
    if (!aHasCmtRpmont && bHasCmtRpmont) return 1;
    
    const aPost = a['Post/Grad'] || '';
    const bPost = b['Post/Grad'] || '';
    
    const aOrder = getPostGradOrder(aPost);
    const bOrder = getPostGradOrder(bPost);
    
    // Se ambos são CAP, aplicar critério especial
    if (aOrder === 3 && bOrder === 3) {
      const aIsPriority = shouldCapComeFirst(a);
      const bIsPriority = shouldCapComeFirst(b);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      // Se ambos são prioritários ou ambos não são, usar numeral como desempate
      return (a.NUMERAL || 0) - (b.NUMERAL || 0);
    }
    
    // Se posts diferentes, usar hierarquia
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Se mesmo post e a partir de 1º SGT, usar numeral como desempate
    if (aOrder >= 7) {
      return (a.NUMERAL || 0) - (b.NUMERAL || 0);
    }
    
    return 0;
  });

  const getStatusBadge = (situacao: string) => {
    const status = situacao?.toLowerCase() || '';
    if (status.includes('operando') || status.includes('ativo')) {
      return <Badge variant="default">ATIVO</Badge>;
    } else if (status.includes('licen') || status.includes('férias')) {
      return <Badge variant="secondary">LICENÇA</Badge>;
    } else if (status.includes('afastado')) {
      return <Badge variant="destructive">AFASTADO</Badge>;
    }
    return <Badge variant="outline">{situacao || 'N/A'}</Badge>;
  };

  const formatDate = (dateValue: number | undefined) => {
    if (!dateValue) return 'N/A';
    // Converter data Excel para JavaScript (1900-01-01 = 1)
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
    return jsDate.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="p-4">Carregando policiais...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula, posto ou numeral..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MATRÍCULA</TableHead>
            <TableHead>NUMERAL</TableHead>
            <TableHead>NOME</TableHead>
            <TableHead>POSTO</TableHead>
            <TableHead>UNIDADE</TableHead>
            <TableHead>SITUAÇÃO</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPoliciais.map((policial) => (
            <TableRow key={policial.id}>
              <TableCell className="font-medium">{policial.Matrícula || 'N/A'}</TableCell>
              <TableCell className="font-medium">{policial.NUMERAL || 'N/A'}</TableCell>
              <TableCell>{policial.NOME || 'N/A'}</TableCell>
              <TableCell>{policial['Post/Grad'] || 'N/A'}</TableCell>
              <TableCell>{policial.UNIDADE || 'N/A'}</TableCell>
              <TableCell>{getStatusBadge(policial.SITUAÇÃO || '')}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPolicial(policial)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Exibir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Informações Completas do Policial</DialogTitle>
                      </DialogHeader>
                      {selectedPolicial && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Dados Pessoais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Dados Pessoais
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold">Nome:</span>
                                <p>{selectedPolicial.NOME || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nome de Guerra:</span>
                                <p>{selectedPolicial['NOME DE GUERRA'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nome de Guerra 1:</span>
                                <p>{selectedPolicial['NOME DE GUERRA1'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">CPF:</span>
                                <p>{selectedPolicial.CPF || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Idade:</span>
                                <p>{selectedPolicial.IDADE || 'N/A'} anos</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nascimento:</span>
                                <p>{formatDate(selectedPolicial.NASCIMENTO)}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Mês Aniversário:</span>
                                <p>{selectedPolicial['MÊS ANIVERSARIO'] || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Dados Profissionais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Dados Profissionais
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold">Matrícula:</span>
                                <p>{selectedPolicial.Matrícula || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Numeral:</span>
                                <p>{selectedPolicial.NUMERAL || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Posto/Graduação:</span>
                                <p>{selectedPolicial['Post/Grad'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Função:</span>
                                <p>{selectedPolicial.FUNÇÃO || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Unidade:</span>
                                <p>{selectedPolicial.UNIDADE || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Situação:</span>
                                <div className="mt-1">{getStatusBadge(selectedPolicial.SITUAÇÃO || '')}</div>
                              </div>
                              <div>
                                <span className="font-semibold">Inclusão:</span>
                                <p>{formatDate(selectedPolicial.inclusão)}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Última Promoção:</span>
                                <p>{formatDate(selectedPolicial['ULTIMA PROMOÇÃO'])}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Previsão Férias 2024:</span>
                                <p>{selectedPolicial['PREVISAO FÉRIAS - AQUISITIVO 2024'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Mudança Comportamento:</span>
                                <p>{selectedPolicial['MUDANÇA COMPORTAMENTO'] || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Dados de Contato e Bancários */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Contato e Dados Bancários
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  Telefone:
                                </span>
                                <p>{selectedPolicial.telefone || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  E-mail:
                                </span>
                                <p>{selectedPolicial['E-MAIL'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  Endereço:
                                </span>
                                <p>{selectedPolicial.Endereço || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Bairro:</span>
                                <p>{selectedPolicial.Bairro || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <CreditCard className="h-4 w-4" />
                                  Banco:
                                </span>
                                <p>{selectedPolicial.BANCO || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Agência:</span>
                                <p>{selectedPolicial.AGÊNCIA || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Conta:</span>
                                <p>{selectedPolicial.CONTA || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Data Atual:
                                </span>
                                <p>{formatDate(selectedPolicial['DATA ATUAL'])}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Ordem:</span>
                                <p>{selectedPolicial.ORD || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredPoliciais.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'Nenhum policial encontrado com os critérios de busca.' : 'Nenhum policial cadastrado.'}
        </div>
      )}
    </div>
  );
};

export default PolicialTable;