from __future__ import annotations

import itertools
import logging
import os
import pickle
import random
import glob
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from scipy import sparse
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils import resample
from xgboost import XGBClassifier

from src.preprocess import clean_url, extract_url_features_batch


logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
LOGGER = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_PATH = Path(os.path.join(DATA_DIR, "phishing_data.csv"))
OPENPHISH_PATH = os.path.join(DATA_DIR, "openphish.txt")
TRANCO_PATH = os.path.join(DATA_DIR, "tranco.csv")
MODEL_DIR = Path(os.path.join(BASE_DIR, "models"))
RANDOM_STATE = 42
MIN_DATASET_SIZE = 400
NOISE_RATIO = 0.15
LABEL_NOISE_RATIO = 0.05
HYBRID_SAMPLE_SIZE = 10_000
TFIDF_MAX_FEATURES = 10_000


def get_random_forest_model() -> RandomForestClassifier:
    """Create the regularized Random Forest baseline model."""
    return RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )


def get_xgboost_model() -> XGBClassifier:
    """Create the regularized XGBoost model used for final comparison."""
    return XGBClassifier(
        n_estimators=175,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.15,
        reg_lambda=1.5,
        min_child_weight=2,
        gamma=0.05,
        random_state=RANDOM_STATE,
        eval_metric="logloss",
    )


def sample_url_pool(url_pool: set[str], sample_size: int, random_state: int) -> list[str]:
    """
    Sample URLs reproducibly from a pool without lexicographic bias.

    Sorting and slicing systematically favored certain patterns. Sampling keeps
    the noise and realistic examples distributed more naturally.
    """
    pool_list = list(url_pool)
    if len(pool_list) < sample_size:
        raise ValueError("URL pool is smaller than the requested sample size.")

    rng = random.Random(random_state)
    return rng.sample(pool_list, sample_size)


