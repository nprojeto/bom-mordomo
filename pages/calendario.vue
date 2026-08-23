<script setup lang="ts">
const api = useApi()

const ref_ = ref(hojeISO().slice(0, 7))
const itens = ref<any[]>([])
const carregando = ref(true)
const diaAberto = ref<string | null>(null)

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const rotuloMes = computed(() => {
  const [a, m] = ref_.value.split('-')
  return `${MESES[Number(m) - 1]} ${a}`
})

const celulas = computed(() => {
  const [a, m] = ref_.value.split('-').map(Number)
  const primeiro = new Date(a, m - 1, 1)
  const inicio = new Date(primeiro)
  inicio.setDate(1 - primeiro.getDay())

  const lista: any[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    lista.push({
      iso,
      dia: d.getDate(),
      fora: d.getMonth() !== m - 1,
      hoje: iso === hojeISO(),
      eventos: itens.value.filter((x) => String(x.data).slice(0, 10) === iso)
    })
  }
  return lista
})

const totais = computed(() => {
  const dentro = itens.value
  const soma = (t: string) => dentro.filter((x) => x.tipo === t)
    .reduce((s, x) => s + Number(x.valor || 0), 0)
  return { receita: soma('receita'), despesa: soma('despesa') }
})

const eventosDoDia = computed(() =>
  celulas.value.find((c) => c.iso === diaAberto.value)?.eventos ?? [])

function mudarMes(passo: number) {
  const [a, m] = ref_.value.split('-').map(Number)
  const d = new Date(a, m - 1 + passo, 1)
  ref_.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  carregar()
}

function totalDia(eventos: any[]) {
  return eventos.reduce((s, e) =>
    s + (e.tipo === 'receita' ? Number(e.valor) : -Number(e.valor)), 0)
}

async function carregar() {
  carregando.value = true
  const [a, m] = ref_.value.split('-').map(Number)
  const de = `${ref_.value}-01`
  const ate = new Date(a, m, 0).toISOString().slice(0, 10)
  itens.value = await api.get(`/calendario?de=${de}&ate=${ate}`) ?? []
  carregando.value = false
}

async function pagar(o: any) {
  await api.patch(`/ocorrencias/pagar/${o.id}`, { valor_pago: o.valor })
  await carregar()
  diaAberto.value = null
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Calendário</h1>
      <p>Tudo o que entra e sai, dia a dia.</p>
    </div>

    <div class="folha">
      <div class="folha-cabeca">
        <div class="linha-flex">
          <button class="btn claro mini" @click="mudarMes(-1)">‹</button>
          <div class="mes-titulo">{{ rotuloMes }}</div>
          <button class="btn claro mini" @click="mudarMes(1)">›</button>
        </div>
        <div class="linha-flex pequeno num" style="gap:16px">
          <span class="entrada">+ {{ dinheiro(totais.receita) }}</span>
          <span class="saida">− {{ dinheiro(totais.despesa) }}</span>
        </div>
      </div>

      <div class="semana">
        <div v-for="d in DIAS" :key="d">{{ d }}</div>
      </div>

      <div v-if="carregando" class="vazio">Abrindo o mês…</div>

      <div v-else class="malha">
        <div v-for="c in celulas" :key="c.iso"
             class="dia" :class="{ fora: c.fora, hoje: c.hoje }"
             @click="c.eventos.length && (diaAberto = c.iso)">
          <div class="dia-num">{{ c.dia }}</div>
          <div class="dia-lista">
            <div v-for="e in c.eventos.slice(0, 3)" :key="e.id"
                 class="pilula"
                 :class="e.status === 'pago' ? 'p' : (e.tipo === 'receita' ? 'r' : 'd')">
              {{ e.descricao }}
            </div>
            <div v-if="c.eventos.length > 3" class="pequeno mudo">
              +{{ c.eventos.length - 3 }}
            </div>
          </div>
          <div v-if="c.eventos.length" class="dia-total"
               :class="totalDia(c.eventos) >= 0 ? 'entrada' : 'saida'">
            {{ dinheiro(totalDia(c.eventos)) }}
          </div>
        </div>
      </div>
    </div>

    <!-- detalhe do dia -->
    <div v-if="diaAberto" class="veu" @click.self="diaAberto = null">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ dataBr(diaAberto) }}</h2>
          <button class="fechar" @click="diaAberto = null">×</button>
        </div>
        <div class="painel-corpo pilha">
          <div v-for="e in eventosDoDia" :key="e.id" class="entre"
               style="padding-bottom:12px;border-bottom:1px solid var(--linha)">
            <div>
              <strong>{{ e.descricao }}</strong>
              <span v-if="e.numero_parcela" class="pequeno mudo">
                ({{ e.numero_parcela }}/{{ e.total_parcelas }})
              </span>
              <div class="pequeno mudo linha-flex" style="gap:6px;margin-top:3px">
                <i class="ponto" :style="{ background: e.categoria_cor }"></i>
                {{ e.categoria ?? 'Sem categoria' }}
                <span class="eti" :class="e.status">{{ e.status }}</span>
              </div>
            </div>
            <div class="direita">
              <div class="num" :class="e.tipo === 'receita' ? 'entrada' : 'saida'">
                {{ e.tipo === 'receita' ? '+' : '−' }} {{ dinheiro(e.valor) }}
              </div>
              <button v-if="e.status !== 'pago'" class="btn claro mini"
                      style="margin-top:6px" @click="pagar(e)">Dar baixa</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
