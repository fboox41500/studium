/* MolView-like client app using PubChem + 3Dmol.js + SmilesDrawer
   Optional Gemini (Flash 2.5) backend for AI via /api/ai.
   Enhanced UI with:
   - SVG export (preview, download, copy) and theme/size controls
   - Production-grade chat interface (multi-turn, copy, clear, typing indicator)
*/

const els = {
  queryInput: document.getElementById('queryInput'),
  btnSearch: document.getElementById('btnSearch'),
  btnRenderSmiles: document.getElementById('btnRenderSmiles'),
  altResults: document.getElementById('altResults'),
  canvas2d: document.getElementById('canvas2d'),
  svgContainer: document.getElementById('svgContainer'),
  twoDStatus: document.getElementById('twoDStatus'),
  viewer3d: document.getElementById('viewer3d'),
  threeDStatus: document.getElementById('threeDStatus'),
  props: document.getElementById('props'),
  dropzone: document.getElementById('dropzone'),
  // 2D controls
  drawerTheme: document.getElementById('drawerTheme'),
  svgWidth: document.getElementById('svgWidth'),
  svgHeight: document.getElementById('svgHeight'),
  btnPreviewSVG: document.getElementById('btnPreviewSVG'),
  btnDownloadSVG: document.getElementById('btnDownloadSVG'),
  btnCopySVG: document.getElementById('btnCopySVG'),
  // AI status
  aiStatus: document.getElementById('aiStatus'),
  // Chat UI
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  btnSend: document.getElementById('btnSend'),
  btnClear: document.getElementById('btnClear'),
  typing: document.getElementById('typing'),
};

let current = {
  cid: null,
  smiles: null,
  properties: {},
};

let lastSVG = '';

const aiService = {
  online: false,
  model: '',
  checked: false,
};

const chat = {
  messages: [], // { role: 'user' | 'assistant', text: string, ts: number }
};

function isLikelySmiles(text) {
  if (!text) return false;
  const specials = ['=', '#', '(', ')', '[', ']', '@', '+', '-', '/', '\\'];
  const hasSpecial = specials.some((c) => text.includes(c));
  const hasLetters = /[A-Za-z]/.test(text);
  return hasLetters && hasSpecial;
}

async function searchPubChem(query) {
  els.altResults.hidden = true;
  els.altResults.innerHTML = '';
  if (!query) throw new Error('Empty query');

  let cids = [];

  // Try as name first
  try {
    const r = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`);
    if (r.ok) {
      const j = await r.json();
      cids = (j?.IdentifierList?.CID) || [];
    }
  } catch (e) {}

  if (cids.length === 0 && isLikelySmiles(query)) {
    try {
      const r2 = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(query)}/cids/JSON`);
      if (r2.ok) {
        const j2 = await r2.json();
        cids = (j2?.IdentifierList?.CID) || [];
      }
    } catch (e2) {}
  }

  if (cids.length === 0) throw new Error('No compounds found');
  return cids;
}

