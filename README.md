# Organic Reactions Structuring Utility

This repository provides a script that restructures the
[`smitathkr1/organic_reactions`](https://huggingface.co/datasets/smitathkr1/organic_reactions)
dataset into a richer schema with explicit fields for reactants, reagents,
products, and byproducts. The resulting dataset can be uploaded to the Hugging
Face Hub for reuse.

## Contents

- `scripts/structure_organic_reactions.py` – main transformation script.
- `docs/structured_organic_reactions_dataset_README.md` – dataset README that is
  uploaded alongside the generated dataset on the Hugging Face Hub.
- `requirements.txt` – Python dependencies required to run the script.

## Getting Started

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

Run the script locally to build the structured dataset:

```bash
python scripts/structure_organic_reactions.py --output-json structured_dataset.jsonl
```

To upload the dataset to your Hugging Face account:

```bash
export HF_TOKEN="hf_xxx"  # never hard-code the token
python scripts/structure_organic_reactions.py --push --dataset-name structured-organic-reactions
```

### Command-line Options

| Option | Description |
|--------|-------------|
| `--max-records` | Limit the number of records processed (useful for testing). |
| `--sleep` | Delay (seconds) between HTTP requests for polite crawling. |
| `--output-json` | Path to write the structured dataset as JSON Lines. |
| `--push` | Push the resulting dataset to the Hugging Face Hub. Requires `HF_TOKEN`. |
| `--dataset-name` | Name of the dataset repository (combined with your username). |
| `--readme-path` | README file to upload with the dataset (defaults to the provided template). |
| `--log-level` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

## Hugging Face Authentication

The script uses the Hugging Face token via the `HF_TOKEN` environment variable.
Never commit tokens to source control. Generate a token with write access from
https://huggingface.co/settings/tokens and export it before running the script.

## Dataset Structure

The resulting dataset includes the following fields for each reaction:

- `name`
- `source_url`
- `reactants`
- `reagents`
- `products`
- `byproducts`
- `notes`

A detailed description is available in the dataset README at
`docs/structured_organic_reactions_dataset_README.md`.

## Logging & Error Handling

- HTTP errors and parsing failures are logged and captured in the `notes` field
  on a per-entry basis.
- Requests use a descriptive user agent string and support an optional delay for
  rate limiting.
- Wikipedia parsing leverages reaction box templates, dedicated reagent
  sections, and textual heuristics.

## License

This repository provides tooling around public datasets. Refer to the original
sources for their respective licenses before redistributing derived data.
