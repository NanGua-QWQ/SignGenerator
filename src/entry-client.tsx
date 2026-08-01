import { hydrateRoot } from 'react-dom/client'
import { loadFont } from './features/sign-generator/generators/svg-text'
import { Root } from './root'

void Promise.all([loadFont('a'), loadFont('b')])

hydrateRoot(document.getElementById('root')!, <Root />)
