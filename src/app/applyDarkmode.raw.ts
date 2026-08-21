window.darkmode = {
  fromStorage: localStorage.getItem('darkmode'),
  real: false,
  apply() {
    localStorage.setItem('darkmode', String(window.darkmode.real))
    document.documentElement.classList[window.darkmode.real ? 'add' : 'remove']('dark')
  },
}
window.darkmode.real = {
  'true': true,
  'false': false,
}?.[window.darkmode.fromStorage ?? '']
  || window.matchMedia('(prefers-color-scheme: dark)').matches
window.darkmode.apply()
