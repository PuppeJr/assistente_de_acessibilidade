const cameraImage = document.getElementById("cameraStream");
const detectionCanvas = document.getElementById("detectionCanvas");
const detectionContext = detectionCanvas.getContext("2d");
const statusDiv = document.getElementById("status");
const alertDiv = document.getElementById("alerta");
const detectedObjectsDiv = document.getElementById("detectedObjects");
const startButton = document.getElementById("startButton");
const voiceEnabled = document.getElementById("voiceEnabled");
const confidenceInput = document.getElementById("confidence");
const confidenceValue = document.getElementById("confidenceValue");

const OBJECT_LABELS = {
    person: "pessoa",
    bicycle: "bicicleta",
    car: "carro",
    motorcycle: "motocicleta",
    airplane: "avião",
    bus: "ônibus",
    train: "trem",
    truck: "caminhão",
    boat: "barco",
    "traffic light": "semáforo",
    "fire hydrant": "hidrante",
    "stop sign": "placa de pare",
    "parking meter": "parquímetro",
    bench: "banco",
    bird: "pássaro",
    cat: "gato",
    dog: "cachorro",
    horse: "cavalo",
    sheep: "ovelha",
    cow: "vaca",
    elephant: "elefante",
    bear: "urso",
    zebra: "zebra",
    giraffe: "girafa",
    backpack: "mochila",
    umbrella: "guarda-chuva",
    handbag: "bolsa",
    suitcase: "mala",
    frisbee: "frisbee",
    skateboard: "skate",
    "sports ball": "bola",
    "tennis racket": "raquete",
    bottle: "garrafa",
    "wine glass": "taça",
    cup: "xícara",
    chair: "cadeira",
    couch: "sofá",
    "potted plant": "vaso de planta",
    bed: "cama",
    "dining table": "mesa",
    toilet: "vaso sanitário",
    tv: "televisão",
    laptop: "notebook",
    microwave: "micro-ondas",
    oven: "forno",
    sink: "pia",
    refrigerator: "geladeira"
};

let model;
let running = false;
let processing = false;
let lastAnnouncedClass = "";
let lastAnnouncementAt = 0;
let resizeObserver;

confidenceInput.addEventListener("input", () => {
    confidenceValue.textContent = `${confidenceInput.value}%`;
});

startButton.addEventListener("click", startAssistant);

async function startAssistant() {
    if (running) {
        stopAssistant();
        return;
    }

    const host = document.getElementById("cameraHost").value.trim();
    const port = document.getElementById("cameraPort").value.trim();

    if (!host || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
        statusDiv.textContent = "Informe o IP mostrado no IP Webcam e uma porta válida.";
        return;
    }

    startButton.disabled = true;
    statusDiv.textContent = "Carregando o modelo de IA no computador...";

    try {
        if (!window.cocoSsd || !window.tf) {
            throw new Error("As bibliotecas da IA não foram carregadas. Verifique a conexão com a internet.");
        }

        model = model || await cocoSsd.load({ base: "lite_mobilenet_v2" });
        running = true;
        resizeObserver = new ResizeObserver(drawDetections);
        resizeObserver.observe(cameraImage);
        startButton.textContent = "Parar monitoramento";
        statusDiv.textContent = "IA pronta. Conectando ao IP Webcam...";
        loadNextFrame(host, port);
    } catch (error) {
        statusDiv.textContent = error.message || "Não foi possível carregar o modelo de IA.";
        console.error("Falha ao iniciar o assistente:", error);
    } finally {
        startButton.disabled = false;
    }
}

function stopAssistant() {
    running = false;
    cameraImage.removeAttribute("src");
    detectionContext.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
    detectedObjectsDiv.textContent = "";
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    window.speechSynthesis?.cancel();
    startButton.textContent = "Iniciar monitoramento";
    statusDiv.textContent = "Monitoramento pausado.";
    alertDiv.textContent = "Monitoramento pausado";
}

