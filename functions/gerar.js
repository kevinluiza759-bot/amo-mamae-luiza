// As bibliotecas 'fs-extra', 'path', 'firebase-admin' e 'mammoth' são necessárias para o ambiente Node.js.
// Para usar em um ambiente Node.js real, descomente as linhas abaixo e instale as dependências:
// npm install fs-extra firebase-admin mammoth

const fs = require("fs-extra"); // Descomentado para leitura de arquivos
const path = require("path");   // Descomentado para manipulação de caminhos
const { initializeApp, cert } = require("firebase-admin/app"); // Descomentado para inicialização do Firebase
const { getFirestore, Timestamp } = require("firebase-admin/firestore"); // Import Timestamp (necessário para o Firestore)

// Configuração do Firebase Admin SDK.
// IMPORTANTE: Você deve criar um arquivo 'firebase-key.json' no mesmo diretório deste script.
// Este arquivo deve conter suas credenciais de conta de serviço Firebase.
// Para gerar este arquivo:
// 1. Vá para o Console do Firebase (console.firebase.google.com).
// 2. Selecione seu projeto.
// 3. Clique em "Configurações do projeto" (o ícone de engrenagem).
// 4. Vá para a aba "Contas de serviço".
// 5. Clique em "Gerar nova chave privada" e faça o download do arquivo JSON.
// 6. Renomeie o arquivo baixado para 'firebase-key.json' e coloque-o ao lado deste script.
const serviceAccount = require("./firebase-key.json");

initializeApp({
    credential: cert(serviceAccount),
});
const db = getFirestore();


// Função para converter "DD de [mês por extenso] de YYYY" para "YYYY-MM-DD"
function convertDateToYYYYMMDD(dateStr) {
    const months = {
        "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
        "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
        "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12"
    };
    const parts = dateStr.match(/(\d{1,2}) de ([a-zç]+) de (\d{4})/i);
    if (parts) {
        const day = parts[1].padStart(2, '0');
        const month = months[parts[2].toLowerCase()];
        const year = parts[3];
        if (day && month && year) {
            return `${year}-${month}-${day}`;
        }
    }
    return "S/A"; // Retorna "S/A" se a conversão falhar
}

// Função para formatar a data e hora atual no formato desejado para 'dataCriacao'
function formatCurrentDateForFirestore() {
    const now = new Date();
    // Formata a parte da data para "DD de [mês] de YYYY"
    const datePart = now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
    // Formata a parte da hora para "HH:MM:SS"
    const timePart = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    // Calcula e formata o offset UTC
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetRemainingMinutes = Math.abs(offsetMinutes % 60);
    const sign = offsetMinutes > 0 ? '-' : '+'; // O sinal é invertido para o offset UTC
    const formattedOffset = `UTC${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetRemainingMinutes).padStart(2, '0')}`;

    return `${datePart} às ${timePart} ${formattedOffset}`;
}


/**
 * Extrai texto de um arquivo .docx.
 * @param {string} filepath - O caminho para o arquivo .docx.
 * @returns {Promise<string>} O texto extraído do documento.
 */
async function extractTextFromDocx(filepath) {
    const buffer = await fs.readFile(filepath);
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
}


/**
 * Extrai o Cadastro, Modelo e Placa do veículo a partir do texto.
 * Utiliza expressões regulares para capturar diferentes padrões.
 * @param {string} texto - O texto completo do documento.
 * @returns {{cadastro: string, modelo: string, placa: string}} Objeto com os dados extraídos.
 */
