/**
 * SPARK ⚡ — Indicateur de qualité prompting v2
 * ─────────────────────────────────────────────
 * Scoring DIFFÉRENCIÉ par étape du parcours.
 * Étape 0 : non évaluée (onboarding).
 * Étapes 1–5 : critères adaptés aux activités réelles.
 *
 * INTÉGRATION :
 *  1. CSS → dans <style>
 *  2. JS  → dans <script> avant </script>
 *  3. Dans renderFacEquipes(), après grid.appendChild(card) :
 *       attachPromptingScore(card, eq.id);
 */

// ════════════════════════════════════════════════════════════
// CSS — coller dans <style>
// ════════════════════════════════════════════════════════════
/*

.pq-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px 10px;
  border-top: 1px solid var(--border);
  position: relative;
  cursor: default;
}

.pq-label {
  font-size: .55rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--light);
  white-space: nowrap;
  flex-shrink: 0;
}

// Étoiles
.pq-stars { display: flex; gap: 2px; align-items: center; }
.pq-star  { font-size: .85rem; line-height: 1; transition: transform .15s; }
.pq-star.filled { filter: none; }
.pq-star.empty  { opacity: .18; filter: grayscale(1); }
.pq-star.half   { opacity: .55; }

.pq-score-txt {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: .68rem;
  margin-left: 2px;
  white-space: nowrap;
}

// Badge niveau
.pq-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 20px;
  font-family: 'Syne', sans-serif;
  font-size: .56rem;
  font-weight: 800;
  letter-spacing: .4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.pq-badge.lvl-0,.pq-badge.lvl-1 { background:rgba(212,105,74,.1); color:var(--terra); border:1px solid rgba(212,105,74,.25); }
.pq-badge.lvl-2,.pq-badge.lvl-3 { background:rgba(240,192,64,.1);  color:#b38b00;      border:1px solid rgba(240,192,64,.3);  }
.pq-badge.lvl-4,.pq-badge.lvl-5 { background:rgba(0,212,160,.1);   color:#009978;      border:1px solid rgba(0,212,160,.25);  }

// Badge étape 0
.pq-badge.onboarding {
  background: rgba(0,0,0,.04);
  color: var(--light);
  border: 1px solid var(--border);
}

// Sparkline progression par étape
.pq-sparkline {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 16px;
  margin-left: 4px;
}
.pq-spark-bar {
  width: 5px;
  border-radius: 2px 2px 0 0;
  background: var(--border);
  transition: height .3s ease, background .3s;
  min-height: 2px;
}
.pq-spark-bar.s-low  { background: var(--terra); }
.pq-spark-bar.s-mid  { background: var(--sun);   }
.pq-spark-bar.s-high { background: var(--moss);  }
.pq-spark-bar.s-na   { background: var(--border); opacity: .4; }

// Tooltip
.pq-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 10px;
  width: 250px;
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
  padding: 13px 15px;
  z-index: 500;
  animation: pqTtIn .18s ease-out;
  pointer-events: none;
}
@keyframes pqTtIn {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:none; }
}
.pq-wrap:hover .pq-tooltip { display: block; }

.pq-tt-title {
  font-family: 'Syne', sans-serif;
  font-size: .6rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--light);
  margin-bottom: 10px;
}

// Onglets étapes dans le tooltip
.pq-tt-etapes {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.pq-tt-etape {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: .56rem;
  font-weight: 700;
  border: 1px solid var(--border);
  color: var(--light);
  background: #f8fafc;
  cursor: pointer;
  transition: all .15s;
}
.pq-tt-etape.active {
  background: var(--fac-l);
  border-color: var(--fac-b);
  color: #1890b0;
}
.pq-tt-etape.na { opacity: .4; cursor: default; }

// Critères
.pq-tt-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.pq-tt-ico   { font-size: .8rem; width: 18px; text-align: center; flex-shrink: 0; }
.pq-tt-label { font-size: .6rem; color: var(--mid); flex: 1; line-height: 1.3; }
.pq-tt-bar-wrap {
  width: 44px; height: 4px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.pq-tt-bar  { height: 100%; border-radius: 3px; transition: width .4s ease; }
.pq-tt-val  { font-size: .62rem; font-weight: 700; color: var(--text); white-space: nowrap; }

.pq-tt-sep  { height: 1px; background: var(--border); margin: 8px 0; }

.pq-tt-tip {
  font-size: .6rem;
  color: var(--mid);
  line-height: 1.5;
  font-style: italic;
  padding: 6px 8px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid var(--fac);
}

.pq-loading {
  font-size: .6rem;
  color: var(--light);
  font-style: italic;
  animation: pqPulse 1.4s ease-in-out infinite;
}
@keyframes pqPulse {
  0%,100% { opacity:1; }
  50%      { opacity:.35; }
}

*/

