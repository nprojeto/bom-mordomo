// Tema claro ou escuro.
//
// Guardamos a escolha no próprio navegador. Quem nunca escolheu segue
// a preferência do sistema — e passa a acompanhá-la se ela mudar.

export type Tema = 'claro' | 'escuro' | 'sistema'

const CHAVE = 'sowwell:tema'
const tema = ref<Tema>('sistema')
const escuroAgora = ref(false)

function prefereEscuro() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function aplicar() {
  if (!import.meta.client) return
  const escuro = tema.value === 'escuro'
    || (tema.value === 'sistema' && prefereEscuro())
  escuroAgora.value = escuro
  document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : 'claro')

  // a barra do navegador no celular acompanha
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', escuro ? '#101216' : '#FF8A00')
}

export function useTema() {
  if (import.meta.client && !document.documentElement.dataset.temaPronto) {
    document.documentElement.dataset.temaPronto = '1'
    try {
      const salvo = localStorage.getItem(CHAVE) as Tema | null
      if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') {
        tema.value = salvo
      }
    } catch { /* navegador sem armazenamento: fica no padrão */ }

    aplicar()
    window.matchMedia?.('(prefers-color-scheme: dark)')
      .addEventListener?.('change', () => { if (tema.value === 'sistema') aplicar() })
  }

  function definir(novo: Tema) {
    tema.value = novo
    try { localStorage.setItem(CHAVE, novo) } catch { /* sem problema */ }
    aplicar()
  }

  function alternar() {
    definir(escuroAgora.value ? 'claro' : 'escuro')
  }

  return { tema, escuroAgora, definir, alternar }
}
