export default defineNuxtRouteMiddleware(async (para) => {
  if (import.meta.server) return

  const supa = useSupa()
  const { data } = await supa.auth.getSession()
  const logado = !!data.session

  if (!logado && para.path !== '/login') return navigateTo('/login')
  if (logado && para.path === '/login') return navigateTo('/')
})
