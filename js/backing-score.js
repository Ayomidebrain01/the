/**
 * The Backing Score — questions, scoring, and result copy.
 * Scoring is deterministic. It does not use AI.
 * Proposition is a qualitative read, not a fabricated number.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BackingScore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCALE = [20, 40, 60, 80, 100];
  const TEXT_MIN = 40;
  const TEXT_MAX = 2500;

  const QUESTIONS = [
    {
      id: "ideaType",
      kind: "choice",
      prompt: "What are you trying to get people behind?",
      helper: "Choose all that apply.",
      options: [
        "Sponsorship or partnership",
        "Campaign",
        "Event or programme",
        "Membership or fan initiative",
        "Community initiative",
        "Fundraising",
        "New product or service",
        "New idea or project",
        "Other"
      ]
    },
    {
      id: "audience",
      kind: "choice",
      prompt: "Who are you trying to get behind it?",
      helper: "Choose all that apply.",
      options: [
        "Sponsors",
        "Commercial partners",
        "Fans/supporters",
        "Members",
        "Local community",
        "Funders",
        "Volunteers",
        "Leadership/decision-makers",
        "Other"
      ]
    },
    {
      id: "description",
      kind: "text",
      prompt: "In a few sentences, what are you asking people to back?",
      helper: "Explain it as you would to someone who knows nothing about it.",
      min: TEXT_MIN,
      max: TEXT_MAX
    },
    {
      id: "reason",
      kind: "text",
      prompt: "What's the strongest reason for your audience to back this?",
      helper: "What do they get from saying yes?",
      min: TEXT_MIN,
      max: TEXT_MAX
    },
    {
      id: "clarity",
      kind: "scale",
      prompt: "How clearly can you explain what you're asking people to back — and why?",
      options: ["Not clear yet", "Needs work", "Reasonably clear", "Very clear", "Crystal clear"]
    },
    {
      id: "belief",
      kind: "scale",
      prompt: "What evidence do you have that this will resonate?",
      options: [
        "We haven't tested it",
        "We've had informal feedback",
        "We've received positive audience/community feedback",
        "We've already secured some support",
        "We have strong evidence or previous success"
      ]
    },
    {
      id: "relevance",
      kind: "scale",
      prompt: "How closely does this connect with what the people you're asking to back it actually care about?",
      options: [
        "We're largely guessing",
        "Some understanding",
        "Reasonably connected",
        "Strongly connected",
        "Closely aligned"
      ]
    },
    {
      id: "confidence",
      kind: "scale",
      prompt: "How ready is the idea to be put in front of the people whose support you need?",
      options: [
        "Early thought",
        "Still shaping it",
        "Clear but needs strengthening",
        "Ready to present",
        "Already presenting and seeking backing"
      ]
    },
    {
      id: "barrier",
      kind: "choice",
      prompt: "What's the biggest thing currently holding the idea back?",
      helper: "Choose all that apply.",
      options: [
        "Making the idea clearer",
        "Making the value more compelling",
        "Getting the right people interested",
        "Building trust/evidence",
        "Communicating it effectively",
        "Reaching the right audience",
        "Not enough time/resources",
        "We're not sure yet",
        "Other"
      ]
    }
  ];

  const NEXT = {
    clarity: "Write the ask in one sentence a stranger could repeat.",
    proposition: "Name what they get from saying yes, not only what you need from them.",
    belief: "Point to one piece of proof: a response, a pilot, or a result you have already seen.",
    relevance: "Start from what they already care about, then show where this idea meets it.",
    confidence: "Decide what must be true before you ask, and strengthen that before you go wider."
  };

  const BARRIER_LENS = {
    "Making the idea clearer": "clarity",
    "Making the value more compelling": "proposition",
    "Getting the right people interested": "relevance",
    "Building trust/evidence": "belief",
    "Communicating it effectively": "clarity",
    "Reaching the right audience": "relevance",
    "Not enough time/resources": "confidence"
  };

  function choiceLabel(question, value) {
    const match = question.options.find((option) => {
      return typeof option === "string" ? option === value : option.value === value;
    });
    if (!match) return value || "";
    return typeof match === "string" ? match : match.label;
  }

  function withOther(value, other) {
    if (value !== "Other") return value || "";
    const note = (other || "").trim();
    return note ? "Other: " + note : "Other";
  }

  function asList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }

  function listPhrase(items) {
    const names = items.filter(Boolean);
    if (names.length < 2) return names[0] || "";
    if (names.length === 2) return names[0] + " and " + names[1];
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }

  function chosenText(question, value, other) {
    return listPhrase(asList(value).map(function (item) {
      return withOther(choiceLabel(question, item), item === "Other" ? other : "");
    }));
  }

  function scaleScore(value) {
    const index = Number(value) - 1;
    if (index < 0 || index > 4) return null;
    return SCALE[index];
  }

  function bandFor(score) {
    if (score <= 39) return { id: "not-ready", label: "Not Ready to Be Backed" };
    if (score <= 59) return { id: "promising", label: "Promising, But Not There Yet" };
    if (score <= 74) return { id: "foundation", label: "Strong Foundation" };
    if (score <= 89) return { id: "momentum", label: "Ready to Gain Momentum" };
    return { id: "highly", label: "Highly Backable" };
  }

  const AUDIENCE = {
    "Sponsors": { who: "sponsors", care: "what the association does for them, not only what you need" },
    "Commercial partners": { who: "commercial partners", care: "a clear exchange" },
    "Fans/supporters": { who: "fans and supporters", care: "a reason to care, and a place in it" },
    "Members": { who: "members", care: "what changes for them if they say yes" },
    "Local community": { who: "the local community", care: "why this matters where they live" },
    "Funders": { who: "funders", care: "a credible case and a result they can stand behind" },
    "Volunteers": { who: "volunteers", care: "a role that is worth their time" },
    "Leadership/decision-makers": { who: "decision-makers", care: "a decision they can defend" }
  };

  const IDEA = {
    "Sponsorship or partnership": "a sponsorship or partnership",
    "Campaign": "a campaign",
    "Event or programme": "an event or programme",
    "Membership or fan initiative": "a membership or fan initiative",
    "Community initiative": "a community initiative",
    "Fundraising": "a fundraising ask",
    "New product or service": "a new product or service",
    "New idea or project": "a new idea"
  };

  function contextOf(answers) {
    const ideaParts = asList(answers.ideaType).map(function (item) {
      if (item === "Other") return (answers.ideaTypeOther || "").trim();
      return IDEA[item] || "";
    }).filter(Boolean);
    const audiences = asList(answers.audience);
    const whoParts = audiences.map(function (item) {
      if (item === "Other") return (answers.audienceOther || "").trim();
      return AUDIENCE[item] ? AUDIENCE[item].who : "";
    }).filter(Boolean);
    const careParts = audiences.map(function (item) {
      return AUDIENCE[item] ? AUDIENCE[item].care : "";
    }).filter(Boolean);
    return {
      idea: ideaParts.length ? listPhrase(ideaParts) : "this idea",
      who: whoParts.length ? listPhrase(whoParts) : "the people you need",
      care: careParts.length === 1 ? careParts[0] : (careParts.length ? "a reason each of them can recognise" : "a reason to say yes that is about them")
    };
  }

  function wordsOf(text) {
    const stop = { this: 1, that: 1, with: 1, from: 1, they: 1, them: 1, their: 1, your: 1, have: 1, will: 1, would: 1, about: 1, into: 1, what: 1, when: 1, where: 1, which: 1, there: 1, people: 1 };
    return (String(text || "").toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter(function (word) {
      return !stop[word];
    });
  }

  function reasonRead(answers) {
    const reason = (answers.reason || "").trim();
    const text = reason.toLowerCase();
    const aboutThem = (text.match(/\b(they|their|them|you|your|fans|members|community|sponsors|partners|brand|visibility|return|benefit|impact)\b/g) || []).length;
    const aboutUs = (text.match(/\b(we|our|us|club|need|funding)\b/g) || []).length;
    const reasonWords = wordsOf(reason);
    const descriptionWords = {};
    wordsOf(answers.description).forEach(function (word) { descriptionWords[word] = 1; });
    const shared = reasonWords.filter(function (word) { return descriptionWords[word]; }).length;
    const overlap = reasonWords.length ? shared / reasonWords.length : 0;
    return {
      aboutThem: aboutThem,
      aboutUs: aboutUs,
      thin: reason.length < 90,
      restates: reasonWords.length >= 6 && overlap >= 0.65
    };
  }

  function assessProposition(answers, ctx) {
    const read = reasonRead(answers);
    const valueIsTheGap = asList(answers.barrier).indexOf("Making the value more compelling") !== -1;
    if (read.restates) {
      return "The reason you gave mostly restates the idea. It does not yet say what " + ctx.who + " get. They decide on " + ctx.care + ".";
    }
    if (read.aboutUs > read.aboutThem && (read.thin || valueIsTheGap)) {
      return "The reason you wrote is still mostly about what you need. " + capital(ctx.who) + " will decide based on " + ctx.care + ".";
    }
    if (read.thin || valueIsTheGap) {
      return "There is a reason in what you wrote, but it is not yet the first thing " + ctx.who + " would hear. Lead with " + ctx.care + ".";
    }
    if (read.aboutThem >= read.aboutUs) {
      return "The reason to say yes is already in your answer. Put it in the first line, ahead of the background, so " + ctx.who + " see " + ctx.care + " before anything else.";
    }
    return "The case is there. It will travel further once " + ctx.who + " can see " + ctx.care + " without having to look for it.";
  }

  function capital(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function leadFor(bandId, lowest) {
    const name = lowest.name.toLowerCase();
    if (bandId === "not-ready") {
      return "This is still early. Before that ask goes further, " + name + " needs to be stronger, or the support will be hard to earn.";
    }
    if (bandId === "promising") {
      return "There is a real idea here. It is not yet easy enough to back with confidence, and " + name + " is the clearest place to start.";
    }
    if (bandId === "foundation") {
      return "There is something worth backing here. " + capital(name) + " is where the next gain is, and that is what will make the yes easier.";
    }
    if (bandId === "momentum") {
      return "This is close enough to put in front of people. " + lowest.name + " is the part still worth strengthening so the yes comes more easily.";
    }
    if (lowest.score >= 90) {
      return "This is in a strong place to be backed. The work now is taking it to the right people.";
    }
    return "This is in a strong place to be backed. The work now is taking it to the right people, and keeping " + name + " as sharp as the rest.";
  }

  function patternReading(answers, dimensions, lowest, strongest, ctx) {
    const scores = dimensions.map(function (item) { return item.score; });
    const spread = Math.max.apply(null, scores) - Math.min.apply(null, scores);
    const byId = {};
    dimensions.forEach(function (item) { byId[item.id] = item.score; });
    const notes = [];
    const ideas = asList(answers.ideaType);
    const audiences = asList(answers.audience);
    const asksCommunity = audiences.some(function (item) { return /Fans|Local community|Volunteers|Members/.test(item); });
    const asksCommercial = audiences.some(function (item) { return /Sponsors|Commercial partners/.test(item); });
    if (ideas.indexOf("Sponsorship or partnership") !== -1 && asksCommunity) {
      notes.push("You are asking " + ctx.who + " to back a sponsorship. That is usually a commercial decision. Be explicit about whether this is support, or a partnership with a return.");
    } else if (ideas.indexOf("Fundraising") !== -1 && asksCommercial) {
      notes.push(capital(ctx.who) + " rarely say yes to a donation dressed up as a partnership. They need to see " + ctx.care + ".");
    } else if (ideas.indexOf("Campaign") !== -1 && audiences.indexOf("Funders") !== -1) {
      notes.push("Funders back a result they can account for. A campaign name is not that result until you show what changes if they say yes.");
    }
    if (Number(answers.confidence) >= 4 && Number(answers.belief) <= 2) {
      notes.push("You are close to asking, or already asking, with very little evidence. That is the risk. " + capital(ctx.who) + " will feel the confidence before they feel the proof.");
    } else if (Number(answers.clarity) >= 4 && reasonRead(answers).thin) {
      notes.push("You rate the explanation as clear, but the reason to say yes is still thin. A clear idea is not the same as a clear reason for " + ctx.who + " to act.");
    } else if (spread <= 20 && lowest.score >= 80) {
      notes.push("The scores are even, and they are strong. Nothing is propping up a weak point. The question is whether " + ctx.who + " meet that strength in the way you tell it.");
    } else if (spread <= 20) {
      notes.push("The scores are even. Nothing is badly broken, and nothing is strong enough yet to carry " + ctx.idea + ". " + capital(ctx.who) + " will feel that as hesitation.");
    } else if (byId.clarity >= 80 && byId.belief <= 40) {
      notes.push("You can explain " + ctx.idea + ". What is missing is proof that it will matter to " + ctx.who + ". A clear ask without evidence is still easy to delay.");
    } else if (byId.clarity >= 80 && byId.relevance <= 40) {
      notes.push("The idea is explainable, but it is not yet tied to " + ctx.care + ". " + capital(ctx.who) + " can understand it and still not see themselves in it.");
    } else if (byId.belief >= 80 && byId.relevance >= 80 && byId.clarity <= 40) {
      notes.push("The substance may already be there, and it may already connect. People still cannot see the ask. Until that is obvious, the stronger parts stay hidden.");
    } else if (byId.confidence <= 40 && byId.clarity >= 60 && byId.belief >= 60) {
      notes.push("The thinking is ahead of the readiness. " + capital(ctx.who) + " should not be the place you discover the idea is not ready for the room.");
    } else {
      notes.push(capital(strongest.name) + " is doing the work. " + lowest.name + " is where " + ctx.who + " are most likely to pause, question, or wait.");
    }
    return notes.join(" ");
  }

  function barrierReading(answers, lowest, ctx) {
    const barriers = asList(answers.barrier);
    const barrier = listPhrase(barriers.map(function (item) {
      return withOther(item, item === "Other" ? answers.barrierOther : "");
    }));
    const lens = barriers.map(function (item) { return BARRIER_LENS[item]; }).filter(Boolean)[0] || null;
    if (barriers.length === 1 && barriers[0] === "We're not sure yet") {
      return "You were not sure what is holding this back. The answers are clearer: " + lowest.name.toLowerCase() + " is the first place " + ctx.who + " will feel the gap.";
    }
    if (lens && lens === lowest.id && lowest.score >= 80) {
      return "You named " + barrier.toLowerCase() + " as the thing still in the way. The scores are already strong there. Treat it as the last sharpening before you take this to " + ctx.who + ", not as a rebuild.";
    }
    if (lens && lens === lowest.id) {
      return "You already named the real constraint: " + barrier.toLowerCase() + ". The scores agree. That is useful. It means the next piece of work is not a guess.";
    }
    if (lens && lens !== lowest.id) {
      return "You named " + barrier.toLowerCase() + " as the hold-up. The answers point first to " + lowest.name.toLowerCase() + ". Both matter. Start with " + lowest.name.toLowerCase() + ", because that is what " + ctx.who + " will notice before they hear the rest.";
    }
    return "The constraint you named is part of the picture. The sharper signal in the answers is still " + lowest.name.toLowerCase() + ".";
  }

  function focusDetail(lowest, ctx) {
    if (lowest.score >= 90) {
      return "Take it to " + ctx.who + ". The scores are not asking for a rebuild. Open with " + ctx.care + ", then have the conversation with the people who can actually say yes.";
    }
    const lines = {
      clarity: "Make the ask obvious to " + ctx.who + ". One sentence should cover what this is, who it is for, and why it involves them. If a stranger cannot repeat it, it is not ready to be backed.",
      belief: "Give " + ctx.who + " something to trust. One piece of proof is enough to start: a response you have already heard, a small pilot, or a result you can point to. Without that, a good idea stays a claim.",
      relevance: "Connect this to " + ctx.care + ". If " + ctx.who + " cannot see their own priority in the first moments, they will treat it as your project rather than a reason to act.",
      confidence: "Do not widen the ask yet. Strengthen it until you would be comfortable putting it in front of " + ctx.who + " without explaining the gaps as you go."
    };
    return lines[lowest.id];
  }

  function nextMovesFor(lowest, answers, ctx) {
    if (lowest.score >= 90) {
      return [
        "Open with what " + ctx.who + " get, before you explain what you need.",
        "Take the conversation to the person who can actually say yes."
      ];
    }
    const moves = [NEXT[lowest.id]];
    const barrierLens = asList(answers.barrier).map(function (item) {
      return BARRIER_LENS[item];
    }).filter(function (item) { return item && item !== lowest.id; })[0];
    if (barrierLens && barrierLens !== lowest.id) {
      moves.push(NEXT[barrierLens]);
    } else if (lowest.id === "clarity") {
      moves.push("Test that sentence on someone who is not already close to the idea.");
    } else if (lowest.id === "belief") {
      moves.push("Use that proof in the first conversation, not as an appendix.");
    } else if (lowest.id === "relevance") {
      moves.push("Rewrite the opening so " + ctx.who + " recognise themselves before they hear the request.");
    } else if (lowest.id === "confidence") {
      moves.push("Name the one gap you will close before you ask " + ctx.who + " for a decision.");
    } else {
      moves.push("Put what " + ctx.who + " get in the first line of the ask.");
    }
    return moves.slice(0, 2);
  }

  function scoreAssessment(answers) {
    const clarity = scaleScore(answers.clarity);
    const belief = scaleScore(answers.belief);
    const relevance = scaleScore(answers.relevance);
    const confidence = scaleScore(answers.confidence);
    const dimensions = [
      { id: "clarity", name: "Clarity", score: clarity },
      { id: "belief", name: "Belief", score: belief },
      { id: "relevance", name: "Relevance", score: relevance },
      { id: "confidence", name: "Confidence", score: confidence }
    ];
    const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
    const lowest = dimensions.reduce((best, item) => (item.score < best.score ? item : best));
    const strongest = dimensions.reduce((best, item) => (item.score > best.score ? item : best));
    const band = bandFor(overall);
    const ctx = contextOf(answers);
    const proposition = assessProposition(answers, ctx);

    return {
      overall: overall,
      band: band,
      lead: "You are asking " + ctx.who + " to get behind " + ctx.idea + ". " + leadFor(band.id, lowest),
      reading: patternReading(answers, dimensions, lowest, strongest, ctx) + " " + barrierReading(answers, lowest, ctx),
      dimensions: dimensions,
      proposition: proposition,
      lowest: lowest,
      focus: focusDetail(lowest, ctx),
      nextMoves: nextMovesFor(lowest, answers, ctx)
    };
  }

  function canScore(answers) {
    return ["clarity", "belief", "relevance", "confidence"].every(function (id) {
      return scaleScore(answers[id]) != null;
    });
  }

  function sheetRow(answers, contact, result, submissionId) {
    const ideaQuestion = QUESTIONS[0];
    const audienceQuestion = QUESTIONS[1];
    const barrierQuestion = QUESTIONS[8];
    const person = contact || {};
    const scored = result && result.dimensions;
    return {
      timestamp: new Date().toISOString(),
      name: (person.name || "").trim(),
      email: (person.email || "").trim(),
      organisation: (person.organisation || "").trim(),
      role: (person.role || "").trim(),
      website: (person.website || "").trim(),
      ideaType: chosenText(ideaQuestion, answers.ideaType, answers.ideaTypeOther),
      targetAudience: chosenText(audienceQuestion, answers.audience, answers.audienceOther),
      ideaDescription: (answers.description || "").trim(),
      reasonToBack: (answers.reason || "").trim(),
      clarityScore: scored ? result.dimensions[0].score : "",
      propositionScore: scored ? result.proposition : "",
      beliefScore: scored ? result.dimensions[1].score : "",
      relevanceScore: scored ? result.dimensions[2].score : "",
      confidenceScore: scored ? result.dimensions[3].score : "",
      overallScore: scored ? result.overall : "",
      scoreBand: scored ? result.band.label : "",
      lowestDimension: scored ? result.lowest.name : "",
      biggestBarrier: chosenText(barrierQuestion, answers.barrier, answers.barrierOther),
      followUpInterest: answers.followUp === "talk" ? "Yes, I'd be interested in talking it through" : "Not right now",
      submissionId: submissionId || ""
    };
  }

  const SHEET_COLUMNS = [
    "Submission ID",
    "Timestamp",
    "Name",
    "Email",
    "Organisation",
    "Role",
    "Website",
    "Idea Type",
    "Target Audience",
    "Idea Description",
    "Reason To Back",
    "Clarity Score",
    "Proposition Score",
    "Belief Score",
    "Relevance Score",
    "Confidence Score",
    "Overall Score",
    "Score Band",
    "Lowest Dimension",
    "Biggest Barrier",
    "Follow-up Interest"
  ];

  function rowValues(row) {
    return [
      row.submissionId,
      row.timestamp,
      row.name,
      row.email,
      row.organisation,
      row.role,
      row.website,
      row.ideaType,
      row.targetAudience,
      row.ideaDescription,
      row.reasonToBack,
      row.clarityScore,
      row.propositionScore,
      row.beliefScore,
      row.relevanceScore,
      row.confidenceScore,
      row.overallScore,
      row.scoreBand,
      row.lowestDimension,
      row.biggestBarrier,
      row.followUpInterest
    ];
  }

  return {
    QUESTIONS: QUESTIONS,
    TEXT_MIN: TEXT_MIN,
    TEXT_MAX: TEXT_MAX,
    SHEET_COLUMNS: SHEET_COLUMNS,
    canScore: canScore,
    scoreAssessment: scoreAssessment,
    sheetRow: sheetRow,
    rowValues: rowValues
  };
});