function extrairCadastroModeloPlaca(texto) {
    const t = texto.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

    let cadastro = "S/A";
    let modelo = "S/A";
    let placa = "S/A";

    // Tenta encontrar a seção do texto que descreve a ordem de serviço e o veículo.
    // Esta parte geralmente começa com "Solicito de V. Sª. que seja efetuado o pagamento da ordem de serviço"
    // e contém a descrição do veículo e a placa antes da menção da oficina.
    const serviceOrderSectionMatch = t.match(/Solicito de V\. Sª\. que seja efetuado o pagamento da ordem de serviço[^.]+\.\s*(.+?)\s*na\s*oficina/i);

    let relevantTextForVehicle = t; // Padrão: usa o texto completo se a seção específica não for encontrada
    if (serviceOrderSectionMatch && serviceOrderSectionMatch[1]) {
        relevantTextForVehicle = serviceOrderSectionMatch[1].trim();
    } else {
        // Fallback: se a seção específica não for encontrada, tenta encontrar a informação do veículo
        // após "realizado" e antes de "na oficina", que é um padrão comum.
        const realizedMatch = t.match(/realizado\s*(?:na\s*)?(?:viatura|veículo)\s*(?:operacional|administrativa|de Transporte Animal deste Regimento,|de Transporte Policial deste Regimento,)?\s*(.+?)\s*na\s*oficina/i);
        if (realizedMatch && realizedMatch[1]) {
            relevantTextForVehicle = realizedMatch[1].trim();
        }
    }

    // Agora, aplica os padrões de extração de veículo à `relevantTextForVehicle`
    // Padrão 1: Captura CADASTRO (MODELO) de placa PLACA ou variações.
    const pattern1 = /([A-Z0-9\-]+(?:\s[A-Z0-9\-]+)?)\s*(?:\(([A-Z0-9\s\/\.-]+)\))?\s*(?:de\s*placas?\s*([A-Z0-9\-]{5,8}))?/i;
    let match = relevantTextForVehicle.match(pattern1);

    if (match) {
        let tempCadastroCandidate = (match[1] || "").trim().toUpperCase();
        let tempModeloCandidate = (match[2] || "").trim();
        let tempPlacaCandidate = (match[3] || "").trim().toUpperCase();

        if (tempPlacaCandidate) {
            placa = tempPlacaCandidate;
        }

        // Tratamento para "VEÍCULO ADMINISTRATIVO" ou outros cadastros/modelos
        if (tempCadastroCandidate === "VEÍCULO ADMINISTRATIVO") {
            cadastro = tempCadastroCandidate; // Mantém como "VEÍCULO ADMINISTRATIVO"
            modelo = tempModeloCandidate || "S/A";
        } else if (tempCadastroCandidate.startsWith("CAV") || tempCadastroCandidate.startsWith("TA") || tempCadastroCandidate.startsWith("COD") || tempCadastroCandidate === "DUSTER" || tempCadastroCandidate.startsWith("PMF")) {
            cadastro = tempCadastroCandidate;
            modelo = tempModeloCandidate || "S/A";
        } else if (tempModeloCandidate) { // Se o primeiro grupo não é um cadastro típico, mas o segundo é um modelo
            modelo = tempModeloCandidate;
            cadastro = tempCadastroCandidate; // O primeiro grupo pode ser um prefixo ou parte do modelo
        } else { // Caso geral, o primeiro grupo é o cadastro
            cadastro = tempCadastroCandidate;
        }

        // Se o MODELO ainda for "S/A", mas o CADASTRO for um nome de modelo conhecido, use o CADASTRO como MODELO
        if (modelo === "S/A" && cadastro !== "S/A") {
            const commonModels = ["DUSTER", "TRAILBLAZER", "GM S10 4X4", "TOYOTA SW4", "HILUX SW4", "IVECO DAILY"];
            if (commonModels.includes(cadastro)) {
                modelo = cadastro;
            }
        }
    }

    // Fallback final para PLACA se não encontrada no bloco principal de informações do veículo
    if (placa === "S/A") {
        const placaOnlyMatch = t.match(/(?:placa|placas?)\s*([A-Z0-9\-]{5,8})/i);
        if (placaOnlyMatch) {
            placa = placaOnlyMatch[1].trim().toUpperCase();
        }
    }

    // Fallback final para CADASTRO se ainda for "S/A" e um padrão de ID específico existir no texto
    if (cadastro === "S/A") {
        const specificIdPattern = /(CAV\d+|PMF-\d+|DUSTER|TA\d+|COD\d+)/i;
        const specificIdMatch = t.match(specificIdPattern);
        if (specificIdMatch) {
            cadastro = specificIdMatch[1].trim().toUpperCase();
        }
    }

    // Se o MODELO ainda for "S/A" e o CADASTRO for um modelo comum, atribua-o ao MODELO
    if (modelo === "S/A" && cadastro !== "S/A") {
        const commonModels = ["DUSTER", "TRAILBLAZER", "GM S10 4X4", "TOYOTA SW4", "HILUX SW4", "IVECO DAILY"];
        if (commonModels.includes(cadastro)) {
            modelo = cadastro;
        }
    }

    return { cadastro, modelo, placa };
}

