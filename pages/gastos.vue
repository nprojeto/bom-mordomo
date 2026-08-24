<script setup lang="ts">
const api = useApi()

const ouvindo = ref(false)
const texto = ref('')
const parcial = ref('')
const salvando = ref(false)
const erro = ref('')
const recado = ref('')
const suportaVoz = ref(true)
const carregando = ref(true)

const itens = ref<any[]>([])
const resumo = ref<any>({})
const cartoes = ref<any[]>([])
const categorias = ref<any[]>([])

const de = ref(hojeISO().slice(0, 8) + '01')
const ate = ref(hojeISO())
const filtroForma = ref('')

const form = ref<any>(null)

let reconhecedor: any = null

const exemplos = [
  'Mercado 85 reais no débito',
  'Tênis 600 em 6 vezes no Nubank',
  'Almoço 32 em dinheiro',
  'Farmácia 47 no crédito à vista'
]

const rotuloForma: Record<string, string> = {
  dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito'
}

const cartaoObrigatorio = computed(() =>
  form.value?.forma === 'credito' && !form.value?.cartao_id)

const totalDaCompra = computed(() => {
  if (!form.value) return 0
  const v = Math.abs(Number(form.value.valor) || 0)
  const n = form.value.forma === 'credito' ? Number(form.value.parcelas) || 1 : 1
  return form.value.base === 'total' ? v : v * n
})

const valorDaParcela = computed(() => {
  if (!form.value) return 0
  const n = form.value.forma === 'credito' ? Number(form.value.parcelas) || 1 : 1
  return totalDaCompra.value / n
})

/* ---------------------------------------------------------- voz */
onMounted(() => {
  const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  if (!SR) { suportaVoz.value = false } else {
    reconhecedor = new SR()
    reconhecedor.lang = 'pt-BR'
    reconhecedor.continuous = false
    reconhecedor.interimResults = true
    reconhecedor.onresult = (ev: any) => {
      let final = '', temp = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript
        if (ev.results[i].isFinal) final += t; else temp += t
      }
      parcial.value = temp
      if (final) { texto.value = final.trim(); parcial.value = ''; interpretar() }
    }
    reconhecedor.onerror = (e: any) => {
      ouvindo.value = false
      erro.value = e.error === 'not-allowed'
        ? 'O microfone está bloqueado. Libere o acesso nas permissões do navegador.'
        : 'Não consegui ouvir. Tente de novo.'
    }
    reconhecedor.onend = () => { ouvindo.value = false }
  }
  carregar()
})

function ouvir() {
  if (!reconhecedor) return
  erro.value = ''; recado.value = ''; form.value = null; texto.value = ''; parcial.value = ''
  ouvindo.value = true
  try { reconhecedor.start() } catch { ouvindo.value = false }
}
function parar() { reconhecedor?.stop(); ouvindo.value = false }

async function interpretar() {
  if (!texto.value.trim()) return
  erro.value = ''
  try {
    const r = await api.post('/gastos/interpretar', { texto: texto.value })
    form.value = {
      id: null,
      descricao: r.descricao,
      valor: r.valor,
      base: r.base,
      forma: r.forma,
      parcelas: r.parcelas,
      cartao_id: r.cartao_id,
      data: r.data,
      categoria_id: r.categoria_id,
      observacao: r.texto,
      origem: 'voz'
    }
  } catch (e: any) { erro.value = e.message }
}

/* ---------------------------------------------------------- crud */
function novoManual() {
  erro.value = ''; recado.value = ''; texto.value = ''
  form.value = {
    id: null, descricao: '', valor: '', base: 'parcela', forma: 'dinheiro',
    parcelas: 1, cartao_id: '', data: hojeISO(), categoria_id: '',
    observacao: '', origem: 'manual'
  }
}

