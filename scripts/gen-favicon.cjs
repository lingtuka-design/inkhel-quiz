const fs = require('fs');
const path = require('path');

const logoSvg = fs.readFileSync(path.resolve('public', 'logo.svg'), 'utf8');

// Strip outer <svg ...> and </svg>
const defsAndContent = logoSvg
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="favGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#d946ef" />
    </linearGradient>
  </defs>
  <rect width="600" height="600" rx="150" fill="url(#favGrad)" />
  <g transform="matrix(0.86, 0, 0, 0.86, 42, 42)">
    ${defsAndContent}
  </g>
</svg>`;

fs.writeFileSync(path.resolve('public', 'favicon.svg'), faviconSvg);
console.log('Successfully generated public/favicon.svg!');
