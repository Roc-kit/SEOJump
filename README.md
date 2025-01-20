# EasySwitchSearch

## Introduction
EasySwitchSearch is a Chrome extension designed for SEO professionals, allowing users to quickly search across tools like Ahrefs, SEMrush, Similarweb, and Google Trends. By selecting text on a webpage, users can instantly use different search engines, supporting regular search, advanced search, and incognito mode, making SEO tasks more efficient.

## Features

### Quick Usage Guide
- **Auto-popup Toolbar**: The toolbar automatically appears after text selection, providing quick search functionality.
- **Right-click Menu Search**: Right-click selected text and choose search engines from the context menu for quick search.
- **Extension Icon Features**:
  - Allow copy functionality
  - Find more search engines
  - Access settings panel
- **Convenient Operations**:
  - Click on a search engine category to use its first search engine by default.
  - Hold **Ctrl** while clicking search engine icons to open searches in background tabs, enabling quick batch searching.

### Advanced Search Engine Features
#### 1. **Regular Search Engine**
   - **Function**: Opens search results directly in a new tab.
   - **Example**:
   ```json
   {
       "name": "Google",
       "url": "https://www.google.com/search?q=%selectedText%"
   }
   ```

#### 2. **Incognito Mode Search**
   - **Function**: Performs searches through incognito window for privacy protection.
   - **Example**:
   ```json
   {
       "name": "Google Incognito",
       "url": "https://www.google.com/search?q=%selectedText%&__ess_start&__incognito=true"
   }
   ```

#### 3. **Auto-fill Search**
   - **Function**: Automatically fills search forms and submits them.
   - **Example**:
   ```json
   {
       "name": "Similarweb bruteAction",
       "url": "https://www.similarweb.com/generator/?__ess_start&__bruteAction=.checker-hero__search input&__text=%selectedText%"
   }
   ```

#### 4. **URL Placeholder Support**
   - `%selectedText%`: Represents user-selected text
   - `%currentUrl%`: Represents current page's complete URL
   - `%currentDomain%`: Represents current page's domain name

#### 5. **Special URL Parameters**
   - `__ess_start`: Identifier for advanced features, must be placed after the URL
   - `__delay=ms`: Loading delay parameter in milliseconds
   - `__incognito=true`: Enable incognito mode search
   - `__input=selector`: Specify CSS selector for input field
   - `__submit=selector`: Specify CSS selector for submit button
   - `__bruteAction=selector`: Execute input sending and button clicking on specified selector and its children

### Settings Page
- **Visual Configuration Interface**: Users can customize settings through the configuration page
  - Add/Remove Search Engines
  - Sort Search Engines
  - Enable/Disable Engines

## Installation

1. Download from Chrome Web Store (coming soon)
2. Or install manually:
   - Clone this repository
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
