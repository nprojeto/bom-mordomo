// Uma tela está bloqueada quando o plano não inclui aquela função.
//
// Preferimos mostrar a tela trancada a redirecionar: quem é mandado
// embora não descobre que a função existe, e some parece defeito.

export function useBloqueio(chave: string) {
  const bloqueado = ref(false)
  const conferindo = ref(true)

  onMounted(async () => {
    try {
      const r = await useRecursos()
      bloqueado.value = !!r && Object.keys(r).length > 0 && r[chave] === false
    } catch {
      bloqueado.value = false
    } finally {
      conferindo.value = false
    }
  })

  return { bloqueado, conferindo }
}
