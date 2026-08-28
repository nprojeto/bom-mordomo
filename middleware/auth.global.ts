const PUBLICAS = ['/login', '/criar-conta', '/recuperar']

// Qual funcionalidade cada tela exige
const RECURSO_DA_TELA: Record<string, string> = {
  '/moderando': 'moderando',
  '/calendario': 'calendario',
  '/contas': 'contas',
  '/gastos': 'gastos',
  '/cartoes': 'cartoes',
  '/reservas': 'reservas'
}

export default defineNuxtRouteMiddleware(async (para) => {
  if (import.meta.server) return

  const supa = useSupa()
  const { data } = await supa.auth.getSession()
  const logado = !!data.session
  const publica = PUBLICAS.includes(para.path)

  if (!logado && !publica) return navigateTo('/login')
  if (logado && publica) return navigateTo('/')
  if (!logado) return

  // Tela fora do plano: em vez de erro, mostramos o que resolveria
  const precisa = RECURSO_DA_TELA[para.path]
  if (!precisa) return

  const recursos = await useRecursos()
  if (recursos && Object.keys(recursos).length && recursos[precisa] === false) {
    return navigateTo(`/planos?bloqueado=${precisa}`)
  }
})