// ════════════════════════════════════════════════════════════
// JS — coller dans <script>
// ════════════════════════════════════════════════════════════

// ── Mots-clés ────────────────────────────────────────────────
const PQ_CONTEXT_WORDS = [
  'parce que','pourquoi','car ','afin','pour que','pour notre','pour le','pour la',
  'notre ','on veut','on aimerait','nous voulons','on cherche','notre équipe',
  'notre projet','notre idée','notre problème','notre collège','notre thème',
  'notre groupe','on a besoin','on essaie','il faut que','we want','because',
  'so that','in order','our team','our project'
];
const PQ_ACTION_WORDS = [
  'créer','crée','ajouter','ajoute','améliorer','améliore','changer','change',
  'modifier','modifie','construire','construis','concevoir','conçois','générer',
  'génère','écrire','écris','faire','fais','développer','développe','proposer',
  'propose','mettre','mets','intégrer','intègre','inclure','inclus',
  'create','add','improve','change','build','generate','write','make','develop'
];
const PQ_REFORMULATION_WORDS = [
  'non','pas ça','ce n\'est pas','plutôt','autrement','différemment',
  'en fait','je veux dire','plus précisément','je voulais dire',
  'plutôt comme','pas exactement','pas tout à fait','change','reessaie',
  'réessaie','refais','recommence','reprends','try again','not that','instead'
];
// Mots de rôle/audience (étape 4)
const PQ_ROLE_WORDS = [
  'comme si','joue le rôle','tu es','imagine que tu es','en tant que',
  'pour un public','pour des','face à','devant','présente à',
  'as if','play the role','you are','imagine you are','as a','for an audience'
];
// Mots de feedback/critique (étape 5)
const PQ_FEEDBACK_WORDS = [
  'qu\'est-ce qui','ce qui manque','améliore','critique','évalue','note sur',
  'qu\'est-ce que tu penses','donne-moi un retour','feedback','points faibles',
  'what\'s missing','improve','critique','evaluate','give me feedback','weak points'
];
// Contraintes créatives (étape 2)
const PQ_CONSTRAINT_WORDS = [
  'contrainte','limite','budget','pour des','destiné à','à destination','accessible',
  'sans','avec seulement','maximum','minimum','en tenant compte','tout en gardant',
  'constraint','limited','budget','for','targeted at','accessible','without','maximum'
];
// Instructions visuelles (étape 3)
const PQ_VISUAL_WORDS = [
  'couleur','fond','titre','police','image','logo','centré','aligné','taille',
  'police','header','footer','menu','bouton','style','css','html','page',
  'color','background','title','font','image','logo','centered','aligned',
  'size','header','footer','menu','button','style'
];

// ── Utilitaires ───────────────────────────────────────────────
function pqWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}
function pqHas(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.some(w => t.includes(w));
}
function pqRatio(a, b) { return b > 0 ? a / b : 0; }

// ── Définition des critères par étape ────────────────────────
/**
 * Chaque étape retourne un tableau de critères { id, label, icon, score (0|0.5|1), detail }
 * Le score global est la moyenne des critères actifs, ramenée à 5.
 */