function editar(g: any) {
  erro.value = ''
  form.value = {
    id: g.id,
    descricao: g.descricao,
    valor: g.valor_parcela,
    base: 'parcela',
    forma: g.forma,
    parcelas: g.parcelas,
    cartao_id: g.cartao_id ?? '',
    data: String(g.data).slice(0, 10),
    categoria_id: g.categoria_id ?? '',
    observacao: g.observacao ?? '',
    origem: g.origem
  }
}

watch(() => form.value?.forma, (nova) => {
  if (!form.value) return
  if (nova !== 'credito') { form.value.parcelas = 1; form.value.cartao_id = '' }
})

async function salvar() {
  if (!form.value) return
  erro.value = ''
  if (!Number(form.value.valor)) { erro.value = 'Informe o valor.'; return }
  if (cartaoObrigatorio.value) { erro.value = 'Escolha de qual cartão saiu.'; return }

  salvando.value = true
  const corpo = {
    descricao: form.value.descricao || 'Gasto',
    valor: Math.abs(Number(form.value.valor)),
    base: form.value.base,
    forma: form.value.forma,
    parcelas: Number(form.value.parcelas) || 1,
    cartao_id: form.value.cartao_id || null,
    data: form.value.data,
    categoria_id: form.value.categoria_id || null,
    observacao: form.value.observacao || null,
    origem: form.value.origem
  }
  try {
    if (form.value.id) await api.patch(`/gastos/${form.value.id}`, corpo)
    else await api.post('/gastos', corpo)
    recado.value = form.value.id ? 'Alterado.' : 'Registrado.'
    form.value = null; texto.value = ''
    await carregar()
    setTimeout(() => (recado.value = ''), 2500)
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

async function apagar(g: any) {
  if (!confirm(`Apagar "${g.descricao}"?`)) return
  await api.remove(`/gastos/${g.id}`)
  await carregar()
}

async function carregar() {
  carregando.value = true
  try {
    const q = `?de=${de.value}&ate=${ate.value}${filtroForma.value ? `&forma=${filtroForma.value}` : ''}`
    const [g, f, k] = await Promise.all([
      api.get(`/gastos${q}`), api.get('/faturas'), api.get('/categorias')
    ])
    itens.value = g?.itens ?? []
    resumo.value = g ?? {}
    cartoes.value = f?.cartoes ?? []
    categorias.value = (k ?? []).filter((c: any) => c.tipo === 'despesa')
  } catch (e: any) { erro.value = e.message }
  carregando.value = false
}
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Gastos</h1>
        <p>Fale ou digite. Dinheiro, débito ou crédito — tudo conta como saída.</p>
      </div>
      <button class="btn claro" @click="novoManual">＋ Lançar à mão</button>
    </div>

    <!-- microfone -->
    <div class="cartao centro" style="padding:28px 20px;margin-bottom:16px">
      <button class="botao-voz" :class="{ ativo: ouvindo }" :disabled="!suportaVoz"
              @click="ouvindo ? parar() : ouvir()">
        <span>{{ ouvindo ? '■' : '●' }}</span>
      </button>

      <div style="margin-top:12px;min-height:22px">
        <div v-if="ouvindo" class="mudo">Estou ouvindo…</div>
        <div v-else-if="!suportaVoz" class="mudo pequeno">
          Este navegador não converte voz em texto. Use o campo abaixo.
        </div>
        <div v-else class="mudo pequeno">Toque para falar</div>
        <div v-if="parcial" class="mudo" style="font-style:italic">{{ parcial }}</div>
      </div>

      <div style="max-width:460px;margin:14px auto 0">
        <div class="linha-flex">
          <input v-model="texto" placeholder="ou escreva: tênis 600 em 6 vezes no Nubank"
                 @keyup.enter="interpretar" />
          <button class="btn claro" @click="interpretar">Ler</button>
        </div>
        <div class="pequeno mudo" style="margin-top:9px">
          <em>{{ exemplos.join(' · ') }}</em>
        </div>
      </div>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro && !form" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

    <!-- formulario -->
    <div v-if="form" class="cartao" style="margin-bottom:16px;border-color:var(--latao)">
      <div class="entre" style="margin-bottom:12px">
        <div class="rotulo">
          {{ form.id ? 'Editando gasto' : (form.origem === 'voz' ? 'Entendi assim — confira' : 'Novo gasto') }}
        </div>
        <button class="fechar" @click="form = null">×</button>
      </div>

      <div class="grade g3">
        <div class="campo">
          <label>O que foi</label>
          <input v-model="form.descricao" placeholder="Mercado, tênis…" />
        </div>
        <div class="campo">
          <label>Data</label>
          <input v-model="form.data" type="date" />
        </div>
        <div class="campo">
          <label>Categoria</label>
          <select v-model="form.categoria_id">
            <option value="">Sem categoria</option>
            <option v-for="k in categorias" :key="k.id" :value="k.id">{{ k.nome }}</option>
          </select>
        </div>
      </div>

      <div class="campo">
        <label>Como pagou</label>
        <div class="linha-flex" style="flex-wrap:wrap">
          <button v-for="f in ['dinheiro','debito','credito']" :key="f"
                  class="btn mini" :class="form.forma === f ? '' : 'claro'"
                  @click="form.forma = f">
            {{ rotuloForma[f] }}
          </button>
        </div>
      </div>

      <!-- credito -->
      <div v-if="form.forma === 'credito'" class="grade g3">
        <div class="campo">
          <label>Cartão *</label>
          <select v-model="form.cartao_id">
            <option value="">— escolha —</option>
            <option v-for="c in cartoes" :key="c.id" :value="c.id">
              {{ c.nome }} ••{{ c.ultimos4 }}
            </option>
          </select>
        </div>
        <div class="campo">
          <label>Em quantas vezes</label>
          <input v-model="form.parcelas" type="number" min="1" max="72" />
        </div>
        <div class="campo">
          <label>O valor que informei é…</label>
          <select v-model="form.base">
            <option value="parcela">de cada parcela</option>
            <option value="total">o total da compra</option>
          </select>
        </div>
      </div>

      <div v-if="form.forma === 'credito' && !cartoes.length" class="aviso mal">
        Você ainda não tem cartão cadastrado.
        <NuxtLink to="/cartoes"><strong>Cadastre um aqui.</strong></NuxtLink>
      </div>

      <div class="grade g2" style="align-items:end">
        <div class="campo">
          <label>Valor (R$)</label>
          <input v-model="form.valor" type="number" step="0.01" />
        </div>
        <div class="campo">
          <label>Fica assim</label>
          <div class="num saida" style="font-size:1.2rem;padding-top:5px">
            {{ dinheiro(totalDaCompra) }}
            <span v-if="form.forma === 'credito' && Number(form.parcelas) > 1"
                  class="pequeno mudo">
              = {{ form.parcelas }}× {{ dinheiro(valorDaParcela) }}
            </span>
          </div>
        </div>
      </div>

      <div class="campo">
        <label>Observação</label>
        <input v-model="form.observacao" />
      </div>

      <div v-if="erro" class="aviso mal" style="margin-bottom:12px">{{ erro }}</div>

      <div class="linha-flex">
        <button class="btn latao" :disabled="salvando" @click="salvar">
          {{ salvando ? 'Gravando…' : (form.id ? 'Salvar alteração' : 'Gravar gasto') }}
        </button>
        <button class="btn claro" @click="form = null">Descartar</button>
      </div>
    </div>

    <!-- filtros -->
    <div class="cartao" style="margin-bottom:14px">
      <div class="grade g4">
        <div><label>De</label><input v-model="de" type="date" @change="carregar" /></div>
        <div><label>Até</label><input v-model="ate" type="date" @change="carregar" /></div>
        <div>
          <label>Forma</label>
          <select v-model="filtroForma" @change="carregar">
            <option value="">Todas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
        </div>
        <div>
          <label>Comprado no período</label>
          <div class="num saida" style="font-size:1.2rem;padding-top:5px">
            {{ dinheiro(resumo.total_comprado) }}
          </div>
        </div>
      </div>

      <div class="grade g3" style="margin-top:14px">
        <div class="pequeno">
          <span class="rotulo">Dinheiro</span>
          <div class="num">{{ dinheiro(resumo.por_forma?.dinheiro) }}</div>
        </div>
        <div class="pequeno">
          <span class="rotulo">Débito</span>
          <div class="num">{{ dinheiro(resumo.por_forma?.debito) }}</div>
        </div>
        <div class="pequeno">
          <span class="rotulo">Crédito</span>
          <div class="num">{{ dinheiro(resumo.por_forma?.credito) }}</div>
        </div>
      </div>
    </div>

    <!-- lista -->
    <div class="cartao chapa">
      <div class="cartao-topo">
        <h2>Lançamentos</h2>
        <span class="pequeno mudo">{{ itens.length }} registro(s)</span>
      </div>

      <div v-if="carregando" class="vazio">Consultando…</div>
      <div v-else-if="!itens.length" class="vazio">
        <div class="simbolo">◍</div>
        Nada registrado no período.
      </div>
      <div v-else class="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Data</th><th>O quê</th><th>Como</th><th>Categoria</th>
                <th class="direita">Valor</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="g in itens" :key="g.id">
              <td class="num pequeno">{{ dataBr(g.data) }}</td>
              <td>
                <strong>{{ g.descricao }}</strong>
                <div v-if="g.observacao" class="pequeno mudo">“{{ g.observacao }}”</div>
              </td>
              <td class="pequeno">
                <span v-if="g.forma !== 'credito'">{{ rotuloForma[g.forma] }}</span>
                <span v-else class="linha-flex" style="gap:6px">
                  <i class="ponto" :style="{ background: g.cartao_cor }"></i>
                  <span>
                    {{ g.cartao_nome }} <span class="num">••{{ g.ultimos4 }}</span>
                    <span v-if="g.parcelas > 1" class="mudo"> · {{ g.parcelas }}×</span>
                    <span v-else class="mudo"> · à vista</span>
                  </span>
                </span>
              </td>
              <td>
                <span class="linha-flex" style="gap:6px">
                  <i class="ponto" :style="{ background: g.categoria_cor ?? '#94a3b8' }"></i>
                  <span class="pequeno">{{ g.categoria ?? '—' }}</span>
                </span>
              </td>
              <td class="direita num saida">
                {{ dinheiro(g.valor_total) }}
                <div v-if="g.parcelas > 1" class="pequeno mudo">
                  {{ g.parcelas }}× {{ dinheiro(g.valor_parcela) }}
                </div>
              </td>
              <td class="direita" style="white-space:nowrap">
                <button class="btn claro mini" @click="editar(g)">Editar</button>
                <button class="btn risco mini" style="margin-left:4px" @click="apagar(g)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.botao-voz {
  width: 88px; height: 88px; border-radius: 50%;
  border: 2px solid var(--tinta); background: var(--tinta); color: #fff;
  font-size: 1.5rem; cursor: pointer; transition: .2s;
  box-shadow: 0 8px 24px -10px rgba(22,33,31,.6);
}
.botao-voz:hover { background: var(--verde); }
.botao-voz:disabled { opacity: .4; cursor: not-allowed; }
.botao-voz.ativo {
  background: var(--saida); border-color: var(--saida);
  animation: pulso 1.4s ease-in-out infinite;
}
@keyframes pulso {
  0%, 100% { box-shadow: 0 0 0 0 rgba(163,63,50,.45); }
  50%      { box-shadow: 0 0 0 16px rgba(163,63,50,0); }
}
@media (prefers-reduced-motion: reduce) { .botao-voz.ativo { animation: none; } }
</style>