async function fetchProps(cid) {
  const propsList = [
    'MolecularFormula','MolecularWeight','IUPACName','CanonicalSMILES','IsomericSMILES','InChI','InChIKey','ExactMass','XLogP','HBondDonorCount','HBondAcceptorCount','RotatableBondCount','TPSA'
  ];
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${propsList.join(',')}/JSON`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch properties');
  const j = await r.json();
  const p = j?.PropertyTable?.Properties?.[0] || {};
  return p;
}

async function fetchSDF3D(cid) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('3D record not available');
  const sdf = await r.text();
  if (!sdf || sdf.length < 50) throw new Error('Invalid SDF');
  return sdf;
}

function get2DTheme() {
  return els.drawerTheme?.value === 'dark' ? 'dark' : 'light';
}

function getDrawSize() {
  const w = Math.max(100, Math.min(2000, Number(els.svgWidth?.value || 500)));
  const h = Math.max(100, Math.min(2000, Number(els.svgHeight?.value || 350)));
  return { w, h };
}

function render2D(smiles) {
  return new Promise((resolve) => {
    els.twoDStatus.textContent = '';
    if (!smiles) {
      els.twoDStatus.textContent = 'No SMILES available for 2D rendering.';
      return resolve();
    }
    const { w, h } = getDrawSize();
    // Sync canvas size to controls
    if (els.canvas2d) { els.canvas2d.width = w; els.canvas2d.height = h; }

    const drawer = new SmilesDrawer.Drawer({ width: w, height: h, compactDrawing: true });
    SmilesDrawer.parse(smiles, (tree) => {
      drawer.draw(tree, els.canvas2d, get2DTheme(), false);
      resolve();
    }, (err) => {
      els.twoDStatus.textContent = '2D rendering failed: ' + err;
      resolve();
    });
  });
}

function init3DViewer() {
  const config = { backgroundColor: '0x0b1220' };
  const viewer = $3Dmol.createViewer(els.viewer3d, config);
  viewer.setBackgroundColor(0x0b1220);
  return viewer;
}

async function render3DFromSDF(sdf) {
  els.threeDStatus.textContent = '';
  const viewer = init3DViewer();
  try {
    viewer.addModel(sdf, 'sdf');
    viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
    viewer.zoomTo();
    viewer.render();
  } catch (e) {
    els.threeDStatus.textContent = '3D render failed: ' + e.message;
  }
}

function renderProps(p) {
  const items = [
    ['CID', current.cid],
    ['IUPAC Name', p.IUPACName],
    ['Formula', p.MolecularFormula],
    ['Molecular Weight', p.MolecularWeight],
    ['Exact Mass', p.ExactMass],
    ['Canonical SMILES', p.CanonicalSMILES],
    ['Isomeric SMILES', p.IsomericSMILES],
    ['InChI', p.InChI],
    ['InChIKey', p.InChIKey],
    ['XLogP', p.XLogP],
    ['H-bond donors', p.HBondDonorCount],
    ['H-bond acceptors', p.HBondAcceptorCount],
    ['Rotatable bonds', p.RotatableBondCount],
    ['Topological PSA', p.TPSA]
  ];
  els.props.innerHTML = items.map(([k,v]) => `
    <div class="label">${k}</div>
    <div>${v ?? '-'}</div>
  `).join('');
}

function summarizeLipophilicity(xlogp) {
  if (xlogp == null) return 'Lipophilicity unknown.';
  const x = Number(xlogp);
  if (Number.isNaN(x)) return 'Lipophilicity unknown.';
  if (x < 0) return `Very hydrophilic (XLogP ${x}).`;
  if (x < 1) return `Hydrophilic (XLogP ${x}).`;
  if (x < 3) return `Moderate lipophilicity (XLogP ${x}).`;
  if (x < 5) return `Lipophilic (XLogP ${x}).`;
  return `Highly lipophilic (XLogP ${x}).`;
}

function summarizeHBDHBA(d, a) {
  if (d == null || a == null) return '';
  return `H-bond donors: ${d}, acceptors: ${a}.`;
}

function summarizeRotatableBonds(n) {
  if (n == null) return '';
  const x = Number(n);
  if (Number.isNaN(x)) return '';
  let flex;
  if (x === 0) flex = 'rigid';
  else if (x <= 3) flex = 'low flexibility';
  else if (x <= 7) flex = 'moderate flexibility';
  else flex = 'high flexibility';
  return `Rotatable bonds: ${x} (${flex}).`;
}

function summarizePSA(tpsa) {
  if (tpsa == null) return '';
  const x = Number(tpsa);
  if (Number.isNaN(x)) return '';
  let permeability;
  if (x < 60) permeability = 'likely good passive permeability';
  else if (x < 140) permeability = 'moderate passive permeability';
  else permeability = 'limited passive permeability';
  return `Topological polar surface area: ${x} Å² (${permeability}).`;
}

function generateSummary(p) {
  const parts = [];
  if (p.IUPACName) parts.push(`${p.IUPACName} (${p.MolecularFormula ?? 'formula unknown'})`);
  else if (p.MolecularFormula) parts.push(`Formula: ${p.MolecularFormula}`);
  if (p.MolecularWeight) parts.push(`Molecular weight: ${Number(p.MolecularWeight).toFixed(2)} g/mol.`);
  if (p.XLogP != null) parts.push(summarizeLipophilicity(p.XLogP));
  parts.push(summarizeHBDHBA(p.HBondDonorCount, p.HBondAcceptorCount));
  parts.push(summarizeRotatableBonds(p.RotatableBondCount));
  parts.push(summarizePSA(p.TPSA));
  return parts.filter(Boolean).join(' ');
}

// Client-side fallback AI for offline mode
function generateAIAnswer(question, p) {
  const q = (question || '').toLowerCase();
  if (!q || /summary|summarize|overview|properties/.test(q)) {
    return generateSummary(p);
  }
  if (/formula/.test(q)) return `Molecular formula: ${p.MolecularFormula ?? 'unknown'}.`;
  if (/weight|mw|molecular weight/.test(q)) return `Molecular weight: ${p.MolecularWeight ?? 'unknown'} g/mol.`;
  if (/smiles/.test(q)) return `Canonical SMILES: ${p.CanonicalSMILES ?? 'unknown'}.`;
  if (/inchikey|inchi key|inchi/.test(q)) return `InChI: ${p.InChI ?? 'unknown'}  InChIKey: ${p.InChIKey ?? 'unknown'}.`;
  if (/lipophil|logp|hydrophil|hydrophobic/.test(q)) return summarizeLipophilicity(p.XLogP);
  if (/donor|acceptor|h[- ]?bond/.test(q)) return summarizeHBDHBA(p.HBondDonorCount, p.HBondAcceptorCount);
  if (/rotatable|flexib/.test(q)) return summarizeRotatableBonds(p.RotatableBondCount);
  if (/permeab|psa|polar surface/.test(q)) return summarizePSA(p.TPSA);

  return 'I can summarize properties, formula, MW, SMILES, InChI, lipophilicity (XLogP), H-bond donors/acceptors, rotatable bonds, and TPSA. Ask for a "summary" to begin.';
}

function updateAIStatusBadge() {
  if (!els.aiStatus) return;
  if (aiService.online) {
    els.aiStatus.textContent = `AI: Online (${aiService.model || 'Gemini'})`;
    els.aiStatus.classList.add('online');
    els.aiStatus.classList.remove('offline');
  } else {
    els.aiStatus.textContent = 'AI: Offline';
    els.aiStatus.classList.add('offline');
    els.aiStatus.classList.remove('online');
  }
}

async function checkAIStatus() {
  try {
    const r = await fetch('/api/ai/status');
    if (r.ok) {
      const j = await r.json();
      aiService.online = !!j.online;
      aiService.model = j.model || '';
    } else {
      aiService.online = false;
    }
  } catch (e) {
    aiService.online = false;
  } finally {
    aiService.checked = true;
    updateAIStatusBadge();
  }
}

function chatRender() {
  if (!els.chatMessages) return;
  els.chatMessages.innerHTML = '';
  chat.messages.forEach((m, idx) => {
    const wrap = document.createElement('div');
    wrap.className = `msg ${m.role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.text; // safe, no HTML injection

    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    const btnCopy = document.createElement('button');
    btnCopy.textContent = 'Copy';
    btnCopy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(m.text); } catch {}
    });
    actions.appendChild(btnCopy);

    const inner = document.createElement('div');
    inner.appendChild(bubble);
    inner.appendChild(actions);

    wrap.appendChild(inner);
    els.chatMessages.appendChild(wrap);
  });
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function chatAdd(role, text) {
  chat.messages.push({ role, text: String(text || ''), ts: Date.now() });
  chatRender();
}

