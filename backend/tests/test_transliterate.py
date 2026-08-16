import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transliterate import devanagari_to_hinglish


def test_devanagari_to_hinglish_arbitrary_sentences():
    # Test conversational Devanagari greeting
    out1 = devanagari_to_hinglish("क्या हाल है? आप कैसे हो")
    assert "kya" in out1.lower()
    assert "haal" in out1.lower()
    assert "hai" in out1.lower()
    assert "aap" in out1.lower()
    assert "kaise" in out1.lower()
    assert "ho" in out1.lower()

    # Test Devanagari sentence
    out2 = devanagari_to_hinglish("भारत देश")
    assert "bhaarat" in out2.lower() or "bharat" in out2.lower()
    assert "desh" in out2.lower()

    # Test Urdu / Perso-Arabic tokens conversion
    out3 = devanagari_to_hinglish("اور last dose of what you want to be next")
    assert "aur" in out3.lower()
    assert "last dose of what you want to be next" in out3.lower()

    # Test Urdu sentence from user screenshot
    out4 = devanagari_to_hinglish("بعد بعد پر تمے پکار ہوئے کا دے")
    assert "baad" in out4.lower()
    assert "par" in out4.lower()
    assert "tumhein" in out4.lower()
    assert "pukaar" in out4.lower()
    assert "hue" in out4.lower()
    assert "ka" in out4.lower()
    assert "de" in out4.lower()

    # Test non-indic Latin passthrough
    out5 = devanagari_to_hinglish("Hello world 123")
    assert out5 == "Hello world 123"
