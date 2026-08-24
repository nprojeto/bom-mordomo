<script setup lang="ts">
const api = useApi()

const ref_ = ref(hojeISO().slice(0, 7))
const itens = ref<any[]>([])
const carregando = ref(true)
const diaAberto = ref<string | null>(null)
const editando = ref<any>(null)
const erro = ref('')

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
      iso, dia: d.getDate(),
      fora: d.getMonth() !== m - 1,
      hoje: iso === hojeISO(),
      eventos: itens.value.filter((x) => String(x.data).slice(0, 10) === iso)
    })
  }
  return lista
})

const totais = computed(() => {
  const soma = (t: string) => itens.value.filter((x) => x.tipo === t)
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
  const ate = `${ref_.value}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
  try {
    itens.value = await api.get(`/calendario?de=${de}&ate=${ate}`) ?? []
    erro.value = ''
  } catch (e: any) {
    erro.value = e.message
    itens.value = []
  } finally {
    carregando.value = false
  }
}

async function pagar(o: any) {
  await api.patch(`/ocorrencias/pagar/${o.id}`, { valor_pago: o.valor })
  await carregar()
}

async function desfazer(o: any) {
  await api.patch(`/ocorrencias/desfazer/${o.id}`)
  await carregar()
}

function editar(o: any) {
  editando.value = {
    id: o.id,
    descricao: o.descricao,
    vencimento: String(o.data).slice(0, 10),
    valor_previsto: o.valor,
    valor_pago: o.valor_pago ?? '',
    status: o.status,
    observacao: o.observacao ?? ''
  }
  erro.value = ''
}

async function salvarEdicao() {
  erro.value = ''
  try {
    await api.patch(`/ocorrencias/${editando.value.id}`, {
      vencimento: editando.value.vencimento,
      valor_previsto: Number(editando.value.valor_previsto),
      valor_pago: editando.value.valor_pago === '' ? null : Number(editando.value.valor_pago),
      status: editando.value.status,
      observacao: editando.value.observacao || null
    })
    editando.value = null
    diaAberto.value = null
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function apagar(o: any) {
  if (!confirm(`Apagar o lançamento "${o.descricao}" deste dia?`)) return
  await api.remove(`/ocorrencias/${o.id}`)
  diaAberto.value = null
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Calendário</h1>
      <p>Tudo o que entra e sai, dia a dia. Clique num dia para editar.</p>
    </div>

    <div v-if="erro && !editando" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
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

      <div class="semana"><div v-for="d in DIAS" :key="d">{{ d }}</div></div>

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
    <div v-if="diaAberto && !editando" class="veu" @click.self="diaAberto = null">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ dataBr(diaAberto) }}</h2>
          <button class="fechar" @click="diaAberto = null">×</button>
        </div>
        <div class="painel-corpo pilha">
          <div v-for="e in eventosDoDia" :key="e.id"
               style="padding-bottom:14px;border-bottom:1px solid var(--linha)">
            <div class="entre">
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
              <div class="num direita" :class="e.tipo === 'receita' ? 'entrada' : 'saida'">
                {{ e.tipo === 'receita' ? '+' : '−' }} {{ dinheiro(e.valor) }}
              </div>
            </div>
            <div v-if="e.fatura" class="linha-flex" style="margin-top:8px">
              <NuxtLink to="/gastos" class="btn claro mini">Ver os gastos</NuxtLink>
              <span class="pequeno mudo">{{ e.itens }} lançamento(s) nesta fatura</span>
            </div>
            <div v-else class="linha-flex" style="margin-top:8px;flex-wrap:wrap">
              <button v-if="e.status !== 'pago'" class="btn latao mini" @click="pagar(e)">
                Dar baixa
              </button>
              <button v-else class="btn claro mini" @click="desfazer(e)">Desfazer baixa</button>
              <button class="btn claro mini" @click="editar(e)">Editar</button>
              <button class="btn risco mini" @click="apagar(e)">Apagar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- edicao -->
    <div v-if="editando" class="veu" @click.self="editando = null">
      <div class="painel" style="max-width:460px">
        <div class="painel-topo">
          <h2>Editar lançamento</h2>
          <button class="fechar" @click="editando = null">×</button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>Lançamento</label>
            <input :value="editando.descricao" disabled />
            <div class="pequeno mudo" style="margin-top:4px">
              O nome vem do cadastro em <strong>Contas</strong>. Aqui você ajusta só este mês.
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Vencimento</label>
              <input v-model="editando.vencimento" type="date" />
            </div>
            <div class="campo">
              <label>Situação</label>
              <select v-model="editando.status">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Valor previsto (R$)</label>
              <input v-model="editando.valor_previsto" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Valor pago (R$)</label>
              <input v-model="editando.valor_pago" type="number" step="0.01" />
            </div>
          </div>
          <div class="campo">
            <label>Observação</label>
            <textarea v-model="editando.observacao" rows="2"></textarea>
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="editando = null">Cancelar</button>
          <button class="btn" @click="salvarEdicao">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
