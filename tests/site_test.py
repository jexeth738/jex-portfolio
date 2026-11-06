"""Dependency-free acceptance checks. Run from the site root."""
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

class Document(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text()
        cls.css = (ROOT / 'styles.css').read_text()
        cls.doc = Document(cls.html)
        cls.links = [a['href'] for t,a in cls.doc.elements if t=='a' and 'href' in a]
    def test_real_jex_work_and_both_contacts(self):
        for url in [
            'https://x.com/Jexeth017', 'https://t.me/Jexeth017',
            'https://github.com/jexeth738/hamster-city', 'https://squeekcity.space',
            'https://x.com/Jexeth017/status/2117973562481119439',
            'https://x.com/Jexeth017/status/2116578401914151278',
        ]: self.assertIn(url, self.links)
        for name in ['Squeek City', 'Grand Theft Hamster', 'String art', 'Digital creator', 'NFT collector']:
            self.assertIn(name.lower(), self.html.lower())
        self.assertIn('0xyas &amp; Jex',self.html)
    def test_professional_copy_and_no_misattributed_work(self):
        for bad in ['empty hype', 'self-described', 'Specific art picks', 'rank claims', 'iNeed', 'Bountix', 'community threads', 'salsabila2507']:
            self.assertNotIn(bad.lower(),self.html.lower())
    def test_full_scene_has_real_local_art_and_animation(self):
        for name in ['freefire-action.webp','bermuda-coast.webp','ignis.webp','squeek-city.webp']:
            self.assertTrue((ROOT/'assets'/name).exists(),name)
            self.assertIn(name,self.html+self.css)
        self.assertTrue(any(t=='canvas' for t,a in self.doc.elements))
        self.assertTrue(any(t=='script' and a.get('src')=='scene.mjs' for t,a in self.doc.elements))
        for element in ['airdrop','palm','mist','scene-depth']:
            self.assertIn(element,self.html+self.css)
    def test_all_referenced_local_files_exist(self):
        references=[]
        for tag,attrs in self.doc.elements:
            if 'src' in attrs:references.append(attrs['src'])
            if tag=='link' and 'href' in attrs:references.append(attrs['href'])
        references += re.findall(r'url\([\'"]?([^\)\'\"]+)',self.css)
        for ref in references:
            if not ref.startswith(('http:','https:','data:','#')):
                self.assertTrue((ROOT/unquote(ref)).is_file(),ref)
    def test_accessible_fallback_and_motion_controls(self):
        self.assertIn('prefers-reduced-motion',self.css)
        self.assertIn('motion-toggle',self.html)
        self.assertTrue(any(t=='a' and a.get('class')=='skip-link' for t,a in self.doc.elements))
        self.assertIn('aria-pressed',self.html)
        self.assertNotRegex(self.html,r'<[^>]+(?:class|id)=[\'"][^\'"]*(?:preloader|loading-screen)')
        self.assertNotRegex(self.css,r'\.reveal\s*\{[^}]*opacity\s*:\s*0')
        self.assertEqual(sum(t=='h1' for t,a in self.doc.elements),1)
        self.assertIn('not affiliated',self.html.lower())
    def test_anchors_and_ids_are_valid(self):
        ids=[a['id'] for t,a in self.doc.elements if 'id' in a]
        self.assertEqual(len(ids),len(set(ids)))
        for link in self.links:
            if link.startswith('#'):self.assertIn(link[1:],ids)
        for tag,a in self.doc.elements:
            if tag=='a' and a.get('target')=='_blank':self.assertIn('noopener',a.get('rel',''))
            if tag=='img':self.assertIn('alt',a)
    def test_no_runtime_third_party_dependencies(self):
        for tag,a in self.doc.elements:
            if tag=='script':self.assertFalse(a.get('src','').startswith('http'))
            if tag=='link':self.assertFalse(a.get('href','').startswith('http'))
        self.assertNotIn('https://',self.css)

if __name__=='__main__':unittest.main(verbosity=2)
