/**
 * Disclaimer — the persistent reminder that MindFuel is supportive, not a
 * substitute for professional care, plus links to the privacy policy, terms
 * and the shareable parent guide.
 */

import { PARENT_GUIDE_HASH, PRIVACY_HASH, TERMS_HASH } from '../lib/routes'
import { SUPPORT_DISCLAIMER } from '../lib/safety'

export default function Disclaimer() {
  return (
    <footer className="disclaimer">
      <p>{SUPPORT_DISCLAIMER}</p>
      <nav aria-label="About MindFuel" className="footer-links">
        <a href={PRIVACY_HASH}>Privacy</a>
        <a href={TERMS_HASH}>Terms</a>
        <a href={PARENT_GUIDE_HASH}>For parents</a>
      </nav>
    </footer>
  )
}
