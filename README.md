# Projeto MAXX - Predição de Risco de Churn

## Descrição completa do projeto
Este projeto tem como objetivo apoiar a tomada de decisão estratégica na MAXX por meio de Inteligência Artificial aplicada à análise de clientes, utilizando dados históricos de relacionamento e atendimento para identificar padrões de insatisfação e prever o risco de cancelamento (churn).

A solução utiliza um modelo preditivo treinado a partir de dados consolidados de clientes e registros de interação, gerando indicadores e uma classificação de risco que podem ser utilizados para priorizar ações de retenção, acompanhar tendências e apoiar melhorias no atendimento.

---

## IDE utilizada
Visual Studio Code (VS Code)

---

## Organização do código-fonte
- **web:** pasta `frontend/` (interface do sistema)
- **app:** back-end/modelo na raiz do repositório (ex.: `api.py`, `requirements.txt`, modelo `.joblib` e arquivos de suporte)

---

## Como executar (passo a passo)

### Passo 1 – Baixar e adicionar os 2 arquivos do Google Drive (obrigatório)
**Importante:** Para executar o projeto corretamente, é necessário adicionar **2 arquivos de dados** que não foram incluídos no GitHub. Esses arquivos ficaram no **Google Drive** porque, durante o upload no GitHub, foi preciso remover alguns arquivos para que o repositório fosse publicado sem erros/limitações de tamanho.

**Projeto completo no Google Drive (backup):**  
https://drive.google.com/file/d/1s8Q6YUnq9Cq9O5ih4CRNscb3CZwPJIFR/view?usp=sharing

**Arquivos que devem ser baixados e adicionados manualmente:**  
- `datasetdashboard.csv`  
- `datasetdashboard.xlsx`  
Pasta no Drive com os 2 arquivos:  
https://drive.google.com/drive/folders/1nfOjcCs6zfFhpv87kFY53S1Dg6jo27UZ?usp=sharing

**Como baixar e colocar no lugar certo:**
1. Acesse a pasta do Drive no link acima.
2. Faça o download dos dois arquivos:
   - `datasetdashboard.csv`
   - `datasetdashboard.xlsx`
3. Abra a pasta principal do projeto no seu computador (a mesma onde estão `api.py` e a pasta `frontend/`).
4. Cole os dois arquivos **na raiz do projeto**, no mesmo nível do `api.py`, ficando assim:
MachineLearning-An-lisedeChurn-main/
├─ frontend/
├─ api.py
├─ requirements.txt
├─ datasetdashboard.csv
├─ datasetdashboard.xlsx
└─ ...


5. Confirme que os nomes ficaram **exatamente iguais** (sem “(1)”, sem renomear automaticamente).
6. Depois disso, siga para o Passo 2 (back-end) e o Passo 3 (front-end).

> Se aparecer erro de “arquivo não encontrado” ao rodar, normalmente é porque os arquivos não estão na raiz do projeto ou porque o nome ficou diferente. Ajuste o nome e mantenha ao lado do `api.py`.

---

### Passo 2 – Executar o Back-end (app)
1. Abra um terminal na raiz do projeto (onde está o `api.py`).
2. (Opcional, recomendado) Crie um ambiente virtual:
   - `python -m venv .venv`
3. Ative o ambiente virtual:
   - Windows (PowerShell): `.venv\Scripts\Activate.ps1`
   - Windows (CMD): `.venv\Scripts\activate.bat`
4. Instale as dependências:
   - `pip install -r requirements.txt`
5. Execute a API:
   - `python api.py`
6. Mantenha este terminal aberto. Ele exibirá a porta/URL onde o serviço está rodando.

---

### Passo 3 – Executar o Front-end (web)
1. Abra um novo terminal.
2. Entre na pasta do front-end:
   - `cd frontend`
3. Instale as dependências:
   - `npm install`
4. Rode o front:
   - `npm run dev`
5. Abra no navegador o endereço exibido no terminal (ex.: `http://localhost:5173` ou `http://localhost:3000`).

---

## Observação importante (envio de e-mail)
O front-end possui uma integração de **envio de alerta por e-mail (EmailJS)** com um e-mail configurado diretamente no código.  
Antes de apresentar/rodar em outra máquina, **altere o e-mail de destino** no arquivo:

- `frontend/script.js` → procurar pela configuração `EMAIL_CONFIG` e mudar o campo `TO_EMAIL` para o e-mail desejado.

---

## Banco de dados / Dados
Este projeto **não utiliza banco de dados relacional**. A base usada para alimentar o dashboard e análises é fornecida por arquivos (CSV/XLSX).  
Para rodar localmente, é obrigatório adicionar:
- `datasetdashboard.csv`
- `datasetdashboard.xlsx`
(conforme o Passo 1)

---

## Vídeo da apresentação
Link: https://drive.google.com/file/d/10rlUPmeVLUXd546WSmu8fY9WCeFmga28/view?usp=sharing 

