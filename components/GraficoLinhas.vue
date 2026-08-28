<script setup lang="ts">
const props = withDefaults(defineProps<{
  datas: string[]
  series: { nome: string; cor: string; pontos: number[] }[]
  altura?: number
  acumulado?: boolean
}>(), { altura: 300, acumulado: false })

const L = 58   // espaço para os valores à esquerda
const R = 14
const T = 14
const B = 30

const larg = 900
const alt = computed(() => props.altura)

// no acumulado a linha só sobe: fica muito mais legível quando a
// categoria tem lançamentos esparsos
const dados = computed(() => props.series.map((s) => {
  if (!props.acumulado) return { ...s, valores: s.pontos }
  let soma = 0
  return { ...s, valores: s.pontos.map((v) => (soma += v)) }
}))

const maximo = computed(() => {
  const todos = dados.value.flatMap((s) => s.valores)
  const m = Math.max(0, ...todos)
  return m === 0 ? 1 : m * 1.12
})

const passoX = computed(() =>
  props.datas.length > 1 ? (larg - L - R) / (props.datas.length - 1) : 0)

function x(i: number) { return L + i * passoX.value }
function y(v: number) {
  return T + (alt.value - T - B) * (1 - v / maximo.value)
}

function caminho(valores: number[]) {
  if (!valores.length) return ''
  return valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

// linhas horizontais de referência
const marcas = computed(() => {
  const n = 4
  return Array.from({ length: n + 1 }, (_, i) => {
    const v = (maximo.value / n) * i
    return { v, y: y(v) }
  })
})

// só algumas datas no eixo, senão vira borrão
const rotulos = computed(() => {
  const n = props.datas.length
  const cada = Math.max(1, Math.ceil(n / 8))
  return props.datas.map((d, i) => ({ d, i }))
    .filter(({ i }) => i % cada === 0 || i === n - 1)
})

const foco = ref<number | null>(null)
const area = ref<SVGSVGElement | null>(null)

function mover(ev: MouseEvent) {
  if (!area.value || props.datas.length < 2) return
  const cx = area.value.getBoundingClientRect()
  const rel = ((ev.clientX - cx.left) / cx.width) * larg
  const i = Math.round((rel - L) / passoX.value)
  foco.value = Math.max(0, Math.min(props.datas.length - 1, i))
}

const curto = (d: string) => {
  const [, m, dia] = String(d).split('-')
  return `${dia}/${m}`
}

const noFoco = computed(() => {
  if (foco.value === null) return []
  return dados.value
    .map((s) => ({ nome: s.nome, cor: s.cor, valor: s.valores[foco.value!] }))
    .filter((s) => s.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)
})
</script>

<template>
  <div class="gr">
    <svg ref="area" :viewBox="`0 0 ${larg} ${alt}`" class="gr-tela"
         @mousemove="mover" @mouseleave="foco = null">
      <!-- referências -->
      <g>
        <line v-for="(m, i) in marcas" :key="i"
              :x1="L" :x2="larg - R" :y1="m.y" :y2="m.y" class="gr-grade" />
        <text v-for="(m, i) in marcas" :key="'t' + i"
              :x="L - 8" :y="m.y + 4" class="gr-valor">
          {{ m.v >= 1000 ? (m.v / 1000).toFixed(m.v >= 10000 ? 0 : 1) + 'k' : Math.round(m.v) }}
        </text>
      </g>

      <!-- dia em foco -->
      <line v-if="foco !== null" :x1="x(foco)" :x2="x(foco)"
            :y1="T" :y2="alt - B" class="gr-foco" />

      <!-- linhas -->
      <path v-for="(s, i) in dados" :key="i" :d="caminho(s.valores)"
            class="gr-linha" :style="{ stroke: s.cor }" />

      <!-- pontos do dia em foco -->
      <template v-if="foco !== null">
        <circle v-for="(s, i) in dados" :key="'p' + i"
                v-show="s.valores[foco] > 0"
                :cx="x(foco)" :cy="y(s.valores[foco])" r="4"
                :style="{ fill: s.cor }" class="gr-ponto" />
      </template>

      <!-- datas -->
      <text v-for="r in rotulos" :key="r.i" :x="x(r.i)" :y="alt - 10"
            class="gr-data" text-anchor="middle">{{ curto(r.d) }}</text>
    </svg>

    <div v-if="foco !== null && noFoco.length" class="gr-caixa">
      <div class="gr-caixa-dia">{{ dataBr(datas[foco]) }}</div>
      <div v-for="(s, i) in noFoco" :key="i" class="gr-caixa-linha">
        <i class="ponto" :style="{ background: s.cor }"></i>
        <span>{{ s.nome }}</span>
        <strong class="num">{{ dinheiro(s.valor) }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gr { position: relative; }
.gr-tela { width: 100%; height: auto; display: block; overflow: visible; }

.gr-grade { stroke: var(--linha); stroke-width: 1; }
.gr-foco { stroke: var(--tinta-45); stroke-width: 1; stroke-dasharray: 3 3; }
.gr-valor { fill: var(--tinta-45); font-size: 11px; text-anchor: end; }
.gr-data { fill: var(--tinta-45); font-size: 11px; }

.gr-linha {
  fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
}
.gr-ponto { stroke: var(--carta); stroke-width: 2; }

.gr-caixa {
  position: absolute; top: 8px; right: 8px;
  background: var(--carta); border: 1px solid var(--linha);
  border-radius: 11px; padding: 10px 12px; box-shadow: var(--sombra);
  pointer-events: none; min-width: 180px; max-width: 240px;
}
.gr-caixa-dia {
  font-size: .72rem; font-weight: 700; color: var(--tinta-45);
  text-transform: uppercase; letter-spacing: .05em; margin-bottom: 7px;
}
.gr-caixa-linha {
  display: flex; align-items: center; gap: 7px; font-size: .8rem;
  margin-bottom: 4px;
}
.gr-caixa-linha span {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gr-caixa-linha strong { font-size: .78rem; }

@media (max-width: 760px) {
  .gr-caixa {
    position: static; margin-top: 10px; max-width: none;
    box-shadow: none;
  }
}
</style>