def generate_synthetic_dataset(
    samples_per_class: int = 250,
    random_state: int = RANDOM_STATE,
) -> pd.DataFrame:
    """
    Generate a larger balanced dataset of legitimate and phishing URLs.

    This keeps the project beginner-friendly while making the training
    process more realistic than a tiny hand-written CSV.
    """
    rng = random.Random(random_state)

    legitimate_domains = [
        "google.com",
        "github.com",
        "amazon.in",
        "wikipedia.org",
        "microsoft.com",
        "apple.com",
        "stackoverflow.com",
        "python.org",
        "linkedin.com",
        "netflix.com",
        "oracle.com",
        "ibm.com",
        "coursera.org",
        "udemy.com",
        "paypal.com",
        "dropbox.com",
        "zoom.us",
        "notion.so",
        "reddit.com",
        "openai.com",
    ]

    legitimate_paths = [
        "",
        "/",
        "/about",
        "/contact",
        "/products",
        "/pricing",
        "/support",
        "/docs",
        "/blog",
        "/careers",
        "/features",
        "/download",
        "/services",
    ]

    suspicious_legitimate_urls = {
        "http://google-login.com",
        "https://paypal-account-help.org",
        "http://amazon-secure-docs.com",
        "https://bank-update-portal.org",
        "http://verify-github-support.com",
    }

    phishing_keywords = [
        "login",
        "verify",
        "secure",
        "update",
        "bank",
        "paypal",
        "account",
        "free",
        "gift",
        "signin",
        "confirm",
        "billing",
        "wallet",
        "otp",
        "reset",
    ]

    phishing_brands = [
        "google",
        "paypal",
        "bank",
        "microsoft",
        "amazon",
        "facebook",
        "apple",
        "netflix",
        "instagram",
        "webmail",
    ]

    phishing_tlds = ["xyz", "top", "ru", "info", "click", "biz", "site", "online", "live", "icu"]

    phishing_actions = [
        "verify-now",
        "secure-login",
        "update-account",
        "confirm-identity",
        "reset-password",
        "claim-reward",
        "free-gift",
        "bank-alert",
        "urgent-review",
        "billing-check",
    ]

    realistic_phishing_samples = {
        "http://secure-login-google.com",
        "http://google-account-verification.net",
        "http://paypal-secure-login-alert.xyz",
        "http://secure-paypal-account-check.click",
        "https://amazon-login-verification.top",
        "http://verify-google-billing-update.xyz",
        "https://secure-bank-account-review.click",
        "http://paypal-account-recovery-alert.top",
        "http://google-secure-update-account.xyz",
        "https://amazon-payment-login-alert.click",
        "http://g00gle.com",
        "http://gooogle.com",
        "http://goog1e.com",
        "http://paypa1.com",
        "http://amaz0n.com",
        "http://micr0soft.com",
        "http://amaz0n-login.com",
    }

    legitimate_urls: set[str] = set()
    phishing_urls: set[str] = set(realistic_phishing_samples)
    noisy_legitimate_urls: set[str] = set(suspicious_legitimate_urls)
    noisy_phishing_urls: set[str] = {
        "http://abc123-domain.com",
        "https://g00gle.com",
        "http://paypa1.com",
        "https://arnazon-support.com",
        "http://micr0softonline.com",
        "https://dropb0xfiles.com",
        "http://gooogle-login.com",
        "https://goog1e-support.com",
        "http://amaz0n-login-alert.com",
    }
    random_but_legit_urls: set[str] = {
        "http://randomsite.xyz",
        "https://mypersonalpage.top",
        "http://communityhub.click",
        "https://dailynotes.gq",
        "http://smallproject.online",
    }

    for domain, path in itertools.product(legitimate_domains, legitimate_paths):
        protocol = rng.choice(["http://", "https://"])
        prefix = rng.choice(["", "www."])
        suffix = rng.choice(["", "", "?ref=home", "?src=nav", "#section"])
        legitimate_urls.add(f"{protocol}{prefix}{domain}{path}{suffix}")

    while len(legitimate_urls) < samples_per_class:
        domain = rng.choice(legitimate_domains)
        section = rng.choice(["docs", "help", "learn", "account", "teams", "news", "store"])
        protocol = rng.choice(["http://", "https://"])
        prefix = rng.choice(["", "www."])
        legitimate_urls.add(f"{protocol}{prefix}{domain}/{section}/{rng.randint(1, 999)}")

    while len(phishing_urls) < samples_per_class:
        brand = rng.choice(phishing_brands)
        keyword_one = rng.choice(phishing_keywords)
        keyword_two = rng.choice(phishing_keywords)
        action = rng.choice(phishing_actions)
        tld = rng.choice(phishing_tlds)
        pattern_type = rng.randint(1, 5)

        if pattern_type == 1:
            url = f"http://{brand}-{keyword_one}-{action}.{tld}"
        elif pattern_type == 2:
            url = f"https://{keyword_one}-{brand}-{keyword_two}.{tld}/login"
        elif pattern_type == 3:
            url = f"http://{brand}.secure-{keyword_one}-{keyword_two}.{tld}/verify"
        elif pattern_type == 4:
            url = f"https://{keyword_one}-{keyword_two}-{brand}-alert.{tld}/{action}"
        else:
            url = f"http://{brand}-{keyword_one}.{keyword_two}-{action}.{tld}/confirm"

        phishing_urls.add(url)

    noise_count = max(1, int(samples_per_class * NOISE_RATIO))

    while len(noisy_legitimate_urls) < noise_count:
        brand = rng.choice(["google", "paypal", "amazon", "github", "bank"])
        keyword = rng.choice(["login", "secure", "update", "verify", "account"])
        domain_tail = rng.choice(["blog.com", "news.org", "community.net", "docs.io"])
        noisy_legitimate_urls.add(f"https://{brand}-{keyword}.{domain_tail}")

    while len(random_but_legit_urls) < noise_count:
        base = rng.choice(["randomsite", "portfoliohub", "dailyjournal", "mywebsite", "studentpage"])
        tld = rng.choice(["xyz", "top", "click", "gq", "site"])
        random_but_legit_urls.add(f"http://{base}{rng.randint(1, 999)}.{tld}")

    while len(noisy_phishing_urls) < noise_count:
        base = rng.choice(["abc", "portal", "access", "member", "auth"])
        token = rng.randint(100, 999)
        typo_brand = rng.choice(["g00gle", "paypa1", "arnazon", "faceb00k", "rnicrosoft"])
        phishing_domain = rng.choice(
            [
                f"{base}{token}-domain.com",
                f"{typo_brand}.com",
                f"{base}{token}-{typo_brand}.net",
            ]
        )
        noisy_phishing_urls.add(f"http://{phishing_domain}")

    legitimate_pool = legitimate_urls | noisy_legitimate_urls | random_but_legit_urls
    phishing_pool = phishing_urls | noisy_phishing_urls

    legitimate_df = pd.DataFrame(
        {"url": sample_url_pool(legitimate_pool, samples_per_class, random_state), "label": 0}
    )
    phishing_df = pd.DataFrame(
        {"url": sample_url_pool(phishing_pool, samples_per_class, random_state + 1), "label": 1}
    )

    synthetic_df = pd.concat([legitimate_df, phishing_df], ignore_index=True)
    protected_urls = realistic_phishing_samples | noisy_phishing_urls
    synthetic_df = apply_label_noise(
        synthetic_df,
        label_noise_ratio=LABEL_NOISE_RATIO,
        random_state=random_state,
        protected_urls=protected_urls,
    )
    synthetic_df = synthetic_df.sample(frac=1, random_state=random_state).reset_index(drop=True)
    return synthetic_df


