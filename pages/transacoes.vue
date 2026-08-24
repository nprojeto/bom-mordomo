<script setup lang="ts">
const api = useApi()

const transacoes = ref<any[]>([])
const contas = ref<any[]>([])
const categorias = ref<any[]>([])
const carregando = ref(true)
const sincronizando = ref(false)
const conectando = ref(false)
const recado = ref('')
const erro = ref('')

const de = ref(hojeISO().slice(0, 8) + '01')
const ate = ref(hojeISO())
const contaFiltro = ref('')

const totalGasto = computed(() =>
  transacoes.value.filter((t) => Number(t.valor) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.valor)), 0))

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const q = `?de=${de.value}&ate=${ate.value}${contaFiltro.value ? `&conta=${contaFiltro.value}` : ''}`
    const [t, c, k] = await Promise.all([
      api.get(`/transacoes${q}`), api.get('/banco/contas'), api.get('/categorias')
    ])
    transacoes.value = t ?? []
    contas.value = c ?? []
    categorias.value = k ?? []
  } catch (e: any) { erro.value = e.message }
  carregando.value = false
}

async function conectarBanco() {
  erro.value = ''; recado.value = ''
  conectando.value = true
  try {
    const { accessToken } = await api.post('/banco/connect-token')
    const Widget = (window as any).PluggyConnect
    if (!Widget) throw new Error('O conector do banco ainda está carregando. Recarregue a página.')

    const w = new Widget({
      connectToken: accessToken,
      includeSandbox: false,
      onSuccess: async (item: any) => {
        recado.value = 'Banco conectado. Importando os lançamentos…'
        await api.post('/banco/itens', { itemId: item?.item?.id ?? item?.itemId, dias: 365 })
        recado.value = 'Pronto. Seus gastos já estão aqui.'
        await carregar()
      },
      onError: (e: any) => { erro.value = 'Não deu para conectar: ' + (e?.message ?? '') }
    })
    w.init()
  } catch (e: any) { erro.value = e.message }
  conectando.value = false
}

async function sincronizar() {
  sincronizando.value = true
  erro.value = ''; recado.value = ''
  try {
    await api.post('/banco/sync', { dias: 60 })
    recado.value = 'Lançamentos atualizados.'
    await carregar()
  } catch (e: any) { erro.value = e.message }
  sincronizando.value = false
}

async function classificar(t: any, categoria_id: string) {
  await api.patch(`/transacoes/${t.id}`, { categoria_id: categoria_id || null })
  t.categoria_id = categoria_id
}

async function ignorar(t: any) {
  await api.patch(`/transacoes/${t.id}`, { ignorar: true })
  await carregar()
}

const editando = ref<any>(null)

function editar(t: any) {
  editando.value = {
    id: t.id,
    descricao: t.estabelecimento ?? t.descricao,
    data: String(t.data).slice(0, 10),
    valor: Math.abs(Number(t.valor)),
    saida: Number(t.valor) < 0,
    categoria_id: t.categoria_id ?? '',
    observacao: t.observacao ?? ''
  }
  erro.value = ''
}

