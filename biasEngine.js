/**
 * Job Description Bias Engine
 * 
 * Rule-based token classification & lexical pattern engine for detecting:
 * 1. Masculine-coded stems (Gaucher, Friesen & Kay, 2011)
 * 2. Feminine-coded stems (Gaucher, Friesen & Kay, 2011)
 * 3. Gendered titles and binary pronouns
 * 4. Exclusive / ageist / non-inclusive phrases
 * 
 * =========================================================================
 * [AI / Hugging Face Token-Classification Model Hook]
 * Future integration point:
 * Replace or augment `analyzeJobDescription` with a fine-tuned Hugging Face
 * transformer pipeline (e.g. `pipeline('token-classification', model='sdg5/job-bias-roberta')`)
 * or call an inference endpoint:
 *   const hfResponse = await fetch("https://api-inference.huggingface.co/models/...", { ... });
 * The return format below (flags with start, end, category, text, reason, alternatives)
 * matches standard BIO / NER span classification outputs.
 * =========================================================================
 */

export const MASCULINE_STEMS = [
  "active", "adventurous", "aggress", "ambitio", "analy", "assert", 
  "athlet", "autonom", "boast", "challeng", "compet", "confident", 
  "courag", "decisive", "determin", "dominant", "force", "headstrong", 
  "independen", "lead", "outspoken", "persist", "superior", 
  "self-reliant", "ninja", "rockstar", "guru"
];

export const FEMININE_STEMS = [
  "affectionate", "cheer", "collab", "commit", "compassion", 
  "connect", "considerate", "cooperat", "empath", "gentle", 
  "honest", "interpersonal", "kind", "loyal", "nurtur", 
  "polite", "supportive", "sympath", "trust", "understand", "warm"
];

export const GENDERED_TERMS = [
  {
    pattern: /\bhe or she\b/gi,
    label: "he or she",
    replacements: ["they"],
    reason: "Binary phrasing excludes non-binary individuals; use the singular 'they'."
  },
  {
    pattern: /\bshe or he\b/gi,
    label: "she or he",
    replacements: ["they"],
    reason: "Binary phrasing excludes non-binary individuals; use singular 'they'."
  },
  {
    pattern: /\bhis or her\b/gi,
    label: "his or her",
    replacements: ["their"],
    reason: "Binary possessive pronoun excludes non-binary identities; use 'their'."
  },
  {
    pattern: /\bher or his\b/gi,
    label: "her or his",
    replacements: ["their"],
    reason: "Binary possessive pronoun excludes non-binary identities; use 'their'."
  },
  {
    pattern: /\bhe\b/gi,
    label: "he",
    replacements: ["they", "the candidate", "the applicant"],
    reason: "Assumes a male candidate; use gender-neutral 'they' or role title."
  },
  {
    pattern: /\bhim\b/gi,
    label: "him",
    replacements: ["them", "the candidate"],
    reason: "Assumes a male candidate; use gender-neutral 'them'."
  },
  {
    pattern: /\bhis\b/gi,
    label: "his",
    replacements: ["their"],
    reason: "Assumes a male candidate; use gender-neutral 'their'."
  },
  {
    pattern: /\bshe\b/gi,
    label: "she",
    replacements: ["they", "the candidate"],
    reason: "Gender-specific pronoun; use gender-neutral 'they' or role title."
  },
  {
    pattern: /\bher\b/gi,
    label: "her",
    replacements: ["their", "them"],
    reason: "Gender-specific pronoun; use gender-neutral 'their' or 'them'."
  },
  {
    pattern: /\bsalesman\b/gi,
    label: "salesman",
    replacements: ["salesperson", "sales representative", "account executive"],
    reason: "Gendered job title implying the role is intended for men."
  },
  {
    pattern: /\bsalesmen\b/gi,
    label: "salesmen",
    replacements: ["sales team", "sales representatives", "sales professionals"],
    reason: "Gendered plural noun implying sales teams are solely male."
  },
  {
    pattern: /\bsaleswoman\b/gi,
    label: "saleswoman",
    replacements: ["salesperson", "sales representative"],
    reason: "Gendered job title; neutral titles promote equal professional standing."
  },
  {
    pattern: /\bchairman\b/gi,
    label: "chairman",
    replacements: ["chair", "chairperson", "board president"],
    reason: "Gendered executive title; 'chair' is the globally accepted neutral standard."
  },
  {
    pattern: /\bchairwoman\b/gi,
    label: "chairwoman",
    replacements: ["chair", "chairperson"],
    reason: "Gendered leadership title; standardizing on 'chair' ensures neutral leadership parity."
  },
  {
    pattern: /\bfireman\b/gi,
    label: "fireman",
    replacements: ["firefighter"],
    reason: "Gendered title; 'firefighter' is the standard inclusive designation."
  },
  {
    pattern: /\bmanpower\b/gi,
    label: "manpower",
    replacements: ["workforce", "staffing", "personnel", "talent capacity"],
    reason: "Gendered language for collective personnel; use 'workforce' or 'staffing'."
  },
  {
    pattern: /\bforeman\b/gi,
    label: "foreman",
    replacements: ["supervisor", "team lead", "crew leader"],
    reason: "Gendered title for supervisory roles; use 'supervisor' or 'lead'."
  },
  {
    pattern: /\bguys\b/gi,
    label: "guys",
    replacements: ["team", "colleagues", "folks", "everyone"],
    reason: "Informal gendered colloquialism that can feel alienating in professional contexts."
  },
  {
    pattern: /\bbusinessman\b/gi,
    label: "businessman",
    replacements: ["business professional", "executive", "entrepreneur"],
    reason: "Gendered business title; use neutral professional terms."
  },
  {
    pattern: /\bbusinesswoman\b/gi,
    label: "businesswoman",
    replacements: ["business professional", "executive"],
    reason: "Gendered business title; use neutral professional terms."
  }
];

