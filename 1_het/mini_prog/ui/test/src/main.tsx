import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { OpenWindow } from './openWindow.tsx'

render(<OpenWindow />, document.getElementById('app')!)
