# SEOJump

SEOJump is a Chrome extension for SEO workflows. It lets you send selected text, the current page URL, or the current domain to search engines and SEO tools such as Google, Ahrefs, Semrush, Similarweb, Google Trends, Wayback Machine, Whois services, and more.

## Core contexts

- `%selectedText%` — selected text or keyword
- `%currentUrl%` — current page URL
- `%currentDomain%` — current page domain

This is the main difference between SEOJump and ordinary selection-search extensions: tools can operate on keywords, pages, or domains.

## Main features

- Selection toolbar with three modes:
  - Hold `Ctrl` while selecting text
  - Always show after selecting text
  - Disabled
- Right-click search menu remains available independently of the toolbar mode.
- Custom categories and tools.
- Drag-and-drop sorting for categories and tools.
- JSON and CSV import/export.
- English and Simplified Chinese UI.
- Incognito search support.
- Experimental Advanced Actions for sites that cannot receive queries through URL parameters.

## Advanced Actions

Advanced Actions are intentionally treated as experimental because they depend on the target site's DOM.

Supported parameters include:

- `__delay=ms`
- `__incognito=true`
- `__input=selector`
- `__submit=selector`
- `__bruteAction=selector`
- `__text=%selectedText%`

Advanced Actions use `__seojump_start` as the only action marker.

Selectors can use fallbacks separated by `||`:

```text
input[type="search"] || input[name="q"] || .search-box input
```

## Project structure

The extension stays on Manifest V3 and Vanilla JavaScript. No framework or build step is required.

```text
background.js
options.js
popup.js

src/
  shared/
    settings.js
    i18n.js
  background/
    search.js
    context-menu.js
    favicon.js
  content/
    core.js
    toolbar.js
    advanced-actions.js
    main.js
  options/
    state.js
    render.js
    io.js
```

Source files should generally stay below 500 lines. Split by responsibility rather than by arbitrary line count.

## Installation

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select this repository directory.

## Website

The public URL-template directory is maintained separately at `Roc-kit/SEOJumpSite`. The extension and website have independent repositories, release cycles, and data. The website may keep its own snapshot of useful extension templates as seed content, but there is no runtime or build-time dependency between the two projects.

## Repository

GitHub: `Roc-kit/SEOJump`
