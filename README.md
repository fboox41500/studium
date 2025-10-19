AI-enabled Molecular Viewer (MolView-like)

Overview
This repository contains a lightweight, client-only molecular exploration tool inspired by MolView (https://molview.org/). It provides search via PubChem, 2D depiction from SMILES, interactive 3D visualization, and an “AI Assistant” that generates human-readable summaries of molecular properties without requiring external AI keys. Everything runs in the browser using public REST APIs and CDN libraries.

Features
- Search compounds by name or paste a SMILES string
- Fetch best match from PubChem and display:
  - 2D structure (via SmilesDrawer)
  - 3D structure (via 3Dmol.js) when available from PubChem
  - Key properties (formula, molecular weight, SMILES, InChI, etc.)
- Drag-and-drop SDF/MOL files to visualize in 3D
- AI Assistant panel that summarizes the selected molecule’s properties and answers basic property questions using heuristics
- No build/compile step required; works as a static site you can open in a browser

Quick start
- Open web/index.html in a modern browser
- Type a compound name like "aspirin" or a SMILES string like "CC(=O)OC1=CC=CC=C1C(=O)O"
- Click Search to load data from PubChem

Notes
- This project intentionally avoids a backend to keep setup minimal. All data is loaded from PubChem PUG REST endpoints. You need an internet connection.
- The AI Assistant is rule-based and deterministic to avoid requiring API keys. You can later replace it with your preferred LLM.
- 3D models are requested from PubChem using 3D records when available; if a 3D conformer doesn’t exist, the viewer falls back gracefully.

Stack
- HTML/CSS/JavaScript (client-only)
- 3Dmol.js (3D visualization)
- SmilesDrawer (2D depiction)
- PubChem PUG REST API

Extending
- Add a real AI provider: Create a lightweight backend that proxies requests to your LLM of choice. Replace the generateAIAnswer function in web/app.js to call your backend securely.
- Add a 2D editor: Integrate JSME or Ketcher to draw and export SMILES/MOL directly in-browser.
- More data: Pull hazard classifications and spectra from additional data providers or PubChem PUG-View headings.

License
- This example uses only client-side code with CDN libraries. Review 3Dmol.js and SmilesDrawer licenses before distribution.
