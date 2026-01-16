import joblib
import pandas as pd
import os

# =========================
# CONFIGURAÇÕES
# =========================
MODEL_PATH = "gradient_boosting_model (1).joblib"
DATABASE_PATH = "base_clientes.csv"

# =========================
# FUNÇÕES AUXILIARES
# =========================

def to_float(v):
    try:
        return float(str(v).replace(",", "."))
    except:
        return 0.0


def features_zeradas(valores: dict, features: list) -> bool:
    return all(to_float(valores.get(f, 0)) == 0.0 for f in features)


def classificar_risco(percentual):
    if percentual >= 60:
        return "ALTO"
    elif percentual >= 30:
        return "MODERADO"
    return "BAIXO"


def normalizar_id(v):
    return str(v).strip().split(".")[0].lstrip("0")


# =========================
# 1) CARREGA MODELO
# =========================
artifact = joblib.load(MODEL_PATH)

if isinstance(artifact, dict):
    model = artifact["model"]
    FEATURES = artifact["features"]
else:
    model = artifact
    FEATURES = list(model.feature_names_in_)

print("Modelo carregado:", type(model))
print("Features do modelo:", FEATURES)

# =========================
# 2) CARREGA BASE
# =========================
if not os.path.exists(DATABASE_PATH):
    raise FileNotFoundError("base_clientes.csv não encontrada")

df = pd.read_csv(DATABASE_PATH, dtype=str)
df.columns = df.columns.str.strip()

print("\nColunas encontradas na base:")
for c in df.columns:
    print("-", c)

# =========================
# 3) DETECTA COLUNA DE ID
# =========================
possiveis_ids = [
    "ID_CLIENTE", "ID", "CLIENTE", "COD_CLIENTE", "CODIGO_CLIENTE"
]

col_id = None
for c in possiveis_ids:
    if c in df.columns:
        col_id = c
        break

if col_id is None:
    raise ValueError("Nenhuma coluna de ID reconhecida automaticamente.")

print(f"\nColuna de ID detectada: {col_id}")

df["ID_BUSCA"] = df[col_id].apply(normalizar_id)

# =========================
# 4) MOSTRA EXEMPLOS DE IDS
# =========================
print("\nExemplos de IDs válidos na base:")
print(df["ID_BUSCA"].head(10).to_list())

# =========================
# 5) PEDE ID DO CLIENTE
# =========================
id_cliente = input("\nDigite o ID do cliente para testar: ").strip()
id_cliente = normalizar_id(id_cliente)

# =========================
# 6) BUSCA CLIENTE
# =========================
cliente = df[df["ID_BUSCA"] == id_cliente]

if cliente.empty:
    raise ValueError("Cliente não encontrado na base (confira os exemplos acima).")

row = cliente.iloc[0]

# =========================
# 7) MONTA FEATURES
# =========================
valores = {}
for f in FEATURES:
    valores[f] = to_float(row.get(f, 0))

print("\n=== FEATURES DO CLIENTE ===")
for k, v in valores.items():
    print(f"{k}: {v}")

# =========================
# 8) APLICA REGRAS
# =========================
print("\n=== DECISÃO ===")

if features_zeradas(valores, FEATURES):
    print("➡️ TODAS AS FEATURES ZERADAS")
    print("❌ MODELO NÃO FOI USADO")
    print("➡️ Churn: BAIXO (0%)")
    exit(0)

if valores.get("DAYS_SINCE_LAST", 0) >= 366:
    print("➡️ DAYS_SINCE_LAST >= 366")
    print("❌ MODELO NÃO FOI USADO")
    print("➡️ Churn: BAIXO (0%)")
    exit(0)

# =========================
# 9) CHAMADA DO MODELO
# =========================
X = pd.DataFrame([valores], columns=FEATURES)
proba = model.predict_proba(X)[0, 1]
percentual = round(proba * 100, 2)

print("✅ MODELO FOI USADO")
print(f"➡️ Probabilidade de churn: {percentual}%")
print(f"➡️ Nível de risco: {classificar_risco(percentual)}")
