<script setup lang="ts">
const api = useApi()

const itens = ref<any[]>([])
const resumo = ref<any>({})
const carregando = ref(true)
const erro = ref('')

const de = ref(hojeISO().slice(0, 8) + '01')
const ate = ref(hojeISO())
const filtroForma = ref('')

const lancador = ref<any>(null)

const rotuloForma: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito',
  credito: 'Crédito', beneficio: 'Vale'
}
const FORMAS = ['dinheiro', 'pix', 'debito', 'credito', 'beneficio']

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const q = `?de=${de.value}&ate=${ate.value}${filtroForma.value ? `&forma=${filtroForma.value}` : ''}`
    const g = await api.get(`/gastos${q}`)
    itens.value = g?.itens ?? []
    resumo.value = g ?? {}
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

function editar(g: any) {
  lancador.value?.editar(g)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function apagar(g: any) {
  if (!confirm(`Apagar "${g.descricao}"?`)) return
  try {
    await api.remove(`/gastos/${g.id}`)
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Gastos</h1>
      <p>Tudo o que saiu no dia a dia — dinheiro, pix, débito e crédito.</p>
    </div>

    <LancarGasto ref="lancador" @salvo="carregar" />

    <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <!-- filtros -->
    <div class="cartao" style="margin-bottom:14px">
      <div class="grade g4">
        <div>
          <label>De</label>
          <input v-model="de" type="date" :max="hojeISO()" @change="carregar" />
        </div>
        <div>
          <label>Até</label>
          <input v-model="ate" type="date" :max="hojeISO()" @change="carregar" />
        </div>
        <div>
          <label>Forma</label>
          <select v-model="filtroForma" @change="carregar">
            <option value="">Todas</option>
            <option v-for="f in FORMAS" :key="f" :value="f">{{ rotuloForma[f] }}</option>
          </select>
        </div>
        <div>
          <label>Comprado no período</label>
          <div class="num saida" style="font-size:1.2rem;padding-top:5px">
            {{ dinheiro(resumo.total_comprado) }}
          </div>
        </div>
      </div>

      <div class="grade g4" style="margin-top:14px">
        <div v-for="f in FORMAS" :key="f" class="pequeno">
          <span class="rotulo">{{ rotuloForma[f] }}</span>
          <div class="num">{{ dinheiro(resumo.por_forma?.[f]) }}</div>
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
        <div class="simbolo"><i class="mi">shopping_bag</i></div>
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
                <span v-if="g.forma === 'beneficio'" class="linha-flex" style="gap:6px">
                  <i class="ponto" :style="{ background: g.cartao_cor }"></i>
                  <span>
                    {{ g.cartao_nome }} <span class="num">••{{ g.ultimos4 }}</span>
                    <span class="mudo"> · vale</span>
                  </span>
                </span>
                <span v-else-if="g.forma !== 'credito'">{{ rotuloForma[g.forma] }}</span>
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
                <button class="btn risco mini" style="margin-left:4px" @click="apagar(g)"><i class="mi">close</i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