function chatAddUser(text) { chatAdd('user', text); }
function chatAddAssistant(text) { chatAdd('assistant', text); }

function setTyping(on) {
  if (!els.typing) return;
  els.typing.hidden = !on;
}

async function askServerAIChat(question) {
  try {
    const history = chat.messages.slice(-14).map(m => ({ role: m.role, text: m.text }));
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question || 'Give a brief property summary.',
        history,
        properties: current.properties || {},
        smiles: current.smiles || null,
        cid: current.cid || null,
      })
    });
    if (!r.ok) throw new Error('AI request failed');
    const j = await r.json();
    return j.answer || 'No answer produced.';
  } catch (e) {
    console.warn('AI backend error:', e);
    return null;
  }
}

async function showCompoundByCID(cid) {
  current.cid = cid;
  current.properties = {};
  current.smiles = null;
  lastSVG = '';

  els.props.innerHTML = 'Loading properties...';
  els.twoDStatus.textContent = '';
  els.threeDStatus.textContent = '';
  els.svgContainer.hidden = true;
  els.svgContainer.innerHTML = '';

  try {
    const p = await fetchProps(cid);
    current.properties = p;
    current.smiles = p.CanonicalSMILES || p.IsomericSMILES || null;
    renderProps(p);
    await render2D(current.smiles);
  } catch (e) {
    els.props.innerHTML = 'Failed to load properties: ' + e.message;
  }

  try {
    const sdf = await fetchSDF3D(cid);
    await render3DFromSDF(sdf);
  } catch (e3d) {
    els.threeDStatus.textContent = '3D structure not available.';
    const viewer = $3Dmol.createViewer(els.viewer3d);
    viewer.render();
  }

  if (aiService.online) {
    setTyping(true);
    const ans = await askServerAIChat('Summarize key properties concisely.');
    setTyping(false);
    chatAddAssistant(ans || generateSummary(current.properties));
  } else {
    chatAddAssistant(generateSummary(current.properties));
  }
}

