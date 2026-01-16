from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os
import csv
from datetime import datetime, timedelta
from flask import send_from_directory

# =========================
# CONFIGURAÇÕES
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "gradient_boosting_model (1).joblib")
DATABASE_PATH = os.path.join(BASE_DIR, "base_clientes.csv")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DASHBOARD_XLSX_PATH = os.path.join(BASE_DIR, "datasetdashboard.xlsx")

app = Flask(__name__)
CORS(app)

# =========================
# CARREGAMENTO DO MODELO
# =========================
if not os.path.exists(MODEL_PATH):
    print(f"ERRO: Modelo não encontrado em {MODEL_PATH}")
    model = None
    FEATURES = []
else:
    artifact = joblib.load(MODEL_PATH)

    if isinstance(artifact, dict):
        model = artifact.get("model")
        FEATURES = artifact.get("features", [])
    else:
        model = artifact
        FEATURES = list(model.feature_names_in_)

    print("Modelo carregado com sucesso!")
    print(f"Features carregadas: {len(FEATURES)}")

# =========================
# FUNÇÕES AUXILIARES
# =========================

def parse_date(date_str):
    """Tenta parsear uma data de várias formas"""
    if pd.isna(date_str) or not date_str:
        return None

    date_str = str(date_str).strip()

    formats = [
        '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y',
        '%Y/%m/%d', '%d.%m.%Y', '%m/%d/%Y'
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue

    try:
        return pd.to_datetime(date_str, errors='coerce')
    except:
        return None


def calcular_taxa_contato(total_registros, dias_unicos):
    """Calcula taxa de contato por dia"""
    if dias_unicos > 0:
        return round(total_registros / dias_unicos, 2)
    return 0.0


def _to_float(v):
    """Converte valores (inclusive com vírgula) para float com fallback seguro."""
    try:
        return float(str(v).replace(",", "."))
    except:
        return 0.0


def _features_zeradas(valores: dict) -> bool:
    """Retorna True se todas as FEATURES do modelo estiverem 0 (cliente inativo por regra)."""
    if not FEATURES:
        return False
    return all(_to_float(valores.get(f, 0)) == 0.0 for f in FEATURES)

# =========================
# ROTAS DE SERVIÇO
# =========================

@app.route("/predict", methods=["POST"])
def predict():
    try:
        if model is None:
            return jsonify({"error": "Modelo não carregado"}), 500

        data = request.get_json() or {}

        # -------------------------------------------------
        # REGRA DE NEGÓCIO: CLIENTE INATIVO (FEATURES ZERADAS)
        # (isso é o que você realmente tem na prática, pois você zera tudo no banco)
        # -------------------------------------------------
        if _features_zeradas(data):
            return jsonify({
                "percentual_churn": 0.0,
                "nivel_risco": "BAIXO",
                "motivo": "Cliente inativo (features zeradas por regra de negócio)",
                "usou_modelo": False
            })

        # -------------------------------------------------
        # REGRA DE NEGÓCIO: CLIENTE INATIVO (>= 366 DIAS)
        # (mantida também, caso o front envie DAYS_SINCE_LAST real)
        # -------------------------------------------------
        days_since_last = int(_to_float(data.get("DAYS_SINCE_LAST", 0)))
        if days_since_last >= 366:
            return jsonify({
                "percentual_churn": 0.0,
                "nivel_risco": "BAIXO",
                "motivo": "Cliente inativo há mais de 1 ano (regra de negócio)",
                "usou_modelo": False
            })

        # -------------------------------------------------
        # CHAMADA NORMAL DO MODELO (CLIENTE ATIVO)
        # -------------------------------------------------
        df = pd.DataFrame([data])
        df = df.reindex(columns=FEATURES, fill_value=0)
        df = df.applymap(_to_float)

        proba_all = model.predict_proba(df)[0]
        classes = list(model.classes_)

        idx_churn = classes.index(1) if 1 in classes else 1
        percentual = round(float(proba_all[idx_churn]) * 100, 2)

        risco = (
            "ALTO" if percentual >= 60
            else "MODERADO" if percentual >= 30
            else "BAIXO"
        )

        return jsonify({
            "percentual_churn": percentual,
            "nivel_risco": risco,
            "usou_modelo": True
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def serve_index():
    try:
        return send_from_directory(FRONTEND_DIR, "index.html")
    except:
        return jsonify({"error": "Pasta frontend não encontrada"}), 500


@app.route("/salvar_historico", methods=["POST"])
def salvar_historico():
    try:
        dados = request.json or {}
        id_cliente = str(dados.get("ID_CLIENTE")).strip()

        # --- TAREFA 1: ATUALIZAR A BASE_CLIENTES.CSV (SUBSTITUIÇÃO) ---
        if os.path.exists(DATABASE_PATH):
            df_base = pd.read_csv(DATABASE_PATH, dtype=str)
            df_base['ID_CLIENTE'] = df_base['ID_CLIENTE'].astype(str).str.strip()

            if id_cliente in df_base['ID_CLIENTE'].values:
                for feature in FEATURES:
                    if feature in dados:
                        df_base.loc[df_base['ID_CLIENTE'] == id_cliente, feature] = str(dados[feature])

                df_base.to_csv(DATABASE_PATH, index=False)
                print(f"Base de Clientes atualizada para o ID: {id_cliente}")
            else:
                print(f"ID {id_cliente} não encontrado na base_clientes para substituição.")

        # --- TAREFA 2: SALVAR NO HISTÓRICO (ADICIONAR LINHA) ---
        log_path = os.path.join(BASE_DIR, "historico_analises.csv")
        file_exists = os.path.exists(log_path)

        with open(log_path, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=dados.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(dados)
            print(f"Registro adicionado ao Histórico de Análises.")

        return jsonify({
            "status": "success",
            "message": "Dados do cliente atualizados e histórico registrado!"
        })

    except Exception as e:
        print(f"Erro crítico: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/cliente/<id_cliente>", methods=["GET"])
def buscar_cliente(id_cliente):
    try:
        df = pd.read_csv(DATABASE_PATH, dtype=str)
        df.columns = df.columns.str.strip()
        id_alvo = str(id_cliente).strip().split('.')[0]
        df['ID_BUSCA'] = df['ID_CLIENTE'].astype(str).str.strip().str.split('.').str[0]
        cliente = df[df['ID_BUSCA'] == id_alvo]

        if cliente.empty:
            return jsonify({"error": "Cliente não encontrado"}), 404

        row = cliente.iloc[0]
        dados_retorno = {}
        for f in FEATURES:
            val = str(row.get(f, "0")).replace(',', '.')
            dados_retorno[f] = float(val) if val != 'nan' else 0.0
        return jsonify(dados_retorno)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/atualizar_temporal/<id_cliente>", methods=["GET"])
def atualizar_temporal(id_cliente):
    try:
        # 1. Configuração da Data Base (conforme informado por você)
        DATA_BASE_CSV = datetime(2025, 10, 31)
        hoje = datetime.now()

        # 2. Carregar dados
        df = pd.read_csv(DATABASE_PATH, dtype=str)
        df.columns = df.columns.str.strip()
        id_alvo = str(id_cliente).strip().split('.')[0]
        df['ID_BUSCA'] = df['ID_CLIENTE'].astype(str).str.strip().str.split('.').str[0]
        cliente = df[df['ID_BUSCA'] == id_alvo]

        if cliente.empty:
            return jsonify({"error": "Cliente não encontrado"}), 404

        row = cliente.iloc[0]

        # --- LÓGICA DAYS_SINCE_LAST (SOMA) ---
        dias_no_csv = int(float(str(row.get('DAYS_SINCE_LAST', '0')).replace(',', '.')))
        dias_decorridos_desde_base = (hoje - DATA_BASE_CSV).days
        novo_days_since = dias_no_csv + max(0, dias_decorridos_desde_base)

        # --- LÓGICA QTD_SOL_LAST_30D (ZERAGEM) ---
        if novo_days_since > 30:
            qtd_sol_final = 0
        else:
            qtd_sol_final = int(float(str(row.get('QTD_SOL_LAST_30D', '0')).replace(',', '.')))

        return jsonify({
            "DAYS_SINCE_LAST": int(novo_days_since),
            "QTD_SOL_LAST_30D": int(qtd_sol_final)
        })

    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# ATENÇÃO: ESTA ERA A SEGUNDA ROTA /predict DUPLICADA.
# PARA NÃO "SUMIR LINHA", EU MANTIVE O BLOCO,
# MAS MUDEI O ENDPOINT PARA NÃO CONFLITAR COM /predict.
# =========================
@app.route("/predict_legacy", methods=["POST"])
def predict_legacy():
    try:
        if model is None:
            return jsonify({"error": "Modelo não carregado"}), 500

        data = request.get_json() or {}

        # Aplicar a MESMA regra aqui, caso algum fluxo do front chame o legacy
        if _features_zeradas(data):
            return jsonify({
                "percentual_churn": 0.0,
                "nivel_risco": "BAIXO",
                "motivo": "Cliente inativo (features zeradas por regra de negócio)",
                "usou_modelo": False
            })

        days_since_last = int(_to_float(data.get("DAYS_SINCE_LAST", 0)))
        if days_since_last >= 366:
            return jsonify({
                "percentual_churn": 0.0,
                "nivel_risco": "BAIXO",
                "motivo": "Cliente inativo há mais de 1 ano (regra de negócio)",
                "usou_modelo": False
            })

        df = pd.DataFrame([data])
        df = df.reindex(columns=FEATURES, fill_value=0)
        df = df.applymap(_to_float)

        proba = model.predict_proba(df)[0][1]
        percentual = round(float(proba) * 100, 2)
        risco = "ALTO" if percentual >= 60 else "MODERADO" if percentual >= 30 else "BAIXO"
        return jsonify({"percentual_churn": percentual, "nivel_risco": risco, "usou_modelo": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# ROTAS ADICIONAIS (OPCIONAIS)
# =========================

@app.route("/simular_contato/<id_cliente>", methods=["GET"])
def simular_contato(id_cliente):
    try:
        df = pd.read_csv(DATABASE_PATH, dtype=str)
        df.columns = df.columns.str.strip()
        id_alvo = str(id_cliente).strip().split('.')[0]
        df['ID_BUSCA'] = df['ID_CLIENTE'].astype(str).str.strip().str.split('.').str[0]
        cliente = df[df['ID_BUSCA'] == id_alvo]

        if cliente.empty:
            return jsonify({"error": "Cliente não encontrado"}), 404

        row = cliente.iloc[0]

        try:
            valor_atual = float(str(row.get('TAXA_CONTATO_DIA', '0')).replace(',', '.'))
        except:
            valor_atual = 0.0

        nova_taxa = valor_atual + 1.0

        return jsonify({
            "TAXA_CONTATO_DIA": nova_taxa
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/historico", methods=["GET"])
def listar_historico():
    """Lista todo o histórico salvo"""
    try:
        arquivo_path = os.path.join(BASE_DIR, "historico.csv")
        if not os.path.exists(arquivo_path):
            return jsonify({"historico": []})

        with open(arquivo_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            historico = list(reader)

        return jsonify({"historico": historico})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/estatisticas", methods=["GET"])
def estatisticas():
    """Retorna estatísticas básicas do sistema"""
    try:
        historico_count = 0
        historico_path = os.path.join(BASE_DIR, "historico.csv")
        if os.path.exists(historico_path):
            with open(historico_path, 'r', encoding='utf-8-sig') as f:
                historico_count = sum(1 for line in f) - 1

        base_exists = os.path.exists(DATABASE_PATH)
        modelo_exists = os.path.exists(MODEL_PATH)

        return jsonify({
            "historico_registros": max(0, historico_count),
            "base_clientes_existe": base_exists,
            "modelo_existe": modelo_exists,
            "features_suportadas": FEATURES
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# HEALTH CHECK
# =========================

@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint para verificar saúde da API"""
    status = {
        "status": "healthy",
        "model_loaded": os.path.exists(MODEL_PATH),
        "database_exists": os.path.exists(DATABASE_PATH),
        "timestamp": datetime.now().isoformat()
    }
    return jsonify(status)


# Esta parte deve ser SEMPRE a última do arquivo
if __name__ == "__main__":
    print("=" * 50)
    print("API de Predição de Churn Iniciando...")
    print(f"Diretório base: {BASE_DIR}")
    print(f"Modelo: {'Carregado' if os.path.exists(MODEL_PATH) else 'Não encontrado'}")
    print(f"Base de clientes: {'Encontrada' if os.path.exists(DATABASE_PATH) else 'Não encontrada'}")
    print(f"Features suportadas: {len(FEATURES)}")
    print("=" * 50)
    app.run(debug=True, port=5000)
