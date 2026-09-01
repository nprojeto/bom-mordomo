<script setup lang="ts">
const api = useApi()

const dados = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const temRecurso = ref(true)
const detalhe = ref(false)      // a barra de ajuste fica recolhida
const meuLimite = ref(0)
const mexeu = ref(false)
const salvando = ref(false)

const sugerido = computed(() => Number(dados.value?.limite_sugerido ?? 0))
const diasRestantes = computed(() => Number(dados.value?.dias_restantes ?? 0))
const restante = computed(() => Number(dados.value?.restante ?? 0))
const gastoHoje = computed(() => Number(dados.value?.gasto_hoje ?? 0))
const limiteHoje = computed(() => Number(dados.value?.limite_hoje ?? 0))

const sobra = computed(() => limiteHoje.value - gastoHoje.value)
const passou = computed(() => sobra.value < 0)

const maxSlider = computed(() => Math.max(50, Math.ceil(sugerido.value * 2 / 10) * 10))

// Se eu segurar neste ritmo, com quanto termino o mês?
const economia = computed(() => {
  if (!dados.value || diasRestantes.value <= 0) return 0
  return restante.value - meuLimite.value * diasRestantes.value
})

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await useRecursos()
    temRecurso.value = !r || !Object.keys(r).length || r.moderando !== false
    if (!temRecurso.value) return

    dados.value = await api.get(`/moderando?mes=${hojeISO().slice(0, 7)}`)
    if (!mexeu.value) meuLimite.value = Math.floor(sugerido.value)
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

async function guardarLimite() {
  salvando.value = true
  try {
    await api.patch('/config', { limite_diario: meuLimite.value })
    await carregar()
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

defineExpose({ carregar })
onMounted(carregar)
</script>

<template>
  <!-- fora do plano: mostra o que é e como liberar -->
  <div v-if="!temRecurso && !carregando" class="cartao larga mod-travado">
    <div class="linha-flex" style="gap:12px">
      <span class="mod-cadeado"><i class="mi">lock</i></span>
      <div style="flex:1;min-width:0">
        <strong>Moderador</strong>
        <div class="pequeno mudo">
          Mostra quanto dá para gastar hoje sem apertar o fim do mês.
        </div>
      </div>
      <NuxtLink to="/planos?bloqueado=moderando" class="btn latao mini">
        Ver planos
      </NuxtLink>
    </div>
  </div>

  <div v-else-if="dados" class="cartao larga mod" :class="{ passou }">
    <div class="entre" style="flex-wrap:wrap;gap:12px">
      <div style="min-width:0">
        <div class="rotulo">Moderador · dá para gastar hoje</div>
        <div class="selo-valor" :class="passou ? 'saida' : 'entrada'">
          {{ dinheiro(Math.max(0, sobra)) }}
        </div>
        <div class="pequeno mudo">
          <template v-if="passou">
            Já gastou {{ dinheiro(gastoHoje) }} · passou
            <strong class="saida">{{ dinheiro(-sobra) }}</strong>
          </template>
          <template v-else-if="gastoHoje">
            Já gastou {{ dinheiro(gastoHoje) }} de {{ dinheiro(limiteHoje) }}
          </template>
          <template v-else>
            De {{ dinheiro(limiteHoje) }} previstos para hoje
          </template>
        </div>
      </div>

      <button class="btn claro mini" @click="detalhe = !detalhe">
        <i class="mi">tune</i>{{ detalhe ? 'Fechar' : 'Ajustar' }}
      </button>
    </div>

    <!-- números do mês, em linha -->
    <div class="mod-numeros">
      <div>
        <span class="rotulo">Ainda tenho</span>
        <span class="num">{{ dinheiro(restante) }}</span>
      </div>
      <div>
        <span class="rotulo">Faltam</span>
        <span class="num">{{ diasRestantes }} dia(s)</span>
      </div>
      <div>
        <span class="rotulo">Por dia</span>
        <span class="num">{{ dinheiro(sugerido) }}</span>
      </div>
    </div>

    <!-- ajuste: quem mexe, mexe uma vez por mês -->
    <div v-if="detalhe" class="mod-ajuste">
      <div class="entre" style="margin-bottom:8px">
        <span class="pequeno">Segurar em</span>
        <strong class="num">{{ dinheiro(meuLimite) }} por dia</strong>
      </div>

      <input v-model.number="meuLimite" type="range" min="0" :max="maxSlider"
             step="5" @input="mexeu = true" />

      <div class="pequeno" style="margin-top:8px">
        <template v-if="economia > 0">
          Neste ritmo, sobram <strong class="entrada">{{ dinheiro(economia) }}</strong>
          no fim do mês.
        </template>
        <template v-else-if="economia < 0">
          Neste ritmo, faltam <strong class="saida">{{ dinheiro(-economia) }}</strong>
          no fim do mês.
        </template>
        <template v-else>
          Neste ritmo, o mês fecha no zero.
        </template>
      </div>

      <div class="linha-flex" style="margin-top:12px">
        <button class="btn mini" :disabled="salvando" @click="guardarLimite">
          {{ salvando ? 'Guardando…' : 'Usar este limite' }}
        </button>
        <NuxtLink to="/moderando" class="btn claro mini">Ver o mês inteiro</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mod { border-left: 3px solid var(--entrada); }
.mod.passou { border-left-color: var(--saida); }
.mod .selo-valor { font-size: 1.65rem; }

.mod-numeros {
  display: flex; flex-wrap: wrap; gap: 18px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--linha);
}
.mod-numeros > div { display: grid; gap: 1px; }
.mod-numeros .num { font-size: .92rem; }

.mod-ajuste {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--linha);
}
.mod-ajuste input[type="range"] { width: 100%; accent-color: var(--laranja); }

.mod-travado { border-left: 3px solid var(--linha); }
.mod-cadeado {
  width: 34px; height: 34px; flex: 0 0 34px; border-radius: 11px;
  background: var(--papel); color: var(--tinta-45);
  display: grid; place-items: center;
}

@media (max-width: 760px) {
  .mod .selo-valor { font-size: 1.4rem; }
  .mod-numeros { gap: 12px; }
  .mod-numeros .rotulo { font-size: .57rem; }
  .mod-numeros .num { font-size: .82rem; }
}
</style>