function computeCriteresEtape(etape, msgs) {
  const user   = msgs.filter(m => m.role === 'user');
  const assist = msgs.filter(m => m.role === 'assistant');
  if (!user.length) return null; // pas encore de messages à cette étape

  const avgWords = user.reduce((s, m) => s + pqWords(m.message), 0) / user.length;

  // Critère universel C1 — longueur/précision
  const c1 = {
    id: 'c1', icon: '📝', label: 'Longueur & précision',
    score: avgWords >= 20 ? 1 : avgWords >= 10 ? 0.5 : 0,
    detail: `${Math.round(avgWords)} mots en moyenne`
  };

  // Critère universel C4 — efficacité des relances
  const ratio = assist.length > 0 ? user.length / assist.length : 99;
  const c4 = {
    id: 'c4', icon: '⚡', label: 'Efficacité des relances',
    score: ratio <= 1.3 ? 1 : ratio <= 2 ? 0.5 : 0,
    detail: ratio === 99 ? 'n/a' : `ratio ${ratio.toFixed(1)}`
  };

  // Critère universel C3 — reformulation après échec
  let ref = 0, opp = 0;
  for (let i = 1; i < user.length; i++) {
    if (pqWords(user[i-1].message) < 10) {
      opp++;
      if (pqWords(user[i].message) > pqWords(user[i-1].message) * 1.5
          || pqHas(user[i].message, PQ_REFORMULATION_WORDS)) ref++;
    }
  }
  const c3 = {
    id: 'c3', icon: '🔄', label: 'Reformulation après échec',
    score: opp === 0 ? 0.75 : (ref/opp) >= 0.6 ? 1 : (ref/opp) >= 0.3 ? 0.5 : 0,
    detail: opp > 0 ? `${ref}/${opp} reformulé(s)` : 'Pas d\'occasion détectée'
  };

  // ── Critères spécifiques par étape ──────────────────────────

  if (etape === 0) {
    // Onboarding — Découvrir
    // Seuils abaissés : premier contact avec l'IA, messages courts attendus.
    // On évalue la curiosité et la capacité à engager une conversation, pas la précision.

    // C0a — Premier engagement : l'équipe a envoyé au moins 1 message (trivial mais signal de départ)
    const c0a = {
      id: 'c0a', icon: '👋', label: 'Premier engagement',
      score: user.length >= 1 ? 1 : 0,
      detail: `${user.length} message(s) envoyé(s)`
    };

    // C0b — Curiosité exploratoire : présence d'une vraie question (?)
    const qRatio0 = user.filter(m => m.message.includes('?')).length / user.length;
    const c0b = {
      id: 'c0b', icon: '🔭', label: 'Curiosité (questions posées)',
      score: qRatio0 >= 0.4 ? 1 : qRatio0 >= 0.1 ? 0.5 : 0,
      detail: `${Math.round(qRatio0 * 100)}% contiennent une ?`
    };

    // C0c — Longueur minimale : seuil très bas (5 mots) adapté à l'onboarding
    const c0c = {
      id: 'c0c', icon: '📝', label: 'Longueur minimale',
      score: avgWords >= 10 ? 1 : avgWords >= 5 ? 0.5 : 0,
      detail: `${Math.round(avgWords)} mots en moyenne`
    };

    // C0d — Auto-présentation : l'équipe parle d'elle-même (prénom, collège, groupe...)
    const INTRO_WORDS = [
      'je m\'appelle','on s\'appelle','notre équipe','notre groupe','notre collège',
      'on est','nous sommes','je suis','on vient','notre classe','notre prof',
      'my name','we are','our team','our school','our group','i am'
    ];
    const introRatio = user.filter(m => pqHas(m.message, INTRO_WORDS)).length / user.length;
    const c0d = {
      id: 'c0d', icon: '🏫', label: 'Auto-présentation de l\'équipe',
      score: introRatio >= 0.3 ? 1 : introRatio >= 0.1 ? 0.5 : 0,
      detail: `${Math.round(introRatio * 100)}% des messages`
    };

    // C3 reformulation : conservé mais avec score neutre si pas d'occasion (normal en étape 0)
    return [c0a, c0b, c0c, c0d, c3];
  }

  if (etape === 1) {
    // Problématiser — contexte narratif
    const ctxRatio = user.filter(m => pqHas(m.message, PQ_CONTEXT_WORDS)).length / user.length;
    const c2 = {
      id: 'c2', icon: '🎯', label: 'Contexte (qui/quoi/pourquoi)',
      score: ctxRatio >= 0.5 ? 1 : ctxRatio >= 0.25 ? 0.5 : 0,
      detail: `${Math.round(ctxRatio*100)}% des messages`
    };
    // Qualité question vs affirmation
    const qRatio = user.filter(m => m.message.includes('?')).length / user.length;
    const cQ = {
      id: 'cQ', icon: '❓', label: 'Questions réelles posées',
      score: qRatio >= 0.4 ? 1 : qRatio >= 0.2 ? 0.5 : 0,
      detail: `${Math.round(qRatio*100)}% contiennent une ?`
    };
    return [c1, c2, cQ, c3, c4];
  }

  if (etape === 2) {
    // Imaginer — contraintes créatives
    const cstRatio = user.filter(m => pqHas(m.message, PQ_CONSTRAINT_WORDS)).length / user.length;
    const cC = {
      id: 'cC', icon: '🎨', label: 'Contraintes créatives données',
      score: cstRatio >= 0.4 ? 1 : cstRatio >= 0.2 ? 0.5 : 0,
      detail: `${Math.round(cstRatio*100)}% des messages`
    };
    // Itération créative — plusieurs cycles
    const cycles = Math.min(user.length, assist.length);
    const cI = {
      id: 'cI', icon: '🔁', label: 'Cycles d\'itération créative',
      score: cycles >= 4 ? 1 : cycles >= 2 ? 0.5 : 0,
      detail: `${cycles} cycle(s) détecté(s)`
    };
    return [c1, cC, cI, c3, c4];
  }

  if (etape === 3) {
    // Créer — instructions techniques précises
    const vizRatio = user.filter(m => pqHas(m.message, PQ_VISUAL_WORDS)).length / user.length;
    const cV = {
      id: 'cV', icon: '🖼️', label: 'Instructions visuelles précises',
      score: vizRatio >= 0.5 ? 1 : vizRatio >= 0.25 ? 0.5 : 0,
      detail: `${Math.round(vizRatio*100)}% des messages`
    };
    // Autonomie croissante : les messages tardifs sont-ils plus longs ?
    const firstHalf  = user.slice(0, Math.ceil(user.length/2));
    const secondHalf = user.slice(Math.ceil(user.length/2));
    const avgFirst  = firstHalf.reduce((s,m)  => s + pqWords(m.message), 0) / (firstHalf.length  || 1);
    const avgSecond = secondHalf.reduce((s,m) => s + pqWords(m.message), 0) / (secondHalf.length || 1);
    const cA = {
      id: 'cA', icon: '📈', label: 'Autonomie croissante',
      score: secondHalf.length === 0 ? 0.5
           : avgSecond > avgFirst * 1.2 ? 1
           : avgSecond >= avgFirst * 0.9 ? 0.5 : 0,
      detail: avgSecond > 0 ? `${Math.round(avgFirst)}→${Math.round(avgSecond)} mots` : 'Trop peu de données'
    };
    return [c1, cV, c3, cA, c4];
  }

  if (etape === 4) {
    // Chiffrer & Pitcher — rôle / audience / argument
    const roleRatio = user.filter(m => pqHas(m.message, PQ_ROLE_WORDS)).length / user.length;
    const cR = {
      id: 'cR', icon: '🎭', label: 'Cadrage rôle / audience',
      score: roleRatio >= 0.3 ? 1 : roleRatio >= 0.1 ? 0.5 : 0,
      detail: `${Math.round(roleRatio*100)}% des messages`
    };
    // Demande d'angle stratégique
    const ctxRatio = user.filter(m => pqHas(m.message, PQ_CONTEXT_WORDS)).length / user.length;
    const c2b = {
      id: 'c2b', icon: '🎯', label: 'Objectif & argument ciblé',
      score: ctxRatio >= 0.5 ? 1 : ctxRatio >= 0.25 ? 0.5 : 0,
      detail: `${Math.round(ctxRatio*100)}% des messages`
    };
    return [c1, cR, c2b, c3, c4];
  }

  if (etape === 5) {
    // S'entraîner — réflexivité et intégration des retours
    const fbRatio = user.filter(m => pqHas(m.message, PQ_FEEDBACK_WORDS)).length / user.length;
    const cF = {
      id: 'cF', icon: '🪞', label: 'Demande de feedback ciblé',
      score: fbRatio >= 0.4 ? 1 : fbRatio >= 0.2 ? 0.5 : 0,
      detail: `${Math.round(fbRatio*100)}% des messages`
    };
    // Intégration des retours : msg suivant plus long après réponse SPARK longue
    let integ = 0, intOpp = 0;
    for (let i = 1; i < user.length; i++) {
      if (assist[i-1] && pqWords(assist[i-1].message) > 30) {
        intOpp++;
        if (pqWords(user[i].message) > pqWords(user[i-1].message)) integ++;
      }
    }
    const cInt = {
      id: 'cInt', icon: '🔗', label: 'Intégration des retours SPARK',
      score: intOpp === 0 ? 0.5 : (integ/intOpp) >= 0.6 ? 1 : (integ/intOpp) >= 0.3 ? 0.5 : 0,
      detail: intOpp > 0 ? `${integ}/${intOpp} intégré(s)` : 'Trop peu de données'
    };
    return [c1, cF, cInt, c3, c4];
  }

  // Fallback (étapes > 5)
  const ctxRatio = user.filter(m => pqHas(m.message, PQ_CONTEXT_WORDS)).length / user.length;
  const c2 = {
    id: 'c2', icon: '🎯', label: 'Présence de contexte',
    score: ctxRatio >= 0.5 ? 1 : ctxRatio >= 0.25 ? 0.5 : 0,
    detail: `${Math.round(ctxRatio*100)}%`
  };
  return [c1, c2, c3, c4];
}

