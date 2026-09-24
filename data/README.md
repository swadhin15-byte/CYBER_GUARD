# Data

`*/samples.jsonl` are small, hand-written demo fixtures. They are replayed
through the real detectors at startup by `backend/seed.py`, so the board you
see on launch was produced by the same code path a live event takes.

Each line is a single event in the shape its detector's `detect()` accepts.

Real datasets go in the same folders and stay out of git (see `.gitignore`).
Useful starting points for each module:

- **phishing** — Enron + SpamAssassin for legitimate mail, PhishTank and the
  Nazario phishing corpus for the positive class. Keep the legitimate:phishing
  ratio realistic; a balanced set will flatter your metrics and mislead you.
- **deepfake** — FaceForensics++, Celeb-DF, DFDC for video; ASVspoof for audio.
- **anomaly** — your own logs if you can get them. Otherwise the LANL
  authentication dataset or CERT insider threat set. Synthetic logs are fine
  for a demo but will not teach the model a real baseline.
