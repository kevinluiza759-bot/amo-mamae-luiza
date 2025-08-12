// functions/index.js (ou index.ts)

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Inicialize o Firebase Admin SDK (se ainda não fez)
admin.initializeApp();

const app = express();
// Use cors para permitir requisições do seu frontend
app.use(cors({ origin: true }));
app.use(express.json()); // Para parsear o corpo da requisição JSON

// Endpoint HTTP para gerar o DOCX
app.post('/', async (req, res) => {
    let tempFilePath; // Declarado com 'let' fora do try

    try {
        const osData = req.body; // Os dados da Ordem de Serviço enviados do frontend

        // Validação básica dos dados recebidos
        if (!osData || !osData.cadastroViatura || !osData.numeroOS || !osData.dataOS) {
            console.error('Dados da OS incompletos:', osData);
            return res.status(400).send('Dados da Ordem de Serviço incompletos.');
        }

        // --- 1. Baixar o modelo DOCX do Firebase Storage ---
        const bucket = admin.storage().bucket();
        // CORREÇÃO FINAL DO NOME DO ARQUIVO: 'template-os.docx'
        const filePath = 'templates/template-os.docx'; // Caminho exato no seu Storage

        // Nome do arquivo temporário no ambiente da Cloud Function.
        tempFilePath = path.join('/tmp', `modelo-${osData.numeroOS || 'temp'}.docx`);

        await bucket.file(filePath).download({ destination: tempFilePath });
        console.log('Modelo DOCX baixado para:', tempFilePath);

        // --- 2. Carregar o modelo e criar o Docxtemplater ---
        const content = fs.readFileSync(tempFilePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // --- 3. Preparar os dados para o Docxtemplater ---
        const dataOS = new Date(osData.dataOS + 'T00:00:00');
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        const dataFormatada = dataOS.toLocaleDateString('pt-BR', options);

        const templateData = {
            numeroOficina: osData.numeroOficina || '',
            data: dataFormatada,
            numeroOS: osData.numeroOS || '',
            cadastro: osData.cadastroViatura || '',
            modelo: osData.modeloViatura || '',
            placa: osData.placaViatura || 'N/D',
            oficina: osData.oficinaResponsavel || '',
            observacao: osData.defeitoRelatado || osData.observacao || '',
            valorOS: osData.valorOS || 'R$ 0,00',
            tipo: osData.tipoFrota || 'FROTA PESADA',
            cota: osData.tipoFrota === 'leve' ? osData.cotaMensal || '' : 'FROTA PESADA',
            saldo: osData.tipoFrota === 'leve' ? osData.saldoDisponivel || '' : 'FROTA PESADA',
            policial: osData.assinatura?.policial?.NOME || '',
            'NOME DE GUERRA1': osData.assinatura?.policial?.['Post/Grad'] || '',
            funcao: osData.assinatura?.funcao || '',
            Matrícula: osData.assinatura?.policial?.Matrícula || '',
        };

        console.log('Dados para o template:', templateData);

        // --- 4. Preencher o modelo com os dados ---
        doc.render(templateData);

        // --- 5. Gerar o DOCX preenchido ---
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // --- 6. Enviar o arquivo de volta para o cliente ---
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        const nomeArquivo = `${osData.numeroOficina || '000'} - COLOG - ${osData.placaViatura || 'SEM-PLACA'} - OS ${osData.numeroOS || 'sem-numero'}`.replace(/[^\w\s\-]/gi, '');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.docx"`);
        res.send(buffer);

    } catch (error) {
        console.error('Erro ao gerar o documento DOCX:', error);
        if (error.properties) {
            const e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            };
            console.error(JSON.stringify({ error: e }));
            return res.status(500).send(`Erro ao preencher o template: ${error.message}. Verifique os placeholders.`);
        }
        return res.status(500).send('Erro interno do servidor ao gerar o documento.');
    } finally {
        try {
            if (tempFilePath) {
                fs.unlinkSync(tempFilePath);
                console.log('Arquivo temporário excluído:', tempFilePath);
            }
        } catch (e) {
            console.warn('Não foi possível excluir o arquivo temporário:', e);
        }
    }
});

// Exporte a função HTTP para o Firebase
exports.gerarOrdemServicoDocx = functions.https.onRequest(app);