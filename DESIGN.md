# Nexume design system · Playful

The latest [Playful reference](docs/PLAYFUL_STYLE_REFERENCE.md) supersedes Henry and Letter. Existing application functions remain authoritative: sidebar navigation, bottom profile photo, library views, quick actions and local data are retained.

## Tokens

- Canvas #f6f2ee, elevated cards #ffffff, text #111111, supporting text #414040.
- Hot Magenta #ff2e95 is reserved for primary actions and the wordmark.
- Borders #e8e5e0 / #e2dcd6. Stone icons; no additional UI accent colors.
- Inter is bundled locally. Body 400, controls 500/600, display 700/900 italic at 70–79px where space allows.
- Image radius 16px, feature/card radius 44px, controls 99px.
- Card elevation uses the reference's 0 32px 80px rgba(0,0,0,.22) plus 0 2px 8px rgba(0,0,0,.08). No shadows on text, buttons or icons.
- Pink actions use dark text, following the reference's example CTA, for stronger text contrast.

## Application composition

Warm canvas and centered content up to 1200px plus padding. Page headings retain their functional section names; no promotional slogans were added. The sidebar uses subdued line icons and a black active state. The lower avatar displays the saved profile photo and is the sole Profile entry.

Search sits in a white pill. Catalog artwork returns to full color. Discover uses a dark category strip. Recommend has a single soft pink/oat atmospheric section, real candidate artwork and a white result card. Filter and pick behavior is unchanged. Cards are tilted only inside the isolated candidate preview; functional controls never overlap.

The desktop theme is `src/styles/playful.css`, loaded after the existing structural stylesheet. Profile, lists, review dialogs, settings and statistics use the same surface and control tokens. The standalone public viewer keeps its existing style.

## Verification

All 11 sections are checked at 960×640 and 1440×1000 for horizontal overflow, navigation boundaries and heading containment. The profile avatar, dialog bounds and recommendation cover/text separation are tested. Existing functional tests exercise search, card actions, backups, diary, ratings, lists, profile, reduced motion and Collection fallback. See [verification](docs/VERIFICATION.md) for the exact build results and limits.
