# AUDIT V3.2 — True Background Removal & Structured Headquarters

Date: 2026-09-22  
Branch: `feature/v3.2-real-bg-removal-address-structure`  
PR: #28

## 1. True logo background removal

Previous remove-bg behavior was brightness-based and therefore behaved more like background treatment than actual deletion.

V3.2 changes the algorithm to connected-background deletion:
- estimate background references from outer-edge corner samples only;
- seed a flood fill from all image borders;
- accept pixels matching the estimated background colors within a configurable tolerance;
- allow a small local gradient to handle mildly uneven backgrounds;
- set accepted background pixels to alpha 0;
- anti-alias only the immediate subject boundary;
- never recolor the logo subject.

Important safety property: a background-colored pixel enclosed inside the logo is preserved because it is not connected to the image border.

The original uploaded image remains the only persistent logo asset. The transparent PNG is generated in memory for rendering.

## 2. Structured headquarters address

New state fields:
- `companyAddressDetail`
- `companyProvince`
- `companyWard`

Legacy `companyAddress` remains as a compatibility field only and is synchronized from the structured values.

UI:
- row 1: detailed address;
- row 2 inputs: Province and Ward.

Report output:
- line 1: `Trụ sở: <detail>`
- line 2: `Phường <ward>, Tỉnh <province>`
- when one value is missing, only the available administrative part is shown.

Legacy one-line states migrate into `companyAddressDetail`. Existing Tùng Gia Bảo Nam Nha Trang states also recover province `Khánh Hòa`.

## 3. Import/export compatibility

Excel:
- exports `Địa chỉ chi tiết`;
- exports `Khu vực` in Ward → Province order;
- importer recognizes legacy `Địa chỉ`, new `Địa chỉ chi tiết`, `Khu vực`, `Phường`, and `Tỉnh`.

OCR:
- extracts explicit Ward/Province tokens when present;
- recognizes Khánh Hòa from the supplied source material;
- keeps the remaining address text in detailed address.

Backup schema remains v4; all new fields are optional/backward compatible.

## 4. Regression coverage

CI #243:
- runtime dependency audit: 0 vulnerabilities;
- Core logic PASS;
- Importer logic PASS;
- PC Storage logic PASS;
- Logo Processing logic PASS;
- 37/37 DOM tests PASS;
- Smoke PASS: 269 IDs, 83 bindings, 23 preview targets;
- production build PASS.

Pixel tests specifically prove:
- non-white edge-connected backgrounds are deleted;
- enclosed background-colored pixels are preserved;
- colored subject pixels remain opaque.

DOM tests verify:
- address inputs are split correctly;
- preview order is Ward before Province;
- legacy compatibility field stays synchronized;
- remove-background UI communicates actual deletion.

## Release gate

Merge only after the final documentation head repeats:
- runtime audit;
- all logic/DOM/smoke tests;
- production build.

After merge, verify GitHub Pages for the exact merge commit.
