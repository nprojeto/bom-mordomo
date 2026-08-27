<script setup lang="ts">
const api = useApi()

const lista = ref<any[]>([])
const carregando = ref(true)
const abrindoReserva = ref(false)
const abrindoMov = ref(false)
const erro = ref('')
const extrato = ref<any[]>([])
const selecionada = ref<any>(null)

const vazioR = () => ({
  id: null as string | null, nome: '', tipo: 'investimento',
  instituicao: '', meta_valor: '', meta_data: '', cor: '#0ea5e9', observacao: ''
})
const vazioM = () => ({
  id: null as string | null, reserva_id: '', tipo: 'aporte',
  valor: '', data: hojeISO(), observacao: ''
})

const formR = ref(vazioR())
const formM = ref(vazioM())

const total = computed(() => lista.value
  .filter((r) => r.ativo !== false)
  .reduce((s, r) => s + Number(r.saldo || 0), 0))

const rotuloTipo: Record<string, string> = {
  investimento: 'Investimento', fundo_reserva: 'Fundo de reserva', meta: 'Meta'
}

const erroCarga = ref('')
const verArquivadas = ref(false)

const visiveis = computed(() =>
  verArquivadas.value ? lista.value : lista.value.filter((r) => r.ativo !== false))

const qtdArquivadas = computed(() =>
  lista.value.filter((r) => r.ativo === false).length)

async function reativar(r: any) {
  erroCarga.value = ''
  try {
    await api.post(`/reservas/reativar/${r.id}`)
    await carregar()
  } catch (e: any) { erroCarga.value = e.message }
}

async function carregar() {
  carregando.value = true
  erroCarga.value = ''
  try {
    lista.value = await api.get('/reservas?todas=1') ?? []
  } catch (e: any) {
    erroCarga.value = e.message
  } finally {
    carregando.value = false
  }
}

async function abrirExtrato(r: any) {
  selecionada.value = r
  extrato.value = await api.get(`/reservas/movimentos/${r.id}`) ?? []
}

/* ---------------- reserva ---------------- */
function novaReserva() { formR.value = vazioR(); erro.value = ''; abrindoReserva.value = true }

function editarReserva(r: any) {
  formR.value = {
    id: r.id, nome: r.nome, tipo: r.tipo,
    instituicao: r.instituicao ?? '',
    meta_valor: r.meta_valor ?? '', meta_data: r.meta_data ?? '',
    cor: r.cor ?? '#0ea5e9', observacao: r.observacao ?? ''
  }
  erro.value = ''
  abrindoReserva.value = true
}

