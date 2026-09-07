# Phishing Website Detection using Machine Learning

This project detects whether a URL is a phishing website or a legitimate website using machine learning.

The dataset is constructed using phishing URLs from OpenPhish and legitimate URLs from Tranco, a research-oriented ranking of top websites. This hybrid dataset reflects real-world conditions where phishing and benign URLs originate from different sources.

Phishing URLs are labeled as `1` and legitimate URLs as `0`.

It includes:

- URL preprocessing
- Character-level TF-IDF feature extraction
- SMOTE for class imbalance handling
- Feature selection with `SelectKBest`
- Model training with Random Forest and XGBoost
- Automatic best-model selection
- Model saving with pickle
- FastAPI deployment
- Simple HTML frontend for testing predictions

## Project Structure

```text
phishing-detection/
|
|-- data/
|   |-- openphish.txt
|   |-- tranco.csv
|   `-- phishing_data.csv
|
|-- models/
|   |-- vectorizer.pkl
|   |-- selector.pkl
|   `-- best_model.pkl
|
|-- src/
|   |-- __init__.py
|   |-- train.py
|   |-- predict.py
|   `-- preprocess.py
|
|-- api/
|   `-- app.py
|
|-- requirements.txt
`-- README.md
```

## Dataset Format

The training pipeline expects these source files in the `data/` folder:

- `openphish.txt`: plain text file with one phishing URL per line
- `tranco.csv`: CSV with `rank,domain`

During training, the project:

1. loads phishing URLs from OpenPhish and assigns label `1`
2. loads Tranco domains, converts them to URLs using `http://`, and assigns label `0`
3. samples a balanced subset from both sources
4. removes duplicates and null values
5. shuffles the merged dataset
6. saves a snapshot to `data/phishing_data.csv`

The generated dataset snapshot contains:

```csv
url,label
http://google.com,0
http://fake-login.com,1
```

## Installation

1. Create and activate a virtual environment.

```powershell
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies.

```powershell
pip install -r requirements.txt
```

## Train the Model

Run:

```powershell
python -m src.train
```

This will:

- build the hybrid OpenPhish + Tranco dataset when `data/openphish.txt` and `data/tranco.csv` are available
- load and preprocess the dataset
- split the data into train and test sets
- create TF-IDF features using character n-grams `(2, 3)`
- limit TF-IDF vocabulary size for memory efficiency
- combine TF-IDF with handcrafted URL features
- apply SMOTE only on the training data
- select top features using chi-square
- train Random Forest and XGBoost
- compare both models
- save:
  - `models/vectorizer.pkl`
  - `models/selector.pkl`
  - `models/best_model.pkl`

## Run the API

Start the FastAPI server with:

```powershell
uvicorn api.app:app --reload
```

## API Endpoints

### 1. Home Page

Open:

```text
http://127.0.0.1:8000/
```

This shows a small HTML form where you can test a URL.

### 2. Prediction Endpoint

Request:

```text
GET /predict?url=http://secure-login-paypal.verify-user-session.com
```

Example:

```text
http://127.0.0.1:8000/predict?url=http://secure-login-paypal.verify-user-session.com
```

Example response:

```json
{
  "url": "http://secure-login-paypal.verify-user-session.com",
  "prediction": "Phishing"
}
```

## Predict from Python

You can also predict directly:

```python
from src.predict import predict_url

result = predict_url("https://google.com")
print(result)
```

## Notes

- OpenPhish provides phishing URLs in plain-text feed format, while Tranco provides ranked legitimate domains suited to research-oriented benign URL sampling.
- If the OpenPhish and Tranco source files are not present, the code falls back to the local CSV or synthetic demo dataset flow so the project remains runnable.
- The core ML pipeline is unchanged: URL preprocessing, TF-IDF character n-grams, handcrafted URL features, StandardScaler, SMOTE on training data only, chi-square feature selection, Random Forest, and XGBoost.