// ── Score global d'une équipe ─────────────────────────────────
function computePromptingScoreV2(msgs) {
  // Scores par étape (0 à 5)
  const scoresByEtape = {};
  for (let e = 0; e <= 5; e++) {
    const em = msgs.filter(m => Number(m.etape || 0) === e && m.role === 'user');
    const am = msgs.filter(m => Number(m.etape || 0) === e && m.role === 'assistant');
    if (!em.length) { scoresByEtape[e] = null; continue; }
    const criteres = computeCriteresEtape(e, [...em.map(m=>({...m})), ...am.map(m=>({...m}))]);
    if (!criteres) { scoresByEtape[e] = null; continue; }
    const avg = criteres.reduce((s, c) => s + c.score, 0) / criteres.length;
    scoresByEtape[e] = Math.round(avg * 5 * 2) / 2; // ramené sur 5, arrondi 0.5
  }

  // Score global = moyenne des étapes avec données
  const etapesAvecDonnees = Object.values(scoresByEtape).filter(v => v !== null);
  const scoreGlobal = etapesAvecDonnees.length === 0
    ? null
    : Math.round((etapesAvecDonnees.reduce((s,v) => s+v, 0) / etapesAvecDonnees.length) * 2) / 2;

  // Progression (C5 inter-étapes)
  const progressionScores = Object.values(scoresByEtape).filter(v => v !== null);
  let progression = 'neutre';
  if (progressionScores.length >= 2) {
    const first = progressionScores[0];
    const last  = progressionScores[progressionScores.length - 1];
    if (last > first + 0.5) progression = 'en hausse';
    else if (last < first - 0.5) progression = 'en baisse';
  }

  // Conseil actionnable basé sur l'étape en cours
  const etapeActive = Math.max(...Object.keys(scoresByEtape).filter(k => scoresByEtape[k] !== null).map(Number), -1);
  let tip = '';
  if (etapeActive === -1 || scoreGlobal === null) {
    tip = 'L\'équipe n\'a pas encore interagi avec SPARK.';
  } else if (etapeActive === 0) {
    const s = scoresByEtape[0];
    tip = s < 2
      ? 'L\'équipe démarre timidement. Suggérez-leur de se présenter à SPARK : prénom, collège, ce qu\'ils attendent du programme.'
      : s < 4
      ? 'Bon démarrage ! Encouragez-les à poser une vraie question sur le programme ou le design thinking.'
      : 'Excellent premier contact. L\'équipe s\'est bien présentée et a déjà engagé une vraie conversation.';
  } else {
    const s = scoresByEtape[etapeActive];
    const TIPS = {
      1: s < 2 ? 'Encourager l\'équipe à nommer leur contexte : collège, quartier, problème réel.'
               : s < 4 ? 'Bien ! Suggérer d\'ajouter le "pourquoi c\'est important pour nous".'
                       : 'Excellente mise en contexte à l\'étape 1.',
      2: s < 2 ? 'Les messages manquent de contraintes créatives. Suggérer : "pour des gens de X ans, sans Y".'
               : s < 4 ? 'Faire itérer plus : demander 3 options puis choisir en affinant.'
                       : 'Très bonne utilisation de l\'IA pour brainstormer.',
      3: s < 2 ? 'Les instructions visuelles sont floues. Demander des couleurs, dispositions précises.'
               : s < 4 ? 'Bon départ. Travailler la reformulation quand le résultat ne convient pas.'
                       : 'Maîtrise technique remarquable pour cette étape.',
      4: s < 2 ? 'Pas encore de cadrage audience/rôle. Suggérer : "présente ça à un jury de professionnels".'
               : s < 4 ? 'Encourager à challenger SPARK : "qu\'est-ce qui manque dans notre argument ?"'
                       : 'Excellent usage stratégique de l\'IA pour le pitch.',
      5: s < 2 ? 'Peu de demandes de feedback ciblé. Suggérer : "qu\'est-ce qui est flou dans notre pitch ?"'
               : s < 4 ? 'Bien. Vérifier que l\'équipe intègre vraiment les retours SPARK dans les messages suivants.'
                       : 'Niveau expert — l\'équipe utilise l\'IA comme un vrai miroir critique.',
    };
    tip = TIPS[etapeActive] || 'Continuez à accompagner l\'équipe dans sa progression.';
  }

  const userCount = msgs.filter(m => m.role === 'user').length;
  return { scoreGlobal, scoresByEtape, progression, tip, userCount, etapeActive };
}

