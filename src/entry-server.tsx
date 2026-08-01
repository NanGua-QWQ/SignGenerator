import { renderToString } from 'react-dom/server'
import { Root } from './root'

export function render(url: string): string {
  const previousSearch = (globalThis as { __SIGN_GENERATOR_SEARCH__?: string })
    .__SIGN_GENERATOR_SEARCH__
  ;(globalThis as { __SIGN_GENERATOR_SEARCH__?: string }).__SIGN_GENERATOR_SEARCH__ = new URL(
    url,
    'http://localhost',
  ).search
  try {
    return renderToString(<Root />)
  } finally {
    if (previousSearch === undefined) {
      delete (globalThis as { __SIGN_GENERATOR_SEARCH__?: string }).__SIGN_GENERATOR_SEARCH__
    } else {
      ;(globalThis as { __SIGN_GENERATOR_SEARCH__?: string }).__SIGN_GENERATOR_SEARCH__ =
        previousSearch
    }
  }
}
