"""
TREINAMENTO GRADIENT BOOSTING - PIPELINE CORRIGIDO E FIEL AO ORIGINAL

Base:
- train (2).xlsx
- test (2).xlsx

Saída:
- gradient_boosting_model (1).joblib
"""

import warnings
warnings.filterwarnings("ignore")

from pathlib import Path
from typing import Dict, Optional, Tuple

import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    accuracy_score
)

# ======================================================
# CONFIGURAÇÕES
# ======================================================

TRAIN_PATH = Path("train (2).xlsx")
TEST_PATH = Path("test (2).xlsx")
MODEL_OUTPUT = Path("gradient_boosting_model (1).joblib")

RANDOM_STATE = 42
CV_FOLDS = 10

MODEL_PARAMS = {
    "n_estimators": 200,
    "learning_rate": 0.05,
    "max_depth": 3,
    "subsample": 0.8,
    "min_samples_split": 20,
    "min_samples_leaf": 10,
    "random_state": RANDOM_STATE
}

# ======================================================
# CLASSE DE TREINAMENTO
# ======================================================

class GradientBoostingTrainerCustom:

    def __init__(self):
        self.model: Optional[GradientBoostingClassifier] = None
        self.feature_names: list = []

        self.X_train = None
        self.y_train = None
        self.X_test = None
        self.y_test = None

    # --------------------------------------------------
    # LOAD DATA
    # --------------------------------------------------
    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        print("📍 Carregando datasets...")

        if not TRAIN_PATH.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {TRAIN_PATH}")

        if not TEST_PATH.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {TEST_PATH}")

        df_train = pd.read_excel(TRAIN_PATH)
        df_test = pd.read_excel(TEST_PATH)

        print(f"   ✓ Train shape: {df_train.shape}")
        print(f"   ✓ Test shape:  {df_test.shape}")

        return df_train, df_test

    # --------------------------------------------------
    # PREPARAR FEATURES
    # --------------------------------------------------
    def prepare_features(self, df_train: pd.DataFrame, df_test: pd.DataFrame):

        if "TARGET" not in df_train.columns:
            raise ValueError("TARGET não encontrado no treino")

        if "TARGET" not in df_test.columns:
            raise ValueError("TARGET não encontrado no teste")

        self.y_train = df_train["TARGET"].astype(int)
        self.y_test = df_test["TARGET"].astype(int)

        cols_drop = ["TARGET", "ID_CLIENTE", "FIRST_DATE", "LAST_DATE"]

        X_train = df_train.drop(columns=cols_drop, errors="ignore")
        X_test = df_test.drop(columns=cols_drop, errors="ignore")

        X_train = X_train.select_dtypes(include=[np.number]).fillna(0)
        X_test = X_test.select_dtypes(include=[np.number]).fillna(0)

        common_cols = sorted(list(set(X_train.columns) & set(X_test.columns)))

        self.X_train = X_train[common_cols]
        self.X_test = X_test[common_cols]

        self.feature_names = common_cols

        print(f"📊 Features utilizadas: {len(self.feature_names)}")
        print(f"📊 TARGET treino: {self.y_train.value_counts().to_dict()}")
        print(f"📊 TARGET teste:  {self.y_test.value_counts().to_dict()}")

    # --------------------------------------------------
    # BUILD MODEL
    # --------------------------------------------------
    def build_model(self) -> GradientBoostingClassifier:
        return GradientBoostingClassifier(**MODEL_PARAMS)

    # --------------------------------------------------
    # TREINAMENTO + CROSS VALIDATION
    # --------------------------------------------------
    def fit_model(self):
        print("📍 Iniciando Cross-validation...")

        self.model = self.build_model()

        cv = StratifiedKFold(
            n_splits=CV_FOLDS,
            shuffle=True,
            random_state=RANDOM_STATE
        )

        cv_scores = cross_val_score(
            self.model,
            self.X_train,
            self.y_train,
            cv=cv,
            scoring="roc_auc"
        )

        print(f"   ✓ CV AUC Scores: {cv_scores}")
        print(f"   ✓ CV Mean AUC: {cv_scores.mean():.4f}")
        print(f"   ✓ CV Std AUC:  {cv_scores.std():.4f}")

        print("\n📍 Treinando modelo final...")
        self.model.fit(self.X_train, self.y_train)

    # --------------------------------------------------
    # AVALIAÇÃO
    # --------------------------------------------------
    def evaluate(self) -> Dict:
        print("📍 Avaliando no conjunto de teste...")

        y_proba = self.model.predict_proba(self.X_test)[:, 1]
        y_pred = (y_proba >= 0.5).astype(int)

        cm = confusion_matrix(self.y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        metrics = {
            "Accuracy": accuracy_score(self.y_test, y_pred),
            "AUC": roc_auc_score(self.y_test, y_proba),
            "Precision": precision_score(self.y_test, y_pred, zero_division=0),
            "Recall": recall_score(self.y_test, y_pred),
            "F1": f1_score(self.y_test, y_pred),
            "True_Positive": tp,
            "False_Positive": fp,
            "False_Negative": fn,
            "True_Negative": tn
        }

        print("\n📊 MÉTRICAS DE TESTE")
        for k, v in metrics.items():
            if isinstance(v, float):
                print(f"   {k}: {v:.4f}")
            else:
                print(f"   {k}: {v}")

        print("\n📉 MATRIZ DE CONFUSÃO")
        print(cm)

        return metrics

    # --------------------------------------------------
    # SAVE MODEL
    # --------------------------------------------------
    def save_model(self):
        artifact = {
            "model": self.model,
            "features": self.feature_names
        }

        joblib.dump(artifact, MODEL_OUTPUT)
        print(f"\n💾 Modelo salvo em: {MODEL_OUTPUT.resolve()}")

    # --------------------------------------------------
    # PIPELINE
    # --------------------------------------------------
    def train(self):
        print("=" * 80)
        print("🎯 TREINAMENTO GRADIENT BOOSTING - PIPELINE FINAL")
        print("=" * 80)

        df_train, df_test = self.load_data()
        self.prepare_features(df_train, df_test)
        self.fit_model()
        self.evaluate()
        self.save_model()

        print("\n✅ TREINAMENTO FINALIZADO COM SUCESSO")

# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":
    trainer = GradientBoostingTrainerCustom()
    trainer.train()