// ── Rendu HTML ────────────────────────────────────────────────
function renderPromptingScoreV2(result) {
  const { scoreGlobal, scoresByEtape, progression, tip, userCount, etapeActive } = result;

  // Cas : aucun message du tout
  if (scoreGlobal === null) {
    return `<div class="pq-wrap">
      <span class="pq-label">Prompting</span>
      <span class="pq-badge onboarding">Pas encore démarré</span>
    </div>`;
  }

  const LABELS = ['Débutant','Débutant','En progression','En progression','Confirmé','Expert IA'];
  const lvl    = Math.floor(Math.min(scoreGlobal, 5));

  // Étoiles
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    if      (scoreGlobal >= i)       starsHtml += `<span class="pq-star filled">⭐</span>`;
    else if (scoreGlobal >= i - 0.5) starsHtml += `<span class="pq-star half">⭐</span>`;
    else                             starsHtml += `<span class="pq-star empty">⭐</span>`;
  }

  // Sparkline étapes (0 à 5)
  let sparkHtml = '';
  for (let e = 0; e <= 5; e++) {
    const s = scoresByEtape[e];
    const h = s === null ? 4 : Math.round((s / 5) * 14) + 2;
    const cls = s === null ? 's-na' : s < 2 ? 's-low' : s < 4 ? 's-mid' : 's-high';
    sparkHtml += `<div class="pq-spark-bar ${cls}" style="height:${h}px" title="Étape ${e}: ${s !== null ? s+'/5' : 'n/a'}"></div>`;
  }

  // Icône progression
  const progIcon = progression === 'en hausse' ? '↗️' : progression === 'en baisse' ? '↘️' : '→';

  // Tooltip — onglets étapes (0 à 5)
  let ttEtapesBtns = '';
  for (let e = 0; e <= 5; e++) {
    const na = scoresByEtape[e] === null;
    ttEtapesBtns += `<span class="pq-tt-etape${e === etapeActive ? ' active' : ''}${na ? ' na' : ''}"
      onclick="pqShowEtapeDetail(this, ${e}, '${JSON.stringify(scoresByEtape).replace(/'/g,"\\'")}')">
      ${e === 0 ? 'E0' : 'J'+e}
    </span>`;
  }

  // Détail étape active par défaut
  const detailId = `pq-detail-${Math.random().toString(36).slice(2,7)}`;

  return `
    <div class="pq-wrap">
      <span class="pq-label">Prompting</span>
      <div class="pq-stars">${starsHtml}</div>
      <span class="pq-score-txt" style="color:${lvl>=4?'#009978':lvl>=2?'#b38b00':'var(--terra)'}">
        ${scoreGlobal.toFixed(1)}/5
      </span>
      <div class="pq-sparkline">${sparkHtml}</div>
      <span class="pq-badge lvl-${lvl}">${progIcon} ${LABELS[lvl]}</span>

      <div class="pq-tooltip">
        <div class="pq-tt-title">Prompting · ${userCount} msg · ${progIcon} ${progression}</div>
        <div class="pq-tt-etapes">${ttEtapesBtns}</div>
        <div id="${detailId}" class="pq-tt-detail"></div>
        <div class="pq-tt-sep"></div>
        <div class="pq-tt-tip">${tip}</div>
      </div>
    </div>`;
}

