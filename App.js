const cameraImage = document.getElementById("cameraStream"); // Referência ao elemento que exibe o quadro atual da câmera.
const detectionCanvas = document.getElementById("detectionCanvas"); // Área transparente usada para desenhar as detecções.
const detectionContext = detectionCanvas.getContext("2d"); // Contexto 2D necessário para desenhar no canvas.
const statusDiv = document.getElementById("status"); // Elemento que informa o estado de conexão e processamento.
const alertDiv = document.getElementById("alerta"); // Elemento que mostra o aviso principal de detecção.
const detectedObjectsDiv = document.getElementById("detectedObjects"); // Elemento que lista os objetos e suas confianças.
const startButton = document.getElementById("startButton"); // Botão que inicia ou interrompe o monitoramento.
const voiceEnabled = document.getElementById("voiceEnabled"); // Opção que habilita ou desabilita os avisos falados.
const confidenceInput = document.getElementById("confidence"); // Controle de sensibilidade usado para filtrar previsões.
const confidenceValue = document.getElementById("confidenceValue"); // Saída textual que apresenta a sensibilidade selecionada.

const OBJECT_LABELS = { // Relaciona as classes do COCO-SSD aos nomes exibidos em português.
    person: "pessoa", // Traduz a classe de pessoa para o rótulo exibido em português.
    bicycle: "bicicleta", // Traduz a classe de bicicleta para o rótulo exibido.
    car: "carro", // Traduz a classe de automóvel para o rótulo exibido.
    motorcycle: "motocicleta", // Traduz a classe de motocicleta para o rótulo exibido.
    airplane: "avião", // Traduz a classe de avião para o rótulo exibido.
    bus: "ônibus", // Traduz a classe de ônibus para o rótulo exibido.
    train: "trem", // Traduz a classe de trem para o rótulo exibido.
    truck: "caminhão", // Traduz a classe de caminhão para o rótulo exibido.
    boat: "barco", // Traduz a classe de barco para o rótulo exibido.
    "traffic light": "semáforo", // Traduz a classe de semáforo para o rótulo exibido.
    "fire hydrant": "hidrante", // Traduz a classe de hidrante para o rótulo exibido.
    "stop sign": "placa de pare", // Traduz a classe de placa de parada para o rótulo exibido.
    "parking meter": "parquímetro", // Traduz a classe de parquímetro para o rótulo exibido.
    bench: "banco", // Traduz a classe de banco para o rótulo exibido.
    bird: "pássaro", // Traduz a classe de pássaro para o rótulo exibido.
    cat: "gato", // Traduz a classe de gato para o rótulo exibido.
    dog: "cachorro", // Traduz a classe de cachorro para o rótulo exibido.
    horse: "cavalo", // Traduz a classe de cavalo para o rótulo exibido.
    sheep: "ovelha", // Traduz a classe de ovelha para o rótulo exibido.
    cow: "vaca", // Traduz a classe de vaca para o rótulo exibido.
    elephant: "elefante", // Traduz a classe de elefante para o rótulo exibido.
    bear: "urso", // Traduz a classe de urso para o rótulo exibido.
    zebra: "zebra", // Traduz a classe de zebra para o rótulo exibido.
    giraffe: "girafa", // Traduz a classe de girafa para o rótulo exibido.
    backpack: "mochila", // Traduz a classe de mochila para o rótulo exibido.
    umbrella: "guarda-chuva", // Traduz a classe de guarda-chuva para o rótulo exibido.
    handbag: "bolsa", // Traduz a classe de bolsa para o rótulo exibido.
    suitcase: "mala", // Traduz a classe de mala para o rótulo exibido.
    frisbee: "frisbee", // Traduz a classe de frisbee para o rótulo exibido.
    skateboard: "skate", // Traduz a classe de skate para o rótulo exibido.
    "sports ball": "bola", // Traduz a classe de bola esportiva para o rótulo exibido.
    "tennis racket": "raquete", // Traduz a classe de raquete de tênis para o rótulo exibido.
    bottle: "garrafa", // Traduz a classe de garrafa para o rótulo exibido.
    "wine glass": "taça", // Traduz a classe de taça para o rótulo exibido.
    cup: "xícara", // Traduz a classe de xícara para o rótulo exibido.
    chair: "cadeira", // Traduz a classe de cadeira para o rótulo exibido.
    couch: "sofá", // Traduz a classe de sofá para o rótulo exibido.
    "potted plant": "vaso de planta", // Traduz a classe de planta em vaso para o rótulo exibido.
    bed: "cama", // Traduz a classe de cama para o rótulo exibido.
    "dining table": "mesa", // Traduz a classe de mesa de jantar para o rótulo exibido.
    toilet: "vaso sanitário", // Traduz a classe de vaso sanitário para o rótulo exibido.
    tv: "televisão", // Traduz a classe de televisão para o rótulo exibido.
    laptop: "notebook", // Traduz a classe de notebook para o rótulo exibido.
    microwave: "micro-ondas", // Traduz a classe de micro-ondas para o rótulo exibido.
    oven: "forno", // Traduz a classe de forno para o rótulo exibido.
    sink: "pia", // Traduz a classe de pia para o rótulo exibido.
    refrigerator: "geladeira" // Traduz a classe de geladeira para o rótulo exibido.
}; // Encerra o mapa de classes reconhecidas para seus nomes em português.

