# e-invoice

Notes for AI sessions in this repository. The owner speaks Malay: reply to him in Malay; write code, comments and docs in English.

## Website checks (owner, 3/11/2026)

The owner tests a live site with these free scanners and sends screenshots
(owner: "set semua ujian tu dlm readme kt semua sesi dan projek"). A cloud
session cannot open them (the sandbox blocks their hosts), so give him the
links with the site's address filled in, then read his screenshots.

| Check | Link (put the site's address in) | Grade |
|---|---|---|
| Security headers | https://securityheaders.com/?q=DOMAIN&followRedirects=on | A+ to F |
| HTTPS certificate | https://www.ssllabs.com/ssltest/analyze.html?d=DOMAIN | A+ to F |
| Speed, Google | https://pagespeed.web.dev/report?url=https%3A%2F%2FDOMAIN | 0-100, Mobile and Desktop tabs |
| Security, Mozilla | https://developer.mozilla.org/en-US/observatory/analyze?host=DOMAIN | A+ to F |
| Speed, GTmetrix | https://gtmetrix.com (type `https://DOMAIN`, then Test your site) | A to F |

- After a change to hosting, headers, images, scripts or how pages load, ask
  him to run the checks again and compare with the last results below. A
  grade that drops is a bug to fix before other work.
- Write each new result below (date and grades) in the same commit as the
  change that moved it.
- Never weaken a security header or HTTPS to win a speed score.
- A strict Content-Security-Policy (a list of allowed scripts) can break
  sign-in, analytics, payments and ads: propose it with what it risks, never
  ship it without his "lulus".

Live address: not known yet. Ask the owner the first time, put it in place of DOMAIN above, and write the results here.
