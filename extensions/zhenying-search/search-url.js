(function () {
  const DEFAULT_BASE_URL = 'https://framehdr.com'
  const STORAGE_KEY = 'zhenyingBaseUrl'

  function normalizeBaseUrl(baseUrl) {
    let url = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')

    if (!url) {
      return DEFAULT_BASE_URL
    }

    if (!/^https?:\/\//.test(url)) {
      url = `https://${url}`
    }

    return url.replace(/\/+$/, '')
  }

  function buildSearchUrl(baseUrl, keyword) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
    const query = encodeURIComponent(keyword.trim())

    return `${normalizedBaseUrl}/search.php?q=${query}`
  }

  const api = {
    DEFAULT_BASE_URL,
    STORAGE_KEY,
    normalizeBaseUrl,
    buildSearchUrl,
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.ZhenYingSearch = api
  }

  if (typeof module !== 'undefined') {
    module.exports = api
  }
})()