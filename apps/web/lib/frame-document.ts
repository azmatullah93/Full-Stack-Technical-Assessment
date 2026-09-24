export function documentHtml(html: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>
* {
  box-sizing: border-box;
}
html {
  color-scheme: light;
  scroll-behavior: auto;
}
body {
  margin: 0;
  background: #fffef9;
  color: #344438;
  font:
    17px/1.85 Georgia,
    "Times New Roman",
    serif;
  overflow-wrap: anywhere;
}
body > main {
  max-width: 740px;
  margin: 0 auto;
  padding: 62px 54px 90px;
}
h1,
h2,
h3 {
  color: #273e30;
  font-weight: 400;
  line-height: 1.18;
  letter-spacing: -0.035em;
}
h1 {
  font-size: clamp(34px, 5vw, 49px);
  margin: 24px 0 32px;
}
h2 {
  font-size: 27px;
  margin-top: 40px;
}
h3 {
  font-size: 23px;
}
p {
  margin: 0 0 24px;
}
a {
  color: #3e6950;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}
a:hover {
  color: #192f22;
}
a:focus-visible,
summary:focus-visible {
  outline: 2px solid #718b5d;
  outline-offset: 5px;
}
blockquote {
  margin: 34px 0;
  padding: 16px 24px;
  border-left: 2px solid #bdcba7;
  color: #76806b;
  font-style: italic;
}
li {
  margin: 10px 0;
}
pre {
  overflow: auto;
  padding: 20px;
  background: #efefe6;
  font: 14px/1.6 monospace;
}
code {
  font-size: 0.85em;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  padding: 10px;
  border: 1px solid #dedfd2;
}
hr {
  border: 0;
  border-top: 1px solid #dedfd2;
  margin: 30px 0;
}
details {
  margin: 32px 0;
  padding: 16px 20px;
  border: 1px solid #e2e4d7;
  border-radius: 6px;
  font-size: 15px;
}
summary {
  cursor: pointer;
}
details p {
  margin: 16px 0 0;
}
@media (max-width: 600px) {
  body > main {
    padding: 36px 24px 60px;
  }
  body {
    font-size: 16px;
  }
}
</style></head><body><main>${html}</main></body></html>`;
}