let model; // Guarda o modelo COCO-SSD carregado para análise dos quadros.
let running = false; // Indica se o ciclo de monitoramento está ativo.
let processing = false; // Evita iniciar outra análise enquanto um quadro está sendo processado.
let lastAnnouncedClass = ""; // Armazena a última classe anunciada para controle dos avisos.
let lastAnnouncementAt = 0; // Registra o horário do último aviso falado.
let resizeObserver; // Observa mudanças de tamanho da imagem para ajustar as marcações.

confidenceInput.addEventListener("input", () => { // Trata alterações no controle de sensibilidade.
    confidenceValue.textContent = `${confidenceInput.value}%`; // Atualiza o percentual mostrado junto ao controle.
}); // Atualiza a exibição sempre que a sensibilidade muda.

startButton.addEventListener("click", startAssistant); // Associa o botão à rotina de iniciar ou parar.

async function startAssistant() { // Valida as configurações, carrega o modelo e inicia a captura.
    if (running) { // Verifica se o botão foi acionado durante um monitoramento ativo.
        stopAssistant(); // Encerra o monitoramento em andamento.
        return; // Não executa novamente a etapa de inicialização.
    } // Finaliza a verificação do estado atual.

    const host = document.getElementById("cameraHost").value.trim(); // Lê o IP da câmera e remove espaços externos.
    const port = document.getElementById("cameraPort").value.trim(); // Lê a porta digitada e remove espaços externos.

    if (!host || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) { // Rejeita IP vazio e porta fora do formato ou intervalo esperado.
        statusDiv.textContent = "Informe o IP mostrado no IP Webcam e uma porta válida."; // Explica como corrigir os dados de conexão.
        return; // Impede o início com parâmetros inválidos.
    } // Encerra a validação de entrada.

    startButton.disabled = true; // Evita acionamentos repetidos durante a inicialização.
    statusDiv.textContent = "Carregando o modelo de IA no computador..."; // Informa que o modelo está sendo preparado.

    try { // Executa as etapas de inicialização que podem falhar.
        if (!window.cocoSsd || !window.tf) { // Confere se TensorFlow.js e COCO-SSD foram carregados pela página.
            throw new Error("As bibliotecas da IA não foram carregadas. Verifique a conexão com a internet."); // Interrompe a inicialização com uma mensagem útil.
        } // Termina a verificação das bibliotecas.

        model = model || await cocoSsd.load({ base: "lite_mobilenet_v2" }); // Carrega o modelo uma vez ou reutiliza o modelo já carregado.
        running = true; // Ativa o ciclo de captura e análise de imagens.
        resizeObserver = new ResizeObserver(drawDetections); // Prepara a atualização das caixas quando o tamanho da imagem mudar.
        resizeObserver.observe(cameraImage); // Começa a observar as dimensões da imagem exibida.
        startButton.textContent = "Parar monitoramento"; // Atualiza o botão para permitir interromper o processo.
        statusDiv.textContent = "IA pronta. Conectando ao IP Webcam..."; // Informa que o carregamento do modelo terminou.
        loadNextFrame(host, port); // Solicita o primeiro quadro da câmera.
    } catch (error) { // Mostra e registra erros ocorridos durante a inicialização.
        statusDiv.textContent = error.message || "Não foi possível carregar o modelo de IA."; // Apresenta a causa do erro ou uma mensagem padrão.
        console.error("Falha ao iniciar o assistente:", error); // Registra detalhes técnicos no console do navegador.
    } finally { // Restaura o botão depois do sucesso ou da falha.
        startButton.disabled = false; // Reabilita o botão mesmo quando ocorre uma falha.
    } // Encerra o tratamento de inicialização.
} // Finaliza a rotina que valida e inicia o monitoramento.

