#!/usr/bin/env python3
"""Create a structured version of the Hugging Face organic_reactions dataset.

The script downloads the source dataset, scrapes supplementary information
from the referenced resources (name-reaction.com and Wikipedia), attempts to map
reactions into structured fields, and optionally uploads the result to a new
Hugging Face dataset repository.

Usage examples
--------------
    python scripts/structure_organic_reactions.py \
        --output-json structured_organic_reactions.json

    HF_TOKEN=... python scripts/structure_organic_reactions.py \
        --push --dataset-name structured-organic-reactions

Key features
------------
* Robust HTTP handling with polite user agent headers and logging.
* Parsing logic tailored for name-reaction.com alt text descriptions and
  Wikipedia reaction templates / sections.
* Graceful fallbacks with provenance notes when information cannot be parsed.
* Optional upload to Hugging Face Hub using the token supplied via HF_TOKEN.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import unquote, urlparse

import mwparserfromhell
import requests
from bs4 import BeautifulSoup
from datasets import Dataset, Features, Sequence as HFSequence, Value, load_dataset
from huggingface_hub import HfApi
from huggingface_hub.utils import HfHubHTTPError
from requests import Response
from requests.exceptions import RequestException, Timeout

# ----------------------------------------------------------------------------
# Constants & configuration
# ----------------------------------------------------------------------------

DEFAULT_USER_AGENT = (
    "structured-organic-reactions/0.1 (+https://huggingface.co/datasets)"
)
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
NAME_REACTION_DOMAIN = "www.name-reaction.com"
WIKIPEDIA_DOMAIN = "en.wikipedia.org"
REQUEST_TIMEOUT = 15  # seconds
REQUEST_BACKOFF_SECONDS = 0.25

NAME_REACTION_PATTERNS: Dict[str, re.Pattern[str]] = {
    "reactants": re.compile(r"Reactant[s]?\s*:\s*([^\.;]+)", re.IGNORECASE),
    "reagents": re.compile(r"Reagent[s]?\s*:\s*([^\.;]+)", re.IGNORECASE),
    "products": re.compile(r"Product[s]?\s*:\s*([^\.;]+)", re.IGNORECASE),
    "byproducts": re.compile(
        r"By[-\s]?product[s]?\s*:\s*([^\.;]+)", re.IGNORECASE
    ),
}

# Keywords that commonly indicate auxiliary reagents or conditions rather than
# core reactants. Used as a heuristic when dissecting reaction equations.
REAGENT_KEYWORDS = {
    "naoh",
    "koh",
    "h2so4",
    "hcl",
    "hbr",
    "nabr",
    "heat",
    "hv",
    "light",
    "pyridine",
    "water",
    "h2o",
    "catalyst",
    "reagent",
    "pt",
    "pd",
    "ni",
    "cu",
    "zn",
    "li",
    "na",
    "k",
    "mg",
    "al",
    "acid",
    "base",
    "triethylamine",
    "grignard",
    "dabco",
    "dmf",
    "dmso",
    "thf",
    "ether",
    "ccl4",
    "cbr4",
    "pph3",
    "et3n",
    "pr3",
    "socl2",
    "pcl3",
    "pcl5",
    "pbr3",
    "tscl",
}


# ----------------------------------------------------------------------------
# Helper utilities
# ----------------------------------------------------------------------------


def clean_whitespace(value: str) -> str:
    """Collapse consecutive whitespace characters and strip the ends."""

    return re.sub(r"\s+", " ", value).strip()


def normalize_item(raw: str) -> str:
    """Normalize an extracted chemical species description."""

    text = raw
    text = text.replace("–", "-")
    text = re.sub(r"\[[^\]]*\]", "", text)  # remove reference markers
    text = re.sub(r"\([^)]*\)$", "", text)  # drop trailing parentheses notes
    text = re.sub(r"^[:;,.]+", "", text)
    text = re.sub(r"\b(an?|the|two|three|four|five|six|several|various)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(molecule|molecules|equivalents?|mol|moles)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\d+\s*", "", text)
    text = re.sub(r"\s+/\s+", " / ", text)
    text = clean_whitespace(text)
    return text


def split_candidates(text: str) -> List[str]:
    """Split a piece of reaction text into candidate entries."""

    if not text:
        return []
    working = text
    working = working.replace(";", ",")
    working = working.replace("/", ",")
    working = working.replace("\\", ",")
    working = re.sub(r"\b(?:and|or)\b", ",", working, flags=re.IGNORECASE)
    parts = [normalize_item(part) for part in re.split(r",", working)]
    return [part for part in parts if part]


def deduplicate(items: Iterable[str]) -> List[str]:
    """Return items with order preserved and duplicates removed."""

    seen = set()
    ordered: List[str] = []
    for item in items:
        key = item.lower()
        if key and key not in seen:
            seen.add(key)
            ordered.append(item)
    return ordered


def wikicode_to_text(value: mwparserfromhell.wikicode.Wikicode | str) -> str:
    """Convert wikicode structures to plain text."""

    if isinstance(value, mwparserfromhell.wikicode.Wikicode):
        code = value
    else:
        code = mwparserfromhell.parse(str(value))
    text = code.strip_code()
    return clean_whitespace(text)


# ----------------------------------------------------------------------------
# Data structures
# ----------------------------------------------------------------------------


@dataclass
class ReactionRecord:
    """Structured representation of a reaction entry."""

    name: str
    source_url: str
    reactants: List[str] = field(default_factory=list)
    reagents: List[str] = field(default_factory=list)
    products: List[str] = field(default_factory=list)
    byproducts: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "source_url": self.source_url,
            "reactants": deduplicate(self.reactants),
            "reagents": deduplicate(self.reagents),
            "products": deduplicate(self.products),
            "byproducts": deduplicate(self.byproducts),
            "notes": " | ".join(deduplicate(self.notes)),
        }

    def add_note(self, message: str) -> None:
        if message:
            self.notes.append(clean_whitespace(message))


# ----------------------------------------------------------------------------
# Parsing logic
# ----------------------------------------------------------------------------


class ReactionDatasetParser:
    """Parser responsible for transforming raw entries into structured records."""

    def __init__(self, sleep_between_requests: float = 0.0) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": DEFAULT_USER_AGENT})
        self.sleep_between_requests = sleep_between_requests

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def parse(self, name: str, url: str) -> ReactionRecord:
        domain = urlparse(url).netloc
        record = ReactionRecord(name=name, source_url=url)

        try:
            if domain == NAME_REACTION_DOMAIN:
                self._parse_name_reaction(url, record)
            elif domain == WIKIPEDIA_DOMAIN:
                self._parse_wikipedia(url, record)
            else:
                record.add_note(f"Unsupported domain {domain}; fields left empty")
                logging.warning("Unsupported domain encountered: %s", url)
        except Timeout:
            record.add_note("Request timed out while fetching source page")
            logging.warning("Timeout while fetching %s", url)
        except RequestException as exc:
            record.add_note(f"HTTP error: {exc}")
            logging.warning("HTTP error for %s: %s", url, exc)
        except Exception as exc:  # noqa: BLE001 broad fallback
            record.add_note(f"Parsing failed: {exc}")
            logging.exception("Failed to parse %s", url)

        return record

    # ------------------------------------------------------------------
    # Domain-specific parsers
    # ------------------------------------------------------------------

    def _parse_name_reaction(self, url: str, record: ReactionRecord) -> None:
        response = self._http_get(url)
        if response is None:
            record.add_note("Failed to retrieve name-reaction page")
            return

        soup = BeautifulSoup(response.text, "html.parser")
        candidate_alt_texts = []
        for img in soup.select("img"):
            alt = img.get("alt")
            if not alt:
                continue
            lower = alt.lower()
            if any(keyword in lower for keyword in ("reactant", "reagent", "product")):
                candidate_alt_texts.append(alt)

        if not candidate_alt_texts:
            record.add_note("No informative image alt text found on name-reaction page")
            return

        # Prefer the first candidate alt text which typically describes the schematic.
        alt_text = candidate_alt_texts[0]
        logging.debug("Selected alt text for %s: %s", record.name, alt_text)

        for field, pattern in NAME_REACTION_PATTERNS.items():
            match = pattern.search(alt_text)
            if match:
                values = split_candidates(match.group(1))
                if field == "reactants":
                    record.reactants.extend(values)
                elif field == "reagents":
                    record.reagents.extend(values)
                elif field == "products":
                    record.products.extend(values)
                elif field == "byproducts":
                    record.byproducts.extend(values)

        if not record.reactants and record.reagents:
            # Promote up to two non-reagent-like entries from the reagent list into reactants.
            retained_reagents: List[str] = []
            promoted = 0
            for item in record.reagents:
                if promoted < 2 and not self._looks_like_reagent(item):
                    record.reactants.append(item)
                    promoted += 1
                else:
                    retained_reagents.append(item)
            record.reagents = retained_reagents

        if not record.reactants and not record.products:
            record.add_note("Alt text did not contain explicit reactants/products")

    def _parse_wikipedia(self, url: str, record: ReactionRecord) -> None:
        title = self._extract_wikipedia_title(url)
        if not title:
            record.add_note("Unable to determine Wikipedia title from URL")
            return

        wikicode = self._fetch_wikitext(title)
        if wikicode is None:
            record.add_note("Failed to fetch Wikipedia wikitext")
            return

        parsed = mwparserfromhell.parse(wikicode)

        reaction_data = self._extract_reactionbox(parsed)
        record.reactants.extend(reaction_data["reactants"])
        record.reagents.extend(reaction_data["reagents"])
        record.products.extend(reaction_data["products"])
        record.byproducts.extend(reaction_data["byproducts"])

        if not record.reagents:
            reagents_from_sections = self._extract_reagents_from_sections(parsed)
            if reagents_from_sections:
                record.reagents.extend(reagents_from_sections)

        plain_text = parsed.strip_code()
        if not record.byproducts:
            record.byproducts.extend(self._extract_byproducts_from_text(parsed))

        if not record.reactants or not record.products:
            fallback_reactants, fallback_products = self._extract_from_reaction_equation(
                parsed
            )
            record.reactants.extend(fallback_reactants)
            record.products.extend(fallback_products)

        if not record.reactants or not record.products:
            text_reactants, text_products = self._extract_from_plain_text(plain_text)
            record.reactants.extend(text_reactants)
            record.products.extend(text_products)

        if not record.reagents:
            record.add_note("Wikipedia page lacked explicit reagent data")
        if not record.reactants:
            record.add_note("Wikipedia page lacked explicit reactant data")
        if not record.products:
            record.add_note("Wikipedia page lacked explicit product data")

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    def _http_get(self, url: str, params: Optional[Dict[str, str]] = None) -> Optional[Response]:
        time.sleep(self.sleep_between_requests)
        response = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        if response.status_code >= 400:
            logging.warning("Received status %s for %s", response.status_code, response.url)
            return None
        return response

    def _fetch_wikitext(self, title: str) -> Optional[str]:
        params = {
            "action": "parse",
            "page": title,
            "prop": "wikitext",
            "format": "json",
            "redirects": True,
        }
        response = self._http_get(WIKIPEDIA_API_URL, params=params)
        if response is None:
            return None
        payload = response.json()
        if "error" in payload:
            logging.warning("Wikipedia API error for %s: %s", title, payload["error"])
            return None
        try:
            return payload["parse"]["wikitext"]["*"]
        except KeyError:
            logging.warning("Unexpected Wikipedia API payload for %s", title)
            return None

    # ------------------------------------------------------------------
    # Wikipedia parsing helpers
    # ------------------------------------------------------------------

    def _extract_wikipedia_title(self, url: str) -> Optional[str]:
        try:
            slug = url.split("/wiki/")[-1]
            return unquote(slug)
        except Exception:
            return None

    def _extract_reactionbox(self, parsed: mwparserfromhell.wikicode.Wikicode) -> Dict[str, List[str]]:
        reactants: List[str] = []
        reagents: List[str] = []
        products: List[str] = []
        byproducts: List[str] = []

        for template in parsed.filter_templates():
            name = template.name.strip().lower()
            if name == "reactionbox reaction":
                for param in template.params:
                    key = param.name.strip().lower()
                    value = wikicode_to_text(param.value)
                    items = split_candidates(value)
                    if not items:
                        continue
                    if key.startswith("reactant"):
                        reactants.extend(items)
                    elif key.startswith("reagent") or key == "catalyst":
                        reagents.extend(items)
                    elif key.startswith("product"):
                        products.extend(items)
                    elif key.startswith("sideproduct") or key.startswith("byproduct"):
                        byproducts.extend(items)
            elif name == "reactionbox conditions":
                for param in template.params:
                    key = param.name.strip().lower()
                    if key in {"reagent1", "reagent2", "reagent3", "catalyst", "reagent"}:
                        reagents.extend(split_candidates(wikicode_to_text(param.value)))
        return {
            "reactants": reactants,
            "reagents": reagents,
            "products": products,
            "byproducts": byproducts,
        }

    def _extract_reagents_from_sections(
        self, parsed: mwparserfromhell.wikicode.Wikicode
    ) -> List[str]:
        reagents: List[str] = []
        for section in parsed.get_sections(include_headings=True):
            headings = section.filter_headings()
            if not headings:
                continue
            heading_text = headings[0].title.strip().lower()
            if "reagent" not in heading_text and "catalyst" not in heading_text:
                continue
            for link in section.filter_wikilinks():
                reagents.append(normalize_item(wikicode_to_text(link.title)))
        return deduplicate(reagents)

    def _extract_byproducts_from_text(
        self, parsed: mwparserfromhell.wikicode.Wikicode
    ) -> List[str]:
        plain_text = parsed.strip_code()
        sentences = re.split(r"(?<=[.!?])\s+", plain_text)
        byproducts: List[str] = []
        for sentence in sentences:
            if "byproduct" not in sentence.lower():
                continue
            tail = sentence.split("byproduct", 1)[-1]
            byproducts.extend(split_candidates(tail))
        return deduplicate(byproducts)

    def _extract_from_reaction_equation(
        self, parsed: mwparserfromhell.wikicode.Wikicode
    ) -> Tuple[List[str], List[str]]:
        for line in str(parsed).splitlines():
            if "->" in line or "→" in line:
                clean_line = wikicode_to_text(line)
                if "->" in clean_line:
                    lhs, rhs = clean_line.split("->", 1)
                elif "→" in clean_line:
                    lhs, rhs = clean_line.split("→", 1)
                else:
                    continue
                reactants = self._classify_equation_side(lhs, reagents_container=None)
                products = self._classify_equation_side(rhs, reagents_container=None)
                return reactants, products
        return [], []

    def _classify_equation_side(
        self, text: str, reagents_container: Optional[List[str]]
    ) -> List[str]:
        entries = []
        for raw_entry in re.split(r"\+", text):
            cleaned = normalize_item(raw_entry)
            if not cleaned:
                continue
            entries.append(cleaned)
            if reagents_container is not None and self._looks_like_reagent(cleaned):
                reagents_container.append(cleaned)
        return entries

    def _looks_like_reagent(self, text: str) -> bool:
        canonical = text.lower()
        return any(keyword in canonical for keyword in REAGENT_KEYWORDS)

    def _extract_from_plain_text(self, plain_text: str) -> Tuple[List[str], List[str]]:
        sentences = re.split(r"(?<=[.!?])\s+", plain_text)
        for sentence in sentences:
            lowered = sentence.lower()
            if " to give " in lowered or " to form " in lowered or " to produce " in lowered:
                for trigger in (" to give ", " to form ", " to produce "):
                    if trigger in lowered:
                        pivot = lowered.index(trigger)
                        before = sentence[:pivot]
                        after = sentence[pivot + len(trigger) :]
                        reactants = split_candidates(before)
                        products = split_candidates(after)
                        if reactants and products:
                            return reactants, products
        return [], []


# ----------------------------------------------------------------------------
# Dataset orchestration & Hugging Face upload
# ----------------------------------------------------------------------------


def build_structured_dataset(
    parser: ReactionDatasetParser,
    max_records: Optional[int] = None,
) -> Dataset:
    source = load_dataset("smitathkr1/organic_reactions", split="train")
    records: List[ReactionRecord] = []

    total = len(source) if max_records is None else min(len(source), max_records)

    for idx, row in enumerate(source):
        if max_records is not None and idx >= max_records:
            break
        if idx % 25 == 0:
            logging.info("Processing record %s / %s", idx + 1, total)
        record = parser.parse(row["name"], row["link"])
        records.append(record)

    name_entries: List[str] = []
    url_entries: List[str] = []
    reactants_entries: List[List[str]] = []
    reagents_entries: List[List[str]] = []
    products_entries: List[List[str]] = []
    byproducts_entries: List[List[str]] = []
    notes_entries: List[str] = []

    for record in records:
        record_dict = record.to_dict()
        name_entries.append(record_dict["name"])
        url_entries.append(record_dict["source_url"])
        reactants_entries.append(record_dict["reactants"])
        reagents_entries.append(record_dict["reagents"])
        products_entries.append(record_dict["products"])
        byproducts_entries.append(record_dict["byproducts"])
        notes_entries.append(record_dict["notes"])

    structured = {
        "name": name_entries,
        "source_url": url_entries,
        "reactants": reactants_entries,
        "reagents": reagents_entries,
        "products": products_entries,
        "byproducts": byproducts_entries,
        "notes": notes_entries,
    }

    features = Features(
        {
            "name": Value("string"),
            "source_url": Value("string"),
            "reactants": HFSequence(Value("string")),
            "reagents": HFSequence(Value("string")),
            "products": HFSequence(Value("string")),
            "byproducts": HFSequence(Value("string")),
            "notes": Value("string"),
        }
    )

    return Dataset.from_dict(structured, features=features)


def push_to_hub(
    dataset: Dataset,
    token: str,
    dataset_name: str,
    readme_path: Optional[Path] = None,
) -> str:
    api = HfApi()
    who = api.whoami(token)
    owner = who.get("name") or who.get("username")
    if not owner:
        raise RuntimeError("Unable to determine Hugging Face username from token")

    repo_id = f"{owner}/{dataset_name}"
    logging.info("Uploading dataset to %s", repo_id)

    api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True, token=token)
    dataset.push_to_hub(repo_id, token=token)

    if readme_path and readme_path.exists():
        with readme_path.open("r", encoding="utf-8") as handle:
            readme_content = handle.read()
        api.upload_file(
            path_or_fileobj=readme_content.encode("utf-8"),
            path_in_repo="README.md",
            repo_id=repo_id,
            repo_type="dataset",
            token=token,
            commit_message="Update dataset README",
        )
    else:
        logging.warning("README path %s not found; skipping upload", readme_path)

    return repo_id


# ----------------------------------------------------------------------------
# CLI entrypoint
# ----------------------------------------------------------------------------


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--max-records",
        type=int,
        default=None,
        help="Limit the number of records processed (useful for testing)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Seconds to sleep between HTTP requests (rate limiting)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional path to write the structured dataset as JSONL",
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Push the structured dataset to the Hugging Face Hub",
    )
    parser.add_argument(
        "--dataset-name",
        default="structured-organic-reactions",
        help="Name for the dataset repository on the Hub (owner inferred from token)",
    )
    parser.add_argument(
        "--readme-path",
        type=Path,
        default=Path("docs/structured_organic_reactions_dataset_README.md"),
        help="README file to upload alongside the dataset",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity",
    )
    return parser.parse_args(argv)


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    configure_logging(args.log_level)

    parser = ReactionDatasetParser(sleep_between_requests=args.sleep)
    dataset = build_structured_dataset(parser, max_records=args.max_records)

    logging.info("Structured dataset contains %s records", len(dataset))

    if args.output_json:
        logging.info("Writing JSON output to %s", args.output_json)
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        with args.output_json.open("w", encoding="utf-8") as handle:
            for example in dataset:
                handle.write(json.dumps(example, ensure_ascii=False) + "\n")

    if args.push:
        token = os.getenv("HF_TOKEN")
        if not token:
            raise RuntimeError("HF_TOKEN environment variable must be set to push to Hub")
        repo_id = push_to_hub(dataset, token, args.dataset_name, args.readme_path)
        logging.info("Dataset uploaded to https://huggingface.co/datasets/%s", repo_id)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.error("Interrupted by user")
        sys.exit(1)
    except HfHubHTTPError as hub_error:
        logging.error("Hugging Face Hub error: %s", hub_error)
        sys.exit(1)
    except Exception as unhandled:  # noqa: BLE001
        logging.exception("Unhandled error: %s", unhandled)
        sys.exit(1)