export const EXCLUSIVE_PHRASES = [
  {
    pattern: /\bdigital native(s)?\b/gi,
    label: "digital native",
    replacements: ["comfortable with digital tools", "proficient in modern software", "tech-fluent"],
    reason: "Age-biased jargon implying only younger demographics possess digital skills."
  },
  {
    pattern: /\brecent graduate(s)?\b/gi,
    label: "recent graduate",
    replacements: ["early-career professional", "entry-level candidate"],
    reason: "Unnecessarily restricts applicants by graduation recency rather than demonstrated skill level."
  },
  {
    pattern: /\byoung and energetic\b/gi,
    label: "young and energetic",
    replacements: ["motivated and proactive", "driven professional", "enthusiastic"],
    reason: "Explicit age proxy that dissuades experienced and older candidates from applying."
  },
  {
    pattern: /\bnative English speaker(s)?\b/gi,
    label: "native English speaker",
    replacements: ["fluent in English", "proficient professional English", "effective English communicator"],
    reason: "Discriminates against multilingual candidates who have fluent professional English proficiency."
  },
  {
    pattern: /\bculture fit\b/gi,
    label: "culture fit",
    replacements: ["culture add", "values alignment", "collaborative contribution"],
    reason: "'Culture fit' frequently leads to hiring in one's own demographic image; 'culture add' encourages diversity."
  },
  {
    pattern: /\bwork hard[, ]+play hard\b/gi,
    label: "work hard, play hard",
    replacements: ["sustainable, goal-focused team", "high-achieving environment", "purpose-driven culture"],
    reason: "Signals burnout culture and exclusionary social drinking, deterring caregivers and parents."
  },
  {
    pattern: /\bfast-paced environment\b/gi,
    label: "fast-paced environment",
    replacements: ["dynamic environment", "adaptable workplace", "evolving team"],
    reason: "Often used as code for understaffing, long hours, and low psychological safety."
  },
  {
    pattern: /\brockstar developer\b/gi,
    label: "rockstar developer",
    replacements: ["skilled software engineer", "accomplished developer"],
    reason: "Hyper-masculine jargon that discourages diverse applicants and implies a solo hero culture."
  },
  {
    pattern: /\bninja developer\b/gi,
    label: "ninja developer",
    replacements: ["expert software engineer", "proficient developer"],
    reason: "Aggressive tech jargon that can deter underrepresented groups."
  }
];

