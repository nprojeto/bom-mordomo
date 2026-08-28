<script setup lang="ts">
const props = withDefaults(defineProps<{
  de: string
  ate: string
  minDias?: number
  maxDias?: number
}>(), { minDias: 7, maxDias: 120 })

const emit = defineEmits<{ mudou: [{ de: string; ate: string }] }>()

// Trabalhamos em "dias atrás": 0 é hoje, 119 é o começo da faixa.
const HOJE = hojeISO()
const LIMITE = props.maxDias - 1

function paraDias(data: string) {
  return Math.round(
    (new Date(HOJE + 'T12:00:00').getTime() - new Date(data + 'T12:00:00').getTime())
    / 86400000)
}
function paraData(dias: number) {
  const d = new Date(HOJE + 'T12:00:00')
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

// esquerda = mais antigo (número maior), direita = mais recente
const inicio = ref(Math.min(LIMITE, paraDias(props.de)))
const fim = ref(Math.max(0, paraDias(props.ate)))

watch(() => [props.de, props.ate], () => {
  inicio.value = Math.min(LIMITE, paraDias(props.de))
  fim.value = Math.max(0, paraDias(props.ate))
})

const dias = computed(() => inicio.value - fim.value + 1)

const trilha = ref<HTMLElement | null>(null)
const arrastando = ref<'inicio' | 'fim' | null>(null)

// posição em porcentagem, com o passado à esquerda
const pos = (d: number) => ((LIMITE - d) / LIMITE) * 100

const estiloFaixa = computed(() => ({
  left: pos(inicio.value) + '%',
  width: (pos(fim.value) - pos(inicio.value)) + '%'
}))

function valorNoPonto(clientX: number) {
  if (!trilha.value) return 0
  const r = trilha.value.getBoundingClientRect()
  const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  return Math.round(LIMITE - p * LIMITE)
}

function pegar(qual: 'inicio' | 'fim', ev: PointerEvent) {
  arrastando.value = qual
  ;(ev.target as HTMLElement).setPointerCapture?.(ev.pointerId)
}

function mover(ev: PointerEvent) {
  if (!arrastando.value) return
  const v = valorNoPonto(ev.clientX)

  if (arrastando.value === 'inicio') {
    // o intervalo tem um mínimo: menos que isso não conta nada
    inicio.value = Math.min(LIMITE, Math.max(fim.value + props.minDias - 1, v))
  } else {
    fim.value = Math.max(0, Math.min(inicio.value - props.minDias + 1, v))
  }
}

function soltar() {
  if (!arrastando.value) return
  arrastando.value = null
  emit('mudou', { de: paraData(inicio.value), ate: paraData(fim.value) })
}

function tocarTrilha(ev: PointerEvent) {
  if (arrastando.value) return
  const v = valorNoPonto(ev.clientX)
  // move a alça mais próxima
  const perto = Math.abs(v - inicio.value) < Math.abs(v - fim.value) ? 'inicio' : 'fim'
  arrastando.value = perto
  mover(ev)
  soltar()
}

// atalhos rápidos
const ATALHOS = [7, 15, 30, 60, 90, 120]
function usarAtalho(n: number) {
  fim.value = 0
  inicio.value = Math.min(LIMITE, n - 1)
  emit('mudou', { de: paraData(inicio.value), ate: paraData(fim.value) })
}

const rotulo = (d: number) => dataBr(paraData(d))
</script>

<template>
  <div class="periodo">
    <div class="entre" style="margin-bottom:12px;flex-wrap:wrap;gap:10px">
      <div>
        <div class="rotulo">Período</div>
        <div class="periodo-datas num">
          {{ rotulo(inicio) }} <span class="mudo">a</span> {{ rotulo(fim) }}
          <span class="periodo-conta">{{ dias }} dias</span>
        </div>
      </div>

      <div class="linha-flex" style="flex-wrap:wrap">
        <button v-for="n in ATALHOS" :key="n" class="btn mini"
                :class="dias === n && fim === 0 ? '' : 'claro'"
                @click="usarAtalho(n)">
          {{ n }}d
        </button>
      </div>
    </div>

    <div ref="trilha" class="trilha" @pointerdown="tocarTrilha">
      <div class="trilha-faixa" :style="estiloFaixa"></div>

      <button class="alca" :style="{ left: pos(inicio) + '%' }"
              aria-label="Início do período"
              @pointerdown.stop="pegar('inicio', $event)"
              @pointermove="mover" @pointerup="soltar" @pointercancel="soltar">
        <span class="alca-balao">{{ rotulo(inicio) }}</span>
      </button>

      <button class="alca" :style="{ left: pos(fim) + '%' }"
              aria-label="Fim do período"
              @pointerdown.stop="pegar('fim', $event)"
              @pointermove="mover" @pointerup="soltar" @pointercancel="soltar">
        <span class="alca-balao">{{ rotulo(fim) }}</span>
      </button>
    </div>

    <div class="entre pequeno mudo" style="margin-top:6px">
      <span>{{ rotulo(LIMITE) }}</span>
      <span>hoje</span>
    </div>
  </div>
</template>

<style scoped>
.periodo-datas { font-size: .95rem; font-weight: 700; margin-top: 3px; }
.periodo-conta {
  display: inline-block; margin-left: 8px; padding: 2px 9px;
  border-radius: 999px; background: var(--laranja-fundo); color: var(--laranja);
  font-size: .72rem; font-weight: 700;
}

.trilha {
  position: relative; height: 8px; border-radius: 999px;
  background: var(--linha); margin: 22px 12px 0; cursor: pointer;
  touch-action: none;
}
.trilha-faixa {
  position: absolute; top: 0; bottom: 0; border-radius: 999px;
  background: var(--laranja);
}

.alca {
  position: absolute; top: 50%; width: 24px; height: 24px;
  margin-left: -12px; margin-top: -12px; padding: 0;
  border-radius: 50%; background: var(--carta);
  border: 3px solid var(--laranja); cursor: grab;
  box-shadow: 0 2px 8px rgba(22,32,46,.22); touch-action: none;
}
.alca:active { cursor: grabbing; transform: scale(1.12); }
.alca:focus-visible { outline: 2px solid var(--laranja); outline-offset: 3px; }

.alca-balao {
  position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
  background: var(--tinta); color: var(--carta);
  font-size: .66rem; font-weight: 700; padding: 3px 8px;
  border-radius: 6px; white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity .15s;
}
.alca:hover .alca-balao, .alca:active .alca-balao { opacity: 1; }

@media (max-width: 760px) {
  .periodo-datas { font-size: .84rem; }
  .trilha { margin-top: 18px; }
}
</style>
