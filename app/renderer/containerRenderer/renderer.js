import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App.js'
import qs from 'query-string'

const rootDom = ReactDOM.createRoot(document.getElementById('root'))

const params = new Proxy(new URLSearchParams(global.location), {
  get: (searchParams, prop) => {
    return searchParams.get(prop)
  },
})

const objParams = qs.parse(params.search, { allowDots: true });

rootDom.render(
  <App config={objParams} />
)
