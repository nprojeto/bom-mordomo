// Esconder valores, como nos aplicativos de banco.
//
// Começa sempre oculto: quem abre o sistema num lugar público não
// deveria precisar lembrar de esconder antes. Mostrar é uma decisão
// consciente; esconder tem que ser o padrão.
//
// Por isso a escolha não é guardada entre sessões — a cada carregamento
// da página os valores voltam a ficar cobertos.

export const sigilo = ref(true)

export function useSigilo() {
  function alternar() {
    sigilo.value = !sigilo.value
  }

  function esconder() {
    sigilo.value = true
  }

  return { sigilo, alternar, esconder }
}