/**
 * Busca informações do veículo no Firestore.
 * @param {string|null} cadastro - O cadastro do veículo.
 * @param {string|null} modelo - O modelo do veículo.
 * @param {string|null} placa - A placa do veículo.
 * @returns {Promise<Object|null>} Os dados do veículo ou null se não encontrado.
 */
async function buscarVeiculo(cadastro, modelo, placa) {
    // Mock de dados da frota para simulação, se o Firestore real não estiver configurado.
    const mockFrota = [
        { CADASTRO: "CAV12", MODELO: "TRAILBLAZER", PLACA: "SBQ0D65" },
        { CADASTRO: "CAV08", MODELO: "GM S10 4X4", PLACA: "ORZ-3930" },
        { CADASTRO: "PMF-8020", MODELO: "TOYOTA Hilux SW4", PLACA: "PMF-8020" },
        { CADASTRO: "DUSTER", MODELO: "DUSTER", PLACA: "PNK8927" },
        { CADASTRO: "CAV05", MODELO: "TOYOTA SW4", PLACA: "PME5810" },
        { CADASTRO: "CAV13", MODELO: "TRAILBLAZER", PLACA: "SBP4F05" },
        { CADASTRO: "TA01", MODELO: "VW 24280", PLACA: "ORX-3312" },
        { CADASTRO: "TA02", MODELO: "IVECO DAILY", PLACA: "PNM9507" },
        { CADASTRO: "CAV06", MODELO: "TRAILBLAZER", PLACA: "ORZ-3940" },
        { CADASTRO: "CAV11", MODELO: "TRAILBLAZER", PLACA: "ORZ-3945" },
        { CADASTRO: "COD20", MODELO: "TOYOTA HILUX SW4", PLACA: "PMF-8020" },
        { CADASTRO: "MP 1360", MODELO: "YAMAHA/LANDER XTZ", PLACA: "N/D" } // Adicionado para o exemplo do usuário
    ];

    // Se o 'db' real estiver inicializado, use-o; caso contrário, use um mock simples para 'frota'.
    const currentDb = typeof db !== 'undefined' && db.collection ? db : {
        collection: (name) => {
            if (name === "frota") {
                return {
                    where: (field, op, value) => ({
                        get: async () => {
                            let filtered = mockFrota;
                            if (field === "CADASTRO" && value !== null) {
                                filtered = filtered.filter(item => item.CADASTRO === value);
                            } else if (field === "MODELO" && value !== null) {
                                filtered = filtered.filter(item => item.MODELO === value);
                            } else if (field === "PLACA" && value !== null) {
                                filtered = filtered.filter(item => item.PLACA === value);
                            }
                            return {
                                empty: filtered.length === 0,
                                docs: filtered.map(item => ({ data: () => item }))
                            };
                        }
                    })
                };
            }
            // Retorna um mock vazio para outras coleções se o db real não estiver disponível
            return { where: () => ({ get: async () => ({ empty: true, docs: [] }) }) };
        }
    };


    let queryRef;
    if (cadastro && cadastro !== "S/A") {
        queryRef = currentDb.collection("frota").where("CADASTRO", "==", cadastro);
    } else if (modelo && modelo !== "S/A") {
        queryRef = currentDb.collection("frota").where("MODELO", "==", modelo);
    } else if (placa && placa !== "S/A") {
        queryRef = currentDb.collection("frota").where("PLACA", "==", placa);
    } else {
        return null;
    }

    try {
        const snapshot = await queryRef.get();
        if (snapshot.empty) {
            return null;
        }
        return snapshot.docs[0].data();
    } catch (error) {
        console.error("Erro ao buscar veículo no Firestore:", error.message);
        return null;
    }
}

/**
 * Verifica se os campos essenciais do veículo e da OS foram extraídos.
 * Este é o critério para considerar um documento como "seguindo o modelo de OS".
 * @param {Object} obj - Objeto com os dados extraídos.
 * @returns {boolean} True se todos os campos essenciais estiverem completos, false caso contrário.
 */
function isCompleto(obj) {
    return (
        obj.CADASTRO && obj.CADASTRO !== "S/A" &&
        obj.MODELO && obj.MODELO !== "S/A" &&
        obj.PLACA && obj.PLACA !== "S/A" &&
        obj["Nº (O.S)"] && obj["Nº (O.S)"] !== "S/A" &&
        obj["DATA do OF."] && obj["DATA do OF."] !== "S/A" &&
        obj["VALOR DA OS"] && obj["VALOR DA OS"] !== "S/A" &&
        obj.OFICINA && obj.OFICINA !== "S/A" &&
        obj["DEFEITO (MEC.) OBSERVADO"] && obj["DEFEITO (MEC.) OBSERVADO"] !== "S/A"
    );
}

