# Parent Possible Program Finder

A county-based finder for Parents as Teachers (PAT) and HIPPY home visiting programs in Colorado. Families or caseworkers pick their county, filter by program, child's age, and language, and send an "I'm interested" request to a site.

Built by Duke Global Research and Consulting for Parent Possible, fall 2026.

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The finder page. One self-contained file with no outside dependencies except Google Fonts. |
| `template.html` | The source for `index.html`, before the data is filled in. Edit this, not `index.html`. |
| `update.html` | The form a PAT or HIPPY site uses to send Parent Possible an update. Built from `src/update.html`. |
| `admin.html` | The Parent Possible staff screen: review update requests, see what needs attention, edit sites, publish. Built from `src/admin.html`. |
| `src/shared.js`, `src/base.css` | Rules and styles the pages share, such as how long an enrollment answer stays current. |
| `data/sites.json` | The one approved site list. All three pages read it. It starts as the 33 PAT and HIPPY sites cleaned from the "Overall" tab of the Site Update spreadsheet. |
| `data/co_counties.json` | Colorado county map shapes. |
| `data/co_zips.json` | Each Colorado ZIP code and the counties it falls in (HUD ZIP-to-county crosswalk). Rebuild with `scripts/make-zips.py`. |
| `scripts/` | Scripts that rebuild the data and the page. |
| `wordpress-plugin/` | A small WordPress plugin that puts the finder on any page with `[program_finder]`. |

## Keeping the list up to date

The finder is only as good as the list behind it, so the list has one home (`data/sites.json`) and one way in.

1. **A site sends an update** with `update.html`. It picks its program, says whether it is taking new families in each county it serves, and fixes any details that are wrong. Parent Possible can email each site its own link (`update.html?site=...`), which skips the first step. The staff screen has a "Copy reminder" button that writes that email.
2. **One Parent Possible staff member reviews it** on `admin.html`. Nothing a site sends reaches the finder until it is approved. Each change can be accepted or left out on its own, and the screen flags a sender whose email doesn't match the listing.
3. **Staff publish.** Approved requests and direct edits collect as unpublished edits. Staff can preview them in the finder (`index.html?preview=1`), then download the new `sites.json`, replace `data/sites.json`, run `python3 scripts/build.py`, and commit.

Two rules are built in:

- **Enrollment belongs to a site in a county.** A site's phone number or referral email is shared by every county it serves, so one edit changes all of them. Its enrollment status is set county by county. Every change on the update form and the staff screen is labeled "All 6 counties" or "Pueblo County only" so the reach is clear before anyone saves.
- **An old answer becomes "not confirmed", never "closed".** Each enrollment answer carries the date it was confirmed. After 45 days the finder stops showing it and says "Call to check openings" instead. The 45 days, and the 180 days for re-checking the rest of a listing, are starting proposals. Both are at the top of `src/shared.js`.

The staff screen's "Needs attention" tab is worked out from the list each time it opens: sites with no working referral email, counties whose enrollment was never confirmed or has expired, answers about to expire, missing details, and listings nobody has checked recently. Staff can also mark a referral email as bouncing, which sends that site's family requests to Parent Possible until it is fixed.

The finder shows enrollment only once at least one site has a current answer. The real list has none yet, so the finder looks the same as before. To see the whole workflow, open `admin.html`, go to Publish > Demo tools > Load sample data, then use "Preview in the finder". Sample data stays in that browser and is never written to `data/sites.json`.

### What is still a prototype

There is no server yet, so:

- The update form does not send anything. It shows the email Parent Possible would get and saves the request in the same browser, where the staff screen picks it up. A request can also be copied as a code and pasted into the staff screen on another computer.
- The staff screen has no login and keeps unpublished edits in the browser it was opened in.
- Publishing is the three manual steps above.

The live version needs the update form to post to a form service or a WordPress form, the staff screen to sit behind the WordPress login, and publishing to be one button.

## Start over from the spreadsheet

To rebuild the list from a new version of Parent Possible's spreadsheet:

```
python3 scripts/clean.py "Site Update 2025-26.xlsx" > data/sites.json
python3 scripts/build.py
```

Then commit and push. GitHub Pages republishes the pages within a minute or two. The script needs `openpyxl` (`pip install openpyxl`).

This replaces the whole list, including enrollment answers and anything approved on the staff screen, because the spreadsheet has no columns for them. Once sites are sending updates, change the list through the staff screen instead. "Download as a spreadsheet" on its Publish tab gives a current copy, one row per program and county, for anyone who still wants the list in Excel.

## Put it on the WordPress site

1. In this repo on GitHub, go to Settings > Pages, set the source to "Deploy from a branch", branch `main`, folder `/ (root)`. The finder will be live at https://doumifrog.github.io/ppp-finder/.
2. Zip the `wordpress-plugin/pp-program-finder` folder (or use the ready-made `pp-program-finder.zip`), then in WordPress go to Plugins > Add New > Upload Plugin and activate it.
3. The plugin already points at https://doumifrog.github.io/ppp-finder/. If the page moves, update the link in Settings > Program Finder.
4. Add the shortcode `[program_finder]` to any page.

The iframe resizes itself to fit the finder, so there's no inner scroll bar.

If installing plugins isn't allowed on the site, paste this into a Custom HTML block instead (replace the link):

```html
<iframe id="pp-finder" src="https://doumifrog.github.io/ppp-finder/" title="Find a home visiting program" style="width:100%;border:0;height:1400px"></iframe>
<script>
window.addEventListener('message', function (e) {
  var f = document.getElementById('pp-finder');
  if (e.source === f.contentWindow && e.data && e.data.type === 'pp-finder-height') f.style.height = e.data.height + 'px';
});
</script>
```

The finder's footer links to the update form, so the form opens inside the same frame. To put the update form on a page of its own, use the same Custom HTML block with `update.html` at the end of the link.

## Language

The page has an English/Español toggle. It opens in Spanish when the visitor's browser is set to Spanish, remembers the visitor's choice, and can be forced with `?lang=es` or `?lang=en` on the page link. All page text is in the `T` object near the top of the script in `template.html`.

The update form and the staff screen are in English only, since program and Parent Possible staff use them.

## Still to do before launch

- Have a native Spanish speaker at Parent Possible review the Spanish text, including the new enrollment wording ("Acepta familias nuevas", "Lista de espera", "Llame para preguntar si hay cupo").
- Agree with Parent Possible who reviews update requests, and how often sites are asked to confirm enrollment.
- Give the update form somewhere to send requests, put the staff screen behind a login, and remove the "Prototype for review" banners in `src/update.html` and `src/admin.html` (see "What is still a prototype").

- The interest form is a mock. It shows the email it would send but doesn't send anything. Sending needs a form service (for example Formspree or a WordPress form plugin like Gravity Forms) and Parent Possible's intake email for the CC.
- Only 12 of 33 sites have an email on file (all 11 HIPPY sites and Roots Family Center PAT). Requests for the other sites go to Parent Possible to forward.
- Remove the "Prototype for review" banner at the top of `template.html`.
- The form must never ask about immigration or legal status.