function showAlternativeCIDs(cids) {
  els.altResults.hidden = false;
  els.altResults.innerHTML = '';
  const count = cids.length;
  const title = document.createElement('div');
  title.textContent = `${count} matches found. Showing first; choose another CID:`;
  els.altResults.appendChild(title);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexWrap = 'wrap';
  list.style.gap = '6px';
  cids.slice(0, 20).forEach((cid) => {
    const btn = document.createElement('button');
    btn.textContent = `CID ${cid}`;
    btn.style.padding = '6px 10px';
    btn.style.border = '1px solid #334155';
    btn.style.borderRadius = '8px';
    btn.style.background = '#0b1220';
    btn.style.color = '#e2e8f0';
    btn.style.cursor = 'pointer';
    btn.onclick = () => showCompoundByCID(cid);
    list.appendChild(btn);
  });
  els.altResults.appendChild(list);
}

async function handleSearch() {
  const q = els.queryInput.value.trim();
  if (!q) return;
  try {
    const cids = await searchPubChem(q);
    if (cids.length > 1) showAlternativeCIDs(cids);
    await showCompoundByCID(cids[0]);
  } catch (e) {
    els.props.innerHTML = '';
    els.twoDStatus.textContent = '';
    els.threeDStatus.textContent = '';
    els.altResults.hidden = true;
    alert('Search failed: ' + e.message);
  }
}

function handleRenderSmiles() {
  const q = els.queryInput.value.trim();
  if (!q) return;
  if (!isLikelySmiles(q)) {
    alert('Input does not look like a SMILES string.');
    return;
  }
  current.cid = null;
  current.properties = { CanonicalSMILES: q };
  current.smiles = q;
  lastSVG = '';
  els.svgContainer.hidden = true;
  els.svgContainer.innerHTML = '';
  render2D(q);
  els.props.innerHTML = '<div class="label">Canonical SMILES</div><div>' + q + '</div>';
  els.threeDStatus.textContent = '3D not available for direct SMILES (search a known compound to fetch 3D).';
  const viewer = $3Dmol.createViewer(els.viewer3d);
  viewer.render();
  chatAddAssistant('Rendered SMILES. Ask about properties or search PubChem for full data.');
}

function setupDnD() {
  ['dragenter','dragover'].forEach(ev => {
    els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(ev => {
    els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.remove('dragover'); });
  });
  els.dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      render3DFromSDF(String(text));
      els.threeDStatus.textContent = 'Rendering dropped structure...';
    };
    reader.readAsText(file);
  });
}

function setup2DControls() {
  if (!els.drawerTheme) return;
  els.drawerTheme.addEventListener('change', () => { if (current.smiles) render2D(current.smiles); });
  const resize = () => { if (current.smiles) render2D(current.smiles); };
  els.svgWidth.addEventListener('change', resize);
  els.svgHeight.addEventListener('change', resize);
  els.btnPreviewSVG.addEventListener('click', previewSVG);
  els.btnDownloadSVG.addEventListener('click', downloadSVG);
  els.btnCopySVG.addEventListener('click', copySVG);
}