function stopAssistant() { // Interrompe a captura e limpa os recursos e avisos ativos.
    running = false; // Interrompe novas solicitações e análises de quadros.
    cameraImage.removeAttribute("src"); // Remove a imagem exibida da câmera.
    detectionContext.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height); // Apaga todas as caixas desenhadas no canvas.
    detectedObjectsDiv.textContent = ""; // Limpa a lista de objetos anteriormente detectados.
    resizeObserver?.disconnect(); // Para de observar redimensionamentos, se o observador existir.
    resizeObserver = undefined; // Libera a referência ao observador encerrado.
    window.speechSynthesis?.cancel(); // Cancela um anúncio falado que ainda esteja em andamento.
    startButton.textContent = "Iniciar monitoramento"; // Restaura o rótulo inicial do botão.
    statusDiv.textContent = "Monitoramento pausado."; // Informa que a captura foi interrompida.
    alertDiv.textContent = "Monitoramento pausado"; // Atualiza também o aviso principal da interface.
} // Finaliza a rotina de parada e limpeza visual.

function loadNextFrame(host, port) { // Solicita o próximo quadro e define como reagir ao resultado.
    if (!running) return; // Não solicita imagens quando o monitoramento está parado.

    const params = new URLSearchParams({ host, port, ts: Date.now().toString() }); // Codifica os dados da câmera e inclui um marcador para evitar cache.
    cameraImage.onload = () => { // Processa o quadro assim que ele termina de carregar.
        if (!running) return; // Ignora imagens que terminem de carregar após a parada do monitoramento.
        statusDiv.textContent = "Monitorando as imagens do IP Webcam neste computador."; // Exibe o estado de conexão ativo.
        analyzeFrame(host, port); // Envia o quadro carregado para a análise de objetos.
    }; // Define a ação executada quando um quadro chega com sucesso.
    cameraImage.onerror = () => { // Informa uma falha e agenda uma nova tentativa de conexão.
        if (!running) return; // Evita reagir a um erro depois que o monitoramento foi encerrado.
        statusDiv.textContent = "Sem imagem da câmera. Confira IP, porta e se o IP Webcam está transmitindo."; // Orienta a conferir a conexão da câmera.
        alertDiv.textContent = "Câmera desconectada"; // Destaca o estado de desconexão no aviso principal.
        detectedObjectsDiv.textContent = ""; // Remove resultados que já não correspondem à câmera.
        detectionContext.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height); // Apaga as marcações do quadro anterior.
        window.setTimeout(() => loadNextFrame(host, port), 2500); // Tenta obter outro quadro após uma pausa.
    }; // Define a recuperação para falhas ao carregar a imagem.
    cameraImage.src = `/camera.jpg?${params.toString()}`; // Solicita ao servidor local o próximo quadro da câmera.
} // Finaliza a preparação de uma solicitação de imagem.