def apply_label_noise(
    df: pd.DataFrame,
    label_noise_ratio: float = LABEL_NOISE_RATIO,
    random_state: int = RANDOM_STATE,
    protected_urls: set[str] | None = None,
) -> pd.DataFrame:
    """Flip a small percentage of labels to make evaluation more realistic."""
    noisy_df = df.copy()
    noise_count = max(1, int(len(noisy_df) * label_noise_ratio))
    protected_urls = protected_urls or set()
    candidate_df = noisy_df[~noisy_df["url"].isin(protected_urls)]
    if candidate_df.empty:
        return noisy_df

    flip_sample_size = min(noise_count, len(candidate_df))
    flip_indices = candidate_df.sample(n=flip_sample_size, random_state=random_state).index
    noisy_df.loc[flip_indices, "label"] = 1 - noisy_df.loc[flip_indices, "label"]
    print(f"[INFO] Applied label noise to {flip_sample_size} samples.")
    return noisy_df


def ensure_realistic_dataset(
    data_path: Path,
    min_dataset_size: int = MIN_DATASET_SIZE,
    samples_per_class: int = 250,
) -> pd.DataFrame:
    """
    Load the CSV if available, then expand it with synthetic samples when needed.

    The expanded dataset is also written back to disk so students can inspect it.
    """
    csv_df = load_dataset(data_path) if data_path.exists() else pd.DataFrame(columns=["url", "label"])

    # Keep a genuinely user-provided dataset when it is already large enough.
    # Otherwise, augment it with fresh synthetic samples for the current run.
    if not csv_df.empty:
        class_counts = csv_df["label"].value_counts().to_dict()
        min_class_count = min(class_counts.values()) if len(class_counts) == 2 else 0
    else:
        min_class_count = 0

    if len(csv_df) >= min_dataset_size and min_class_count >= min_dataset_size // 4:
        combined_df = csv_df.drop_duplicates(subset=["url", "label"]).reset_index(drop=True)
    else:
        needed_per_class = max(samples_per_class, min_dataset_size // 2)
        synthetic_df = generate_synthetic_dataset(samples_per_class=needed_per_class)
        combined_df = pd.concat([csv_df, synthetic_df], ignore_index=True)
        combined_df = combined_df.drop_duplicates(subset=["url", "label"]).reset_index(drop=True)

    combined_df = combined_df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    data_path.parent.mkdir(parents=True, exist_ok=True)
    combined_df.to_csv(data_path, index=False)
    LOGGER.info("Dataset prepared and saved to: %s", data_path)
    LOGGER.info("Final dataset size: %s rows", len(combined_df))
    LOGGER.info("Class distribution:\n%s", combined_df["label"].value_counts().sort_index())
    return combined_df


def load_dataset(data_path: Path) -> pd.DataFrame:
    """Load dataset and validate required columns."""
    LOGGER.info("Loading dataset from: %s", data_path)

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found at: {data_path}")

    df = pd.read_csv(data_path)

    required_columns = {"url", "label"}
    if not required_columns.issubset(df.columns):
        raise ValueError("Dataset must contain 'url' and 'label' columns.")

    df = df.dropna(subset=["url", "label"]).copy()
    df["url"] = df["url"].astype(str)
    df["label"] = df["label"].astype(int)
    return df


def load_openphish_dataset(openphish_path: Path) -> pd.DataFrame:
    """Load phishing URLs from the OpenPhish text feed format."""
    LOGGER.info("Loading OpenPhish phishing URLs from: %s", openphish_path)
    if not os.path.exists(openphish_path):
        raise FileNotFoundError(f"OpenPhish dataset not found at: {openphish_path}")

    phish_df = pd.read_csv(openphish_path, header=None, names=["url"])
    phish_df = phish_df.dropna(subset=["url"]).copy()
    phish_df["url"] = phish_df["url"].astype(str).str.strip()
    phish_df = phish_df[phish_df["url"] != ""].copy()
    phish_df["label"] = 1
    return phish_df[["url", "label"]]


def load_tranco_dataset(tranco_path: Path) -> pd.DataFrame:
    """Load legitimate domains from a Tranco CSV and convert them into URLs."""
    LOGGER.info("Loading Tranco legitimate domains from: %s", tranco_path)
    if not os.path.exists(tranco_path):
        raise FileNotFoundError(f"Tranco dataset not found at: {tranco_path}")

    tranco_df = pd.read_csv(tranco_path, header=None)
    if tranco_df.shape[1] == 1:
        tranco_df.columns = ["domain"]
        if str(tranco_df.iloc[0, 0]).strip().lower() == "domain":
            tranco_df = tranco_df.iloc[1:].copy()
    else:
        tranco_df = tranco_df.iloc[:, :2].copy()
        tranco_df.columns = ["rank", "domain"]
        first_rank = str(tranco_df.iloc[0, 0]).strip().lower()
        first_domain = str(tranco_df.iloc[0, 1]).strip().lower()
        if first_rank == "rank" and first_domain == "domain":
            tranco_df = tranco_df.iloc[1:].copy()

    tranco_df = tranco_df.dropna(subset=["domain"]).copy()
    tranco_df["domain"] = tranco_df["domain"].astype(str).str.strip()
    tranco_df = tranco_df[tranco_df["domain"] != ""].copy()
    tranco_df["url"] = "http://" + tranco_df["domain"]
    tranco_df["label"] = 0
    return tranco_df[["url", "label"]]


def resolve_dataset_path(preferred_path: str, pattern: str) -> str:
    """Resolve a dataset path, falling back to the first matching filename variation."""
    print(f"[DEBUG] Looking for: {preferred_path}")
    print(f"[DEBUG] Exists: {os.path.exists(preferred_path)}")
    if os.path.exists(preferred_path):
        return preferred_path

    matches = glob.glob(os.path.join(DATA_DIR, pattern))
    if matches:
        resolved_path = matches[0]
        print(f"[DEBUG] Using matched file: {resolved_path}")
        print(f"[DEBUG] Exists: {os.path.exists(resolved_path)}")
        return resolved_path

    return preferred_path


def sample_balanced_subset(df: pd.DataFrame, sample_size: int, dataset_name: str) -> pd.DataFrame:
    """
    Sample a balanced subset without failing when the source is smaller.

    This keeps the training pipeline reproducible while still working for
    smaller local snapshots of OpenPhish or Tranco.
    """
    available_rows = len(df)
    if available_rows == 0:
        raise ValueError(f"{dataset_name} dataset is empty after loading.")

    actual_sample_size = min(sample_size, available_rows)
    if actual_sample_size < sample_size:
        LOGGER.warning(
            "%s has only %s rows; using all available rows instead of %s.",
            dataset_name,
            available_rows,
            sample_size,
        )

    return df.sample(n=actual_sample_size, random_state=RANDOM_STATE)


def build_hybrid_dataset(
    openphish_path: str = OPENPHISH_PATH,
    tranco_path: str = TRANCO_PATH,
    sample_size: int = HYBRID_SAMPLE_SIZE,
) -> pd.DataFrame:
    """
    Build the hybrid real-world dataset from OpenPhish and Tranco.

    Phishing URLs come from OpenPhish with label 1. Legitimate URLs come from
    Tranco and are converted to HTTP URLs with label 0.
    """
    phish_df = load_openphish_dataset(openphish_path)
    legit_df = load_tranco_dataset(tranco_path)

    if len(phish_df) < 500:
        phish_df = resample(
            phish_df,
            replace=True,
            n_samples=1000,
            random_state=RANDOM_STATE,
        )

    min_samples = min(len(phish_df), 5000)
    phish_df = sample_balanced_subset(phish_df, min(min_samples, sample_size), "OpenPhish")
    legit_df = sample_balanced_subset(legit_df, min(min_samples, sample_size), "Tranco")

    hybrid_df = pd.concat([phish_df, legit_df], ignore_index=True)
    hybrid_df = hybrid_df.dropna(subset=["url", "label"]).copy()
    hybrid_df["url"] = hybrid_df["url"].astype(str).str.strip()
    hybrid_df = hybrid_df[hybrid_df["url"] != ""].copy()
    hybrid_df = hybrid_df.drop_duplicates(subset="url")

    counts = hybrid_df["label"].value_counts()
    min_samples = int(counts.min())
    df_phish = hybrid_df[hybrid_df["label"] == 1].sample(n=min_samples, random_state=RANDOM_STATE)
    df_legit = hybrid_df[hybrid_df["label"] == 0].sample(n=min_samples, random_state=RANDOM_STATE)
    hybrid_df = pd.concat([df_phish, df_legit], ignore_index=True)
    hybrid_df = hybrid_df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    assert hybrid_df["label"].value_counts()[0] == hybrid_df["label"].value_counts()[1]

    label_counts = hybrid_df["label"].value_counts()
    if abs(label_counts.get(0, 0) - label_counts.get(1, 0)) > 100:
        print("[WARNING] Dataset still imbalanced")

    print("[INFO] Final balanced dataset after deduplication")
    print(f"[INFO] Phishing samples: {label_counts.get(1, 0)}")
    print(f"[INFO] Legitimate samples: {label_counts.get(0, 0)}")
    print("[INFO] Balanced dataset created")
    print("[INFO] Hybrid dataset loaded successfully")
    print(f"[INFO] Phishing samples: {len(phish_df)}")
    print(f"[INFO] Legitimate samples: {len(legit_df)}")
    LOGGER.info("Hybrid dataset built from OpenPhish + Tranco.")
    LOGGER.info("Dataset size: %s rows", len(hybrid_df))
    LOGGER.info("Class distribution:\n%s", hybrid_df["label"].value_counts().sort_index())
    return hybrid_df


def preprocess_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Apply URL cleaning to the full dataset."""
    LOGGER.info("Preprocessing URLs...")
    processed_df = df.copy()
    processed_df["clean_url"] = processed_df["url"].apply(clean_url)
    processed_df = processed_df[processed_df["clean_url"].str.len() > 0].copy()
    if processed_df.empty:
        raise ValueError("No valid URLs remain after preprocessing.")
    return processed_df


def build_vectorizer() -> TfidfVectorizer:
    """Create the TF-IDF vectorizer using character-level n-grams."""
    return TfidfVectorizer(
        analyzer="char",
        ngram_range=(2, 3),
        max_features=TFIDF_MAX_FEATURES,
    )


def combine_feature_sets(tfidf_features: Any, scaled_url_features: np.ndarray) -> Any:
    """
    Combine TF-IDF features with handcrafted URL features.

    This helps the model learn both text patterns and structural properties.
    """
    tfidf_matrix = (
        tfidf_features
        if sparse.issparse(tfidf_features)
        else sparse.csr_matrix(np.asarray(tfidf_features))
    )
    url_feature_matrix = sparse.csr_matrix(scaled_url_features)
    if tfidf_matrix.shape[0] != url_feature_matrix.shape[0]:
        raise ValueError("Feature combination failed because TF-IDF rows and URL feature rows do not match.")
    return sparse.hstack((tfidf_matrix, url_feature_matrix), format="csr")


def scale_url_features(
    train_urls: pd.Series,
    test_urls: pd.Series,
) -> tuple[dict[str, Any], np.ndarray, np.ndarray]:
    """
    Scale only the handcrafted numeric URL features.

    TF-IDF stays unchanged, while the smaller numeric feature block is
    normalized to improve model stability and generalization.
    """
    train_url_features = extract_url_features_batch(train_urls.tolist())
    test_url_features = extract_url_features_batch(test_urls.tolist())

    scaler = StandardScaler()
    scaled_train = scaler.fit_transform(train_url_features)
    scaled_test = scaler.transform(test_url_features)

    # chi2 feature selection requires non-negative values. After standardizing,
    # shift each handcrafted feature column using only training statistics so
    # we keep the training/prediction pipeline consistent.
    min_values = scaled_train.min(axis=0)
    shift_vector = np.where(min_values < 0, -min_values, 0.0)

    non_negative_train = scaled_train + shift_vector
    non_negative_test = scaled_test + shift_vector

    scaler_bundle = {
        "scaler": scaler,
        "shift_vector": shift_vector,
    }
    return scaler_bundle, non_negative_train, non_negative_test


def select_top_features(
    x_train_resampled: Any,
    y_train_resampled: pd.Series,
    x_test_combined: Any,
    max_features: int = 500,
) -> tuple[SelectKBest, Any, Any]:
    """
    Select the best features using chi-square.

    The number of selected features is adaptive, so it never exceeds
    the number of available features.
    """
    k = min(max_features, x_train_resampled.shape[1])
    LOGGER.info("Selecting top %s features using chi-square...", k)

    selector = SelectKBest(score_func=chi2, k=k)
    x_train_selected = selector.fit_transform(x_train_resampled, y_train_resampled)
    x_test_selected = selector.transform(x_test_combined)
    return selector, x_train_selected, x_test_selected


def get_cross_validation_score(model: Any, x_train: pd.Series, y_train: pd.Series, model_name: str) -> float:
    """
    Compute mean 5-fold cross-validation accuracy using the same feature flow
    as the main training pipeline.
    """
    LOGGER.info("Running 5-fold cross-validation for %s...", model_name)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    fold_scores: list[float] = []

    for fold_number, (train_idx, val_idx) in enumerate(cv.split(x_train, y_train), start=1):
        x_fold_train = x_train.iloc[train_idx]
        x_fold_val = x_train.iloc[val_idx]
        y_fold_train = y_train.iloc[train_idx]
        y_fold_val = y_train.iloc[val_idx]

        vectorizer = build_vectorizer()
        x_fold_train_tfidf = vectorizer.fit_transform(x_fold_train)
        x_fold_val_tfidf = vectorizer.transform(x_fold_val)

        _scaler_bundle, x_fold_train_url_scaled, x_fold_val_url_scaled = scale_url_features(
            x_fold_train,
            x_fold_val,
        )
        x_fold_train_combined = combine_feature_sets(x_fold_train_tfidf, x_fold_train_url_scaled)
        x_fold_val_combined = combine_feature_sets(x_fold_val_tfidf, x_fold_val_url_scaled)

        smote = SMOTE(random_state=RANDOM_STATE)
        x_fold_train_for_smote = (
            x_fold_train_combined.toarray() if sparse.issparse(x_fold_train_combined) else x_fold_train_combined
        )
        x_fold_train_resampled, y_fold_train_resampled = smote.fit_resample(x_fold_train_for_smote, y_fold_train)

        selector = SelectKBest(score_func=chi2, k=min(500, x_fold_train_resampled.shape[1]))
        x_fold_train_selected = selector.fit_transform(x_fold_train_resampled, y_fold_train_resampled)
        x_fold_val_selected = selector.transform(x_fold_val_combined)

        fold_model = clone(model)
        fold_model.fit(x_fold_train_selected, y_fold_train_resampled)
        fold_predictions = fold_model.predict(x_fold_val_selected)
        fold_accuracy = accuracy_score(y_fold_val, fold_predictions)
        fold_scores.append(float(fold_accuracy))
        LOGGER.info("Fold %s Accuracy: %.4f", fold_number, fold_accuracy)

    mean_score = float(np.mean(fold_scores))
    LOGGER.info("%s CV Accuracy Scores: %s", model_name, [round(score, 4) for score in fold_scores])
    LOGGER.info("%s Mean CV Accuracy: %.4f", model_name, mean_score)
    return mean_score


def evaluate_model(
    model: Any,
    x_test: Any,
    y_test: pd.Series,
    model_name: str,
    cv_score: float,
    decision_threshold: float | None = None,
) -> dict[str, Any]:
    """Evaluate a trained model and return all important metrics."""
    LOGGER.info("Evaluating %s...", model_name)
    probabilities = model.predict_proba(x_test)[:, 1]
    if model_name == "XGBoost" and decision_threshold is not None:
        predictions = (probabilities > decision_threshold).astype(int)
        tuned_test_f1 = f1_score(y_test, predictions, zero_division=0)
        print("[INFO] Threshold tuned on validation set")
        print(f"[INFO] Best threshold: {decision_threshold}")
        print(f"[INFO] Final XGBoost F1 on test set: {tuned_test_f1:.4f}")
    else:
        predictions = model.predict(x_test)

    conf_matrix = confusion_matrix(y_test, predictions)

    metrics = {
        "accuracy": accuracy_score(y_test, predictions),
        "precision": precision_score(y_test, predictions, zero_division=0),
        "recall": recall_score(y_test, predictions, zero_division=0),
        "f1_score": f1_score(y_test, predictions, zero_division=0),
        "cv_accuracy": cv_score,
        "roc_auc": roc_auc_score(y_test, probabilities),
        "confusion_matrix": conf_matrix.tolist(),
        "classification_report": classification_report(y_test, predictions, zero_division=0),
    }

    print(f"\n{model_name} Results")
    print("-" * 50)
    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall   : {metrics['recall']:.4f}")
    print(f"F1-Score : {metrics['f1_score']:.4f}")
    print(f"CV Score : {metrics['cv_accuracy']:.4f}")
    print(f"ROC-AUC  : {metrics['roc_auc']:.4f}")
    print("Confusion Matrix:")
    print(conf_matrix)
    print("Classification Report:")
    print(metrics["classification_report"])

    return metrics


def save_pickle(obj: Any, file_path: Path) -> None:
    """Save a Python object as a pickle file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "wb") as file:
        pickle.dump(obj, file)
    LOGGER.info("Saved: %s", file_path)