function getMasculineAlternatives(stem) {
  const map = {
    active: ["engaged", "responsive", "productive"],
    adventurous: ["innovative", "creative", "curious"],
    aggress: ["proactive", "motivated", "purpose-driven"],
    ambitio: ["goal-oriented", "dedicated", "high-performing"],
    analy: ["detail-oriented", "methodical", "thorough"],
    assert: ["clear communicator", "direct communicator", "effective speaker"],
    athlet: ["resilient", "adaptable", "stamina-driven"],
    autonom: ["self-directed", "self-managed", "initiative-taking"],
    boast: ["demonstrated track record", "proven record"],
    challeng: ["stimulating", "engaging", "complex"],
    compet: ["skilled", "results-focused", "market-leading"],
    confident: ["poised", "knowledgeable", "well-prepared"],
    courag: ["principled", "resilient", "steadfast"],
    decisive: ["informed decision-maker", "action-oriented"],
    determin: ["resolute", "dedicated", "steadfast"],
    dominant: ["leading", "influential", "prominent"],
    force: ["impactful", "influential", "compelling"],
    headstrong: ["principled", "purpose-driven"],
    independen: ["self-directed", "initiative-taking", "self-guided"],
    lead: ["guide", "facilitate", "champion"],
    outspoken: ["candid", "transparent", "direct"],
    persist: ["persevering", "dedicated", "diligent"],
    superior: ["exceptional", "high-quality", "distinguished"],
    "self-reliant": ["resourceful", "self-directed", "initiative-oriented"],
    ninja: ["specialist", "expert", "skilled practitioner"],
    rockstar: ["experienced professional", "high performer", "key contributor"],
    guru: ["advisor", "subject matter expert", "mentor"]
  };
  return map[stem] || ["proactive", "dedicated", "effective"];
}

function getFeminineAlternatives(stem) {
  const map = {
    affectionate: ["cordial", "respectful", "collegial"],
    cheer: ["positive", "constructive", "encouraging"],
    collab: ["cross-functional", "team-aligned", "coordinated"],
    commit: ["dedicated", "reliable", "accountable"],
    compassion: ["attentive", "thoughtful", "client-focused"],
    connect: ["liaise", "bridge", "network"],
    considerate: ["respectful", "thoughtful", "client-focused"],
    cooperat: ["coordinated", "team-aligned", "cross-functional"],
    empath: ["attentive", "user-focused", "client-centered"],
    gentle: ["measured", "patient", "composed"],
    honest: ["transparent", "candid", "ethical"],
    interpersonal: ["communication-focused", "stakeholder-facing"],
    kind: ["respectful", "collegial", "courteous"],
    loyal: ["dependable", "long-standing", "dedicated"],
    nurtur: ["foster", "mentor", "develop"],
    polite: ["professional", "courteous", "respectful"],
    supportive: ["enabling", "resourceful", "solution-oriented"],
    sympath: ["receptive", "responsive", "open-minded"],
    trust: ["reliable", "dependable", "accountable"],
    understand: ["perceptive", "insightful", "comprehending"],
    warm: ["welcoming", "collegial", "inclusive"]
  };
  return map[stem] || ["coordinated", "inclusive", "thoughtful"];
}

export const CATEGORY_INFO = {
  masculine: {
    label: "Masculine-coded",
    badge: "Masculine",
    color: "orange",
    bgClass: "bg-amber-100 text-amber-900 border-amber-500",
    badgeClass: "bg-amber-500 text-white",
    borderClass: "border-b-2 border-amber-500",
    borderStyleName: "solid underline",
    description: "Words associated with masculine stereotypes (agentic, competitive). High concentrations dissuade qualified female applicants."
  },
  feminine: {
    label: "Feminine-coded",
    badge: "Feminine",
    color: "teal",
    bgClass: "bg-teal-100 text-teal-900 border-teal-600",
    badgeClass: "bg-teal-600 text-white",
    borderClass: "border-b-2 border-dashed border-teal-600",
    borderStyleName: "dashed underline",
    description: "Words associated with communal stereotypes. Over-reliance can subtly stereotype roles as support-heavy."
  },
  gendered: {
    label: "Gendered Title / Pronoun",
    badge: "Gendered Term",
    color: "red",
    bgClass: "bg-rose-100 text-rose-900 border-rose-500",
    badgeClass: "bg-rose-600 text-white",
    borderClass: "border-b-2 border-rose-500 border-double",
    borderStyleName: "double underline",
    description: "Explicit gender markers, gendered occupational titles, or binary pronouns that exclude candidates."
  },
  exclusive: {
    label: "Exclusive Phrase",
    badge: "Exclusive",
    color: "purple",
    bgClass: "bg-purple-100 text-purple-900 border-purple-600",
    badgeClass: "bg-purple-600 text-white",
    borderClass: "border-b-2 border-dotted border-purple-600",
    borderStyleName: "dotted underline",
    description: "Jargon or proxies that filter applicants by age, native language status, or culture rather than core job skills."
  }
};

