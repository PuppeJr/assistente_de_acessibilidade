import ipaddress  # Valida o endereço IP da câmera antes de iniciar a conexão.
import logging  # Registra falhas de conexão para facilitar o diagnóstico.
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer  # Fornece o servidor HTTP local com suporte a várias requisições.
from pathlib import Path  # Resolve o diretório onde os arquivos da aplicação estão.
from urllib.error import URLError  # Permite tratar erros retornados pela requisição HTTP.
from urllib.parse import parse_qs, urlsplit  # Separa caminho e parâmetros da URL recebida.
from urllib.request import Request, urlopen  # Cria e executa a requisição à câmera.


ROOT = Path(__file__).resolve().parent  # Define a pasta do projeto como raiz dos arquivos servidos.
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # Limita cada imagem recebida a 8 MiB.


class AssistantHandler(SimpleHTTPRequestHandler):  # Define o comportamento HTTP específico da aplicação.
    def __init__(self, *args, **kwargs):  # Inicializa o manipulador usando a pasta do projeto como raiz.
        super().__init__(*args, directory=str(ROOT), **kwargs)  # Faz os arquivos estáticos serem servidos a partir da raiz do projeto.

    def do_GET(self):  # Trata solicitações HTTP GET recebidas pelo servidor.
        if urlsplit(self.path).path == "/camera.jpg":  # Direciona o endpoint de imagem para o encaminhador da câmera.
            self.serve_camera_frame()  # Obtém e devolve o quadro atual do IP Webcam.
            return  # Evita que o endpoint seja tratado como um arquivo local.
        super().do_GET()  # Mantém o comportamento padrão para os demais arquivos da aplicação.

    def serve_camera_frame(self):  # Busca um quadro JPEG no IP Webcam e o encaminha ao navegador.
        query = parse_qs(urlsplit(self.path).query)  # Lê os parâmetros enviados na URL do endpoint.
        host = query.get("host", [""])[0]  # Obtém o endereço IPv4 informado para a câmera.
        port_text = query.get("port", ["8080"])[0]  # Obtém a porta da câmera ou usa a porta padrão.

        try:  # Valida o endereço e a porta informados antes de conectar.
            address = ipaddress.ip_address(host)  # Valida e normaliza o endereço informado.
            port = int(port_text)  # Converte a porta para número para validar seu intervalo.
            if address.version != 4 or not address.is_private or address.is_loopback or address.is_link_local:  # Restringe a conexão a um IPv4 privado da rede local.
                raise ValueError("Use o endereço IPv4 privado mostrado no IP Webcam.")  # Informa o formato de endereço esperado.
            if not 1 <= port <= 65535:  # Confere se a porta está no intervalo permitido pelo protocolo.
                raise ValueError("A porta informada é inválida.")  # Informa que a porta não é válida.
        except ValueError as error:  # Converte entradas inválidas em uma resposta HTTP adequada.
            self.send_error(400, str(error))  # Responde com erro de requisição e a causa da validação.
            return  # Não tenta acessar a câmera com parâmetros inválidos.

        url = f"http://{address}:{port}/shot.jpg"  # Monta o endereço do quadro JPEG fornecido pelo IP Webcam.
        request = Request(url, headers={"User-Agent": "AcessibilidadeLocal/1.0"})  # Identifica a requisição feita pelo assistente.

        try:  # Solicita e valida o conteúdo da imagem retornada pela câmera.
            with urlopen(request, timeout=4) as response:  # Busca a imagem com limite de quatro segundos para a conexão.
                if response.status != 200 or not response.headers.get("Content-Type", "").lower().startswith("image/"):  # Confere o status HTTP e o tipo de conteúdo retornado.
                    self.send_error(502, "O IP Webcam não retornou uma imagem.")  # Informa que a resposta da câmera não contém uma imagem válida.
                    return  # Interrompe o processamento desta resposta inválida.
                image = response.read(MAX_IMAGE_BYTES + 1)  # Lê no máximo um byte além do limite para detectar excesso de tamanho.
            if len(image) > MAX_IMAGE_BYTES:  # Verifica se o conteúdo ultrapassou o tamanho permitido.
                self.send_error(502, "A imagem recebida excede o limite permitido.")  # Rejeita imagens grandes demais.
                return  # Impede o envio da imagem acima do limite.
        except (OSError, URLError, TimeoutError) as error:  # Trata erros de rede, URL e tempo limite.
            logging.warning("Falha ao obter imagem do IP Webcam: %s", error)  # Registra o erro sem expor detalhes técnicos ao navegador.
            self.send_error(502, "Não foi possível acessar o IP Webcam.")  # Informa ao cliente que a câmera não pôde ser acessada.
            return  # Encerra o atendimento após a falha na conexão.

        self.send_response(200)  # Indica que o quadro da câmera foi obtido com sucesso.
        self.send_header("Content-Type", "image/jpeg")  # Declara que o corpo da resposta é uma imagem JPEG.
        self.send_header("Content-Length", str(len(image)))  # Informa o tamanho exato do conteúdo enviado.
        self.send_header("Cache-Control", "no-store")  # Evita que o navegador reutilize um quadro antigo em cache.
        self.end_headers()  # Finaliza os cabeçalhos antes de enviar o conteúdo.
        self.wfile.write(image)  # Envia os bytes da imagem ao navegador.


if __name__ == "__main__":  # Executa o servidor somente quando este arquivo é iniciado diretamente.
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")  # Configura mensagens de log com horário.
    server = ThreadingHTTPServer(("127.0.0.1", 8000), AssistantHandler)  # Inicia o servidor somente no próprio computador.
    print("Abra http://127.0.0.1:8000 no computador. Para encerrar, pressione Ctrl+C.")  # Exibe o endereço local da aplicação.
    try:  # Mantém o servidor ativo até uma interrupção do usuário.
        server.serve_forever()  # Mantém o servidor atendendo requisições até ser interrompido.
    except KeyboardInterrupt:  # Trata Ctrl+C como um encerramento normal.
        print("\nServidor encerrado.")  # Confirma o encerramento solicitado pelo usuário.
    finally:  # Garante a liberação dos recursos de rede em qualquer caso.
        server.server_close()  # Libera o socket do servidor ao terminar.
