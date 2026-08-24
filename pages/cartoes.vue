<script setup lang="ts">
const api = useApi()

const cartoes = ref<any[]>([])
const faturas = ref<any[]>([])
const carregando = ref(true)
const abrindo = ref(false)
const erro = ref('')
const detalhe = ref<any>(null)

const vazio = () => ({
  id: null as string | null, nome: '', ultimos4: '',
  dia_fechamento: 25, dia_vencimento: 5, limite: '', cor: '#A33F32', observacao: ''
})
const form = ref(vazio())

const totalAberto = computed(() =>
  cartoes.value.reduce((s, c) => s + Number(c.total_aberta || 0), 0))

async function carregar() {
  carregando.value = true
  const r = await api.get('/faturas')
  cartoes.value = r?.cartoes ?? []
  faturas.value = r?.faturas ?? []
  carregando.value = false
}

function novo() { form.value = vazio(); erro.value = ''; abrindo.value = true }

function editar(c: any) {
  form.value = {
    id: c.id, nome: c.nome, ultimos4: c.ultimos4,
    dia_fechamento: c.dia_fechamento,
    dia_vencimento: c.dia_vencimento ?? '',
    limite: c.limite ?? '', cor: c.cor, observacao: c.observacao ?? ''
  }
  erro.value = ''
  abrindo.value = true
}

