/**
 * spark-guided-tour.js
 * Guided Tour injectable dans la page Team (index.html)
 * ─────────────────────────────────────────────────────
 * Usage : ajouter en bas de <body> dans index.html :
 *   <script src="spark-guided-tour.js"></script>
 *
 * Se déclenche si localStorage.spark_onboarding_done est absent.
 * Peut aussi être déclenché manuellement : SparkTour.start()
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     1. CSS injecté dynamiquement
  ══════════════════════════════════════════════ */
  const CSS = `
    /* ── overlay sombre global ── */
    #gt-overlay {
      position: fixed; inset: 0;
      z-index: 9990;
      pointer-events: none; /* toujours non-bloquant : le spotlight gère le visuel */
      background: transparent;
    }

    /* ── spotlight : élément mis en lumière ── */
    #gt-spotlight {
      position: fixed;
      z-index: 9995;
      border-radius: 10px;
      pointer-events: none;
      /* box-shadow géant = tout le reste s'assombrit */
      box-shadow: 0 0 0 9999px rgba(10, 20, 10, 0.78);
      transition: top .4s cubic-bezier(.4,0,.2,1),
                  left .4s cubic-bezier(.4,0,.2,1),
                  width .4s cubic-bezier(.4,0,.2,1),
                  height .4s cubic-bezier(.4,0,.2,1),
                  opacity .3s ease;
      outline: 2px solid rgba(122,182,72,.6);
      outline-offset: 2px;
    }
    #gt-spotlight.hidden { opacity: 0; box-shadow: none; }

    /* ── animation pulse sur le focus indicator ── */
    @keyframes gtSpotlightPulse {
      0%, 100% { outline-color: rgba(122,182,72,.5); outline-offset: 2px; }
      50%       { outline-color: rgba(122,182,72,1);  outline-offset: 6px; }
    }
    #gt-spotlight:not(.hidden) {
      animation: gtSpotlightPulse 2s ease-in-out infinite;
    }

    /* ── carte tooltip ── */
    #gt-card {
      position: fixed;
      z-index: 9998;
      width: min(340px, calc(100vw - 32px));
      background: white;
      border-radius: 18px;
      box-shadow: 0 16px 48px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.12);
      overflow: hidden;
      transition: top .4s cubic-bezier(.4,0,.2,1),
                  left .4s cubic-bezier(.4,0,.2,1),
                  opacity .25s ease;
      font-family: 'DM Sans', system-ui, sans-serif;
    }
    #gt-card.hidden { opacity: 0; pointer-events: none; }

    /* barre couleur en haut de la carte */
    #gt-card-bar {
      height: 4px;
      background: linear-gradient(90deg, #3d5c3a, #7ab648);
      transition: width .4s ease;
    }

    #gt-card-body { padding: 18px 20px 14px; }

    #gt-card-step {
      font-size: .58rem; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: #7ab648; margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    #gt-card-step-dots { display: flex; gap: 4px; }
    .gt-sdot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(44,58,40,.12);
    }
    .gt-sdot.done  { background: #7ab648; }
    .gt-sdot.cur   { background: #3d5c3a; width: 18px; border-radius: 3px; }

    #gt-card-ico { font-size: 1.8rem; margin-bottom: 8px; }
    #gt-card-ttl {
      font-family: 'Fraunces', serif; font-weight: 900;
      font-size: .95rem; color: #2c3a28; line-height: 1.25; margin-bottom: 6px;
    }
    #gt-card-desc {
      font-size: .72rem; color: #5a6b54; line-height: 1.6; margin-bottom: 14px;
    }
    #gt-card-desc code {
      font-family: 'Courier New', monospace;
      background: rgba(44,58,40,.07); border-radius: 4px;
      padding: 1px 5px; font-size: .68rem; color: #3d5c3a;
    }

    /* indicateur éco inline dans le tooltip */
    .gt-eco-row {
      display: flex; gap: 8px; align-items: center;
      background: rgba(122,182,72,.08);
      border: 1px solid rgba(122,182,72,.2);
      border-radius: 10px; padding: 6px 10px; margin-bottom: 12px;
    }
    .gt-eco-cell {
      display: flex; align-items: center; gap: 3px;
      font-size: .6rem; font-weight: 700; color: #2c3a28;
    }
    .gt-eco-sep { color: rgba(44,58,40,.2); }

    #gt-card-actions { display: flex; gap: 8px; }
    #gt-btn-skip {
      padding: 9px 14px;
      background: transparent;
      border: 1.5px solid rgba(44,58,40,.12);
      border-radius: 10px;
      font-size: .72rem; font-weight: 600; color: #8fa085;
      cursor: pointer; transition: background .2s;
      font-family: 'DM Sans', sans-serif;
    }
    #gt-btn-skip:hover { background: #faf7f2; }
    #gt-btn-next {
      flex: 1; padding: 10px 16px;
      background: #3d5c3a; border: none; border-radius: 10px;
      font-size: .78rem; font-weight: 700; color: white;
      cursor: pointer; transition: all .2s;
      font-family: 'DM Sans', sans-serif;
    }
    #gt-btn-next:hover { background: #5a7a5a; transform: translateY(-1px); }
    #gt-btn-next:disabled {
      opacity: .4; cursor: not-allowed; transform: none;
    }

    /* flèche tooltip pointant vers l'élément */
    #gt-arrow {
      position: fixed; z-index: 9997;
      width: 0; height: 0;
      pointer-events: none;
      transition: top .4s cubic-bezier(.4,0,.2,1),
                  left .4s cubic-bezier(.4,0,.2,1),
                  opacity .3s ease;
    }
    #gt-arrow.up::after {
      content: '';
      display: block;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-bottom: 10px solid white;
    }
    #gt-arrow.down::after {
      content: '';
      display: block;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 10px solid white;
    }
    #gt-arrow.hidden { opacity: 0; }

    /* éco stamp sous une bulle Team (dans l'interface réelle) */
    .gt-eco-stamp {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(122,182,72,.08);
      border: 1px solid rgba(122,182,72,.18);
      border-radius: 20px; padding: 3px 10px;
      margin-top: 4px; margin-left: 38px;
      animation: gtStampIn .4s ease-out;
    }
    @keyframes gtStampIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: none; }
    }
    .gt-eco-stamp .es-col {
      display: flex; align-items: center; gap: 3px;
      font-size: .58rem; font-weight: 700; color: #5a6b54;
      font-family: 'DM Sans', system-ui, sans-serif;
    }
    .gt-eco-stamp .es-tok { font-size: .54rem; font-weight: 600; color: #5a6b54; opacity: .6; font-family: 'DM Sans', system-ui, sans-serif; }
    .gt-eco-stamp .es-sep { color: rgba(44,58,40,.2); font-size: .75rem; }
    .gt-eco-stamp .es-src { font-size: .53rem; color: rgba(122,182,72,.7); text-decoration: none; margin-left: 2px; }
    .gt-eco-stamp .es-src:hover { color: #7ab648; }
  `;

  /* ══════════════════════════════════════════════
     2. EcoLogits — mistral-small-latest
        Méthodologie : https://ecologits.ai/latest/methodology/
  ══════════════════════════════════════════════ */
  const ECO_KWH_PER_TOKEN   = 2.16e-7;  // kWh/token (opérationnel + embodied, mix EU)
  const ECO_GWP_PER_KWH     = 418;      // gCO2eq/kWh — mix électrique européen
  const ECO_WATER_L_PER_KWH = 1.845;    // L/kWh — refroidissement datacenter
  const ECO_CAR_GCO2_PER_KM = 170;      // gCO2eq/km — voiture moyenne EU
  // Dérivés pour chip cumulatif
  const WH = ECO_KWH_PER_TOKEN * 1000;
  const ML = ECO_KWH_PER_TOKEN * ECO_WATER_L_PER_KWH * 1000;
  function tokens(txt) { return Math.max(10, Math.ceil(txt.length / 3.5) + 15); }
  function ecoCalc(tok) {
    const kwh = tok * ECO_KWH_PER_TOKEN;
    return { tok, wh: kwh*1000, co2: kwh*ECO_GWP_PER_KWH, ml: kwh*ECO_WATER_L_PER_KWH*1000,
             car_m: kwh * ECO_GWP_PER_KWH / ECO_CAR_GCO2_PER_KM * 1000 };
  }
  function fWh(v)  { return v < 1 ? (v*1000).toFixed(1)+' mWh' : v.toFixed(2)+' Wh'; }
  function fMl(v)  { return v.toFixed(2)+' ml'; }
  function fCo2(v) { return v < 1e-3 ? (v*1e3).toFixed(1)+' µgCO₂eq' : v.toFixed(3)+' gCO₂eq'; }
  function fCar(m) { return m < 1 ? (m*100).toFixed(0)+' cm' : m.toFixed(1)+' m'; }

  /* ══════════════════════════════════════════════
     3. Définition des étapes
     targetId : ID ou sélecteur CSS de l'élément à spotlight
     pos      : position du tooltip ('bottom' | 'top' | 'right' | 'center')
     locked   : si vrai, le bouton Suivant est désactivé jusqu'à action
  ══════════════════════════════════════════════ */
  const STEPS = [
    {
      id: 'welcome',
      ico: '👋',
      ttl: 'Bienvenue dans Spark !',
      desc: 'En 4 étapes, tu vas découvrir les outils de Spark — en les testant toi-même, maintenant, sur la vraie interface.',
      target: null,        // pas de spotlight → carte centrée
      pos: 'center',
      btnLabel: 'Commencer le tour →',
    },
    {
      id: 'chat',
      ico: '✨',
      ttl: 'Parle à SPARK',
      desc: 'Voici le chat. <strong>Envoie un premier message</strong> à SPARK pour lui décrire ton projet — il te répond en quelques secondes.',
      target: '.input-row',
      pos: 'top',
      locked: true,
      btnLabel: 'Continuer →',
    },
    {
      id: 'eco',
      ico: '⚡',
      ttl: 'Chaque message a un coût',
      desc: 'SPARK vient de répondre. Le badge sous sa bulle montre les ressources de <em>cet échange</em>, calculées avec <a href="https://ecologits.ai/latest/" target="_blank" style="color:#7ab648">EcoLogits</a> : énergie (mWh) · 🌍 CO₂ émis · équivalent en voiture 🚗. La pastille verte en haut cumule ta session.',
      target: '.gt-eco-stamp',
      pos: 'top',
      btnLabel: 'Continuer →',
    },
    {
      id: 'steps',
      ico: '🗺️',
      ttl: 'Ton parcours en 6 étapes',
      desc: 'Ces étapes guident ton projet du début (<em>Découvrir</em>) jusqu\'au pitch final. Chaque étape se débloque en avançant.',
      target: '.steps-sidebar',
      pos: 'right',
      btnLabel: 'Continuer →',
    },
    {
      id: 'mentor',
      ico: '🧑‍🏫',
      ttl: 'Ton canal mentor',
      desc: 'Clique ici pour contacter ton mentor. Il peut répondre à tes questions <em>et</em> commenter ta vitrine directement.',
      target: '#btn-eleve-canal-mentor',
      pos: 'bottom',
      btnLabel: 'Continuer →',
    },
    {
      id: 'vitrine',
      ico: '🖼️',
      ttl: 'Ta vitrine de projet',
      desc: 'Clique sur <strong>Carnet</strong> pour accéder à ta vitrine. À chaque checkpoint, <strong>SPARK génère automatiquement ta page HTML</strong> — tu peux la modifier en direct. Le menu éco dans le Carnet cumule l’impact de toutes tes sessions.',
      target: '#btn-carnet',
      pos: 'bottom',
      btnLabel: 'Continuer →',
    },
    {      id: 'carnet',
      ico: '📓',
      ttl: 'Ta vitrine HTML en direct',
      desc: '',
      target: '#carnet-drawer,#mockup-carnet-preview',
      pos: 'right',
      onEnter() { setTimeout(_openCarnet, 100); },
      onLeave() { _closeCarnet(); },
      subSteps: [
        {
          ico: '👀',
          ttl: 'L\'aperçu en direct',
          desc: 'À gauche : l\'<strong>aperçu live</strong> de ta vitrine. SPARK la génère automatiquement à chaque checkpoint — c\'est une vraie page web rendue dans le navigateur.',
          target: '#vitrine-rendu,#mockup-vitrine-rendu',
          pos: 'right',
          btnLabel: 'Suivant →',
        },
        {
          ico: '💻',
          ttl: 'Le code HTML',
          desc: 'À droite : le <strong>code HTML source</strong> écrit par SPARK. Tu peux le modifier directement et cliquer sur <em>Sauvegarder</em> — ou demander à SPARK de le faire.',
          target: '.carnet-col-code',
          pos: 'left',
          btnLabel: 'Suivant →',
        },
        {
          ico: '✏️',
          ttl: 'À toi de jouer !',
          desc: `Dans le code ci-contre, modifie :<br><strong style="color:#3d5c3a">1.</strong> Le texte entre <code>&lt;h1&gt;</code> et <code>&lt;/h1&gt;</code> — tape le nom de ton projet.<br><strong style="color:#3d5c3a">2.</strong> La couleur <code>#7ab648</code> → remplace-la par un de ces codes :<div id="gt-exo-colors" style="display:flex;flex-wrap:wrap;gap:4px;margin:7px 0 4px;"></div><div id="gt-exo-status" style="font-size:.6rem;margin-top:2px;"></div>`,
          target: '#mockup-carnet-code,#carnet-code-edit',
          pos: 'left',
          btnLabel: 'Valider ✓',
          interactiveExo: true,
        },
        {
          ico: '✅',
          ttl: 'Bravo, c\'est ta vitrine !',
          desc: 'L\'aperçu s\'est mis à jour en temps réel pendant que tu tapais. Dans la vraie app, clique sur <strong>💾 Sauvegarder</strong> pour publier ta vitrine pour ton mentor.',
          target: '#vitrine-rendu,#mockup-vitrine-rendu',
          pos: 'right',
          btnLabel: 'Super, continuer →',
        },
      ],
    },
    {      id: 'done',
      ico: '🚀',
      ttl: 'Tu as tout ce qu\'il faut !',
      desc: 'SPARK, ta vitrine (dans le Carnet) et tes mentors sont prêts. L’étape 0 — <em>Découvrir</em> — t’attend !',
      target: null,
      pos: 'center',
      btnLabel: 'C\'est parti ! 🌱',
    },
  ];

  /* ══════════════════════════════════════════════
     4. État du tour
  ══════════════════════════════════════════════ */
  let cur = 0;
  let chatSent = false;      // déverrouillé dès qu'un message est envoyé
  let ecoStampEl = null;     // référence au stamp éco créé
  let curSub = 0;            // sous-étape active (étapes avec subSteps)
  let _exoWatchEl = null;    // élément surveillé pour l'exercice interactif
  let _exoWatchFn = null;    // listener correspondant

  // ── Helpers dual-context (index.html + mockup) ──────────────────────────────
  // Essaie le vrai ID (index.html) d'abord, puis le fallback (mockup)
  function _el(realId, mockupId) { return document.getElementById(realId) || document.getElementById(mockupId); }
  function _openCarnet()  {
    if (typeof ouvrirCarnet === 'function') { ouvrirCarnet(); }
    else { const d = document.getElementById('mockup-carnet'); if (d) d.classList.add('open'); }
    // Élever le carnet au-dessus de l'overlay du tour (9990) mais sous la carte (9998)
    const drawer  = document.getElementById('carnet-drawer');
    const overlay = document.getElementById('carnet-overlay');
    if (drawer)  { drawer._gtOldZ  = drawer.style.zIndex;  drawer.style.zIndex  = '9993'; }
    if (overlay) { overlay._gtOldZ = overlay.style.zIndex; overlay.style.zIndex = '9992';
                   overlay.style.pointerEvents = 'none'; } // ne pas bloquer le tour
  }
  function _closeCarnet() {
    // Remettre les z-index d'origine
    const drawer  = document.getElementById('carnet-drawer');
    const overlay = document.getElementById('carnet-overlay');
    if (drawer)  { drawer.style.zIndex  = drawer._gtOldZ  || ''; }
    if (overlay) { overlay.style.zIndex = overlay._gtOldZ || ''; overlay.style.pointerEvents = ''; }
    if (typeof fermerCarnet === 'function') { fermerCarnet(); }
    else { const d = document.getElementById('mockup-carnet'); if (d) d.classList.remove('open'); }
  }
  function _carnetCodeEl()    { return _el('carnet-code-edit', 'mockup-carnet-code');  }
  function _carnetPreviewEl() { return _el('vitrine-rendu',    'mockup-vitrine-rendu'); }
  function _carnetWrapEl()    { return _el('carnet-drawer',    'mockup-carnet');        }

  /* Palette de couleurs pour l'exercice */
  const EXO_COLORS = [
    { hex: '#ef4444', nom: 'Rouge'     },
    { hex: '#f97316', nom: 'Orange'    },
    { hex: '#3b82f6', nom: 'Bleu'      },
    { hex: '#8b5cf6', nom: 'Violet'    },
    { hex: '#ec4899', nom: 'Rose'      },
    { hex: '#f59e0b', nom: 'Jaune'     },
  ];

  function _cleanExoWatcher() {
    if (_exoWatchEl && _exoWatchFn) {
      _exoWatchEl.removeEventListener('input', _exoWatchFn);
    }
    _exoWatchEl = null;
    _exoWatchFn = null;
  }

  function _checkExoDone(val) {
    const h1Match = val.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1Text  = (h1Match ? h1Match[1] : '').replace(/<[^>]+>/g, '').trim();
    const h1Changed    = h1Text.length > 0 && !h1Text.includes('ForestGuard');
    const colorChanged = !val.toLowerCase().includes('#7ab648');
    return { h1Changed, colorChanged, done: h1Changed && colorChanged };
  }

  function _buildExoColors() {
    const wrap = document.getElementById('gt-exo-colors');
    if (!wrap || wrap.children.length > 0) return;
    EXO_COLORS.forEach(c => {
      const chip = document.createElement('span');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:10px;background:rgba(44,58,40,.06);border:1px solid rgba(44,58,40,.14);cursor:pointer;font-family:monospace;font-size:.62rem;color:#2c3a28;transition:all .15s;user-select:none;';
      chip.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${c.hex};display:inline-block;flex-shrink:0;border:1px solid rgba(0,0,0,.12)"></span>${c.hex}`;
      chip.title = `${c.nom} — cliquer pour copier`;
      chip.addEventListener('mouseenter', () => chip.style.background = 'rgba(44,58,40,.14)');
      chip.addEventListener('mouseleave', () => chip.style.background = 'rgba(44,58,40,.06)');
      chip.addEventListener('click', () => {
        navigator.clipboard?.writeText(c.hex).catch(() => {});
        chip.style.cssText += ';background:rgba(122,182,72,.18);border-color:rgba(122,182,72,.45);';
        setTimeout(() => { chip.style.background = 'rgba(44,58,40,.06)'; chip.style.borderColor = 'rgba(44,58,40,.14)'; }, 1200);
      });
      wrap.appendChild(chip);
    });
  }

  function _updateExoStatus() {
    const ta = _carnetCodeEl();
    const statusEl = document.getElementById('gt-exo-status');
    if (!ta || !statusEl) return;
    const { h1Changed, colorChanged, done } = _checkExoDone(ta.value);
    statusEl.innerHTML =
      `<span style="color:${h1Changed ? '#7ab648' : '#ccc'}">${h1Changed ? '✓' : '○'} Titre modifié</span>` +
      `<span style="margin-left:10px;color:${colorChanged ? '#7ab648' : '#ccc'}">${colorChanged ? '✓' : '○'} Couleur changée</span>`;
    const btn = document.getElementById('gt-btn-next');
    if (btn) btn.disabled = !done;
  }

  function _startInteractiveExo() {
    _buildExoColors();
    _updateExoStatus();
    const ta = _carnetCodeEl();
    if (!ta) return;
    _cleanExoWatcher();
    _exoWatchEl = ta;
    _exoWatchFn = () => {
      const iframe = _carnetPreviewEl();
      if (iframe) iframe.srcdoc = ta.value;
      _updateExoStatus();
    };
    ta.addEventListener('input', _exoWatchFn);
  }

  /* ══════════════════════════════════════════════
     5. Construction du DOM
  ══════════════════════════════════════════════ */
  function buildDOM() {
    // CSS
    const style = document.createElement('style');
    style.id = 'gt-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    // Overlay sombre
    const ov = document.createElement('div');
    ov.id = 'gt-overlay';
    document.body.appendChild(ov);

    // Spotlight
    const sp = document.createElement('div');
    sp.id = 'gt-spotlight';
    sp.classList.add('hidden');
    document.body.appendChild(sp);

    // Flèche
    const arr = document.createElement('div');
    arr.id = 'gt-arrow';
    arr.classList.add('hidden');
    document.body.appendChild(arr);

    // Carte tooltip
    const card = document.createElement('div');
    card.id = 'gt-card';
    card.innerHTML = `
      <div id="gt-card-bar" style="width:16%"></div>
      <div id="gt-card-body">
        <div id="gt-card-step">
          <span id="gt-card-step-lbl">Étape 1 / ${STEPS.length - 1}</span>
          <div id="gt-card-step-dots"></div>
        </div>
        <div id="gt-card-ico">👋</div>
        <div id="gt-card-ttl"></div>
        <div id="gt-card-desc"></div>
        <div id="gt-card-actions">
          <button id="gt-btn-skip" onclick="SparkTour.skip()">Passer</button>
          <button id="gt-btn-next" onclick="SparkTour.next()">Suivant →</button>
        </div>
      </div>`;
    document.body.appendChild(card);
  }

  /* ══════════════════════════════════════════════
     6. Affichage d'une étape
  ══════════════════════════════════════════════ */
  function showStep(idx) {
    const step = STEPS[idx];
    if (!step) return;

    // ── Si l'étape a des sous-étapes : ouvrir d'abord, puis déléguer ──
    if (step.subSteps) {
      if (step.onEnter) step.onEnter();
      // Attendre la fin de l'animation du tiroir (400ms) avant de positionner
      setTimeout(() => showSubStep(idx, 0), 460);
      return;
    }

    const TOTAL_REAL = STEPS.length - 2; // sans welcome ni done

    // ── Remplir la carte ──
    document.getElementById('gt-card-ico').textContent  = step.ico;
    document.getElementById('gt-card-ttl').textContent  = step.ttl;
    document.getElementById('gt-card-desc').innerHTML   = step.desc;
    document.getElementById('gt-btn-next').innerHTML    = step.btnLabel || 'Suivant →';
    document.getElementById('gt-btn-next').disabled     = !!step.locked;

    // Barre de progression
    const pct = Math.round(((idx) / (STEPS.length - 1)) * 100);
    document.getElementById('gt-card-bar').style.width  = pct + '%';

    // Label + dots
    const isWelcome = step.id === 'welcome';
    const isDone    = step.id === 'done';
    const stepEl    = document.getElementById('gt-card-step');
    const dotsEl    = document.getElementById('gt-card-step-dots');
    if (isWelcome || isDone) {
      stepEl.style.display = 'none';
    } else {
      stepEl.style.display = 'flex';
      const realIdx = idx - 1; // idx 0 = welcome, skip it
      document.getElementById('gt-card-step-lbl').textContent = `Étape ${realIdx} / ${TOTAL_REAL}`;
      dotsEl.innerHTML = '';
      for (let i = 1; i <= TOTAL_REAL; i++) {
        const d = document.createElement('div');
        d.className = 'gt-sdot' + (i < realIdx ? ' done' : i === realIdx ? ' cur' : '');
        dotsEl.appendChild(d);
      }
    }

    // ── Position ──
    if (!step.target || step.pos === 'center') {
      positionCenter();
    } else {
      const el = document.querySelector(step.target);
      if (el) {
        positionAround(el, step.pos);
      } else {
        positionCenter();
      }
    }

    // Callback d'entrée pour les étapes sans subSteps
    if (step.onEnter) step.onEnter();
  }

  /* ── sous-étape (étapes avec subSteps) ── */
  function showSubStep(stepIdx, subIdx) {
    _cleanExoWatcher(); // nettoyer le watcher de l'éventuelle étape précédente

    const step      = STEPS[stepIdx];
    const sub       = step.subSteps[subIdx];
    const TOTAL_SUBS = step.subSteps.length;

    // ── Remplir la carte ──
    document.getElementById('gt-card-ico').textContent = sub.ico || step.ico;
    document.getElementById('gt-card-ttl').textContent = sub.ttl;
    document.getElementById('gt-card-desc').innerHTML  = sub.desc;
    document.getElementById('gt-btn-next').innerHTML   = sub.btnLabel || 'Suivant →';
    document.getElementById('gt-btn-next').disabled    = !!sub.interactiveExo; // bloqué jusqu'à exercice terminé

    // Barre de progression interpolée
    const pct = Math.round(((stepIdx + subIdx / TOTAL_SUBS) / (STEPS.length - 1)) * 100);
    document.getElementById('gt-card-bar').style.width = pct + '%';

    // Label + dots de sous-étape
    const stepEl = document.getElementById('gt-card-step');
    const dotsEl = document.getElementById('gt-card-step-dots');
    stepEl.style.display  = 'flex';
    document.getElementById('gt-card-step-lbl').textContent =
      `📓 Carnet ${subIdx + 1}/${TOTAL_SUBS}`;
    dotsEl.innerHTML = '';
    for (let i = 0; i < TOTAL_SUBS; i++) {
      const d = document.createElement('div');
      d.className = 'gt-sdot' + (i < subIdx ? ' done' : i === subIdx ? ' cur' : '');
      dotsEl.appendChild(d);
    }

    // ── Position ──
    const target = sub.target;
    const pos    = sub.pos || 'top';
    const _doPosition = () => {
      if (!target || pos === 'center') {
        positionCenter();
      } else {
        const el = document.querySelector(target);
        if (el) positionAround(el, pos); else positionCenter();
      }
    };
    // Sous-étape 0 du carnet : le drawer vient juste de s'ouvrir,
    // attendre que l'animation (400ms) soit terminée avant de mesurer les coordonnées
    if (subIdx === 0) { setTimeout(_doPosition, 420); } else { _doPosition(); }

    if (sub.onEnter) sub.onEnter();

    // ── Exercice interactif ──
    if (sub.interactiveExo) _startInteractiveExo();
  }

  /* ── centrage (bienvenue / fin) ── */
  function positionCenter() {
    const sp = document.getElementById('gt-spotlight');
    const arr = document.getElementById('gt-arrow');
    const card = document.getElementById('gt-card');

    sp.classList.add('hidden');
    arr.classList.add('hidden');

    // carte centrée
    card.classList.remove('hidden');
    card.style.top  = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  /* ── spotlight sur un élément ── */
  function positionAround(el, pos) {
    const PAD = 8;
    const r   = el.getBoundingClientRect();
    const sp  = document.getElementById('gt-spotlight');
    const arr = document.getElementById('gt-arrow');
    const card = document.getElementById('gt-card');

    // Spotlight
    sp.classList.remove('hidden');
    sp.style.top    = (r.top    - PAD) + 'px';
    sp.style.left   = (r.left   - PAD) + 'px';
    sp.style.width  = (r.width  + PAD*2) + 'px';
    sp.style.height = (r.height + PAD*2) + 'px';

    // Carte + flèche
    card.classList.remove('hidden');
    card.style.transform = 'none';
    const cardW = Math.min(340, window.innerWidth - 32);
    const MARGIN = 14;

    if (pos === 'top') {
      // Carte au-dessus de l'élément
      const cardH = 240; // estimation
      let top = r.top - PAD - MARGIN - cardH;
      if (top < 16) top = r.bottom + PAD + MARGIN + 10;
      let left = r.left + r.width / 2 - cardW / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16));
      card.style.top  = top + 'px';
      card.style.left = left + 'px';
      // Flèche pointant vers le bas (vers l'élément)
      arr.className = 'down';
      arr.style.top  = (top + cardH - 4) + 'px';
      arr.style.left = (left + cardW / 2 - 9) + 'px';
    } else if (pos === 'bottom') {
      let top  = r.bottom + PAD + MARGIN + 10;
      let left = r.left + r.width / 2 - cardW / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16));
      card.style.top  = top + 'px';
      card.style.left = left + 'px';
      arr.className = 'up';
      arr.style.top  = (top - 10) + 'px';
      arr.style.left = (left + cardW / 2 - 9) + 'px';
    } else if (pos === 'right') {
      let left = r.right + PAD + MARGIN + 10;
      if (left + cardW + 16 > window.innerWidth) {
        left = r.left - PAD - MARGIN - cardW - 10;
      }
      let top = r.top + r.height / 2 - 100;
      top = Math.max(16, Math.min(top, window.innerHeight - 260));
      card.style.top  = top + 'px';
      card.style.left = left + 'px';
      arr.classList.add('hidden');
      return; // pas de flèche
    } else if (pos === 'left') {
      let left = r.left - PAD - MARGIN - cardW - 10;
      if (left < 16) left = r.right + PAD + MARGIN + 10;
      let top = r.top + r.height / 2 - 100;
      top = Math.max(16, Math.min(top, window.innerHeight - 260));
      card.style.top  = top + 'px';
      card.style.left = left + 'px';
      arr.classList.add('hidden');
      return; // pas de flèche
    }

    arr.classList.remove('hidden');
  }

  /* ══════════════════════════════════════════════
     7. Éco stamp — injecte le badge sous la bulle Team
  ══════════════════════════════════════════════ */
  function injectEcoStamp(userTxt, replyTxt) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return null;
    const t = tokens(userTxt) + tokens(replyTxt);
    const stamp = document.createElement('div');
    stamp.className = 'gt-eco-stamp';
    const e = ecoCalc(t);
    stamp.innerHTML = `
      <span class="es-col">⚡ <strong>${fWh(e.wh)}</strong></span>
      <span class="es-sep">·</span>
      <span class="es-col">🌍 <strong>${fCo2(e.co2)}</strong></span>
      <span class="es-sep">·</span>
      <span class="es-col">🚗 <strong>${fCar(e.car_m)}</strong></span>
      <a class="es-src" href="https://ecologits.ai/latest/" target="_blank">EcoLogits ↗</a>`;
    msgs.appendChild(stamp);
    msgs.scrollTop = msgs.scrollHeight;
    return stamp;
  }

  /* ══════════════════════════════════════════════
     8. Intercepter l'envoi du message (étape chat)
  ══════════════════════════════════════════════ */
  function hookChatSend() {
    // On observe le DOM pour détecter l'apparition d'une bulle .spark-msg
    // après la bulle .eleve-msg (= quand Team répond)
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;

    const observer = new MutationObserver(() => {
      if (chatSent) return;
      const allMsgs = msgs.querySelectorAll('.msg');
      // On cherche une bulle élève ET une bulle Team après elle
      let hasUser = false, hasTeamAfter = false;
      allMsgs.forEach(m => {
        if (m.classList.contains('eleve-msg')) hasUser = true;
        if (hasUser && m.classList.contains('spark-msg') && !m.querySelector('.typing-bubble')) {
          hasTeamAfter = true;
        }
      });
      if (hasUser && hasTeamAfter) {
        chatSent = true;
        observer.disconnect();
        // Attendre 150ms que _simulateTeamReply ait le temps d'ajouter son stamp
        setTimeout(() => {
          const lastUserEl2 = [...msgs.querySelectorAll('.msg')].reverse().find(m => m.classList.contains('eleve-msg'));
          const allChildren2 = Array.from(msgs.children);
          const userChildIdx2 = allChildren2.indexOf(lastUserEl2);
          const stampsAfterUser2 = userChildIdx2 >= 0
            ? allChildren2.slice(userChildIdx2 + 1).filter(el => el.classList.contains('gt-eco-stamp'))
            : [];

          if (stampsAfterUser2.length > 0) {
            // _simulateTeamReply a déjà injecté le stamp → on le réutilise
            ecoStampEl = stampsAfterUser2[stampsAfterUser2.length - 1];
          } else {
            // Aucun stamp (app réelle sans stamp natif) → on l'injecte
            const allMsgs2 = msgs.querySelectorAll('.msg');
            const lastTeam2 = [...allMsgs2].reverse().find(m =>
              m.classList.contains('spark-msg') && !m.querySelector('.typing-bubble')
            );
            const uTxt = lastUserEl2?.querySelector('.msg-bubble')?.textContent || '';
            const tTxt = lastTeam2?.querySelector('.msg-bubble')?.textContent || '';
            ecoStampEl = injectEcoStamp(uTxt, tTxt);
          }
          // Débloquer le bouton Suivant
          document.getElementById('gt-btn-next').disabled = false;
          // Mettre à jour la position si on est encore sur l'étape chat
          if (STEPS[cur].id === 'chat') {
            const inputRow = document.querySelector('.input-row');
            if (inputRow) positionAround(inputRow, 'top');
          }
        }, 150);
      }
    });
    observer.observe(msgs, { childList: true, subtree: true });
  }

  /* ══════════════════════════════════════════════
     9. API publique
  ══════════════════════════════════════════════ */
  window.SparkTour = {

    start() {
      if (document.getElementById('gt-overlay')) return; // déjà lancé
      buildDOM();
      cur    = 0;
      curSub = 0;
      chatSent = false;
      hookChatSend();
      showStep(cur);
    },

    next() {
      const step = STEPS[cur];
      // étape finale → fermer
      if (step.id === 'done') {
        SparkTour.finish();
        return;
      }

      // ── Gestion des sous-étapes ──
      if (step.subSteps) {
        const sub = step.subSteps[curSub];

          curSub++;
        if (curSub < step.subSteps.length) {
          showSubStep(cur, curSub);
          return;
        }
        // Fin des sous-étapes → passer à l'étape suivante
        if (step.onLeave) step.onLeave();
        curSub = 0;
        cur++;
        showStep(cur);
        return;
      }

      // Callback de sortie de l'étape courante
      if (step.onLeave) step.onLeave();
      // Avancer
      cur++;
      // Si c'est l'étape éco et que le stamp n'existe pas encore → sauter
      if (STEPS[cur] && STEPS[cur].id === 'eco' && !ecoStampEl) {
        cur++;
      }
      showStep(cur);
    },

    skip() {
      SparkTour.finish();
    },

    finish() {
      _cleanExoWatcher();
      try { localStorage.setItem('spark_onboarding_done', '1'); } catch(e) {}
      // Callback de sortie de l'étape courante si besoin
      if (STEPS[cur] && STEPS[cur].onLeave) STEPS[cur].onLeave();
      curSub = 0;
      ['gt-overlay','gt-spotlight','gt-arrow','gt-card','gt-styles'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      // Re-armer le watcher : si le FAC reset plus tard, le tour se relancera
      setTimeout(watchForFacReset, 1000);
    },
  };

  /* ══════════════════════════════════════════════
     10. Détection conversation vide (reset FAC / première connexion)
         → force le tour même si spark_onboarding_done est en localStorage
  ══════════════════════════════════════════════ */

  /**
   * Vérifie si la conversation est vide (aucun message élève).
   * Appelé après un délai pour laisser loadConversation() + sparkGreet() s'exécuter.
   * Si vide = reset FAC ou première fois → effacer le flag et lancer le tour.
   */
  function _checkConvEmpty() {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    // On attend que sparkGreet (bulle d'accueil) soit rendue
    const userMsgs = msgs.querySelectorAll('.eleve-msg');
    if (userMsgs.length === 0) {
      // Aucun message élève = conversation fraîche
      try { localStorage.removeItem('spark_onboarding_done'); } catch (e) {}
      if (!document.getElementById('gt-overlay')) {
        SparkTour.start();
      }
    }
  }

  /**
   * Surveille #chat-messages en temps réel.
   * Si le FAC supprime la conversation pendant la session, tous les .eleve-msg
   * disparaissent → on relance le tour automatiquement.
   */
  function watchForFacReset() {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;

    let debounce = null;
    const obs = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (document.getElementById('gt-overlay')) return; // tour déjà en cours
        const userMsgs = msgs.querySelectorAll('.eleve-msg');
        if (userMsgs.length === 0) {
          obs.disconnect();
          try { localStorage.removeItem('spark_onboarding_done'); } catch (e) {}
          setTimeout(SparkTour.start, 800);
        }
      }, 600);
    });
    obs.observe(msgs, { childList: true, subtree: false });
  }

  /* ══════════════════════════════════════════════
     11. Auto-lancement
         — attend que #s-eleve soit visible
  ══════════════════════════════════════════════ */
  function waitAndLaunch() {
    const sEleve = document.getElementById('s-eleve');
    const isVisible = sEleve && (sEleve.classList.contains('on') || getComputedStyle(sEleve).display !== 'none');

    if (isVisible) {
      _doLaunch();
      return;
    }

    // Observer jusqu'à ce que s-eleve devienne visible
    if (!sEleve) return;
    const obs = new MutationObserver(() => {
      if (sEleve.classList.contains('on') || getComputedStyle(sEleve).display !== 'none') {
        obs.disconnect();
        setTimeout(_doLaunch, 400);
      }
    });
    obs.observe(sEleve, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  function _doLaunch() {
    let onboardingDone = false;
    try { onboardingDone = !!localStorage.getItem('spark_onboarding_done'); } catch (e) {}

    if (!onboardingDone) {
      // Première fois ou localStorage effacé → lancer directement
      SparkTour.start();
    } else {
      // Tour déjà fait → vérifier quand même si conv est vide (reset FAC)
      // On attend 1500ms pour que loadConversation() + sparkGreet() soient rendus
      setTimeout(_checkConvEmpty, 1500);
    }
    // Dans tous les cas, surveiller les resets FAC futurs
    setTimeout(watchForFacReset, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndLaunch);
  } else {
    waitAndLaunch();
  }

})();
