/**
 * Pop-out window — the Document Picture-in-Picture API (Chrome and Edge 116+)
 * opens a small, always-on-top window that floats over every other tab and
 * app. Browsers only open one from a tap, never on their own when the student
 * switches away, so the focus coach offers a "Pop out timer" button.
 *
 * The app's styles are copied in as constructed stylesheets, which the
 * Content-Security-Policy allows (no inline <style> tags); cross-origin sheets
 * (the web fonts) are linked instead.
 */

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

function api(): DocumentPictureInPicture | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    documentPictureInPicture?: DocumentPictureInPicture
  }
  return w.documentPictureInPicture ?? null
}

export function pipSupported(): boolean {
  return api() !== null
}

function copyStyles(target: Window): void {
  const doc = target.document
  const Sheet = (target as Window & typeof globalThis).CSSStyleSheet
  const adopted: CSSStyleSheet[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')
      const copy = new Sheet()
      copy.replaceSync(css)
      adopted.push(copy)
    } catch {
      // Cross-origin rules can't be read; link the same file instead.
      if (sheet.href) {
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        doc.head.append(link)
      }
    }
  }
  doc.adoptedStyleSheets = adopted
}

/** Open the pop-out window, or null if unsupported or the browser refused. */
export async function openPipWindow(
  title: string,
  size: { width: number; height: number },
): Promise<Window | null> {
  const pip = api()
  if (!pip) return null
  try {
    const win = await pip.requestWindow(size)
    win.document.title = title
    win.document.documentElement.lang = document.documentElement.lang || 'en'
    copyStyles(win)
    win.document.body.className = 'pip-body'
    return win
  } catch {
    return null
  }
}