async function salvar() {
  erro.value = ''
  if (!form.value.nome.trim()) { erro.value = 'Dê um nome ao cartão.'; return }
  if (!/^\d{4}$/.test(String(form.value.ultimos4))) {
    erro.value = 'Os 4 últimos dígitos são obrigatórios (só números).'; return
  }
  if (!Number(form.value.dia_fechamento)) {
    erro.value = 'Informe o dia em que a fatura vira.'; return
  }
  if (!Number(form.value.dia_vencimento)) {
    erro.value = 'Informe o dia de vencimento da fatura.'; return
  }
  const corpo = {
    nome: form.value.nome.trim(),
    ultimos4: String(form.value.ultimos4),
    dia_fechamento: Number(form.value.dia_fechamento),
    dia_vencimento: Number(form.value.dia_vencimento),
    limite: form.value.limite ? Number(form.value.limite) : null,
    cor: form.value.cor,
    observacao: form.value.observacao || null
  }
  try {
    if (form.value.id) await api.patch(`/cartoes/${form.value.id}`, corpo)
    else await api.post('/cartoes', corpo)
    abrindo.value = false
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function arquivar(c: any) {
  if (!confirm(`Arquivar o cartão "${c.nome}"? O histórico continua guardado.`)) return
  await api.remove(`/cartoes/${c.id}`)
  await carregar()
}

async function apagar(c: any) {
  if (!confirm(`Apagar "${c.nome}" DE VEZ? Só funciona se não houver gastos nele.`)) return
  try {
    await api.remove(`/cartoes/${c.id}?definitivo=1`)
    detalhe.value = null
    await carregar()
  } catch (e: any) { alert(e.message) }
}

function faturasDo(id: string) {
  return faturas.value
    .filter((f) => f.cartao_id === id)
    .sort((a, b) => String(a.competencia) < String(b.competencia) ? 1 : -1)
}

function rotuloComp(d: string) {
  const [a, m] = String(d).slice(0, 7).split('-')
  return `${MESES[Number(m) - 1]}/${a}`
}
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Cartões</h1>
        <p>Cada cartão junta os gastos até fechar a fatura.</p>
      </div>
      <button class="btn" @click="novo()">＋ Novo cartão</button>
    </div>

    <div v-if="cartoes.length" class="cartao" style="margin-bottom:16px">
      <div class="rotulo">Somando nas faturas abertas</div>
      <div class="selo-valor saida">{{ dinheiro(totalAberto) }}</div>
    </div>

    <div v-if="carregando" class="vazio">Consultando…</div>

    <div v-else-if="!cartoes.length" class="cartao vazio">
      <div class="simbolo">▤</div>
      Nenhum cartão cadastrado. Cadastre um para lançar gastos no crédito.
    </div>

    <div v-else class="grade g2">
      <div v-for="c in cartoes" :key="c.id" class="cartao"
           :style="{ borderTop: `3px solid ${c.cor}` }">
        <div class="entre">
          <div>
            <h3>{{ c.nome }}</h3>
            <div class="pequeno mudo num">•••• {{ c.ultimos4 }}</div>
          </div>
          <div class="direita pequeno mudo">
            <div>Vira dia {{ c.dia_fechamento }}</div>
            <div>Vence dia {{ c.dia_vencimento }}</div>
          </div>
        </div>

        <div class="rotulo" style="margin-top:14px">Fatura aberta</div>
        <div class="selo-valor saida">{{ dinheiro(c.total_aberta) }}</div>
        <div class="pequeno mudo">
          {{ c.itens_aberta }} lançamento(s)<span v-if="c.vencimento_aberta">
            · vence em {{ dataBr(c.vencimento_aberta) }}</span>
        </div>

        <div v-if="c.limite" style="margin-top:10px">
          <div class="barra-meta">
            <i :style="{ width: Math.min(100, (c.total_aberta / c.limite) * 100) + '%',
                         background: c.cor }"></i>
          </div>
          <div class="pequeno mudo" style="margin-top:4px">
            Limite {{ dinheiro(c.limite) }}
          </div>
        </div>

        <div class="linha-flex" style="margin-top:14px;flex-wrap:wrap">
          <button class="btn claro mini" @click="detalhe = c">Faturas</button>
          <button class="btn claro mini" @click="editar(c)">Editar</button>
          <button class="btn risco mini" @click="arquivar(c)">Arquivar</button>
        </div>
      </div>
    </div>

    <!-- faturas do cartao -->
    <div v-if="detalhe" class="veu" @click.self="detalhe = null">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ detalhe.nome }} <span class="mudo num">••{{ detalhe.ultimos4 }}</span></h2>
          <button class="fechar" @click="detalhe = null">×</button>
        </div>
        <div class="painel-corpo" style="padding:0">
          <div v-if="!faturasDo(detalhe.id).length" class="vazio">
            Nenhuma fatura ainda.
          </div>
          <table v-else>
            <thead>
              <tr><th>Fatura</th><th>Vence</th><th class="direita">Itens</th>
                  <th class="direita">Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="f in faturasDo(detalhe.id)" :key="f.competencia">
                <td style="text-transform:capitalize">{{ rotuloComp(f.competencia) }}</td>
                <td class="num pequeno">{{ dataBr(f.vencimento) }}</td>
                <td class="direita num pequeno">{{ f.itens }}</td>
                <td class="direita num saida">{{ dinheiro(f.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="painel-pe">
          <button class="btn risco" @click="apagar(detalhe)">Apagar cartão</button>
          <span class="espaco"></span>
          <NuxtLink to="/gastos" class="btn latao">Lançar gasto</NuxtLink>
        </div>
      </div>
    </div>

    <!-- formulario -->
    <div v-if="abrindo" class="veu" @click.self="abrindo = false">
      <div class="painel" style="max-width:470px">
        <div class="painel-topo">
          <h2>{{ form.id ? 'Editar cartão' : 'Novo cartão' }}</h2>
          <button class="fechar" @click="abrindo = false">×</button>
        </div>
        <div class="painel-corpo">
          <div class="dupla">
            <div class="campo">
              <label>Nome do cartão *</label>
              <input v-model="form.nome" placeholder="Nubank, Inter…" />
            </div>
            <div class="campo">
              <label>4 últimos dígitos *</label>
              <input v-model="form.ultimos4" maxlength="4" inputmode="numeric"
                     placeholder="1234" class="num" />
            </div>
          </div>

          <div class="dupla">
            <div class="campo">
              <label>Dia que a fatura vira *</label>
              <input v-model="form.dia_fechamento" type="number" min="1" max="31" />
            </div>
            <div class="campo">
              <label>Dia do vencimento *</label>
              <input v-model="form.dia_vencimento" type="number" min="1" max="31" />
            </div>
          </div>

          <div class="aviso pequeno" style="margin-bottom:13px">
            Compras até o dia da virada entram na fatura do mês; depois disso,
            vão para a fatura seguinte. O aviso por e-mail chega no dia do vencimento.
          </div>

          <div class="dupla">
            <div class="campo">
              <label>Limite (opcional)</label>
              <input v-model="form.limite" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Cor</label>
              <input v-model="form.cor" type="color" style="height:40px;padding:3px" />
            </div>
          </div>

          <div class="campo">
            <label>Observação</label>
            <input v-model="form.observacao" />
          </div>

          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="abrindo = false">Cancelar</button>
          <button class="btn" @click="salvar">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