async function salvarEdicao() {
  erro.value = ''
  const v = Math.abs(Number(editando.value.valor))
  try {
    await api.patch(`/transacoes/${editando.value.id}`, {
      descricao: editando.value.descricao,
      estabelecimento: editando.value.descricao,
      data: editando.value.data,
      valor: editando.value.saida ? -v : v,
      tipo: editando.value.saida ? 'debito' : 'credito',
      categoria_id: editando.value.categoria_id || null,
      observacao: editando.value.observacao || null
    })
    editando.value = null
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function apagar(t: any) {
  if (!confirm('Apagar este lançamento de vez?')) return
  await api.remove(`/transacoes/${t.id}`)
  await carregar()
}

function novoManual() {
  editando.value = {
    id: null, descricao: '', data: hojeISO(), valor: '',
    saida: true, categoria_id: '', observacao: ''
  }
  erro.value = ''
}

async function criarManual() {
  erro.value = ''
  const v = Math.abs(Number(editando.value.valor))
  if (!v) { erro.value = 'Informe o valor.'; return }
  try {
    await api.post('/transacoes', {
      descricao: editando.value.descricao || 'Lançamento',
      estabelecimento: editando.value.descricao || null,
      data: editando.value.data,
      valor: editando.value.saida ? -v : v,
      tipo: editando.value.saida ? 'debito' : 'credito',
      categoria_id: editando.value.categoria_id || null,
      observacao: editando.value.observacao || null
    })
    editando.value = null
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Cartão e banco</h1>
        <p>Cada compra chega aqui sozinha, direto do seu banco.</p>
      </div>
      <div class="linha-flex">
        <button class="btn claro" :disabled="sincronizando" @click="sincronizar">
          {{ sincronizando ? 'Atualizando…' : '↻ Atualizar' }}
        </button>
        <button class="btn claro" @click="novoManual">＋ Lançar à mão</button>
        <button class="btn latao" :disabled="conectando" @click="conectarBanco">
          ＋ Conectar banco
        </button>
      </div>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

    <!-- contas conectadas -->
    <div v-if="contas.length" class="grade g3" style="margin-bottom:16px">
      <div v-for="c in contas" :key="c.id" class="cartao">
        <div class="rotulo">{{ c.pluggy_items?.connector_nome ?? 'Banco' }}</div>
        <h3 style="margin:3px 0 6px">{{ c.nome }}</h3>
        <div class="num" style="font-size:1.15rem">{{ dinheiro(c.saldo) }}</div>
        <div class="pequeno mudo" style="margin-top:4px">
          {{ c.tipo === 'CREDIT' ? 'Cartão de crédito' : 'Conta corrente' }}
        </div>
      </div>
    </div>

    <div v-else-if="!carregando" class="cartao vazio" style="margin-bottom:16px">
      <div class="simbolo">↹</div>
      Nenhum banco conectado. Clique em <strong>Conectar banco</strong> para trazer
      seus gastos automaticamente.
    </div>

    <!-- filtros -->
    <div class="cartao" style="margin-bottom:14px">
      <div class="grade g4">
        <div><label>De</label><input v-model="de" type="date" @change="carregar" /></div>
        <div><label>Até</label><input v-model="ate" type="date" @change="carregar" /></div>
        <div>
          <label>Conta</label>
          <select v-model="contaFiltro" @change="carregar">
            <option value="">Todas</option>
            <option v-for="c in contas" :key="c.id" :value="c.id">{{ c.nome }}</option>
          </select>
        </div>
        <div>
          <label>Gasto no período</label>
          <div class="num saida" style="font-size:1.2rem;padding-top:5px">
            {{ dinheiro(totalGasto) }}
          </div>
        </div>
      </div>
    </div>

    <div class="cartao chapa">
      <div v-if="carregando" class="vazio">Consultando…</div>
      <div v-else-if="!transacoes.length" class="vazio">Nenhum lançamento no período.</div>
      <div v-else class="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Data</th><th>Descrição</th><th>Categoria</th>
                <th class="direita">Valor</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="t in transacoes" :key="t.id">
              <td class="num pequeno">{{ dataBr(t.data) }}</td>
              <td>
                <strong>{{ t.estabelecimento ?? t.descricao }}</strong>
                <div class="pequeno mudo">{{ t.contas_bancarias?.nome }}</div>
              </td>
              <td style="width:190px">
                <select :value="t.categoria_id ?? ''" style="font-size:.8rem;padding:5px 8px"
                        @change="classificar(t, ($event.target as HTMLSelectElement).value)">
                  <option value="">— classificar —</option>
                  <option v-for="k in categorias.filter(x => x.tipo === (Number(t.valor) < 0 ? 'despesa' : 'receita'))"
                          :key="k.id" :value="k.id">{{ k.nome }}</option>
                </select>
              </td>
              <td class="direita num" :class="Number(t.valor) < 0 ? 'saida' : 'entrada'">
                {{ dinheiro(t.valor) }}
              </td>
              <td class="direita" style="white-space:nowrap">
                <button class="btn claro mini" @click="editar(t)">Editar</button>
                <button class="btn claro mini" style="margin-left:4px" @click="ignorar(t)">Ocultar</button>
                <button class="btn risco mini" style="margin-left:4px" @click="apagar(t)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- editar / lancar a mao -->
    <div v-if="editando" class="veu" @click.self="editando = null">
      <div class="painel" style="max-width:460px">
        <div class="painel-topo">
          <h2>{{ editando.id ? 'Editar lançamento' : 'Lançar à mão' }}</h2>
          <button class="fechar" @click="editando = null">×</button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>Descrição</label>
            <input v-model="editando.descricao" placeholder="Mercado, farmácia…" />
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Valor (R$)</label>
              <input v-model="editando.valor" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Data</label>
              <input v-model="editando.data" type="date" />
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Entrada ou saída</label>
              <select v-model="editando.saida">
                <option :value="true">Saída — gastei</option>
                <option :value="false">Entrada — recebi</option>
              </select>
            </div>
            <div class="campo">
              <label>Categoria</label>
              <select v-model="editando.categoria_id">
                <option value="">Sem categoria</option>
                <option v-for="k in categorias.filter(x => x.tipo === (editando.saida ? 'despesa' : 'receita'))"
                        :key="k.id" :value="k.id">{{ k.nome }}</option>
              </select>
            </div>
          </div>
          <div class="campo">
            <label>Observação</label>
            <input v-model="editando.observacao" />
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="editando = null">Cancelar</button>
          <button class="btn" @click="editando.id ? salvarEdicao() : criarManual()">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
