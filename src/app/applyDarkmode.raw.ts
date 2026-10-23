window.darkmode = {
  fromStorage: localStorage.getItem('darkmode'),
  real: false,
  apply() {
    localStorage.setItem('darkmode', String(window.darkmode.real))
    document.documentElement.classList[window.darkmode.real ? 'add' : 'remove']('dark')
  },
}
switch (window.darkmode.fromStorage) {
  case 'true':
    window.darkmode.real = true
    break
  case 'false':
    window.darkmode.real = false
    break
  default:
    window.darkmode.real = window.matchMedia('(prefers-color-scheme: dark)').matches
    break
}
window.darkmode.apply()
