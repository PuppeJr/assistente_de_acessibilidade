# Assistente de Acessibilidade

Aplicação experimental que usa a câmera de um celular Android como fonte de imagens e inteligência artificial no navegador do computador para reconhecer objetos. O objetivo é oferecer alertas visuais e por voz que possam auxiliar na percepção do ambiente.

> **Atenção:** este projeto é experimental e não substitui bengala, cão-guia, acompanhante ou outros recursos de orientação e mobilidade. O modelo pode não detectar objetos ou classificá-los incorretamente. A aplicação não mede distância nem confirma se o caminho está livre.

## Funcionalidades

- Recebe imagens de um celular executando o aplicativo IP Webcam pela rede Wi-Fi local.
- Detecta objetos reconhecidos pelo modelo COCO-SSD e desenha caixas e rótulos sobre a imagem.
- Exibe os objetos identificados e o nível de confiança.
- Permite ajustar a sensibilidade da detecção (30% a 90%).
- Pode anunciar por voz, em português, o objeto com maior confiança; o recurso pode ser desativado.
- Executa a inferência no navegador do computador. As imagens são encaminhadas pelo servidor local entre o celular e o navegador.

## Tecnologias utilizadas

- **HTML, CSS e JavaScript:** interface e lógica do aplicativo, sem framework de frontend.
- **TensorFlow.js 4.22.0:** execução do modelo de IA no navegador.
- **COCO-SSD 2.2.3 (Lite MobileNet v2):** reconhecimento de objetos.
- **Python 3.7 ou superior:** servidor HTTP local e encaminhamento das imagens do IP Webcam. Usa apenas a biblioteca padrão do Python, sem pacotes adicionais.
- **IP Webcam para Android:** fornece as imagens da câmera do celular.

As bibliotecas JavaScript são carregadas de um CDN, portanto é necessária conexão com a internet para abrir a aplicação e carregar o modelo. Após o carregamento, a detecção é executada no computador.

## Pré-requisitos

- Computador com Python 3.7+ e navegador atualizado (recomenda-se Chrome ou Edge).
- Celular Android com o **IP Webcam** instalado.
- Computador e celular conectados à mesma rede Wi-Fi.
- Acesso à internet no computador para carregar TensorFlow.js, COCO-SSD e o modelo.

## Instalação e execução

Não é necessário instalar Node.js, criar ambiente virtual ou instalar dependências Python.

1. Baixe ou clone o projeto e abra um terminal na pasta que contém `server.py`, `index.html`, `App.js` e `style.css`.
2. Inicie o servidor local:

   **Windows (PowerShell ou Prompt de Comando):**

   ```powershell
   py server.py
   ```

   Se o comando `py` não estiver disponível, tente:

   ```powershell
   python server.py
   ```

   **Linux/macOS:**

   ```bash
   python3 server.py
   ```

3. No computador, abra [http://127.0.0.1:8000](http://127.0.0.1:8000).
4. No celular, abra o IP Webcam e toque em **Iniciar servidor**.
5. Na interface do computador, informe o endereço IPv4 e a porta apresentados pelo IP Webcam (normalmente `8080`) e clique em **Iniciar monitoramento**.
6. Permita o áudio do navegador, se quiser receber alertas por voz. Para encerrar, clique em **Parar monitoramento** ou pressione `Ctrl+C` no terminal.

O servidor é iniciado apenas em `127.0.0.1` (no próprio computador). O celular não precisa abrir a página do projeto; ele fornece as imagens pela rede local.

## Estrutura do projeto

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Estrutura da interface e carregamento das bibliotecas de IA. |
| `style.css` | Estilos responsivos e apresentação visual. |
| `App.js` | Conexão com a câmera, detecção de objetos, desenho das marcações e alertas de voz. |
| `server.py` | Servidor local da aplicação e encaminhamento das imagens do IP Webcam. |

## Solução de problemas

- **Python não encontrado:** instale Python 3.7+ e tente `py server.py` (Windows) ou `python3 server.py` (Linux/macOS).
- **Não carrega o modelo:** confira a conexão com a internet e recarregue a página.
- **Sem imagem da câmera:** confirme que o IP Webcam está transmitindo, que celular e computador estão na mesma Wi-Fi e que o IP e a porta foram digitados corretamente.
- **Conexão recusada ou expirada:** confira as permissões de rede local do celular e do computador, inclusive regras de firewall que possam bloquear a comunicação na rede Wi-Fi.
- **Sem alerta falado:** verifique se a opção de voz está marcada, se o navegador oferece síntese de fala e se o volume está audível.

## Limitações

- O sistema analisa quadros individuais e não calcula distância, risco ou trajetória dos objetos.
- A qualidade e a velocidade da detecção dependem da câmera, da iluminação e do desempenho do computador.
- Somente as classes de objetos mapeadas na aplicação são exibidas, e a classificação pode estar errada.
- O IP Webcam, o computador e o celular precisam permanecer conectados enquanto houver monitoramento.