/**
 * Função recursiva para encontrar todos os arquivos .docx em um diretório e suas subpastas.
 * @param {string} dirPath - O caminho do diretório a ser percorrido.
 * @param {Array<string>} fileList - Lista para armazenar os caminhos completos dos arquivos .docx.
 * @returns {Promise<Array<string>>} Uma lista de caminhos completos para arquivos .docx.
 */
async function findDocxFilesRecursive(dirPath, fileList = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            await findDocxFilesRecursive(filePath, fileList); // Recursão para subdiretórios
        } else if (stat.isFile() && file.toLowerCase().endsWith(".docx")) {
            fileList.push(filePath); // Adiciona o arquivo .docx à lista
        }
    }
    return fileList;
}

/**
 * Processa uma lista de arquivos .docx de uma pasta 'docs' (e subpastas) para extrair informações.
 * Salva os dados extraídos no Firestore.
 * @returns {Promise<Array<Object>>} Uma lista de objetos com os dados extraídos que foram salvos.
 */
async function processarArquivos() {
    // Define o caminho para a pasta 'docs' no mesmo diretório do script.
    const pastaDocs = path.join(__dirname, "docs");

    let arquivos = [];
    try {
        // Usa a função recursiva para encontrar todos os arquivos .docx
        arquivos = await findDocxFilesRecursive(pastaDocs);
        console.log(`🔍 Encontrados ${arquivos.length} arquivos .docx para processar.`);
    } catch (error) {
        console.error(`❌ Erro ao ler a pasta 'docs' ou subpastas: ${error.message}`);
        console.log("Certifique-se de que a pasta 'docs' existe no mesmo diretório do script e contém arquivos .docx (ou subpastas com eles).");
        return []; // Retorna um array vazio se a pasta não for encontrada ou houver erro de leitura
    }


    const resultados = [];
    const erros = [];

    // Itera sobre os arquivos .docx encontrados
    for (let i = 0; i < arquivos.length; i++) {
        const filepath = arquivos[i]; // 'filepath' já é o caminho completo
        const arquivo = path.basename(filepath); // Obtém apenas o nome do arquivo para o campo 'ARQUIVO'
        console.log(`Processando arquivo ${i + 1}/${arquivos.length}: ${arquivo}`); // Log de cada arquivo lido

        try {
            const texto = await extractTextFromDocx(filepath); // Extrai o texto do arquivo .docx
            const textoNormalizado = texto.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

            // Extrair 'DATA do OF.'
            const dataOficioMatch = textoNormalizado.match(
                /Fortaleza,\s*(\d{1,2} de [^\d]+?\d{4})/i
            );
            const dataDoOf = dataOficioMatch ? dataOficioMatch[1].trim() : "S/A";

            // Extrair 'Nº (O.S)'
            const osMatch = textoNormalizado.match(
                /ordem de serviço (?:N[º°]|N°|N)\s*(\d+)/i
            );
            const numOS = osMatch ? osMatch[1].trim() : "S/A";

            // Extrair 'OFICINA' (refinado para capturar apenas o nome da oficina)
            // Captura o nome da oficina até uma vírgula, ponto e vírgula, ou "referente ao serviço"
            const oficinaMatch = textoNormalizado.match(/na oficina\s*([^,;]+?)(?:, referente ao serviço|; no valor de R\$|\. Todo o serviço)/i);
            const oficina = oficinaMatch ? oficinaMatch[1].trim() : "S/A";

            // Extrair 'DEFEITO (MEC.) OBSERVADO' (refinado)
            // Captura tudo após "referente ao serviço (de) " até um ponto e vírgula ou "Todo o serviço"
            const defeitoMatch = textoNormalizado.match(
                /referente ao serviço (?:de)?\s*([^;]+?)(?:; no valor de R\$|\. Todo o serviço)/i
            );
            const defeito = defeitoMatch ? defeitoMatch[1].trim() : "S/A";

            // Extrair 'VALOR DA OS'
            const valorMatch = textoNormalizado.match(/valor de R\$\s*([\d\.,]+)/i);
            const valor = valorMatch ? valorMatch[1].trim() : "S/A";

            // Extrair 'CADASTRO', 'MODELO' e 'PLACA' com a função aprimorada
            const { cadastro, modelo, placa } = extrairCadastroModeloPlaca(texto);

            // Consulta ao Firestore para tentar preencher dados faltantes da frota
            const veiculoDb = await buscarVeiculo(
                cadastro !== "S/A" ? cadastro : null,
                modelo !== "S/A" ? modelo : null,
                placa !== "S/A" ? placa : null
            );

            let cadastroFinal = cadastro;
            let modeloFinal = modelo;
            let placaFinal = placa;

            if (veiculoDb) {
                if (cadastroFinal === "S/A" && veiculoDb.CADASTRO) cadastroFinal = veiculoDb.CADASTRO;
                if (modeloFinal === "S/A" && veiculoDb.MODELO) modeloFinal = veiculoDb.MODELO;
                if (placaFinal === "S/A" && veiculoDb.PLACA) placaFinal = veiculoDb.PLACA;
            }

            const ordemServicoRaw = { // Dados extraídos brutos
                CADASTRO: cadastroFinal,
                MODELO: modeloFinal,
                PLACA: placaFinal,
                "DEFEITO (MEC.) OBSERVADO": defeito,
                OFICINA: oficina,
                "Nº (O.S)": numOS,
                "DATA do OF.": dataDoOf,
                "VALOR DA OS": valor,
                ARQUIVO: arquivo,
                COMPLETO: false, // Inicializa como false, será atualizado após a verificação
            };

            // Verifica se o documento segue o "modelo de OS"
            ordemServicoRaw.COMPLETO = isCompleto(ordemServicoRaw);

            if (ordemServicoRaw.COMPLETO) {
                try {
                    // Mapeia os campos para o formato desejado no Firestore
                    const ordemServicoFirestore = {
                        cadastroViatura: ordemServicoRaw.CADASTRO,
                        dataCriacao: formatCurrentDateForFirestore(), // Data de criação atual formatada
                        dataOS: convertDateToYYYYMMDD(ordemServicoRaw["DATA do OF."]), // Converte a data da OS
                        modeloViatura: ordemServicoRaw.MODELO,
                        numeroOS: ordemServicoRaw["Nº (O.S)"],
                        observacao: ordemServicoRaw["DEFEITO (MEC.) OBSERVADO"],
                        oficinaResponsavel: ordemServicoRaw.OFICINA,
                        placaViatura: ordemServicoRaw.PLACA,
                        valorOS: ordemServicoRaw["VALOR DA OS"],
                        arquivoOriginal: ordemServicoRaw.ARQUIVO // Mantém o nome do arquivo original para referência
                    };

                    // Salva no Firestore na coleção 'ordensDeServico'
                    const docRef = await db.collection("ordensDeServico").add(ordemServicoFirestore);
                    console.log(`✔️ Extraído e salvo no Firestore: ${arquivo} (ID: ${docRef.id})`);
                    resultados.push(ordemServicoFirestore); // Adiciona ao array de resultados para a contagem final
                } catch (firestoreError) {
                    console.error(`❌ Erro ao salvar ${arquivo} no Firestore:`, firestoreError.message);
                    erros.push({ arquivo, erro: `Erro ao salvar no Firestore: ${firestoreError.message}`, detalhes: ordemServicoRaw });
                }
            } else {
                // Adiciona o objeto completo da ordem de serviço bruta aos erros para análise
                erros.push({ arquivo, erro: "Não segue o modelo de OS ou dados incompletos", detalhes: ordemServicoRaw });
                console.log(`⚠️ Ignorado: ${arquivo} (não segue o modelo de OS ou dados incompletos)`);
                console.log(`--- TEXTO EXTRAÍDO DE ${arquivo} (para análise, ignorado) ---\n${texto}\n-----------------------------\n`);
            }

        } catch (error) {
            console.error(`❌ Erro em ${arquivo}:`, error.message);
            erros.push({ arquivo, erro: error.message });
        }
    }

    // Salva os arquivos que foram ignorados ou apresentaram erros em um JSON local
    await fs.writeJson("erros.json", erros, { spaces: 2 });

    console.log(
        `\n✅ Extração concluída. ${resultados.length} registros extraídos que seguem o modelo de OS e foram salvos no Firestore.`
    );
    console.log(`⚠️ ${erros.length} arquivos foram ignorados ou apresentaram erros. Detalhes em 'erros.json'.`);
    return resultados; // Retorna os resultados para inspeção
}

// Chama a função de processamento
processarArquivos();