export function analyzeJobDescription(text) {
  if (!text || typeof text !== "string" || text.trim() === "") {
    return {
      flags: [],
      stats: {
        totalWords: 0,
        flaggedWords: 0,
        masculineCount: 0,
        feminineCount: 0,
        genderedCount: 0,
        exclusiveCount: 0,
        biasScore: 0,
        verdict: "Empty Text",
        verdictDescription: "Please paste a job description or load a sample to start analysis.",
        ratioStatus: "None"
      }
    };
  }

  const rawMatches = [];

  // 1. Exclusive phrases
  for (const item of EXCLUSIVE_PHRASES) {
    const regex = new RegExp(item.pattern.source, item.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      rawMatches.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchedText: match[0],
        category: "exclusive",
        label: item.label,
        reason: item.reason,
        alternatives: item.replacements,
        priority: 1
      });
    }
  }

  // 2. Gendered titles and pronouns
  for (const item of GENDERED_TERMS) {
    const regex = new RegExp(item.pattern.source, item.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      rawMatches.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchedText: match[0],
        category: "gendered",
        label: item.label,
        reason: item.reason,
        alternatives: item.replacements,
        priority: 2
      });
    }
  }

  // 3. Masculine stems
  for (const stem of MASCULINE_STEMS) {
    const safeStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${safeStem}[a-zA-Z]*\\b`, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      rawMatches.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchedText: match[0],
        category: "masculine",
        label: stem,
        reason: `Research identifies '${match[0].toLowerCase()}' as masculine-coded (agentic trait). High concentrations dissuade female candidates.`,
        alternatives: getMasculineAlternatives(stem),
        priority: 3
      });
    }
  }

  // 4. Feminine stems
  for (const stem of FEMININE_STEMS) {
    const safeStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${safeStem}[a-zA-Z]*\\b`, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      rawMatches.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchedText: match[0],
        category: "feminine",
        label: stem,
        reason: `Research identifies '${match[0].toLowerCase()}' as feminine-coded (communal trait). Can stereotype roles as relationship-focused.`,
        alternatives: getFeminineAlternatives(stem),
        priority: 4
      });
    }
  }

  // Sort and resolve overlaps
  rawMatches.sort((a, b) => {
    if (a.startIndex !== b.startIndex) {
      return a.startIndex - b.startIndex;
    }
    const lenA = a.endIndex - a.startIndex;
    const lenB = b.endIndex - b.startIndex;
    if (lenB !== lenA) {
      return lenB - lenA;
    }
    return a.priority - b.priority;
  });

  const flags = [];
  let lastEnd = 0;

  for (let i = 0; i < rawMatches.length; i++) {
    const candidate = rawMatches[i];
    if (candidate.startIndex >= lastEnd) {
      flags.push({
        id: `flag-${candidate.startIndex}-${candidate.endIndex}`,
        startIndex: candidate.startIndex,
        endIndex: candidate.endIndex,
        matchedText: candidate.matchedText,
        category: candidate.category,
        label: candidate.label,
        reason: candidate.reason,
        alternatives: candidate.alternatives
      });
      lastEnd = candidate.endIndex;
    }
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  let masculineCount = 0;
  let feminineCount = 0;
  let genderedCount = 0;
  let exclusiveCount = 0;

  for (const f of flags) {
    if (f.category === "masculine") masculineCount++;
    else if (f.category === "feminine") feminineCount++;
    else if (f.category === "gendered") genderedCount++;
    else if (f.category === "exclusive") exclusiveCount++;
  }

  const flaggedWords = flags.length;

  let biasScore = 0;
  if (totalWords > 0 && flaggedWords > 0) {
    const rawPenalty = (masculineCount * 9) + (feminineCount * 7) + (genderedCount * 14) + (exclusiveCount * 14);
    const densityFactor = Math.min(2.5, Math.max(0.7, 100 / totalWords));
    biasScore = Math.min(100, Math.max(1, Math.round(rawPenalty * densityFactor)));
  }

  let verdict = "Inclusive & Neutral";
  let verdictDescription = "No significant gendered or exclusionary patterns detected. Great job!";
  let ratioStatus = "Neutral";

  if (flaggedWords === 0) {
    verdict = "Inclusive & Neutral";
    verdictDescription = "Outstanding! The text avoids gender-coded traits, binary pronouns, and exclusionary filters.";
    ratioStatus = "Neutral";
    biasScore = 0;
  } else if (masculineCount > feminineCount + 2) {
    verdict = "Masculine-leaning";
    verdictDescription = "Noticeably higher concentration of agentic and competitive words. High risk of deterring women candidates.";
    ratioStatus = "Masculine";
  } else if (feminineCount > masculineCount + 2) {
    verdict = "Feminine-leaning";
    verdictDescription = "Higher concentration of communal words. May subtly stereotype roles as relationship/support oriented.";
    ratioStatus = "Feminine";
  } else if (genderedCount > 0 || exclusiveCount > 0) {
    verdict = "Contains Non-Inclusive Terms";
    verdictDescription = "Features explicit gendered pronouns, exclusive titles, or age/culture proxies that require remediation.";
    ratioStatus = "Exclusive";
  } else {
    verdict = "Balanced Coded Language";
    verdictDescription = "Masculine and feminine-coded words appear in roughly equal proportions, though neutral alternatives are still recommended.";
    ratioStatus = "Balanced";
  }

  return {
    flags,
    stats: {
      totalWords,
      flaggedWords,
      masculineCount,
      feminineCount,
      genderedCount,
      exclusiveCount,
      biasScore,
      verdict,
      verdictDescription,
      ratioStatus
    }
  };
}

