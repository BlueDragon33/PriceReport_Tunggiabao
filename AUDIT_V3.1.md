# AUDIT V3.1 — Original-first Logo Rendering

Date: 2026-09-22  
Branch: `fix/v3.1-logo-original-first`  
PR: #26

## Root cause

The previous default logo state used:
- `logoTreatment = blend`;
- `logoBlendMode = multiply`;
- a radial pseudo wash behind the logo.

For JPG/light-background logos this visually removed or blended away the background even though the user had only uploaded an image. The stored image itself was not necessarily modified, but the rendered result looked like automatic background removal.

## V3.1 behavior

### Original mode — default
- New uploads always enter `logoDisplayMode = original`.
- Existing quotations without an explicit display mode migrate to Original mode.
- Original mode disables blend/filter/mask/clip/opacity/pseudo-wash effects.
- Background treatment is effectively `none`.
- The original Data URL remains the only stored logo asset.

### Remove light background — optional
- User must explicitly choose `Tách nền sáng`.
- A PNG render copy is generated in memory using a light, low-saturation threshold.
- Adjustable threshold: 210–254.
- The original stored image is not overwritten.
- Processing failure falls back to the original source.

### Styled mode — optional
- User must explicitly choose `Hiệu ứng / hòa nền nâng cao`.
- Existing blend modes and backdrop controls become available only in this mode.

### Restore original
The `Khôi phục logo gốc` action switches back to:
- Original mode;
- normal blend;
- no backdrop treatment;
- zero backdrop opacity;
- no backdrop border.

## Data safety

No new logo copy is written into LocalStorage. The original file remains in:
`tunggiabao-price-report-logo-v1`.

The processed background-removed image is held only in memory cache and can always be discarded without data loss.

## Regression coverage

CI #237:
- runtime audit: 0 vulnerabilities;
- Core logic PASS;
- Importer logic PASS;
- PC Storage logic PASS;
- Logo Processing logic PASS;
- 35/35 DOM tests PASS;
- Smoke PASS: 265 IDs, 81 bindings, 22 preview targets;
- Vite production build PASS.

Pixel-level tests verify:
- white pixels become transparent only in opt-in processing;
- saturated colored logo pixels stay opaque;
- mode normalization falls back to Original.

DOM tests verify:
- Original is the default;
- remove-bg controls stay hidden until requested;
- styled controls stay hidden until requested;
- Restore Original disables blend/backdrop processing.

## Release criterion

Merge only after final documentation head repeats:
- runtime security audit;
- all logic/DOM/smoke tests;
- production build.

After merge, confirm GitHub Pages for the exact merge commit.
