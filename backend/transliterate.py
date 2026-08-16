"""
Universal Phonetic Transliterator:
Converts both Devanagari and Perso-Arabic (Urdu) scripts into clean, natural Romanized Hinglish.
"""

import re
import unicodedata

# ---------------------------------------------------------------------------
# DEVANAGARI MAPPINGS
# ---------------------------------------------------------------------------
DEV_INDEPENDENT_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
    "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an", "अः": "ah",
}

DEV_MATRAS = {
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
    "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
}

DEV_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy",
    "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "d", "ढ़": "dh", "फ़": "f",
}

DEV_VIRAMA = "्"
DEV_ANUSVARA = "ं"
DEV_CHANDRABINDU = "ँ"
DEV_VISARGA = "ः"
DEV_NUKTA = "़"

# ---------------------------------------------------------------------------
# URDU / PERSO-ARABIC MAPPINGS
# ---------------------------------------------------------------------------
URDU_COMMON_WORDS = {
    "اور": "aur",
    "بعد": "baad",
    "پر": "par",
    "ہوئے": "hue",
    "ہو": "ho",
    "ہے": "hai",
    "ہیں": "hain",
    "کا": "ka",
    "کے": "ke",
    "کی": "ki",
    "کو": "ko",
    "سے": "se",
    "میں": "main",
    "نے": "ne",
    "تھا": "tha",
    "تھی": "thi",
    "تھے": "the",
    "کیا": "kya",
    "آپ": "aap",
    "کیسے": "kaise",
    "کیسا": "kaisa",
    "کیسی": "kaisi",
    "تم": "tum",
    "ہم": "hum",
    "یہ": "yeh",
    "وہ": "woh",
    "نہیں": "nahi",
    "ہاں": "haan",
    "پکار": "pukaar",
    "تمے": "tumhein",
    "تمہیں": "tumhein",
    "گیا": "gaya",
    "گئے": "gaye",
    "گئی": "gayi",
    "دے": "de",
    "دو": "do",
    "کر": "kar",
    "کرو": "karo",
    "کریں": "karein",
    "بات": "baat",
    "کام": "kaam",
    "نام": "naam",
    "بہت": "bahut",
    "اچھا": "achha",
    "اچھی": "achhi",
    "اچھے": "achhe",
    "شکریہ": "shukriya",
    "دوست": "dost",
    "دوستو": "dosto",
    "بھائی": "bhai",
    "ویڈیو": "video",
    "چینل": "channel",
    "سبسکرائب": "subscribe",
    "لائیک": "like",
    "شیئر": "share",
}

URDU_CHARS = {
    "ا": "a", "آ": "aa", "أ": "a", "إ": "i",
    "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ث": "s",
    "ج": "j", "چ": "ch", "ح": "h", "خ": "kh",
    "د": "d", "ڈ": "d", "ذ": "z", "ر": "r", "ڑ": "r", "ز": "z", "ژ": "zh",
    "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t", "ظ": "z",
    "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ک": "k", "گ": "g",
    "ل": "l", "م": "m", "ن": "n", "ں": "n", "و": "o", "ؤ": "o",
    "ہ": "h", "ۂ": "h", "ۃ": "t", "ھ": "h", "ء": "",
    "ی": "i", "ئ": "i", "ے": "e", "ۓ": "e",
}


def _is_devanagari(text: str) -> bool:
    return any(0x0900 <= ord(c) <= 0x097F for c in text)


def _is_arabic_urdu(text: str) -> bool:
    return any((0x0600 <= ord(c) <= 0x06FF) or (0x0750 <= ord(c) <= 0x077F) or (0xFB50 <= ord(c) <= 0xFDFF) or (0xFE70 <= ord(c) <= 0xFEFF) for c in text)


def _transliterate_devanagari_word(word: str) -> str:
    clean_word = word.strip()
    if not clean_word:
        return word

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

        if c in DEV_INDEPENDENT_VOWELS:
            res.append(DEV_INDEPENDENT_VOWELS[c])
            i += 1
            continue

        if c in DEV_CONSONANTS:
            cons = DEV_CONSONANTS[c]
            i += 1

            if i < n and chars[i] == DEV_NUKTA:
                combined = c + DEV_NUKTA
                if combined in DEV_CONSONANTS:
                    cons = DEV_CONSONANTS[combined]
                i += 1

            if i < n and chars[i] == DEV_VIRAMA:
                res.append(cons)
                i += 1
            elif i < n and chars[i] in DEV_MATRAS:
                matra = DEV_MATRAS[chars[i]]
                res.append(cons + matra)
                i += 1
            elif i < n and chars[i] in (DEV_ANUSVARA, DEV_CHANDRABINDU):
                res.append(cons + "an")
                i += 1
            elif i == n:
                res.append(cons)
            else:
                res.append(cons + "a")
            continue

        if c in DEV_MATRAS:
            res.append(DEV_MATRAS[c])
            i += 1
            continue

        if c in (DEV_ANUSVARA, DEV_CHANDRABINDU):
            res.append("n")
            i += 1
            continue

        if c == DEV_VISARGA:
            res.append("h")
            i += 1
            continue

        if c == DEV_VIRAMA:
            i += 1
            continue

        res.append(c)
        i += 1

    transliterated = "".join(res)
    transliterated = re.sub(r"aa+", "aa", transliterated)
    transliterated = re.sub(r"eee+", "ee", transliterated)
    transliterated = re.sub(r"ooo+", "oo", transliterated)

    return prefix + transliterated + suffix


def _transliterate_urdu_word(word: str) -> str:
    clean_word = word.strip()
    if not clean_word:
        return word

    prefix_match = re.match(r"^([^a-zA-Z0-9؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+)", clean_word)
    prefix = prefix_match.group(1) if prefix_match else ""
    suffix_match = re.search(r"([^a-zA-Z0-9؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+)$", clean_word)
    suffix = suffix_match.group(1) if suffix_match else ""

    core_word = clean_word[len(prefix):len(clean_word) - (len(suffix) if suffix else 0)]
    if not core_word:
        return clean_word

    # Check high frequency Urdu dictionary
    if core_word in URDU_COMMON_WORDS:
        return prefix + URDU_COMMON_WORDS[core_word] + suffix

    # Rule-based character transliteration
    chars = list(unicodedata.normalize("NFC", core_word))
    res = []
    for c in chars:
        if c in URDU_CHARS:
            res.append(URDU_CHARS[c])
        else:
            res.append(c)

    transliterated = "".join(res)
    transliterated = re.sub(r"aa+", "aa", transliterated)
    return prefix + transliterated + suffix


def devanagari_to_hinglish(text: str) -> str:
    """Universal script normalizer: converts Devanagari and Urdu/Perso-Arabic tokens into clean Roman Hinglish."""
    if not text:
        return text

    tokens = text.split(" ")
    result_tokens = []
    for token in tokens:
        if _is_devanagari(token):
            result_tokens.append(_transliterate_devanagari_word(token))
        elif _is_arabic_urdu(token):
            result_tokens.append(_transliterate_urdu_word(token))
        else:
            result_tokens.append(token)

    return " ".join(result_tokens)
