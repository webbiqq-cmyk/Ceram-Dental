# Ceram editorial imagery

Created with the built-in image generation tool for this local redesign.
These are illustrative clinic scenes, not photographs of the actual premises.
Existing doctor portraits and product imagery remain associated with their records.

## Treatment suite

Live assets: `public/images/editorial/home-hero-{600,1440}.webp`

Prompt: Photorealistic architectural editorial photograph for a luxury dental
clinic website. Wide landscape 1536x1024. Daylight through sheer curtains,
pearl white walls, an amethyst upholstered dental chair clearly visible on
the right, clinical equipment, overhead dental lamp, restrained brushed
gold fittings and white cabinetry. Uncluttered left third for text.
No people, logos, words, signs or collage.

## Ceramics studio

Live assets: `public/images/editorial/service-restorative-{600,1440}.webp`

Prompt: Photorealistic premium dental ceramics laboratory editorial photograph.
Wide landscape 1536x1024. Ivory ceramic crowns and a dental arch model on a
white stone laboratory bench, fine ceramic brush, precision tools and an
intraoral scanner. Daylight, softly visible amethyst cabinetry, restrained
champagne details. Readable foreground objects with tactile translucency.
No people, logos, lettering, text, collage or gore.

## Review content

The homepage review carousel contains explicitly labelled illustrative copy.
Replace it with approved patient testimonials before presenting it as real
patient feedback.

## Completed section replacements

Eight remaining fallback images were replaced using the built-in image generation tool.
All 13 editorial slots now have their own image, with 600px and 1440px WebP
versions in `public/images/editorial/`. No pending fallback mappings remain.

Prompt shared by the eight new assets: Create one photorealistic editorial image
for a premium dental website. Landscape 1536x1024, 3:2 composition. Cohesive pearl
white, pale amethyst, light oak and restrained champagne metal palette. Natural
soft daylight, believable materials, refined uncluttered composition. No text,
logos, watermarks, collage or identifiable people. This is illustrative imagery.

Scene prompts:

- `services-hero`: Private dental consultation room with two comfortable plum chairs at a round pale oak desk, daylight from side window, eye-level wide interior view.
- `service-cosmetic`: Macro still life of thin translucent ceramic veneers arranged individually on a lavender ceramic tray beside a dental shade guide, fine surface detail.
- `service-digital`: A modern wireless intraoral scanner on its stand beside a dental implant demonstration model, clean technology bench, close three-quarter view.
- `about-hero`: Light-filled curved clinic corridor with an arched seating alcove, violet upholstered bench and tall window, architectural wide perspective.
- `about-craft`: Close-up of gloved dental technician hands carefully hand-finishing a single ceramic crown using a fine ceramic brush at a laboratory workbench.
- `contact-consultation`: Intimate patient consultation nook, two ivory armchairs facing across a small round table with a closed folder, lavender wall and window garden view.
- `shop-care`: Premium unbranded oral care essentials: toothbrush, dental floss container and clear retainer in an open case, neatly arranged on pale lilac stone, overhead still life.
- `careers-studio`: Wide dental ceramics laboratory with several precision workstations, microscopes, task lamps and neatly organized tools, violet cabinetry, inviting daylight.


## Unique-image update

Three additional images were generated with the built-in image tool:

- `home-care`: gloved hands comparing a ceramic shade tab with a crown on a
  clean tray, close natural light, pale lilac fabric, no faces or text.
- `home-lounge`: two plum upholstered chairs, a small table and leafy branch,
  white walls, curtains and intimate daylight, no people or signage.
- `visit-arrival`: curved white reception desk, flowers, lilac waiting bench,
  frosted glass doorway and discreet champagne fittings, no signs or people.

All five available scenes have 600px and 1440px WebP variants in
`public/images/editorial/`. The ten files total 323,138 bytes. The live pages
use responsive sources, lazy loading below the hero and explicit dimensions.

Eight new scenes remain pending because image generation returned HTTP 429
with `usage_limit_reached`: services hero, cosmetic details, digital equipment,
about hero, about craftsmanship, contact consultation, shop care and careers
studio. Their working fallbacks are explicit in
`public/js/components/editorialImage.js`; repeats remain in those locations.

The requested GitHub main push and subsequent backend hardening have not
started. Finish and verify these images first, push to the existing origin
`https://github.com/webbiqq-cmyk/Ceram-Dental`, then perform the backend work.