def plot_model_comparison(results: dict[str, dict[str, Any]], output_path: Path) -> None:
    """Create a bar chart that compares test accuracy."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        LOGGER.warning("matplotlib is not installed; skipping model comparison plot generation.")
        return

    model_names = list(results.keys())
    accuracy_scores = [results[model_name]["accuracy"] for model_name in model_names]

    plt.figure(figsize=(8, 5))
    bars = plt.bar(model_names, accuracy_scores, color=["#2563eb", "#f59e0b"])
    plt.title("Model Accuracy Comparison")
    plt.xlabel("Models")
    plt.ylabel("Accuracy")
    plt.ylim(0, 1.0)

    for bar, score in zip(bars, accuracy_scores):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            score + 0.02,
            f"{score:.2f}",
            ha="center",
            va="bottom",
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    LOGGER.info("Saved model comparison chart to: %s", output_path)


def train_and_compare_models(data_path: Path = DATA_PATH) -> dict[str, Any]:
    """Run the full training pipeline and return summary results."""
    openphish_path = resolve_dataset_path(OPENPHISH_PATH, "*openphish*.txt")
    tranco_path = resolve_dataset_path(TRANCO_PATH, "*tranco*.csv")

    if os.path.exists(openphish_path) and os.path.exists(tranco_path):
        df = build_hybrid_dataset(openphish_path=openphish_path, tranco_path=tranco_path)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(data_path, index=False)
        LOGGER.info("Saved hybrid dataset snapshot to: %s", data_path)
    else:
        LOGGER.warning(
            "Hybrid sources not found at %s and %s. Falling back to the local CSV/synthetic dataset flow.",
            OPENPHISH_PATH,
            TRANCO_PATH,
        )
        df = ensure_realistic_dataset(data_path)

    df = preprocess_dataset(df)
    LOGGER.info("Usable dataset size after preprocessing: %s rows", len(df))
    LOGGER.info("Usable class distribution:\n%s", df["label"].value_counts().sort_index())

    x = df["clean_url"]
    y = df["label"]

    LOGGER.info("Splitting dataset into train and test sets...")
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    LOGGER.info("Extracting TF-IDF features...")
    vectorizer = build_vectorizer()
    x_train_tfidf = vectorizer.fit_transform(x_train)
    x_test_tfidf = vectorizer.transform(x_test)

    LOGGER.info("Scaling handcrafted URL features...")
    scaler_bundle, x_train_url_scaled, x_test_url_scaled = scale_url_features(x_train, x_test)

    LOGGER.info("Combining TF-IDF and scaled URL features...")
    x_train_combined = combine_feature_sets(x_train_tfidf, x_train_url_scaled)
    x_test_combined = combine_feature_sets(x_test_tfidf, x_test_url_scaled)

    LOGGER.info("Applying SMOTE only on the combined training features...")
    smote = SMOTE(random_state=RANDOM_STATE)
    x_train_for_smote = x_train_combined.toarray() if sparse.issparse(x_train_combined) else x_train_combined
    x_train_resampled, y_train_resampled = smote.fit_resample(x_train_for_smote, y_train)

    selector, x_train_selected, x_test_selected = select_top_features(
        x_train_resampled=x_train_resampled,
        y_train_resampled=y_train_resampled,
        x_test_combined=x_test_combined,
        max_features=500,
    )

    LOGGER.info("Training Random Forest model...")
    random_forest = get_random_forest_model()
    random_forest.fit(x_train_selected, y_train_resampled)

    LOGGER.info("Training XGBoost model...")
    xgboost_model = get_xgboost_model()
    xgboost_model.fit(x_train_selected, y_train_resampled)

    LOGGER.info("Tuning XGBoost threshold on a validation split from the training data...")
    xgb_train_sub, xgb_val, y_xgb_train_sub, y_xgb_val = train_test_split(
        x_train_selected,
        y_train_resampled,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y_train_resampled,
    )
    xgboost_threshold_model = get_xgboost_model()
    xgboost_threshold_model.fit(xgb_train_sub, y_xgb_train_sub)
    y_val_probs = xgboost_threshold_model.predict_proba(xgb_val)[:, 1]
    best_threshold = 0.5
    best_f1 = 0.0
    for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
        val_predictions = (y_val_probs > threshold).astype(int)
        val_f1 = f1_score(y_xgb_val, val_predictions, zero_division=0)
        if val_f1 > best_f1:
            best_f1 = float(val_f1)
            best_threshold = threshold

    random_forest_cv = get_cross_validation_score(
        get_random_forest_model(),
        x_train,
        y_train,
        "Random Forest",
    )
    xgboost_cv = get_cross_validation_score(
        get_xgboost_model(),
        x_train,
        y_train,
        "XGBoost",
    )

    results = {
        "Random Forest": evaluate_model(
            random_forest,
            x_test_selected,
            y_test,
            "Random Forest",
            random_forest_cv,
        ),
        "XGBoost": evaluate_model(
            xgboost_model,
            x_test_selected,
            y_test,
            "XGBoost",
            xgboost_cv,
            decision_threshold=best_threshold,
        ),
    }

    print("\nModel Comparison")
    print("-" * 50)
    print(f"Random Forest Accuracy: {results['Random Forest']['accuracy'] * 100:.2f}%")
    print(f"Random Forest CV Score: {results['Random Forest']['cv_accuracy'] * 100:.2f}%")
    print(f"Random Forest F1      : {results['Random Forest']['f1_score'] * 100:.2f}%")
    print(f"XGBoost Accuracy      : {results['XGBoost']['accuracy'] * 100:.2f}%")
    print(f"XGBoost CV Score      : {results['XGBoost']['cv_accuracy'] * 100:.2f}%")
    print(f"XGBoost F1            : {results['XGBoost']['f1_score'] * 100:.2f}%")

    best_model_name = max(
        results,
        key=lambda model_name: (
            results[model_name]["f1_score"] + results[model_name]["cv_accuracy"]
        ),
    )
    best_model = random_forest if best_model_name == "Random Forest" else xgboost_model

    LOGGER.info("Best model selected automatically: %s", best_model_name)

    save_pickle(vectorizer, MODEL_DIR / "vectorizer.pkl")
    save_pickle(scaler_bundle, MODEL_DIR / "scaler.pkl")
    save_pickle(selector, MODEL_DIR / "selector.pkl")
    save_pickle(best_model, MODEL_DIR / "best_model.pkl")
    plot_model_comparison(results, MODEL_DIR / "model_accuracy_comparison.png")

    return {
        "results": results,
        "best_model_name": best_model_name,
    }


if __name__ == "__main__":
    summary = train_and_compare_models()
    print("\nFinal Summary")
    print("-" * 50)
    print(summary)
