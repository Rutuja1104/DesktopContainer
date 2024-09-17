import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import EnablementKeyLogin from './component/EnablementKeyLogin'

// const root = document.createElement('div')
// root.id = 'root'
// document.body.appendChild(root)
const rootDom = ReactDOM.createRoot(document.getElementById('root'))

rootDom.render(
  <React.StrictMode>
    <EnablementKeyLogin />
  </React.StrictMode>,
)
