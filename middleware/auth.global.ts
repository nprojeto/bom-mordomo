const PUBLICAS = ['/login', '/criar-conta', '/recuperar', '/nova-senha']

export default defineNuxtRouteMiddleware(async (para) => {
  if (import.meta.server) return

  const supa = useSupa()
  const { data } = await supa.auth.getSession()
  const logado = !!data.session
  const publica = PUBLICAS.includes(para.path)

  // link de recuperacao do Supabase chega com token na url
  if (para.path === '/nova-senha') return

  if (!logado && !publica) return navigateTo('/login')
  if (logado && publica) return navigateTo('/')
})
