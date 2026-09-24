import { describe, expect, it } from 'vitest';
import { cleanHtml, normalizeAddress, visibleText } from './content';

describe('untrusted content', () => {
  it('removes active markup, network resources, and escape attempts', () => {
    const html = cleanHtml(
      '<script>parent.alert(1)</script><iframe src="https://evil.test"></iframe><meta http-equiv="refresh" content="0;url=https://evil.test"><form action="https://evil.test"><input autofocus onfocus="alert(1)"></form><img src="https://evil.test/x"><p onclick="alert(1)" style="background-image:url(https://evil.test);position:fixed;color:red">Safe words</p>',
    );
    expect(html).toBe('<p style="color:red">Safe words</p>');
  });
  it('only routes internal addresses and safe fragments', () => {
    const html = cleanHtml(
      '<a href=" Moss.ZZ " target="_top">Moss</a><a href="javascript:alert(1)" data-address="evil.zz">Bad</a><a href="https://evil.test">External</a><a href="#note">Note</a>',
    );
    expect(html).toBe(
      '<a href="#" data-address="moss.zz">Moss</a><a>Bad</a><a>External</a><a href="#note">Note</a>',
    );
  });
  it('extracts prose without joining paragraph boundaries', () => {
    expect(
      visibleText(cleanHtml('<h1>Hello</h1><p>Tea &amp; toast</p><script>hidden</script>')),
    ).toBe('Hello Tea & toast');
  });
  it('normalizes addresses without accepting real network URLs', () => {
    expect(normalizeAddress(' Tidepool.ZZ ')).toBe('tidepool.zz');
    for (const value of ['https://tidepool.zz', 'a.zz/path', '-bad.zz', 'bad-.zz', 'x.com'])
      expect(normalizeAddress(value)).toBeNull();
  });
  it('keeps searchable words separate across line breaks and table cells', () => {
    expect(
      visibleText(
        cleanHtml('<p>coral<br>reef</p><table><tr><td>sea</td><td>grass</td></tr></table>'),
      ),
    ).toBe('coral reef sea grass');
    expect(visibleText(cleanHtml('<p>red<strong>wood</strong></p>'))).toBe('redwood');
  });
  it('decodes entities once, just as the reader sees them', () => {
    expect(visibleText(cleanHtml('<p>&amp;lt; &#x1F331; &copy; &nbsp; garden</p>'))).toBe(
      '&lt; 🌱 © garden',
    );
  });
});
