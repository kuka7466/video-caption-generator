import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transliterate import devanagari_to_hinglish


def test_devanagari_to_hinglish_arbitrary_sentences():
    # Test conversational greeting
    out1 = devanagari_to_hinglish("क्या हाल है? आप कैसे हो")
    assert "kya" in out1.lower()
    assert "haal" in out1.lower()
    assert "hai" in out1.lower()
    assert "aap" in out1.lower()
    assert "kaise" in out1.lower()
    assert "ho" in out1.lower()

    # Test arbitrary general sentence (भारत देश -> bhaarat desh)
    out2 = devanagari_to_hinglish("भारत देश")
    assert "bhaarat" in out2.lower() or "bharat" in out2.lower()
    assert "desh" in out2.lower()

    # Test non-devanagari passthrough
    out3 = devanagari_to_hinglish("Hello world 123")
    assert out3 == "Hello world 123"