async function analyzeFrame(host, port) { // Executa o modelo no quadro e atualiza os resultados.
    if (!running || processing) return; // Evita analisar quando parado ou quando outro quadro ainda está sendo processado.
    processing = true; // Marca o processamento atual para impedir concorrência.

    try { // Analisa o quadro e trata as previsões retornadas pelo modelo.
        const predictions = await model.detect(cameraImage); // Executa a detecção de objetos no quadro atual.
        const threshold = Number(confidenceInput.value) / 100; // Converte a sensibilidade percentual para uma fração.
        const objects = predictions // Inicia o tratamento das previsões retornadas pelo modelo.
            .filter((prediction) => prediction.score >= threshold && OBJECT_LABELS[prediction.class]) // Mantém previsões acima do limite e pertencentes às classes mapeadas.
            .sort((a, b) => b.score - a.score); // Ordena os objetos da maior para a menor confiança.

        drawDetections(objects); // Atualiza as caixas desenhadas para este quadro.
        if (objects.length > 0) { // Verifica se restou ao menos um objeto reconhecido.
            const labels = [...new Set(objects.map((object) => OBJECT_LABELS[object.class]))]; // Cria uma lista sem rótulos repetidos.
            alertDiv.textContent = `Possível obstáculo: ${labels.join(", ")}`; // Mostra os rótulos encontrados como aviso não conclusivo.
            detectedObjectsDiv.textContent = objects // Inicia a criação da lista detalhada de resultados.
                .map((object) => `${OBJECT_LABELS[object.class]} (${Math.round(object.score * 100)}%)`) // Formata o nome e a confiança percentual de cada objeto.
                .join(" · "); // Separa os resultados em uma única linha.
            announceIfNeeded(objects[0].class, OBJECT_LABELS[objects[0].class]); // Avalia se o objeto mais confiante deve ser falado.
        } else { // Atualiza a interface quando nenhum objeto passa pelo filtro.
            alertDiv.textContent = "Nenhum objeto reconhecido neste quadro"; // Informa que não houve reconhecimento, sem indicar caminho livre.
            detectedObjectsDiv.textContent = ""; // Limpa a lista de detecções.
            lastAnnouncedClass = ""; // Reinicia o controle de classe anunciada para este intervalo.
        } // Encerra a atualização da interface conforme os resultados.
    } catch (error) { // Exibe e registra erros ocorridos durante a análise.
        statusDiv.textContent = "Não foi possível analisar a imagem recebida."; // Informa que a análise do quadro falhou.
        console.error("Falha na análise da imagem:", error); // Registra o erro técnico para investigação.
    } finally { // Libera o processamento e agenda o próximo quadro quando aplicável.
        processing = false; // Libera o processamento para o próximo quadro.
        if (running) window.setTimeout(() => loadNextFrame(host, port), 300); // Agenda o próximo quadro somente se a captura continua ativa.
    } // Garante o agendamento ou liberação mesmo quando a análise falhar.
} // Finaliza a detecção e a atualização dos avisos de cada quadro.