function loadNextFrame(host, port) {
    if (!running) return;

    const params = new URLSearchParams({ host, port, ts: Date.now().toString() });
    cameraImage.onload = () => {
        if (!running) return;
        statusDiv.textContent = "Monitorando as imagens do IP Webcam neste computador.";
        analyzeFrame(host, port);
    };
    cameraImage.onerror = () => {
        if (!running) return;
        statusDiv.textContent = "Sem imagem da câmera. Confira IP, porta e se o IP Webcam está transmitindo.";
        alertDiv.textContent = "Câmera desconectada";
        detectedObjectsDiv.textContent = "";
        detectionContext.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
        window.setTimeout(() => loadNextFrame(host, port), 2500);
    };
    cameraImage.src = `/camera.jpg?${params.toString()}`;
}

async function analyzeFrame(host, port) {
    if (!running || processing) return;
    processing = true;

    try {
        const predictions = await model.detect(cameraImage);
        const threshold = Number(confidenceInput.value) / 100;
        const objects = predictions
            .filter((prediction) => prediction.score >= threshold && OBJECT_LABELS[prediction.class])
            .sort((a, b) => b.score - a.score);

        drawDetections(objects);
        if (objects.length > 0) {
            const labels = [...new Set(objects.map((object) => OBJECT_LABELS[object.class]))];
            alertDiv.textContent = `Possível obstáculo: ${labels.join(", ")}`;
            detectedObjectsDiv.textContent = objects
                .map((object) => `${OBJECT_LABELS[object.class]} (${Math.round(object.score * 100)}%)`)
                .join(" · ");
            announceIfNeeded(objects[0].class, OBJECT_LABELS[objects[0].class]);
        } else {
            alertDiv.textContent = "Nenhum objeto reconhecido neste quadro";
            detectedObjectsDiv.textContent = "";
            lastAnnouncedClass = "";
        }
    } catch (error) {
        statusDiv.textContent = "Não foi possível analisar a imagem recebida.";
        console.error("Falha na análise da imagem:", error);
    } finally {
        processing = false;
        if (running) window.setTimeout(() => loadNextFrame(host, port), 300);
    }
}

function drawDetections(objects = []) {
    if (!cameraImage.naturalWidth || !cameraImage.naturalHeight) return;

    const bounds = cameraImage.getBoundingClientRect();
    const scaleX = bounds.width / cameraImage.naturalWidth;
    const scaleY = bounds.height / cameraImage.naturalHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    detectionCanvas.width = Math.round(bounds.width * pixelRatio);
    detectionCanvas.height = Math.round(bounds.height * pixelRatio);
    detectionCanvas.style.width = `${bounds.width}px`;
    detectionCanvas.style.height = `${bounds.height}px`;
    detectionContext.setTransform(pixelRatio * scaleX, 0, 0, pixelRatio * scaleY, 0, 0);
    detectionContext.clearRect(0, 0, cameraImage.naturalWidth, cameraImage.naturalHeight);
    detectionContext.lineWidth = Math.max(3, cameraImage.naturalWidth / 240);
    detectionContext.font = `bold ${Math.max(16, cameraImage.naturalWidth / 40)}px Arial`;
    detectionContext.textBaseline = "top";

    for (const object of objects) {
        const [x, y, width, height] = object.bbox;
        const label = `${OBJECT_LABELS[object.class]} ${Math.round(object.score * 100)}%`;
        const textWidth = detectionContext.measureText(label).width;
        const textHeight = Math.max(22, cameraImage.naturalWidth / 32);
        const labelY = Math.max(0, y - textHeight - 6);

        detectionContext.strokeStyle = "#facc15";
        detectionContext.fillStyle = "#facc15";
        detectionContext.fillRect(x, labelY, textWidth + 12, textHeight + 6);
        detectionContext.strokeRect(x, y, width, height);
        detectionContext.fillStyle = "#111827";
        detectionContext.fillText(label, x + 6, labelY + 3);
    }
}

function announceIfNeeded(objectClass, label) {
    if (!voiceEnabled.checked || !("speechSynthesis" in window)) return;

    const now = Date.now();
    if (now - lastAnnouncementAt < 5000) return;

    lastAnnouncedClass = objectClass;
    lastAnnouncementAt = now;

    const utterance = new SpeechSynthesisUtterance(`Possível obstáculo: ${label}`);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}
