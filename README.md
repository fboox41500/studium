AI-enabled Molecular Viewer (MolView-like)

Overview
This repository contains a lightweight molecular exploration tool inspired by MolView (https://molview.org/). It provides search via PubChem, 2D depiction from SMILES, interactive 3D visualization, and an AI Assistant. By default, the AI assistant uses a deterministic, local heuristic; optionally, you can enable a Gemini Flash 2.5 backend for richer answers.

Features
- Search compounds by name or paste a SMILES string
- Fetch best match from PubChem and display:
  - 2D structure (via SmilesDrawer)
  - 3D structure (via 3Dmol.js) when available from PubChem
  - Key properties (formula, molecular weight, SMILES, InChI, etc.)
- Drag-and-drop SDF/MOL files to visualize in 3D
- AI Assistant panel:
  - Offline: rule-based property summaries with no external keys
  - Online: uses Gemini (Flash) to answer free-form questions when configured
- Runs as a simple static site or via the included Node server

Quick start (no AI backend)
- Open web/index.html in any modern browser
- Type a compound name like "aspirin" or a SMILES string like "CC(=O)OC1=CC=CC=C1C(=O)O"
- Click Search to load data from PubChem

Enable Gemini AI backend (recommended)
- Requirements: Node.js 18+
- Steps:
  1) Export your Gemini API key and (optionally) model name
     - macOS/Linux:
       export GEMINI_API_KEY="your_api_key_here"
       export GEMINI_MODEL="gemini-2.5-flash"   # optional; defaults to gemini-2.5-flash
     - Windows (PowerShell):
       setx GEMINI_API_KEY "your_api_key_here"
       setx GEMINI_MODEL "gemini-2.5-flash"
  2) Install and start the server
       npm install
       npm start
  3) Open http://localhost:3000 in your browser
- The client will auto-detect the AI backend at /api/ai. When connected, the AI Assistant will use Gemini for answers.

Notes
- All compound data is loaded from PubChem PUG REST endpoints. You need an internet connection.
- The optional AI backend uses Google’s Generative Language API. Ensure your API key has access to the configured model. Default model is gemini-2.5-flash; you can override via GEMINI_MODEL.
- If the AI backend is not configured or unreachable, the app falls back to built-in summaries.

Stack
- HTML/CSS/JavaScript (client-only front end)
- 3Dmol.js (3D visualization)
- SmilesDrawer (2D depiction and SVG output)
- ChemDoodle Web Components (2D editor, 3D WebGL viewer, periodic table)
- PubChem PUG REST API (compound data)
- Node.js + Express (optional backend)
- Google Generative Language API (Gemini) via REST

Project layout
- /web            Static front-end assets
- /web/chemdoodle-docs.html  Integration docs for ChemDoodle components
- /server         Minimal Node/Express backend exposing /api/ai

ChemDoodle integration
- Components included:
  - StructureEditorCanvas (canvas id: cdEditor) to draw/edit molecules
  - TransformCanvas3D (canvas id: cd3d) to render 3D molecules (from SDF)
  - PeriodicTableCanvas (canvas id: cdPT)
- CDN includes (already in index.html):
  <link rel="stylesheet" href="https://web.chemdoodle.com/assets/css/ChemDoodleWeb.css" />
  <script src="https://web.chemdoodle.com/assets/js/ChemDoodleWeb.js"></script>
  <script src="https://web.chemdoodle.com/assets/js/ChemDoodleWeb-uis.js"></script>
- App controls in the ChemDoodle panel:
  - Load current SMILES: loads the selected molecule into the editor
  - Use editor as current: exports SMILES from the editor and updates app state
  - Render 3D from current: displays last fetched PubChem 3D SDF in ChemDoodle 3D viewer
- See web/chemdoodle-docs.html for code snippets and usage.

Extending
- Swap/augment AI providers by editing server/index.js to call another model. The client simply POSTs to /api/ai with question + context.
- Add spectra: use ChemDoodle SpectrumCanvas for NMR/IR if you have data sources.
- More data: Pull hazard classifications and spectra from additional data providers or PubChem PUG-View headings.

License
- This example uses only client-side code with CDN libraries plus an optional backend proxy. Review 3Dmol.js, SmilesDrawer, ChemDoodle Web Components, and Google API terms before distribution.
