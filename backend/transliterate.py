"""
Universal Phonetic Devanagari to Conversational Romanized Hinglish Transliterator.
Operates purely algorithmically based on Devanagari Unicode phonetics, conjuncts,
and Hindi schwa deletion rules. Zero sentence hardcoding.
"""

import re
import unicodedata

# Devanagari Unicode character phonetic tables
INDEPENDENT_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
    "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an", "अः": "ah",
}

MATRAS = {
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
    "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
}

CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy",
    # Nukta forms
    "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "d", "ढ़": "dh", "फ़": "f",
}

VIRAMA = "्"
ANUSVARA = "ं"
CHANDRABINDU = "ँ"
VISARGA = "ः"
NUKTA = "़"


def _is_devanagari(text: str) -> bool:
    """Check if text contains any Devanagari characters."""
    return any(0x0900 <= ord(c) <= 0x097F for c in text)


def _transliterate_devanagari_word(word: str) -> str:
    """Algorithmically transliterate a single Devanagari word using phonetic grammar."""
    clean_word = word.strip()
    if not clean_word:
        return word

    # Preserve leading and trailing punctuation (quotes, question marks, brackets)
    prefix_match = re.match(r"^([^a-zA-Z0-9ऀ-ॿ]+)", clean_word)
    prefix = prefix_match.group(1) if prefix_match else ""
    suffix_match = re.search(r"([^a-zA-Z0-9ऀ-ॿ]+)$", clean_word)
    suffix = suffix_match.group(1) if suffix_match else ""

    core_word = clean_word[len(prefix):len(clean_word) - (len(suffix) if suffix else 0)]
    if not core_word:
        return clean_word

    chars = list(unicodedata.normalize("NFC", core_word))
    n = len(chars)
    res = []
    i = 0

    while i < n:
        c = chars[i]

        # 1. Independent Vowel (अ, आ, इ...)
        if c in INDEPENDENT_VOWELS:
            res.append(INDEPENDENT_VOWELS[c])
            i += 1
            continue

        # 2. Consonant (क, ख, ग...)
        if c in CONSONANTS:
            cons = CONSONANTS[c]
            i += 1

            # Check for attached nukta (़)
            if i < n and chars[i] == NUKTA:
                combined = c + NUKTA
                if combined in CONSONANTS:
                    cons = CONSONANTS[combined]
                i += 1

            # Check what follows the consonant
            if i < n and chars[i] == VIRAMA:
                # Halant / Virama: conjunct without vowel
                res.append(cons)
                i += 1
            elif i < n and chars[i] in MATRAS:
                # Attached vowel matra
                matra = MATRAS[chars[i]]
                res.append(cons + matra)
                i += 1
            elif i < n and chars[i] in (ANUSVARA, CHANDRABINDU):
                # Nasal sound
                res.append(cons + "an")
                i += 1
            elif i == n:
                # Word-final consonant: Hindi schwa deletion (e.g. हाल -> haal, not haala)
                res.append(cons)
            else:
                # Implicit short 'a'
                res.append(cons + "a")
            continue

        # 3. Matra standalone
        if c in MATRAS:
            res.append(MATRAS[c])
            i += 1
            continue

        # 4. Anusvara / Chandrabindu standalone
        if c in (ANUSVARA, CHANDRABINDU):
            res.append("n")
            i += 1
            continue

        # 5. Visarga
        if c == VISARGA:
            res.append("h")
            i += 1
            continue

        # 6. Virama standalone
        if c == VIRAMA:
            i += 1
            continue

        # Pass through numbers, ASCII, Latin
        res.append(c)
        i += 1

    transliterated = "".join(res)

    # Phonetic normalization
    transliterated = re.sub(r"aa+", "aa", transliterated)
    transliterated = re.sub(r"eee+", "ee", transliterated)
    transliterated = re.sub(r"ooo+", "oo", transliterated)

    return prefix + transliterated + suffix


def devanagari_to_hinglish(text: str) -> str:
    """
    Convert a Devanagari or mixed text into conversational Romanized Hindi.
    Works for any arbitrary sentence or speech tokens.
    """
    if not text or not _is_devanagari(text):
        return text

    tokens = text.split(" ")
    result_tokens = []
    for token in tokens:
        if _is_devanagari(token):
            result_tokens.append(_transliterate_devanagari_word(token))
        else:
            result_tokens.append(token)

    return " ".join(result_tokens)
