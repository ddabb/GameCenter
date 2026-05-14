/**
 * 字体加载工具
 * 用于在需要时加载字体，避免全局加载影响性能
 */

const GOOGLE_FONTS_CDN = 'https://fonts.gstatic.com';
const GHPROXY_BASE = 'https://ghproxy.com/https://fonts.gstatic.com';
const useMirror = 'google';

const getFontUrl = (path) => {
  switch (useMirror) {
    case 'ghproxy':
      return `url("${GHPROXY_BASE}${path}")`;
    case 'google':
    default:
      return `url("${GOOGLE_FONTS_CDN}${path}")`;
  }
};

const fontGroups = {
  core: [
    { family: 'Inter', source: getFontUrl('/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf'), desc: { weight: '400', style: 'normal' } },
    { family: 'Roboto', source: getFontUrl('/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf'), desc: { weight: '400', style: 'normal' } },
    { family: 'Noto Sans SC', source: getFontUrl('/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG4HFnYlNbPzT7HEL7j12XCOHJKg4RgZw3nFTvwZ8atTsBvwlvRUk7mYP2g.4.woff2'), desc: { weight: '300', style: 'normal' } }
  ],
  common: [
    { family: 'Roboto', source: getFontUrl('/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWub2bWmT.ttf'), desc: { weight: '500', style: 'normal' } },
    { family: 'Roboto', source: getFontUrl('/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf'), desc: { weight: '700', style: 'normal' } },
    { family: 'Open Sans', source: getFontUrl('/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsiH0B4gaVc.ttf'), desc: { weight: '400', style: 'normal' } },
    { family: 'Montserrat', source: getFontUrl('/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2'), desc: { weight: '400', style: 'normal' } }
  ],
  special: [
    { family: 'Lato', source: getFontUrl('/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Raleway', source: getFontUrl('/s/raleway/v28/1Ptug8zYS_SKggPNyCAIT5lu.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Source Sans 3', source: getFontUrl('/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky461EN.ttf'), desc: { weight: '400', style: 'normal' } },
    { family: 'Pacifico', source: getFontUrl('/s/pacifico/v23/FwZY7-Qmy14u9lezJ-6J6MmBp0u-zK4.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Dancing Script', source: getFontUrl('/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i03Sup8hNX6plRP.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Bangers', source: getFontUrl('/s/bangers/v25/FeVQS0BTqb0h60ACH55Q2J5hm24.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Fira Code', source: getFontUrl('/s/firacode/v27/uU9NCBsR6Z2vfE9aq3bh0NSDqFGedCMX.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'JetBrains Mono', source: getFontUrl('/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx3cwgknk-6nFg.woff2'), desc: { weight: '400', style: 'normal' } },
    { family: 'Comic Neue', source: getFontUrl('/s/comicneue/v9/4UaErEJDsxBrF37olUeD_xHM8pxULilENlY.woff2'), desc: { weight: '700', style: 'normal' } },
    { family: 'Inconsolata', source: getFontUrl('/s/inconsolata/v37/QlddNThLqRwH-OJ1UHjlKENVzkWGVkL3GZQmAwLyya15IDhunA.woff2'), desc: { weight: '400', style: 'normal' } }
  ]
};

const loadFontGroup = (fonts, groupName) => {
  return new Promise((resolve) => {
    if (!fonts || fonts.length === 0) {
      resolve({ loaded: [], failed: [] });
      return;
    }

    const promises = fonts.map(font => new Promise((fontResolve) => {
      wx.loadFontFace({
        family: font.family,
        source: font.source,
        desc: font.desc,
        global: true,
        scopes: ['webview', 'native'],
        success: (res) => {
          console.debug(`字体加载成功 [${groupName}]: ${font.family}`);
          fontResolve({ ok: true, family: font.family });
        },
        fail: (err) => {
          console.warn(`字体加载失败 [${groupName}]: ${font.family}`);
          fontResolve({ ok: false, family: font.family, err });
        }
      });
    }));

    Promise.all(promises).then(results => {
      const loaded = results.filter(r => r.ok).map(r => r.family);
      const failed = results.filter(r => !r.ok).map(r => r.family);
      console.debug(`${groupName} 字体加载完成。成功:${loaded.length} 失败:${failed.length}`);
      resolve({ loaded, failed });
    });
  });
};

/**
 * 加载字体
 * @param {string} group - 字体组名称：core, common, special, all
 * @returns {Promise<{loaded: string[], failed: string[]}>} 加载结果
 */
const loadFonts = async (group = 'core') => {
  try {
    let results = { loaded: [], failed: [] };

    if (group === 'all') {
      const coreResult = await loadFontGroup(fontGroups.core, '核心');
      results.loaded = [...results.loaded, ...coreResult.loaded];
      results.failed = [...results.failed, ...coreResult.failed];

      await new Promise(resolve => setTimeout(resolve, 500));

      const commonResult = await loadFontGroup(fontGroups.common, '常用');
      results.loaded = [...new Set([...results.loaded, ...commonResult.loaded])];
      results.failed = [...results.failed, ...commonResult.failed];

      await new Promise(resolve => setTimeout(resolve, 1000));

      const specialResult = await loadFontGroup(fontGroups.special, '特殊');
      results.loaded = [...new Set([...results.loaded, ...specialResult.loaded])];
      results.failed = [...results.failed, ...specialResult.failed];
    } else if (fontGroups[group]) {
      const result = await loadFontGroup(fontGroups[group], group);
      results = result;
    }

    console.debug('字体加载完成', results);
    return results;
  } catch (error) {
    console.error('字体加载出错:', error);
    return { loaded: [], failed: [] };
  }
};

/**
 * 预加载核心字体
 * @returns {Promise<{loaded: string[], failed: string[]}>} 加载结果
 */
const preloadCoreFonts = () => {
  return loadFonts('core');
};

module.exports = {
  loadFonts,
  preloadCoreFonts
};