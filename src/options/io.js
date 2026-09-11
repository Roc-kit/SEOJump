(() => {
  const app = globalThis.SEOJumpOptions;
  const state = app.state;

  function escapeCsv(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        row.push(value);
        value = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        row.push(value);
        if (row.some(cell => cell.trim())) rows.push(row);
        row = [];
        value = '';
      } else {
        value += char;
      }
    }
    row.push(value);
    if (row.some(cell => cell.trim())) rows.push(row);
    return rows;
  }

  function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  app.exportJson = function exportJson() {
    download(
      JSON.stringify({ searchEngines: state.engines }, null, 2),
      'seojump-settings.json',
      'application/json'
    );
  };

  app.exportCsv = function exportCsv() {
    const headers = ['CategoryName', 'CategoryEnabled', 'EngineName', 'EngineURL', 'EngineEnabled', 'EngineFavicon'];
    const rows = [headers];
    state.engines.forEach(category => {
      (category.engines || []).forEach(engine => {
        rows.push([
          category.name || '',
          category.disable ? 'false' : 'true',
          engine.name || '',
          engine.url || '',
          engine.disable ? 'false' : 'true',
          engine.favicon || ''
        ]);
      });
    });
    download(rows.map(row => row.map(escapeCsv).join(',')).join('\n'), 'seojump-settings.csv', 'text/csv');
  };

  function findHeader(headers, name) {
    return headers.findIndex(header => header.trim() === name);
  }

  app.importCsv = async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm(SEOJumpI18n.t('importReplaceConfirm'))) {
      event.target.value = '';
      return;
    }
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error('No rows');
      const headers = rows[0];
      const columns = {
        category: findHeader(headers, 'CategoryName'),
        categoryEnabled: findHeader(headers, 'CategoryEnabled'),
        engine: findHeader(headers, 'EngineName'),
        url: findHeader(headers, 'EngineURL'),
        engineEnabled: findHeader(headers, 'EngineEnabled'),
        favicon: findHeader(headers, 'EngineFavicon')
      };
      if ([columns.category, columns.engine, columns.url].some(index => index < 0)) {
        throw new Error('Required columns missing');
      }

      const categories = new Map();
      rows.slice(1).forEach(row => {
        const categoryName = row[columns.category]?.trim();
        const engineName = row[columns.engine]?.trim();
        const url = row[columns.url]?.trim();
        if (!categoryName || !engineName || !url) return;
        if (!categories.has(categoryName)) {
          categories.set(categoryName, {
            name: categoryName,
            engines: [],
            ...(columns.categoryEnabled >= 0 && row[columns.categoryEnabled]?.toLowerCase() === 'false'
              ? { disable: true }
              : {})
          });
        }
        const engine = { name: engineName, url };
        if (columns.engineEnabled >= 0 && row[columns.engineEnabled]?.toLowerCase() === 'false') {
          engine.disable = true;
        }
        if (columns.favicon >= 0 && row[columns.favicon]?.trim()) {
          engine.favicon = row[columns.favicon].trim();
        }
        categories.get(categoryName).engines.push(engine);
      });

      const engines = [...categories.values()];
      if (!engines.length) throw new Error('No valid engines');
      app.setEngines(engines);
      await app.saveEngines();
      app.renderAll();
      app.showMessage(SEOJumpI18n.t('importSuccess'), 'success');
    } catch (error) {
      console.error('[SEOJump] CSV import failed:', error);
      app.showMessage(SEOJumpI18n.t('importFailed'), 'error');
    } finally {
      event.target.value = '';
    }
  };

  app.importJson = async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm(SEOJumpI18n.t('importReplaceConfirm'))) {
      event.target.value = '';
      return;
    }
    try {
      const settings = JSON.parse(await file.text());
      if (!Array.isArray(settings.searchEngines)) throw new Error('Invalid settings');
      app.setEngines(settings.searchEngines);
      await app.saveEngines();
      app.renderAll();
      app.showMessage(SEOJumpI18n.t('importSuccess'), 'success');
    } catch (error) {
      console.error('[SEOJump] JSON import failed:', error);
      app.showMessage(SEOJumpI18n.t('importFailed'), 'error');
    } finally {
      event.target.value = '';
    }
  };

  function showFormatDialog(mode) {
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.innerHTML = `
      <div class="format-dialog-content">
        <div class="format-dialog-title">${SEOJumpI18n.t(mode === 'export' ? 'chooseExportFormat' : 'chooseImportFormat')}</div>
        <button class="format-option json-format">${SEOJumpI18n.t('jsonFormat')}</button>
        <button class="format-option csv-format">${SEOJumpI18n.t('csvFormat')}</button>
        <div class="format-note">${SEOJumpI18n.t('csvNote')}</div>
        <button class="format-cancel">${SEOJumpI18n.t('cancel')}</button>
      </div>`;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.classList.contains('format-cancel')) {
        dialog.remove();
      } else if (event.target.classList.contains('json-format')) {
        dialog.remove();
        mode === 'export' ? app.exportJson() : document.getElementById('importFromJson').click();
      } else if (event.target.classList.contains('csv-format')) {
        dialog.remove();
        mode === 'export' ? app.exportCsv() : document.getElementById('importFromCSV').click();
      }
    });
  }

  app.showExportDialog = () => showFormatDialog('export');
  app.showImportDialog = () => showFormatDialog('import');
})();