function maybeHandleSVGCommand(text) {
  const t = (text || '').toLowerCase();
  if (!/\bsvg\b/.test(t)) return false;
  if (!current.smiles) {
    chatAddAssistant('No molecule loaded. Search for a compound first to generate an SVG.');
    return true;
  }
  // Detect action
  let action = 'preview';
  if (/download/.test(t)) action = 'download';
  else if (/copy/.test(t)) action = 'copy';
  else if (/preview|show|display/.test(t)) action = 'preview';

  // Detect size like 800x600 or 800 × 600
  const size = t.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/i);
  if (size) {
    const w = Math.max(100, Math.min(2000, Number(size[1])));
    const h = Math.max(100, Math.min(2000, Number(size[2])));
    if (els.svgWidth) els.svgWidth.value = String(w);
    if (els.svgHeight) els.svgHeight.value = String(h);
  }

  // Detect theme
  if (/dark/.test(t) && els.drawerTheme) els.drawerTheme.value = 'dark';
  if (/light/.test(t) && els.drawerTheme) els.drawerTheme.value = 'light';

  // Execute
  if (action === 'download') {
    previewSVG().then(downloadSVG);
    chatAddAssistant('Generated and downloaded SVG.');
  } else if (action === 'copy') {
    previewSVG().then(copySVG);
    chatAddAssistant('Generated SVG and copied to clipboard.');
  } else {
    previewSVG();
    chatAddAssistant('SVG preview generated below. Use Download or Copy as needed.');
  }
  return true;
}

function setupChat() {
  if (!els.chatInput || !els.btnSend) return;
  const doSend = async () => {
    const text = els.chatInput.value.trim();
    if (!text) return;
    chatAddUser(text);
    els.chatInput.value = '';

    // Handle local commands for SVG on the client side
    if (maybeHandleSVGCommand(text)) return;

    if (aiService.online) {
      setTyping(true);
      const answer = await askServerAIChat(text);
      setTyping(false);
      chatAddAssistant(answer || 'No answer produced.');
    } else {
      const answer = generateAIAnswer(text, current.properties || {});
      chatAddAssistant(answer);
    }
  };

  els.btnSend.addEventListener('click', doSend);
  els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });
  if (els.btnClear) {
    els.btnClear.addEventListener('click', () => {
      chat.messages = [];
      chatRender();
    });
  }
}

async function previewSVG() {
  if (!current.smiles) {
    els.twoDStatus.textContent = 'No SMILES available to generate SVG.';
    return;
  }
  const { w, h } = getDrawSize();
  const theme = get2DTheme();
  lastSVG = await buildSVG(current.smiles, w, h, theme);
  if (lastSVG) {
    els.svgContainer.hidden = false;
    els.twoDStatus.textContent = 'SVG preview ready.';
  }
}

async function buildSVG(smiles, width, height, theme) {
  return new Promise((resolve) => {
    try {
      els.svgContainer.innerHTML = '';
      const drawer = new SmilesDrawer.SvgDrawer({ width, height, compactDrawing: true });
      SmilesDrawer.parse(smiles, (tree) => {
        drawer.draw(tree, 'svgContainer', theme, false);
        const svgEl = els.svgContainer.querySelector('svg');
        const svgStr = svgEl ? svgEl.outerHTML : els.svgContainer.innerHTML.trim();
        resolve(svgStr);
      }, (err) => {
        els.twoDStatus.textContent = 'SVG generation failed: ' + err;
        resolve('');
      });
    } catch (e) {
      els.twoDStatus.textContent = 'SVG generation failed: ' + (e?.message || e);
      resolve('');
    }
  });
}

async function downloadSVG() {
  if (!current.smiles) return;
  if (!lastSVG) await previewSVG();
  if (!lastSVG) return;
  const blob = new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = makeFileName('svg');
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

function makeFileName(ext) {
  const base = (current.properties?.IUPACName || current.properties?.InChIKey || (current.cid ? 'CID' + current.cid : 'molecule')).toString();
  const safe = base.replace(/[^A-Za-z0-9-_]+/g, '_').slice(0, 60) || 'molecule';
  return `${safe}.${ext}`;
}

async function copySVG() {
  if (!current.smiles) return;
  if (!lastSVG) await previewSVG();
  if (!lastSVG) return;
  try {
    await navigator.clipboard.writeText(lastSVG);
    els.twoDStatus.textContent = 'SVG copied to clipboard.';
  } catch (e) {
    els.twoDStatus.textContent = 'Clipboard copy failed.';
  }
}

async function main() {
  await checkAIStatus();
  els.btnSearch.addEventListener('click', handleSearch);
  els.btnRenderSmiles.addEventListener('click', handleRenderSmiles);
  els.queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
  setupDnD();
  setup2DControls();
  setupChat();
  if (!aiService.online) {
    chatAddAssistant('AI backend offline. Using built-in summaries. Configure GEMINI_API_KEY and run the server to enable AI.');
  } else {
    chatAddAssistant('Hello! I\'m ready to answer questions about the molecule you load.');
  }
}

main();
