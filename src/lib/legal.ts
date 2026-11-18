/**
 * Privacy policy and terms of use, as typed content. Written to match what the
 * code actually does (see storage.ts, api/*, src/device/errorReporter.ts); if
 * the data flow changes, update this text and bump AI_CONSENT_VERSION in
 * storage.ts so students are asked again.
 *
 * Needs legal review before a public launch. The operator's name and contact
 * come from VITE_OPERATOR_NAME / VITE_CONTACT_EMAIL (see LegalPage).
 */

export type LegalDoc = 'privacy' | 'terms'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  points?: string[]
}

export interface LegalText {
  title: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_UPDATED = '11 November 2026'

const PRIVACY: LegalText = {
  title: 'Privacy policy',
  intro:
    'MindFuel is built so your journal stays yours. There is no account, no sign-up and no database of your entries. This page explains exactly what happens to what you type.',
  sections: [
    {
      heading: 'What stays on your device',
      paragraphs: [
        'Your profile (your first name if you gave one, your exam and its date), your check-ins and their reflections, your calm-activity history, your preferences and your safety plan are saved in this browser, on this device. We cannot see them.',
        'Anyone who uses this browser profile can see them, so on a shared device use your own browser profile, or delete your data when you finish. Clearing your browser data erases them; download a backup if you want to keep them.',
      ],
    },
    {
      heading: 'What is sent, and when',
      paragraphs: [
        'Only when you use an AI feature, and only after you have agreed:',
      ],
      points: [
        'Reflect: the entry you are submitting, its mood and tags, your exam and exam date, and a one-line summary of your recent moods (for example “mood averaging 2.4/5 over 5 check-ins”). Not your name, and not your other entries.',
        'Companion: the last 20 messages of the current conversation, with your exam, exam date and the same one-line mood summary.',
        'Our server passes this to Google’s Gemini AI to write the reply, and sends the reply back. We do not store it, and we do not write it to our logs.',
        'Calm now, the Calm toolkit, Focus, Learn and your safety plan never send anything.',
      ],
    },
    {
      heading: 'Google, our AI provider',
      paragraphs: [
        'Google processes what is sent on our behalf, under the Gemini API terms for paid services. It is not used to train or improve Google’s products. Google may keep it for a limited time to detect abuse and meet legal obligations, and it may be processed outside India.',
      ],
    },
    {
      heading: 'Technical data',
      points: [
        'Like any website, our hosting provider (Vercel) receives your IP address and basic request details in order to deliver the site.',
        'To prevent abuse, we count requests using a one-way scrambled (hashed) form of your IP address, never the address itself. These counts are kept for at most 24 hours, with our database provider (Upstash).',
        'If the app hits an error, it sends a short technical report: the error message, a technical trace of where in the code it happened, the page path and the app version. Never your journal text. These reports stay in our hosting logs for a limited time.',
        'The app’s fonts load from Google Fonts, which also receives your IP address.',
      ],
    },
    {
      heading: 'What we never do',
      paragraphs: [
        'No ads. No selling or sharing your data. No analytics or tracking. No cookies. No profile of you on our side.',
      ],
    },
    {
      heading: 'Your choices',
      points: [
        'Turn the AI features off at any time, at the bottom of the app. Nothing is sent after that.',
        'Download a backup of your data, restore one, or delete everything on this device with “Delete my data”.',
        'Because we do not keep your journal, there is nothing of it on our side to delete.',
      ],
    },
    {
      heading: 'If you are under 18',
      paragraphs: [
        'Please use the AI features only with your parent or guardian’s permission. Everything else in MindFuel works without sending anything.',
      ],
    },
    {
      heading: 'Not medical care',
      paragraphs: [
        'MindFuel is a support tool, not a doctor, therapist or crisis service. If you might be in danger, call 112 (emergency) or 14416 (Tele-MANAS, free, 24/7).',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'If what is sent, or who receives it, changes, we will update this page and ask for your agreement again before the next AI use.',
      ],
    },
  ],
}

const TERMS: LegalText = {
  title: 'Terms of use',
  intro:
    'MindFuel is free to use. By using it, you agree to these terms. They are short and in plain language.',
  sections: [
    {
      heading: 'What MindFuel is',
      paragraphs: [
        'A self-help wellness companion for exam stress. It is not medical care, therapy, diagnosis or a crisis service, and it does not replace a doctor, counsellor or therapist.',
      ],
    },
    {
      heading: 'In an emergency',
      paragraphs: [
        'Do not wait for the app. Call 112 (emergency services) or 14416 (Tele-MANAS, free, 24/7), or go to the nearest hospital.',
      ],
    },
    {
      heading: 'AI replies',
      paragraphs: [
        'Reflections and Companion replies are written by an AI model. They can be wrong, incomplete or not right for you. Use your own judgement, and do not make health decisions based on them.',
      ],
    },
    {
      heading: 'Fair use',
      points: [
        'Use MindFuel for yourself, not commercially.',
        'Do not try to break, overload or misuse the service, or use it to harm anyone.',
        'The AI features have usage limits, so they stay available for everyone.',
      ],
    },
    {
      heading: 'Your data',
      paragraphs: [
        'Your data is stored on your device, and keeping a backup is up to you. The privacy policy explains what is sent and when.',
      ],
    },
    {
      heading: 'If you are under 18',
      paragraphs: [
        'Use the AI features only with your parent or guardian’s permission.',
      ],
    },
    {
      heading: 'Availability',
      paragraphs: [
        'MindFuel is provided free and “as is”. We may change, pause or stop it at any time. To the extent the law allows, we are not responsible for losses that come from using it.',
      ],
    },
    {
      heading: 'Changes to these terms',
      paragraphs: [
        'We may update these terms. The date at the top shows when they last changed.',
      ],
    },
  ],
}

export const LEGAL: Record<LegalDoc, LegalText> = {
  privacy: PRIVACY,
  terms: TERMS,
}