async function salvarReserva() {
  if (!formR.value.nome.trim()) { erro.value = 'Dê um nome à reserva.'; return }
  const corpo = {
    nome: formR.value.nome.trim(),
    tipo: formR.value.tipo,
    instituicao: formR.value.instituicao || null,
    meta_valor: formR.value.meta_valor ? Number(formR.value.meta_valor) : null,
    meta_data: formR.value.meta_data || null,
    cor: formR.value.cor,
    observacao: formR.value.observacao || null
  }
  try {
    if (formR.value.id) await api.patch(`/reservas/${formR.value.id}`, corpo)
    else await api.post('/reservas', corpo)
    abrindoReserva.value = false
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function arquivarReserva(r: any) {
  if (!confirm(`Arquivar "${r.nome}"? O histórico continua guardado.`)) return
  erroCarga.value = ''
  try {
    await api.remove(`/reservas/${r.id}`)
    selecionada.value = null
    await carregar()
  } catch (e: any) { erroCarga.value = e.message }
}

async function apagarReserva(r: any) {
  const aviso = Number(r.saldo) > 0
    ? `\n\nATENÇÃO: esta reserva tem ${dinheiro(r.saldo)} guardado. Tudo será perdido.`
    : ''
  if (!confirm(`Apagar "${r.nome}" DE VEZ, junto com todos os lançamentos?${aviso}\n\nNão dá para desfazer.`)) return
  erroCarga.value = ''
  try {
    await api.remove(`/reservas/${r.id}?definitivo=1`)
    selecionada.value = null
    await carregar()
  } catch (e: any) { erroCarga.value = e.message }
}

/* ---------------- movimento ---------------- */
function novaMov(r: any) {
  formM.value = { ...vazioM(), reserva_id: r.id }
  erro.value = ''
  abrindoMov.value = true
}

function editarMov(m: any) {
  formM.value = {
    id: m.id, reserva_id: m.reserva_id, tipo: m.tipo,
    valor: m.valor, data: String(m.data).slice(0, 10), observacao: m.observacao ?? ''
  }
  erro.value = ''
  abrindoMov.value = true
}

async function salvarMov() {
  if (!Number(formM.value.valor)) { erro.value = 'Informe o valor.'; return }
  const corpo = {
    reserva_id: formM.value.reserva_id,
    tipo: formM.value.tipo,
    valor: Number(formM.value.valor),
    data: formM.value.data,
    observacao: formM.value.observacao || null
  }
  try {
    if (formM.value.id) await api.patch(`/reservas/movimentos/${formM.value.id}`, corpo)
    else await api.post('/reservas/movimentos', corpo)
    abrindoMov.value = false
    await carregar()
    if (selecionada.value) await abrirExtrato(selecionada.value)
  } catch (e: any) { erro.value = e.message }
}

async function apagarMov(m: any) {
  if (!confirm('Apagar este lançamento?')) return
  await api.remove(`/reservas/movimentos/${m.id}`)
  await carregar()
  if (selecionada.value) await abrirExtrato(selecionada.value)
}

function progresso(r: any) {
  if (!r.meta_valor) return null
  return Math.min(100, (Number(r.saldo) / Number(r.meta_valor)) * 100)
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Reservas</h1>
        <p>O que está guardado — investimento, emergência e metas.</p>
      </div>
      <div class="linha-flex">
        <button v-if="qtdArquivadas" class="btn claro" @click="verArquivadas = !verArquivadas">
          {{ verArquivadas ? 'Ocultar arquivadas' : `Ver arquivadas (${qtdArquivadas})` }}
        </button>
        <button class="btn" @click="novaReserva()"><i class="mi">add</i>Nova reserva</button>
      </div>
    </div>

    <div v-if="erroCarga" class="aviso mal entre" style="margin-bottom:16px">
      <span>{{ erroCarga }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <div class="cartao" style="margin-bottom:16px">
      <div class="rotulo">Total guardado</div>
      <div class="selo-valor">{{ dinheiro(total) }}</div>
    </div>

    <div v-if="carregando" class="vazio">Consultando…</div>
    <div v-else-if="!visiveis.length" class="cartao vazio">
      <div class="simbolo"><i class="mi">savings</i></div>
      Nenhuma reserva ainda.
    </div>

    <div v-else class="grade g2 larga">
      <div v-for="r in visiveis" :key="r.id" class="cartao"
           :style="r.ativo === false ? 'opacity:.6' : ''">
        <div class="entre">
          <div>
            <h3>{{ r.nome }}
              <span v-if="r.ativo === false" class="eti cancelado"
                    style="vertical-align:middle">arquivada</span>
            </h3>
            <div class="pequeno mudo">
              {{ rotuloTipo[r.tipo] }}<span v-if="r.instituicao"> · {{ r.instituicao }}</span>
            </div>
          </div>
          <i class="ponto" :style="{ background: r.cor, width:'12px', height:'12px' }"></i>
        </div>

        <div class="selo-valor" style="margin:12px 0 4px">{{ dinheiro(r.saldo) }}</div>

        <template v-if="progresso(r) !== null">
          <div class="barra-meta">
            <i :style="{ width: progresso(r) + '%', background: r.cor }"></i>
          </div>
          <div class="pequeno mudo" style="margin-top:5px">
            {{ Math.round(progresso(r)!) }}% da meta de {{ dinheiro(r.meta_valor) }}
          </div>
        </template>

        <div class="linha-flex" style="margin-top:14px;flex-wrap:wrap">
          <button class="btn latao mini" @click="novaMov(r)">Lançar</button>
          <button class="btn claro mini" @click="abrirExtrato(r)">Extrato</button>
          <button class="btn claro mini" @click="editarReserva(r)">Editar</button>
          <button v-if="r.ativo === false" class="btn latao mini" @click="reativar(r)">
            Reativar
          </button>
          <button v-else class="btn claro mini" @click="arquivarReserva(r)">Arquivar</button>
          <button class="btn risco mini" @click="apagarReserva(r)">Excluir</button>
        </div>
      </div>
    </div>

    <!-- extrato -->
    <div v-if="selecionada" class="veu" @click.self="selecionada = null">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ selecionada.nome }}</h2>
          <button class="fechar" @click="selecionada = null"><i class="mi">close</i></button>
        </div>
        <div class="painel-corpo" style="padding:0">
          <div v-if="!extrato.length" class="vazio">Sem lançamentos ainda.</div>
          <table v-else>
            <tbody>
              <tr v-for="m in extrato" :key="m.id">
                <td class="num pequeno" style="white-space:nowrap">{{ dataBr(m.data) }}</td>
                <td>
                  <span class="pequeno">{{ m.tipo === 'aporte' ? 'Aporte'
                    : m.tipo === 'resgate' ? 'Resgate' : 'Rendimento' }}</span>
                  <div v-if="m.observacao" class="pequeno mudo">{{ m.observacao }}</div>
                </td>
                <td class="direita num" :class="m.tipo === 'resgate' ? 'saida' : 'entrada'">
                  {{ m.tipo === 'resgate' ? '−' : '+' }} {{ dinheiro(m.valor) }}
                </td>
                <td class="direita" style="white-space:nowrap">
                  <button class="btn claro mini" @click="editarMov(m)">Editar</button>
                  <button class="btn risco mini" style="margin-left:4px" @click="apagarMov(m)"><i class="mi">close</i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="painel-pe">
          <button class="btn risco" @click="apagarReserva(selecionada)">Apagar de vez</button>
          <span class="espaco"></span>
          <button class="btn latao" @click="novaMov(selecionada)">Lançar</button>
        </div>
      </div>
    </div>

    <!-- reserva -->
    <div v-if="abrindoReserva" class="veu" @click.self="abrindoReserva = false">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ formR.id ? 'Editar reserva' : 'Nova reserva' }}</h2>
          <button class="fechar" @click="abrindoReserva = false"><i class="mi">close</i></button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>Nome</label>
            <input v-model="formR.nome" placeholder="Tesouro Selic, Reserva de emergência…" />
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Tipo</label>
              <select v-model="formR.tipo">
                <option value="investimento">Investimento</option>
                <option value="fundo_reserva">Fundo de reserva</option>
                <option value="meta">Meta de compra</option>
              </select>
            </div>
            <div class="campo">
              <label>Onde está</label>
              <input v-model="formR.instituicao" placeholder="Nubank, XP…" />
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Meta de valor (opcional)</label>
              <input v-model="formR.meta_valor" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Meta de data (opcional)</label>
              <input v-model="formR.meta_data" type="date" />
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Cor</label>
              <input v-model="formR.cor" type="color" style="height:40px;padding:3px" />
            </div>
            <div class="campo">
              <label>Observação</label>
              <input v-model="formR.observacao" />
            </div>
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="abrindoReserva = false">Cancelar</button>
          <button class="btn" @click="salvarReserva">Salvar</button>
        </div>
      </div>
    </div>

    <!-- movimento -->
    <div v-if="abrindoMov" class="veu" @click.self="abrindoMov = false">
      <div class="painel" style="max-width:420px">
        <div class="painel-topo">
          <h2>{{ formM.id ? 'Editar lançamento' : 'Lançar movimento' }}</h2>
          <button class="fechar" @click="abrindoMov = false"><i class="mi">close</i></button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>O que aconteceu</label>
            <select v-model="formM.tipo">
              <option value="aporte">Guardei dinheiro</option>
              <option value="resgate">Tirei dinheiro</option>
              <option value="rendimento">Rendeu juros</option>
            </select>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Valor (R$)</label>
              <input v-model="formM.valor" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Data</label>
              <input v-model="formM.data" type="date" />
            </div>
          </div>
          <div class="campo">
            <label>Observação</label>
            <input v-model="formM.observacao" />
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="abrindoMov = false">Cancelar</button>
          <button class="btn" @click="salvarMov">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
