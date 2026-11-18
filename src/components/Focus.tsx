/**
 * Focus — the Focus tab: the study-block coach plus offline soundscapes. The
 * timer, the pop-out window and the sound player all live at app level, so
 * they keep going while the student uses other tabs.
 */

import type { AmbientPlayer } from '../hooks/useAmbientSound'
import type { CalmStore } from '../hooks/useCalmStore'
import type { FocusSession } from '../hooks/useFocusSession'
import type { PipControl } from '../hooks/usePipWindow'
import FocusCoach from './FocusCoach'
import Soundscapes from './Soundscapes'

interface Props {
  store: CalmStore
  session: FocusSession
  ambient: AmbientPlayer
  pip: PipControl
}

export default function Focus({ store, session, ambient, pip }: Props) {
  return (
    <>
      <FocusCoach store={store} session={session} pip={pip} />
      <Soundscapes ambient={ambient} />
    </>
  )
}
