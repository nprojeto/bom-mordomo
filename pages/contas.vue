<script setup lang="ts">
const api = useApi()

const lista = ref<any[]>([])
const categorias = ref<any[]>([])
const carregando = ref(true)
const abrindo = ref(false)
const salvando = ref(false)
const erro = ref('')
const filtro = ref<'todos' | 'despesa' | 'receita'>('todos')
const regerar = ref(true)

const vazio = () => ({
  id: null as string | null,
  descricao: '',
  tipo: 'despesa',
  modalidade: 'recorrente',
  categoria_id: '',
  valor: '',
  frequencia: 'mensal',
  data_inicio: hojeISO(),
  data_fim: '',
  total_parcelas: '',
  dia_vencimento: new Date().getDate(),
  credor: '',
  forma_pagamento: '',
  observacao: ''
})

const form = ref(vazio())

const catsFiltradas = computed(() =>
  categorias.value.filter((c) => c.tipo === form.value.tipo))

function diaDe(c: any) {
  if (c.dia_vencimento) return Number(c.dia_vencimento)
  const d = String(c.data_inicio ?? '').slice(8, 10)
  return d ? Number(d) : 99
}

const listaFiltrada = computed(() => {
  const base = filtro.value === 'todos'
    ? lista.value
    : lista.value.filter((c) => c.tipo === filtro.value)
  return [...base].sort((a, b) =>
    diaDe(a) - diaDe(b) || String(a.descricao).localeCompare(String(b.descricao)))
})

// Normaliza tudo para "quanto pesa por mes"
function porMes(c: any) {
  const v = Number(c.valor || 0)
  const fator: Record<string, number> = {
    semanal: 4.33, quinzenal: 2, mensal: 1, bimestral: 1 / 2,
    trimestral: 1 / 3, semestral: 1 / 6, anual: 1 / 12
  }
  if (c.modalidade === 'unica') return 0
  return v * (fator[c.frequencia] ?? 1)
}

const totais = computed(() => {
  const ativos = lista.value.filter((c) => c.ativo !== false)
  const soma = (tipo: string, fn: (c: any) => number) =>
    ativos.filter((c) => c.tipo === tipo).reduce((s, c) => s + fn(c), 0)
  const receitas = soma('receita', porMes)
  const despesas = soma('despesa', porMes) + totalCartoes.value
  return {
    receitas,
    despesas,
    sobra: receitas - despesas,
    qtdReceitas: ativos.filter((c) => c.tipo === 'receita').length,
    qtdDespesas: ativos.filter((c) => c.tipo === 'despesa').length,
    parceladas: ativos.filter((c) => c.modalidade === 'parcelada').length
  }
})

const totalFiltrado = computed(() =>
  listaFiltrada.value.reduce((s, c) => s + porMes(c), 0))

const rotuloModalidade: Record<string, string> = {
  unica: 'Uma vez', recorrente: 'Todo mês', parcelada: 'Parcelada'
}

const erroCarga = ref('')
const cartoes = ref<any[]>([])

// O que cada cartão pesa por mês: a fatura fechada se ainda vence,
// senão a que está acumulando agora.
function pesoDoCartao(c: any) {
  return Number(c.tem_fechada ? c.total_fechada : c.total_aberta) || 0
}

const totalCartoes = computed(() =>
  cartoes.value.reduce((s, c) => s + pesoDoCartao(c), 0))

async function carregar() {
  carregando.value = true
  erroCarga.value = ''
  try {
    const [c, k, f] = await Promise.all([
      api.get('/compromissos'), api.get('/categorias'), api.get('/faturas')
    ])
    lista.value = c ?? []
    categorias.value = k ?? []
    cartoes.value = f?.cartoes ?? []
  } catch (e: any) {
    erroCarga.value = e.message
  } finally {
    carregando.value = false
  }
}

function novo() { form.value = vazio(); erro.value = ''; abrindo.value = true }

