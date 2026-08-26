<script setup lang="ts">
const emit = defineEmits<{ salvo: [] }>()

const api = useApi()

const ouvindo = ref(false)
const texto = ref('')
const parcial = ref('')
const salvando = ref(false)
const erro = ref('')
const recado = ref('')
const suportaVoz = ref(true)

const cartoes = ref<any[]>([])
const categorias = ref<any[]>([])
const form = ref<any>(null)
const seletorCartao = ref<HTMLSelectElement | null>(null)

let reconhecedor: any = null

const exemplos = [
  'Mercado oitenta e cinco no débito',
  'Farmácia trezentos e cinquenta parcelado em três vezes',
  'Três parcelas de duzentos e cinquenta',
  'Padaria quinze no pix'
]

const rotuloForma: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito'
}
const FORMAS = ['dinheiro', 'pix', 'debito', 'credito']

const cartaoObrigatorio = computed(() =>
  form.value?.forma === 'credito' && !form.value?.cartao_id)

const cartaoEscolhido = computed(() =>
  cartoes.value.find((c) => c.id === form.value?.cartao_id) ?? null)

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
onMounted(async () => {
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
  await carregarApoio()
})

async function carregarApoio() {
  try {
    const [f, k] = await Promise.all([api.get('/faturas'), api.get('/categorias')])
    cartoes.value = f?.cartoes ?? []
    categorias.value = (k ?? []).filter((c: any) => c.tipo === 'despesa')
  } catch { /* silencioso: o formulario ainda funciona sem as listas */ }
}

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
    await nextTick()
    if (cartaoObrigatorio.value) seletorCartao.value?.focus()
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
    emit('salvo')
    setTimeout(() => (recado.value = ''), 2500)
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

defineExpose({ editar, novoManual, carregarApoio })
</script>

<template>
  <div>
    <!-- microfone -->
    <div class="cartao centro" style="padding:24px 20px;margin-bottom:14px">
      <button class="botao-voz" :class="{ ativo: ouvindo }" :disabled="!suportaVoz"
              @click="ouvindo ? parar() : ouvir()">
        <span>{{ ouvindo ? '■' : '●' }}</span>
      </button>

      <div style="margin-top:12px;min-height:22px">
        <div v-if="ouvindo" class="mudo">Estou ouvindo…</div>
        <div v-else-if="!suportaVoz" class="mudo pequeno">
          Este navegador não converte voz em texto. Use o campo abaixo.
        </div>
        <div v-else class="mudo pequeno">Toque para falar seu gasto</div>
        <div v-if="parcial" class="mudo" style="font-style:italic">{{ parcial }}</div>
      </div>

      <div style="max-width:470px;margin:14px auto 0">
        <div class="linha-flex">
          <input v-model="texto" placeholder="ou escreva: mercado 85 no débito"
                 @keyup.enter="interpretar" />
          <button class="btn claro" @click="interpretar">Ler</button>
          <button class="btn claro" @click="novoManual">À mão</button>
        </div>
        <div class="pequeno mudo" style="margin-top:9px">
          <em>{{ exemplos.join(' · ') }}</em>
        </div>
      </div>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro && !form" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

    <!-- formulario -->
    <div v-if="form" class="cartao" style="margin-bottom:14px;border-color:var(--latao)">
      <div class="entre" style="margin-bottom:12px">
        <div class="rotulo">
          {{ form.id ? 'Editando gasto' : (form.origem === 'voz' ? 'Entendi assim — confira' : 'Novo gasto') }}
        </div>
        <button class="fechar" @click="form = null">×</button>
      </div>

      <div class="resumo-voz">
        <div>
          <div class="selo-valor saida">{{ dinheiro(totalDaCompra) }}</div>
          <div class="pequeno" style="margin-top:2px">
            <strong>{{ form.descricao || 'Sem descrição' }}</strong>
            <span class="mudo"> · {{ rotuloForma[form.forma] }}</span>
            <span v-if="form.forma === 'credito'" class="mudo">
              · {{ Number(form.parcelas) > 1
                ? form.parcelas + '× ' + dinheiro(valorDaParcela) : 'à vista' }}
            </span>
            <span v-if="cartaoEscolhido" class="mudo">
              · {{ cartaoEscolhido.nome }} ••{{ cartaoEscolhido.ultimos4 }}
            </span>
          </div>
        </div>
        <button class="btn latao" :disabled="salvando || cartaoObrigatorio" @click="salvar">
          {{ salvando ? 'Gravando…' : (form.id ? 'Salvar' : 'Gravar') }}
        </button>
      </div>

      <div v-if="cartaoObrigatorio && cartoes.length" class="aviso" style="margin-bottom:14px">
        <strong>Falta escolher o cartão.</strong>
        Você tem {{ cartoes.length }} cadastrados — selecione abaixo.
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
          <button v-for="f in FORMAS" :key="f"
                  class="btn mini" :class="form.forma === f ? '' : 'claro'"
                  @click="form.forma = f">
            {{ rotuloForma[f] }}
          </button>
        </div>
      </div>

      <div v-if="form.forma === 'credito'" class="grade g3">
        <div class="campo">
          <label>Cartão *</label>
          <select ref="seletorCartao" v-model="form.cartao_id"
                  :style="cartaoObrigatorio ? 'border-color:var(--latao);outline:2px solid var(--latao)' : ''">
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

      <div class="aviso pequeno" style="margin-bottom:12px">
        <template v-if="form.forma === 'credito'">
          Vai para a fatura do cartão e sai do saldo só no vencimento dela.
        </template>
        <template v-else>
          Sai do saldo na hora, no dia {{ dataBr(form.data) }}.
        </template>
      </div>

      <div v-if="erro" class="aviso mal" style="margin-bottom:12px">{{ erro }}</div>

      <div class="linha-flex">
        <button class="btn claro" @click="form = null">Descartar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resumo-voz {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  background: var(--papel); border: 1px solid var(--linha);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
}
.resumo-voz .selo-valor { font-size: 1.7rem; line-height: 1.1; }

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
