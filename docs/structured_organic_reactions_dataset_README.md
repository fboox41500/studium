# Structured Organic Reactions Dataset

This dataset reorganises the public [`smitathkr1/organic_reactions`](https://huggingface.co/datasets/smitathkr1/organic_reactions)
corpus into a more analysis-friendly format. Each reaction entry has been
expanded with best-effort parsing of the linked reference material to surface
its key components in distinct fields.

> ⚠️ **Important**: The underlying sources are heterogeneous (primarily
> Wikipedia and Name-Reaction.com). Automated extraction can occasionally miss
> details or include descriptive phrases rather than tidy chemical names. Users
> should validate critical information against the cited source URLs.

## Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Reaction identifier from the source dataset. |
| `source_url` | string | Original reference URL for the reaction (typically Wikipedia or Name-Reaction.com). |
| `reactants` | list[string] | Primary reactant species inferred from reaction schematics, reaction boxes, or textual descriptions. |
| `reagents` | list[string] | Catalysts, solvents, and auxiliary reagents identified from reaction templates or dedicated sections. |
| `products` | list[string] | Main reaction products extracted from schematics, reaction boxes, or narrative descriptions. |
| `byproducts` | list[string] | Reported side products or byproducts where explicitly mentioned. |
| `notes` | string | Free-text notes capturing parsing caveats or missing data warnings on a per-entry basis. |

## Generation Process

1. Downloaded the `smitathkr1/organic_reactions` dataset using the
   [`datasets`](https://github.com/huggingface/datasets) library.
2. For each entry, fetched the associated web page with a polite user agent and
   a small configurable delay between requests.
3. Parsed data depending on the source domain:
   - **Name-Reaction.com**: extracted structured information from reaction
     schematic image alt-text listings (reactants, reagents, products,
     byproducts).
   - **Wikipedia**: inspected reaction templates (e.g. `Reactionbox Reaction`,
     `Reactionbox Conditions`), reagent sections, inline wikitext equations, and
     descriptive sentences to infer the required fields.
4. Normalised extracted text, removed duplicates, and recorded parsing notes
   when information was missing or ambiguous.
5. Assembled the cleaned data into a Hugging Face `Dataset` with explicit
   `Sequence[string]` features for the list-based fields.

The transformation script is included in this repository under
`scripts/structure_organic_reactions.py`.

## Usage

```python
from datasets import load_dataset

ds = load_dataset("<your-account>/structured-organic-reactions", split="train")
print(ds.features)
```

Each entry includes the original `source_url`, enabling manual verification or
further enrichment.

## Limitations & Future Work

- **Incomplete coverage**: Some pages lack structured templates or machine-
  readable schematics; such entries retain empty lists and a note indicating the
  missing data.
- **Heuristic parsing**: The extraction relies on heuristics (e.g. splitting on
  commas or conjunctions). For formal analyses, consider revalidating the output
  against the cited sources or augmenting with domain-specific NLP models.
- **Byproducts**: These are only captured when sources explicitly mention
  byproducts; absence in the dataset does not imply none are formed.

Contributions to improve the parsing heuristics or extend the dataset are
welcome. Please open an issue or pull request with suggestions.