function editar(c: any) {
  form.value = {
    ...vazio(), ...c,
    categoria_id: c.categoria_id ?? '',
    data_fim: c.data_fim ?? '',
    total_parcelas: c.total_parcelas ?? '',
    credor: c.credor ?? '',
    forma_pagamento: c.forma_pagamento ?? '',
    observacao: c.observacao ?? ''
  }
  erro.value = ''
  abrindo.value = true
}

async function salvar() {
  erro.value = ''
  if (!form.value.descricao.trim()) { erro.value = 'Dê um nome para esta conta.'; return }
  if (!Number(form.value.valor)) { erro.value = 'Informe o valor.'; return }
  if (form.value.modalidade === 'parcelada' && !Number(form.value.total_parcelas)) {
    erro.value = 'Informe quantas parcelas.'; return
  }

  salvando.value = true
  const corpo: any = {
    descricao: form.value.descricao.trim(),
    tipo: form.value.tipo,
    modalidade: form.value.modalidade,
    categoria_id: form.value.categoria_id || null,
    valor: Number(form.value.valor),
    frequencia: form.value.frequencia,
    data_inicio: form.value.data_inicio,
    data_fim: form.value.data_fim || null,
    total_parcelas: form.value.total_parcelas ? Number(form.value.total_parcelas) : null,
    dia_vencimento: form.value.dia_vencimento ? Number(form.value.dia_vencimento) : null,
    credor: form.value.credor || null,
    forma_pagamento: form.value.forma_pagamento || null,
    observacao: form.value.observacao || null
  }

  try {
    if (form.value.id)
      await api.patch(`/compromissos/${form.value.id}`, { ...corpo, regerar: regerar.value })
    else await api.post('/compromissos', corpo)
    abrindo.value = false
    await carregar()
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

async function excluir(c: any) {
  if (!confirm(`Remover "${c.descricao}" e todos os lançamentos futuros dela?`)) return
  await api.remove(`/compromissos/${c.id}`)
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Contas e entradas</h1>
        <p>O que se repete todo mês, o que é parcelado e o que entra.
          Contas anuais e trimestrais entram no total já divididas por mês.</p>
      </div>
      <button class="btn" @click="novo()"><i class="mi">add</i>Cadastrar</button>
    </div>

    <div v-if="!carregando && lista.length" class="grade g3" style="margin-bottom:16px">
      <div class="cartao">
        <div class="rotulo">Entra por mês</div>
        <div class="selo-valor entrada">{{ dinheiro(totais.receitas) }}</div>
        <div class="pequeno mudo">{{ totais.qtdReceitas }} entrada(s) fixa(s)</div>
      </div>
      <div class="cartao">
        <div class="rotulo">Sai por mês</div>
        <div class="selo-valor saida">{{ dinheiro(totais.despesas) }}</div>
        <div class="pequeno mudo">
          {{ totais.qtdDespesas }} conta(s)<span v-if="cartoes.length">
            + {{ cartoes.length }} cartão(ões)</span>
        </div>
      </div>
      <div class="cartao">
        <div class="rotulo">Sobra prevista</div>
        <div class="selo-valor" :class="totais.sobra >= 0 ? 'entrada' : 'saida'">
          {{ dinheiro(totais.sobra) }}
        </div>
        <div class="pequeno mudo">antes dos gastos do dia a dia</div>
      </div>
    </div>

    <!-- cartões de crédito: uma linha por cartão -->
    <div v-if="cartoes.length" class="cartao chapa larga" style="margin-bottom:16px">
      <div class="cartao-topo">
        <h2>Cartões de crédito</h2>
        <span class="num saida">{{ dinheiro(totalCartoes) }}</span>
      </div>
      <div class="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Vence</th><th>Cartão</th><th>Fatura</th>
                <th class="direita">Valor</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in cartoes" :key="c.id">
              <td class="num" style="width:70px;font-weight:600">
                dia {{ c.dia_vencimento }}
              </td>
              <td>
                <span class="linha-flex" style="gap:7px">
                  <i class="ponto" :style="{ background: c.cor }"></i>
                  <span>
                    <strong>{{ c.nome }}</strong>
                    <span class="num mudo pequeno"> ••{{ c.ultimos4 }}</span>
                    <div class="pequeno mudo">vira dia {{ c.dia_fechamento }}</div>
                  </span>
                </span>
              </td>
              <td class="pequeno">
                <template v-if="c.tem_fechada">
                  <span class="eti atrasado">fechada</span>
                  <div class="mudo">vence {{ dataBr(c.vencimento_fechada) }}</div>
                </template>
                <template v-else>
                  <span class="eti pendente">aberta</span>
                  <div class="mudo">{{ c.itens_aberta }} lançamento(s)</div>
                </template>
              </td>
              <td class="direita num saida">
                {{ dinheiro(pesoDoCartao(c)) }}
                <div v-if="c.tem_fechada && c.total_aberta" class="pequeno mudo">
                  próxima: {{ dinheiro(c.total_aberta) }}
                </div>
              </td>
              <td class="direita">
                <NuxtLink to="/cartoes" class="btn claro mini">Ver</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--linha)"
           class="pequeno mudo">
        Tudo que você lança em <NuxtLink to="/gastos"><strong>Gastos</strong></NuxtLink>
        no crédito soma aqui automaticamente.
      </div>
    </div>

    <div class="linha-flex" style="margin-bottom:14px">
      <button v-for="f in ['todos','despesa','receita']" :key="f"
              class="btn mini" :class="filtro === f ? '' : 'claro'"
              @click="filtro = f as any">
        {{ f === 'todos' ? 'Tudo' : (f === 'despesa' ? 'Saídas' : 'Entradas') }}
      </button>
    </div>

    <div v-if="erroCarga" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erroCarga }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <div class="cartao chapa">
      <div v-if="carregando" class="vazio">Consultando…</div>
      <div v-else-if="!listaFiltrada.length" class="vazio">
        <div class="simbolo"><i class="mi">receipt_long</i></div>
        Nada cadastrado ainda. Comece pelo aluguel, a luz, o salário.
      </div>
      <div v-else class="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Vence</th><th>Descrição</th><th>Categoria</th><th>Tipo</th>
              <th class="direita">Valor</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in listaFiltrada" :key="c.id">
              <td class="num" style="width:70px;font-weight:600">
                {{ c.dia_vencimento ? `dia ${c.dia_vencimento}` : dataBr(c.data_inicio) }}
              </td>
              <td>
                <strong>{{ c.descricao }}</strong>
                <div v-if="c.credor" class="pequeno mudo">{{ c.credor }}</div>
              </td>
              <td>
                <span class="linha-flex" style="gap:6px">
                  <i class="ponto" :style="{ background: c.categorias?.cor ?? '#94a3b8' }"></i>
                  <span class="pequeno">{{ c.categorias?.nome ?? '—' }}</span>
                </span>
              </td>
              <td class="pequeno">
                {{ rotuloModalidade[c.modalidade] }}
                <span v-if="c.total_parcelas" class="mudo">· {{ c.total_parcelas }}x</span>
              </td>
              <td class="direita num" :class="c.tipo === 'receita' ? 'entrada' : 'saida'">
                {{ c.tipo === 'receita' ? '+' : '−' }} {{ dinheiro(c.valor) }}
              </td>
              <td class="direita" style="white-space:nowrap">
                <button class="btn claro mini" @click="editar(c)">Editar</button>
                <button class="btn risco mini" style="margin-left:5px" @click="excluir(c)"><i class="mi">close</i></button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="filtro !== 'todos'">
            <tr style="background:#FAFBF9;border-top:2px solid var(--linha)">
              <td colspan="4" style="font-weight:700">
                Total {{ filtro === 'despesa' ? 'das saídas' : 'das entradas' }}
                <span class="pequeno mudo">({{ listaFiltrada.length }} itens, por mês)</span>
              </td>
              <td class="direita num" style="font-weight:700;font-size:1.05rem"
                  :class="filtro === 'receita' ? 'entrada' : 'saida'">
                {{ dinheiro(totalFiltrado) }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- formulario -->
    <div v-if="abrindo" class="veu" @click.self="abrindo = false">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ form.id ? 'Editar conta' : 'Nova conta' }}</h2>
          <button class="fechar" @click="abrindo = false"><i class="mi">close</i></button>
        </div>

        <div class="painel-corpo">
          <div class="campo">
            <label>É entrada ou saída?</label>
            <select v-model="form.tipo">
              <option value="despesa">Saída — conta a pagar</option>
              <option value="receita">Entrada — dinheiro que recebo</option>
            </select>
          </div>

          <div class="campo">
            <label>Descrição</label>
            <input v-model="form.descricao" placeholder="Aluguel, Energia, Salário…" />
          </div>

          <div class="dupla">
            <div class="campo">
              <label>Valor (R$)</label>
              <input v-model="form.valor" type="number" step="0.01" placeholder="0,00" />
            </div>
            <div class="campo">
              <label>Categoria</label>
              <select v-model="form.categoria_id">
                <option value="">Sem categoria</option>
                <option v-for="k in catsFiltradas" :key="k.id" :value="k.id">{{ k.nome }}</option>
              </select>
            </div>
          </div>

          <div class="campo">
            <label>Como se repete</label>
            <select v-model="form.modalidade">
              <option value="recorrente">Todo mês, sem fim definido</option>
              <option value="parcelada">Parcelada — tem número de parcelas</option>
              <option value="unica">Só uma vez</option>
            </select>
          </div>

          <div class="dupla" v-if="form.modalidade !== 'unica'">
            <div class="campo">
              <label>Frequência</label>
              <select v-model="form.frequencia">
                <option value="mensal">Mensal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="semanal">Semanal</option>
                <option value="bimestral">A cada 2 meses</option>
                <option value="trimestral">A cada 3 meses</option>
                <option value="semestral">A cada 6 meses</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div class="campo">
              <label>Dia do vencimento</label>
              <input v-model="form.dia_vencimento" type="number" min="1" max="31" />
            </div>
          </div>

          <div class="campo" v-if="form.modalidade === 'parcelada'">
            <label>Quantas parcelas</label>
            <input v-model="form.total_parcelas" type="number" min="1" placeholder="12" />
          </div>

          <div class="dupla">
            <div class="campo">
              <label>{{ form.modalidade === 'unica' ? 'Data' : 'Começa em' }}</label>
              <input v-model="form.data_inicio" type="date" />
            </div>
            <div class="campo" v-if="form.modalidade === 'recorrente'">
              <label>Termina em (opcional)</label>
              <input v-model="form.data_fim" type="date" />
            </div>
          </div>

          <div class="dupla">
            <div class="campo">
              <label>Para quem / de quem</label>
              <input v-model="form.credor" placeholder="Imobiliária, CPFL, Empresa…" />
            </div>
            <div class="campo">
              <label>Forma de pagamento</label>
              <input v-model="form.forma_pagamento" placeholder="Débito automático, Pix…" />
            </div>
          </div>

          <div class="campo">
            <label>Observação</label>
            <textarea v-model="form.observacao" rows="2"></textarea>
          </div>

          <div v-if="form.id" class="aviso" style="margin-bottom:12px">
            <label class="linha-flex" style="margin:0;cursor:pointer;font-weight:500">
              <input v-model="regerar" type="checkbox" style="width:auto;margin:0" />
              <span>Atualizar também os lançamentos futuros ainda não pagos</span>
            </label>
          </div>

          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>

        <div class="painel-pe">
          <button class="btn claro" @click="abrindo = false">Cancelar</button>
          <button class="btn" :disabled="salvando" @click="salvar">
            {{ salvando ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
