'use client'

import {
  useRouter,
} from 'next/navigation'

import {
  ALL_TEMPLATES,
  TEMPLATE_TITLES,
} from '@/lib/sign-model'
import {
  useSignWorkspace,
} from '@/state/use-sign-workspace'

export default function NewSignPage() {
  const {
    addSign,
  } = useSignWorkspace()
  const router = useRouter()

  const handleSelect = (template: (typeof ALL_TEMPLATES)[number]) => {
    addSign(template)
    router.push('/')
  }

  return (
    <ul className="space-y-2 mx-auto max-w-2xl px-4 py-8">
      {ALL_TEMPLATES.map(template =>
        <li key={template}>
          <button
            type="button"
            onClick={() => handleSelect(template)}
            className="w-full rounded-md border bg-muted/50 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {TEMPLATE_TITLES[template]}
          </button>
        </li>,
      )}
    </ul>
  )
}