// Affiche le détail d'une étape dans le tooltip (appelé au clic)
function pqShowEtapeDetail(btn, etape, scoresJson) {
  // Highlight bouton actif
  btn.closest('.pq-tt-etapes').querySelectorAll('.pq-tt-etape').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Le détail réel est déjà rendu statiquement — ce handler permet
  // une future version dynamique (appel Supabase à la volée par étape).
}

// ── Attachement sur une carte équipe ─────────────────────────
async function attachPromptingScore(card, eqId) {
  const footer = card.querySelector('.tc-footer');
  if (!footer) return;

  const loadingEl = document.createElement('div');
  loadingEl.className = 'pq-wrap';
  loadingEl.innerHTML = '<span class="pq-label">Prompting</span><span class="pq-loading">Analyse…</span>';
  card.insertBefore(loadingEl, footer);

  try {
    const { data: msgs } = await sb
      .from('conversations')
      .select('role, message, etape')
      .eq('equipe_id', eqId)
      .eq('statut', 'visible')
      .order('created_at', { ascending: true });

    const result = computePromptingScoreV2(msgs || []);
    const html   = renderPromptingScoreV2(result);

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    loadingEl.replaceWith(tmp.firstElementChild);
  } catch (e) {
    loadingEl.outerHTML = '<div class="pq-wrap"><span class="pq-label">Prompting</span><span class="pq-loading">—</span></div>';
    console.warn('attachPromptingScore error:', e);
  }
}