export const SAMPLE_JOB_POSTS = {
  heavilyBiased: {
    id: "heavilyBiased",
    title: "Senior Sales Rockstar & Growth Lead (Heavily Biased)",
    badge: "15+ Flags across all 4 categories",
    description: "Contains rockstar, aggressive, salesman, chairman, he, decisive, autonomous, supportive, collaborative, digital native, work hard play hard, guys, etc.",
    text: `We are seeking a high-performing rockstar developer and aggressive salesman to dominate our enterprise market!

As our lead chairman of client acquisition, he must be an ambitious and decisive champion who can lead autonomous teams with superior force. He or she will be competitive, independent, and determined to crush challenging targets.

While we expect you to be collaborative, supportive, and compassionate with clients, we need a young and energetic digital native who thrives in a work hard, play hard environment. You should be a native English speaker with an exceptional culture fit for our fast-paced company.

Send your resume to our foreman and join the guys today!`
  },

  mildlyBiased: {
    id: "mildlyBiased",
    title: "Community & People Operations Specialist (Mildly Biased)",
    badge: "Communal & Casual Leaning",
    description: "Contains communal feminine stems (supportive, nurture, honest) and colloquial terms (guys, fast-paced).",
    text: `We are looking for a warm, compassionate, and supportive People Partner to nurture our internal culture and support our growing team.

In this role, you will collaborate closely with employees to build honest, trusting, and empathetic relationships. You should have an affectionate and loyal approach to interpersonal communication.

We want someone who is considerate and polite, and who can help the guys stay aligned in our fast-paced environment. They will ensure every team member feels understood.`
  },

  clean: {
    id: "clean",
    title: "Senior Product Engineer (Clean & Inclusive)",
    badge: "Zero Bias Detected (Score: 0)",
    description: "Objective, skill-focused job posting adhering to inclusive hiring standards. Scores near 0.",
    text: `We are looking for a Senior Product Engineer to join our cross-functional team and contribute to core user-facing features.

Key Responsibilities:
- Design, implement, and maintain reliable web applications using modern web standards.
- Partner with product managers and designers to solve complex customer problems through thoughtful iteration.
- Mentor team members, share domain knowledge, and participate in peer code reviews.
- Communicate technical tradeoffs clearly to stakeholders.

Qualifications:
- Demonstrated experience building and shipping web applications.
- Proficiency in JavaScript/TypeScript and front-end frameworks.
- Strong problem-solving abilities and a continuous learning mindset.
- Equal Opportunity Employer: We evaluate qualified candidates regardless of gender, race, age, religion, disability, or background.`
  }
};