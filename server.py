import ipaddress
import logging
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
MAX_IMAGE_BYTES = 8 * 1024 * 1024


class AssistantHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/camera.jpg":
            self.serve_camera_frame()
            return
        super().do_GET()

    def serve_camera_frame(self):
        query = parse_qs(urlsplit(self.path).query)
        host = query.get("host", [""])[0]
        port_text = query.get("port", ["8080"])[0]

        try:
            address = ipaddress.ip_address(host)
            port = int(port_text)
            if address.version != 4 or not address.is_private or address.is_loopback or address.is_link_local:
                raise ValueError("Use o endereço IPv4 privado mostrado no IP Webcam.")
            if not 1 <= port <= 65535:
                raise ValueError("A porta informada é inválida.")
        except ValueError as error:
            self.send_error(400, str(error))
            return

        url = f"http://{address}:{port}/shot.jpg"
        request = Request(url, headers={"User-Agent": "AcessibilidadeLocal/1.0"})

        try:
            with urlopen(request, timeout=4) as response:
                if response.status != 200 or not response.headers.get("Content-Type", "").lower().startswith("image/"):
                    self.send_error(502, "O IP Webcam não retornou uma imagem.")
                    return
                image = response.read(MAX_IMAGE_BYTES + 1)
            if len(image) > MAX_IMAGE_BYTES:
                self.send_error(502, "A imagem recebida excede o limite permitido.")
                return
        except (OSError, URLError, TimeoutError) as error:
            logging.warning("Falha ao obter imagem do IP Webcam: %s", error)
            self.send_error(502, "Não foi possível acessar o IP Webcam.")
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(image)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(image)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    server = ThreadingHTTPServer(("127.0.0.1", 8000), AssistantHandler)
    print("Abra http://127.0.0.1:8000 no computador. Para encerrar, pressione Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()
