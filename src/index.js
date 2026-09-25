import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './components/styles/GlobalFixes.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { applyTheme, resolvedTheme } from './utils/theme';
import 'bootstrap/dist/css/bootstrap.min.css';

// The inline script in public/index.html normally does this before paint; repeating it
// here covers any host page that strips inline scripts.
if (!document.documentElement.getAttribute('data-theme')) applyTheme(resolvedTheme());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
