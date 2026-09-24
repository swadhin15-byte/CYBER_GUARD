# Notebooks

Model work happens here, then lands in `backend/models/<module>/detector.py`
behind the `_model_score()` / `_model_signals()` hooks. Keep the notebooks
exploratory — the API should never import from this folder.

Suggested order, matching the roadmap:

| Notebook | Phase | Output |
| --- | --- | --- |
| `01_phishing_baseline.ipynb` | 2 | TF-IDF + linear model over `data/phishing/`, saved to `backend/models/phishing/model.joblib` |
| `02_phishing_error_analysis.ipynb` | 2 | Which rules the model disagrees with, and why |
| `03_deepfake_frames.ipynb` | 3 | Frame-level face crops, blink intervals, lip-sync alignment |
| `04_voice_antispoofing.ipynb` | 3 | Mel-spectrogram model for synthetic speech |
| `05_anomaly_baseline.ipynb` | 4 | IsolationForest over the feature dict in `anomaly/detector.py` |
| `06_threshold_tuning.ipynb` | 5 | Where the risk bands (20/45/68/86) should actually sit |

Notebook 06 matters more than it looks. The thresholds in `risk_engine.py` are
currently a reasonable guess; tuning them against labelled data is what turns
the score into something an analyst can trust.
