(() => {
  const messages = {
    en: {
      optionsTitle: 'SEOJump Options',
      tagline: 'Keyword, page and domain shortcuts for SEO.',
      save: 'Save',
      export: 'Export',
      import: 'Import',
      reset: 'Reset',
      generalSettings: 'General Settings',
      interfaceLanguage: 'Interface language',
      english: 'English',
      chinese: '简体中文',
      selectionToolbar: 'Selection toolbar',
      triggerModifier: 'Hold Ctrl while selecting text',
      triggerAlways: 'Always show after selecting text',
      triggerOff: 'Disable selection toolbar',
      triggerHint: 'The right-click search menu remains available in every mode.',
      placeholderInfo: 'Placeholder Info',
      placeholder: 'Placeholder',
      description: 'Description',
      example: 'Example',
      selectedTextDescription: 'Selected text or search keyword',
      currentUrlDescription: 'Current page URL',
      currentDomainDescription: 'Current page domain',
      placeholderHelpPrefix: 'Add custom tools with these placeholders. Detailed documentation is available',
      here: 'here',
      advancedWarning: 'Advanced Actions are experimental. Target-site DOM changes can break input or submit selectors.',
      searchTools: 'Search Tools',
      categoryName: 'Category Name',
      toolName: 'Tool Name',
      toolUrlPlaceholder: 'Tool URL with %selectedText%, %currentUrl% or %currentDomain%',
      addCategory: 'Add Category',
      editToolUrl: 'Edit URL for {name}',
      cancel: 'Cancel',
      chooseExportFormat: 'Choose Export Format',
      chooseImportFormat: 'Choose Import Format',
      jsonFormat: 'JSON Format',
      csvFormat: 'CSV Format',
      csvNote: 'CSV files can be edited with spreadsheet software.',
      saveSuccess: 'Settings saved successfully!',
      saveFailed: 'Failed to save settings',
      importSuccess: 'Import successful!',
      importFailed: 'Import failed: invalid file format',
      resetConfirm: 'Reset all search tools to defaults? This cannot be undone.',
      resetSuccess: 'Settings reset to default',
      resetFailed: 'Failed to reset settings',
      allowCopy: 'Allow Copy',
      findTools: 'Find Tools',
      settingsPanel: 'Settings',
      seoJump: 'SEOJump'
    },
    'zh-CN': {
      optionsTitle: 'SEOJump 设置',
      tagline: '面向 SEO 的关键词、页面与域名快速跳转工具。',
      save: '保存',
      export: '导出',
      import: '导入',
      reset: '重置',
      generalSettings: '基础设置',
      interfaceLanguage: '界面语言',
      english: 'English',
      chinese: '简体中文',
      selectionToolbar: '划词工具栏',
      triggerModifier: '按住 Ctrl 划词时显示',
      triggerAlways: '划词后始终自动显示',
      triggerOff: '关闭划词工具栏',
      triggerHint: '无论选择哪种模式，右键搜索菜单都会保留。',
      placeholderInfo: '占位符说明',
      placeholder: '占位符',
      description: '说明',
      example: '示例',
      selectedTextDescription: '选中的文本或搜索关键词',
      currentUrlDescription: '当前页面完整 URL',
      currentDomainDescription: '当前页面域名',
      placeholderHelpPrefix: '可使用这些占位符添加自定义工具，详细说明见',
      here: '这里',
      advancedWarning: 'Advanced Action 属于实验性高级功能。目标网站 DOM 改动后，输入框或提交按钮选择器可能失效。',
      searchTools: '搜索工具',
      categoryName: '分类名称',
      toolName: '工具名称',
      toolUrlPlaceholder: '工具 URL，可使用 %selectedText%、%currentUrl% 或 %currentDomain%',
      addCategory: '添加分类',
      editToolUrl: '编辑 {name} 的 URL',
      cancel: '取消',
      chooseExportFormat: '选择导出格式',
      chooseImportFormat: '选择导入格式',
      jsonFormat: 'JSON 格式',
      csvFormat: 'CSV 格式',
      csvNote: 'CSV 文件可以使用表格软件编辑。',
      saveSuccess: '设置已保存',
      saveFailed: '保存设置失败',
      importSuccess: '导入成功',
      importFailed: '导入失败：文件格式无效',
      resetConfirm: '确定将全部搜索工具恢复为默认配置吗？此操作无法撤销。',
      resetSuccess: '已恢复默认设置',
      resetFailed: '恢复默认设置失败',
      allowCopy: '解除复制限制',
      findTools: '查找工具',
      settingsPanel: '设置',
      seoJump: 'SEOJump'
    }
  };

  let currentLanguage = 'en';

  function normalizeLanguage(language) {
    return language === 'zh-CN' ? 'zh-CN' : 'en';
  }

  function t(key, replacements = {}) {
    const dictionary = messages[currentLanguage] || messages.en;
    let value = dictionary[key] || messages.en[key] || key;
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });
    document.documentElement.lang = currentLanguage === 'zh-CN' ? 'zh-CN' : 'en';
  }

  async function initialize() {
    const settings = await SEOJumpSettings.getSettings();
    currentLanguage = normalizeLanguage(settings.uiLanguage);
    apply();
    return currentLanguage;
  }

  async function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    await SEOJumpSettings.updateSettings({ uiLanguage: currentLanguage });
    apply();
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  globalThis.SEOJumpI18n = {
    messages,
    t,
    apply,
    initialize,
    setLanguage,
    getLanguage
  };
})();
