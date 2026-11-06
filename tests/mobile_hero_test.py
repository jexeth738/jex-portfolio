"""Regression guard for the reviewed mobile hero composition, not a visual test."""
from pathlib import Path
import re
import unittest
ROOT = Path(__file__).resolve().parents[1]

class MobileHeroRegression(unittest.TestCase):
    def test_mobile_only_art_framing_and_contrast_patch(self):
        css = (ROOT / 'styles.css').read_text()
        marker = '/* Mobile hero QA: contrast and artwork framing only. */'
        self.assertIn(marker, css, 'Missing mobile-only QA correction')
        patch = css.split(marker, 1)[1].strip()
        self.assertTrue(patch.startswith('@media (max-width: 760px) {'))
        self.assertRegex(patch, r'\.hero-art\s*\{\s*top:\s*64px;\s*\}')
        self.assertRegex(patch, r'\.hero-art img\s*\{\s*object-position:\s*78% top;\s*\}')
        self.assertRegex(patch, r'\.hero \.eyebrow\s*\{[^}]*background:\s*#071318ed;')
        self.assertRegex(patch, r'\.hero \.eyebrow\s*\{[^}]*color:\s*#ffe2a0;')
        self.assertRegex(patch, r'\.world-label\s*\{\s*display:\s*none;\s*\}')
        # Every declaration in this patch must remain nested in the mobile query.
        depth = 0
        for char in patch:
            depth += (char == '{') - (char == '}')
            self.assertGreaterEqual(depth, 0)
        self.assertEqual(depth, 0)
        self.assertEqual(patch.rfind('}'),len(patch)-1)

if __name__ == '__main__':unittest.main(verbosity=2)
