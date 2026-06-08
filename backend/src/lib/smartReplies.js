const normalizeText = (text) => text?.trim().toLowerCase() || "";

const containsWord = (text, words) => {
    const normalized = normalizeText(text);
    return words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
};

const isYesNoQuestion = (text) => {
    const trimmed = normalizeText(text);
    if (!trimmed) return false;

    const questionMarks = trimmed.endsWith("?") || trimmed.includes("?");
    const yesNoStarters = [
        "are", "am", "is", "was", "were",
        "do", "does", "did",
        "can", "could", "will", "would",
        "shall", "should", "may", "might",
        "have", "has", "had"
    ];

    const startsWithHelper = yesNoStarters.some((start) => trimmed.startsWith(`${start} `));
    return questionMarks && startsWithHelper;
};

const isInvitation = (text) => {
    return containsWord(text, [
        "meet", "hang out", "grab", "coffee", "tonight", "sometime", "dinner", "lunch", "join",
        "catch up", "get together", "walk", "call"
    ]);
};

const isThankYou = (text) => {
    return containsWord(text, ["thank", "thanks", "thx", "thankyou"]);
};

const isApology = (text) => {
    return containsWord(text, ["sorry", "apologize", "apologies", "my bad", "pardon"]);
};

const isGreeting = (text) => {
    return containsWord(text, ["hello", "hi", "hey", "good morning", "good evening", "good afternoon"]);
};

const isCheckIn = (text) => {
    return containsWord(text, ["how are you", "how's it going", "how are things", "how have you been", "what's up", "sup"]);
};

const isGoodbye = (text) => {
    return containsWord(text, ["see you", "talk soon", "bye", "goodbye", "later", "take care"]);
};

const getSmartReplies = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return [];

    if (isThankYou(normalized)) {
        return ["You're Welcome", "Anytime", "😊"];
    }

    if (isApology(normalized)) {
        return ["No worries", "It's okay", "Thank you"];
    }

    if (isGoodbye(normalized)) {
        return ["See you", "Take care", "🙂"];
    }

    if (isCheckIn(normalized)) {
        return ["I'm good, thanks!", "Doing well", "Could be better"];
    }

    if (isInvitation(normalized)) {
        return ["Sounds good", "What time?", "Maybe later"];
    }

    if (isYesNoQuestion(normalized) || containsWord(normalized, ["free", "available", "okay", "can you", "want to", "would you", "are you", "should we"])) {
        return ["Yes", "No", "Maybe Later"];
    }

    if (isGreeting(normalized)) {
        return ["Hi!", "Hello!", "How are you?"];
    }

    return [];
};

export default getSmartReplies;