function drawDetections(objects = []) { // Desenha no canvas as caixas e os rótulos dos objetos detectados.
    if (!cameraImage.naturalWidth || !cameraImage.naturalHeight) return; // Aguarda dimensões válidas antes de desenhar as caixas.

    const bounds = cameraImage.getBoundingClientRect(); // Obtém o tamanho visual da imagem na página.
    const scaleX = bounds.width / cameraImage.naturalWidth; // Calcula o fator horizontal entre pixels da imagem e da tela.
    const scaleY = bounds.height / cameraImage.naturalHeight; // Calcula o fator vertical entre pixels da imagem e da tela.
    const pixelRatio = window.devicePixelRatio || 1; // Considera a densidade de pixels do dispositivo.

    detectionCanvas.width = Math.round(bounds.width * pixelRatio); // Define a largura interna do canvas considerando a densidade da tela.
    detectionCanvas.height = Math.round(bounds.height * pixelRatio); // Define a altura interna do canvas considerando a densidade da tela.
    detectionCanvas.style.width = `${bounds.width}px`; // Mantém a largura visual do canvas alinhada à imagem.
    detectionCanvas.style.height = `${bounds.height}px`; // Mantém a altura visual do canvas alinhada à imagem.
    detectionContext.setTransform(pixelRatio * scaleX, 0, 0, pixelRatio * scaleY, 0, 0); // Alinha coordenadas do modelo aos pixels visíveis.
    detectionContext.clearRect(0, 0, cameraImage.naturalWidth, cameraImage.naturalHeight); // Limpa as marcações anteriores antes do novo desenho.
    detectionContext.lineWidth = Math.max(3, cameraImage.naturalWidth / 240); // Ajusta a espessura das caixas à resolução do quadro.
    detectionContext.font = `bold ${Math.max(16, cameraImage.naturalWidth / 40)}px Arial`; // Define o tamanho legível do texto conforme a resolução.
    detectionContext.textBaseline = "top"; // Usa o topo do texto como referência vertical de desenho.

    for (const object of objects) { // Desenha separadamente cada objeto reconhecido.
        const [x, y, width, height] = object.bbox; // Separa posição e dimensões da caixa retornada pelo modelo.
        const label = `${OBJECT_LABELS[object.class]} ${Math.round(object.score * 100)}%`; // Monta o rótulo em português com a confiança da detecção.
        const textWidth = detectionContext.measureText(label).width; // Mede o rótulo para dimensionar seu fundo.
        const textHeight = Math.max(22, cameraImage.naturalWidth / 32); // Define uma altura mínima e proporcional para o rótulo.
        const labelY = Math.max(0, y - textHeight - 6); // Posiciona o rótulo acima da caixa sem ultrapassar o topo da imagem.

        detectionContext.strokeStyle = "#facc15"; // Usa amarelo para destacar o contorno da caixa.
        detectionContext.fillStyle = "#facc15"; // Usa o mesmo amarelo no fundo do rótulo.
        detectionContext.fillRect(x, labelY, textWidth + 12, textHeight + 6); // Desenha o fundo colorido atrás do texto.
        detectionContext.strokeRect(x, y, width, height); // Desenha o contorno ao redor do objeto reconhecido.
        detectionContext.fillStyle = "#111827"; // Define texto escuro com contraste sobre o fundo amarelo.
        detectionContext.fillText(label, x + 6, labelY + 3); // Desenha o nome e a confiança dentro do rótulo.
    } // Encerra o desenho das caixas para todos os objetos recebidos.
} // Finaliza a rotina de renderização das detecções no canvas.

function announceIfNeeded(objectClass, label) { // Controla a frequência e a reprodução dos avisos falados.
    if (!voiceEnabled.checked || !("speechSynthesis" in window)) return; // Sai se a voz estiver desativada ou indisponível no navegador.

    const now = Date.now(); // Captura o horário atual para limitar a frequência dos avisos.
    if (now - lastAnnouncementAt < 5000) return; // Evita repetir avisos com intervalo menor que cinco segundos.

    lastAnnouncedClass = objectClass; // Guarda a classe que será anunciada.
    lastAnnouncementAt = now; // Atualiza o horário do último anúncio realizado.

    const utterance = new SpeechSynthesisUtterance(`Possível obstáculo: ${label}`); // Prepara o texto falado com o rótulo detectado.
    utterance.lang = "pt-BR"; // Configura a pronúncia para português do Brasil.
    utterance.rate = 1; // Mantém a velocidade de fala padrão.
    window.speechSynthesis.speak(utterance); // Solicita ao navegador que reproduza o aviso.
} // Finaliza o controle e a reprodução dos alertas por voz.
