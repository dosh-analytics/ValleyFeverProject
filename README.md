# Valley Fever Heatmap

A draft web page from the Cal/OSHA Research Program Office, California Department of Industrial Relations.
It shows where California's climate most resembles places people already catch Valley Fever
(coccidioidomycosis), how many people work outdoors there, and how many cases each county reports.
Visitors can also look up a California address.

**Status: draft for Cal/OSHA review.** Not yet an official publication and not workplace safety guidance.
The page asks search engines not to index it until it is cleared.

## Viewing it

Once GitHub Pages is on for this repository, the page is at
`https://dosh-analytics.github.io/ValleyFeverProject/`.
To view it locally, open `index.html` in a browser, or run `python3 -m http.server` in this folder and
go to `http://localhost:8000`.

## Files

```
index.html                 page markup, including the county and area outlines of the map (inline SVG)
css/site.css               page styles
css/address-search.css     styles for the address lookup
js/app.js                  map, year-by-year view, Kern County close-up, section menu
js/address-search.js       address lookup
data/map-data.js           county and area figures (CD, PD, WP, WC, WS), one entry per line
data/year-by-year.js       model rank, reported rate and count, and winter rain by county, 2001 to 2023
data/kern.js               Kern County close-up figures
data/lookup.js             map projection, climate bands by 4 km square, and cases by month
img/                       climate layer images, Cal/OSHA logo, validation chart
fonts/public-sans.woff2    Public Sans typeface (self-hosted, no font service)
```

There is no build step and no dependency. Every file is static. The scripts are plain JavaScript loaded
in order at the end of `index.html`; `js/app.js` and `js/address-search.js` read the globals that
the `data/` files define.

## How the address lookup works

1. As someone types, the page asks **Photon** (photon.komoot.io, built on OpenStreetMap) for California
   suggestions. When they press Enter on a street address, it asks the **U.S. Census Bureau geocoder**
   first, since it knows address ranges, and falls back to Photon. The Census geocoder does not allow
   cross-site requests, so it is called as JSONP.
2. Those two calls are the only network requests the lookup makes. The page stores nothing that is typed.
3. The point is placed on the map. The map uses plain longitude and latitude, so a point maps to
   `x = ax*lon + bx`, `y = ay*lat + by` (values in `data/lookup.js`). The county comes from the geocoder
   when it reports one, and otherwise from the county outlines on the map. The area (2020 Public Use
   Microdata Area) comes from the area outlines.
4. The result shows three things, kept separate on purpose:
   - **Reported illness in the county**, 2019 to 2023, compared with the state rate and with the
     20 cases per 100,000 a year that Labor Code 6709 uses to define a highly endemic county.
   - **Climate match at that spot**, from the 4 km square the point falls in, as one of four bands
     (each a quarter of California's land squares).
   - **The month**, as the statewide share of a year's cases reported in that month, 2018 to 2025.
     There is no county or weekly case series to go finer.

Before switching geocoders (for example to a state-licensed service), keep the same output: a label,
longitude, latitude and, if available, the county name. See `photon()` and `census()` in
`js/address-search.js`.

## Data sources

- Reported cases: California Health and Human Services Open Data, infectious disease cases by county and year.
- Climate: PRISM Climate Group, Oregon State University, 4 km monthly data; climate match from a MaxEnt model.
- Outdoor workers: U.S. Census Bureau, American Community Survey.
- Employer sites: business directory extract of California sites with five or more employees, shown only
  as area and county totals, with small counts suppressed.
- Address lookup: Photon and OpenStreetMap contributors; U.S. Census Bureau Geocoder.

## Contact

Cal/OSHA Research Program Office, California Department of Industrial Relations.
