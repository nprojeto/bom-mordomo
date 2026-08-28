<script setup lang="ts">
const api = useApi()

const dados = ref<any>(null)
const carregando = ref(true)
const erro = ref('')

const mostrar = ref<'ambos' | 'receita' | 'despesa'>('ambos')
const acumulado = ref(false)
const barras = ref(true)
const detalhar = ref(false)          // por categoria ou só os totais
const escondidas = ref<string[]>([])

const inicio = new Date(new Date(hojeISO() + 'T12:00:00').getTime() - 29 * 86400000)
const de = ref(inicio.toISOString().slice(0, 10))
const ate = ref(hojeISO())

const dias = computed(() => Number(dados.value?.dias ?? 30))

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    dados.value = await api.get(`/dash?de=${de.value}&ate=${ate.value}`)
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

function mudarPeriodo(p: { de: string; ate: string }) {
  de.value = p.de
  ate.value = p.ate
  carregar()
}

function alternarLinha(chave: string) {
  const i = escondidas.value.indexOf(chave)
  if (i >= 0) escondidas.value.splice(i, 1)
  else escondidas.value.push(chave)
}

// As linhas do gráfico: ou os dois totais, ou uma por categoria.
const series = computed(() => {
  if (!dados.value) return []

  if (!detalhar.value) {
    const t: any[] = []
    if (mostrar.value !== 'despesa') {
      t.push({
        chave: 'total:receita', nome: 'Entradas', cor: '#12A150',
        pontos: dados.value.resumo.por_dia_entradas
      })
    }
    if (mostrar.value !== 'receita') {
      t.push({
        chave: 'total:despesa', nome: 'Saídas', cor: '#E0474C',
        pontos: dados.value.resumo.por_dia_saidas
      })
    }
    return t
  }

  return (dados.value.series ?? [])
    .filter((s: any) => mostrar.value === 'ambos' || s.tipo === mostrar.value)
})

const visiveis = computed(() =>
  series.value.filter((s: any) => !escondidas.value.includes(s.chave)))

const semDados = computed(() =>
  !carregando.value && dados.value
    && !(dados.value.series ?? []).length)

const media = computed(() => {
  if (!dados.value) return { entrada: 0, saida: 0 }
  return {
    entrada: dados.value.resumo.entradas / dias.value,
    saida: dados.value.resumo.saidas / dias.value
  }
})

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Dash</h1>
      <p>Quanto entra e quanto sai em cada dia — e com o quê.</p>
    </div>

    <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <!-- período -->
    <div class="cartao larga" style="margin-bottom:14px">
      <SeletorPeriodo :de="de" :ate="ate" @mudou="mudarPeriodo" />

      <div class="linha-flex" style="flex-wrap:wrap;gap:16px;margin-top:18px;
                                     padding-top:16px;border-top:1px solid var(--linha)">
        <div>
          <div class="rotulo" style="margin-bottom:7px">Mostrar</div>
          <div class="linha-flex" style="flex-wrap:wrap">
            <button class="btn mini" :class="mostrar === 'ambos' ? '' : 'claro'"
                    @click="mostrar = 'ambos'">Tudo</button>
            <button class="btn mini" :class="mostrar === 'receita' ? '' : 'claro'"
                    @click="mostrar = 'receita'">Só entradas</button>
            <button class="btn mini" :class="mostrar === 'despesa' ? '' : 'claro'"
                    @click="mostrar = 'despesa'">Só saídas</button>
          </div>
        </div>

        <div>
          <div class="rotulo" style="margin-bottom:7px">Como ver</div>
          <div class="linha-flex" style="flex-wrap:wrap">
            <button class="btn mini" :class="detalhar ? 'claro' : ''"
                    @click="detalhar = false">Totais</button>
            <button class="btn mini" :class="detalhar ? '' : 'claro'"
                    @click="detalhar = true">Por categoria</button>
            <button class="btn mini" :class="acumulado ? '' : 'claro'"
                    @click="acumulado = !acumulado">Acumulado</button>
            <button v-if="!acumulado" class="btn mini" :class="barras ? '' : 'claro'"
                    @click="barras = !barras">
              {{ barras ? 'Barras' : 'Linhas' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="carregando" class="vazio">Montando o gráfico…</div>

    <template v-else-if="dados">
      <!-- números do período -->
      <div class="grade g4" style="margin-bottom:14px">
        <div class="cartao">
          <div class="rotulo">Entrou</div>
          <div class="selo-valor entrada">{{ dinheiro(dados.resumo.entradas) }}</div>
          <div class="pequeno mudo">{{ dinheiro(media.entrada) }} por dia</div>
        </div>
        <div class="cartao">
          <div class="rotulo">Saiu</div>
          <div class="selo-valor saida">{{ dinheiro(dados.resumo.saidas) }}</div>
          <div class="pequeno mudo">{{ dinheiro(media.saida) }} por dia</div>
        </div>
        <div class="cartao">
          <div class="rotulo">Diferença</div>
          <div class="selo-valor"
               :class="dados.resumo.saldo >= 0 ? 'entrada' : 'saida'">
            {{ dinheiro(dados.resumo.saldo) }}
          </div>
          <div class="pequeno mudo">nos últimos {{ dias }} dias</div>
        </div>
        <div class="cartao">
          <div class="rotulo">Dias sem gastar</div>
          <div class="selo-valor">{{ dados.resumo.dias_sem_gastar }}</div>
          <div class="pequeno mudo">de {{ dias }} dias</div>
        </div>
      </div>

      <!-- os dias que mais pesaram -->
      <div class="grade g2" style="margin-bottom:14px">
        <div v-if="dados.resumo.dia_maior_saida" class="cartao">
          <div class="rotulo">Dia que mais gastou</div>
          <div class="entre" style="margin-top:4px">
            <div>
              <div class="selo-valor saida">
                {{ dinheiro(dados.resumo.dia_maior_saida.valor) }}
              </div>
              <div class="pequeno mudo">
                {{ dataBr(dados.resumo.dia_maior_saida.data) }}
              </div>
            </div>
            <div v-if="dados.resumo.dia_maior_saida.categoria" class="direita">
              <span class="linha-flex" style="gap:7px">
                <i class="ponto" :style="{ background: dados.resumo.dia_maior_saida.cor }"></i>
                <span class="pequeno">{{ dados.resumo.dia_maior_saida.categoria }}</span>
              </span>
              <div class="pequeno mudo">puxou o dia</div>
            </div>
          </div>
        </div>

        <div v-if="dados.resumo.dia_maior_entrada" class="cartao">
          <div class="rotulo">Dia que mais recebeu</div>
          <div class="entre" style="margin-top:4px">
            <div>
              <div class="selo-valor entrada">
                {{ dinheiro(dados.resumo.dia_maior_entrada.valor) }}
              </div>
              <div class="pequeno mudo">
                {{ dataBr(dados.resumo.dia_maior_entrada.data) }}
              </div>
            </div>
            <div v-if="dados.resumo.dia_maior_entrada.categoria" class="direita">
              <span class="linha-flex" style="gap:7px">
                <i class="ponto" :style="{ background: dados.resumo.dia_maior_entrada.cor }"></i>
                <span class="pequeno">{{ dados.resumo.dia_maior_entrada.categoria }}</span>
              </span>
              <div class="pequeno mudo">puxou o dia</div>
            </div>
          </div>
        </div>
      </div>

      <!-- gráfico -->
      <div class="cartao larga">
        <div class="entre" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
          <h2>{{ acumulado ? 'Acumulado no período' : 'Movimento por dia' }}</h2>
          <span class="pequeno mudo">
            {{ dias }} dias · pelo dia em que aconteceu
          </span>
        </div>

        <div v-if="semDados" class="vazio">
          <div class="simbolo"><i class="mi">monitoring</i></div>
          Nada lançado neste período.
        </div>



        <div v-else-if="!visiveis.length" class="vazio">
          Nenhuma linha selecionada.
        </div>

        <GraficoLinhas v-else :datas="dados.datas" :series="visiveis"
                       :acumulado="acumulado" :barras="barras" :altura="320" />

        <!-- legenda, que também liga e desliga as linhas -->
        <div v-if="series.length" class="legenda">
          <button v-for="s in series" :key="s.chave" class="legenda-item"
                  :class="{ apagada: escondidas.includes(s.chave) }"
                  @click="alternarLinha(s.chave)">
            <i class="ponto" :style="{ background: s.cor }"></i>
            <span>{{ s.nome }}</span>
            <strong v-if="s.total" class="num">{{ dinheiro(s.total) }}</strong>
          </button>
        </div>

        <div v-if="detalhar && series.length > 6" class="pequeno mudo"
             style="margin-top:10px">
          Com muitas categorias o gráfico fica confuso — clique nas de que
          não precisa para escondê-las.
        </div>
      </div>

      <!-- ranking -->
      <div v-if="dados.series.length" class="cartao chapa larga" style="margin-top:14px">
        <div class="cartao-topo">
          <h2>Onde o dinheiro passou</h2>
          <span class="pequeno mudo">{{ dias }} dias</span>
        </div>
        <div class="tabela-rolagem">
          <table>
            <thead>
              <tr><th>Categoria</th><th>Tipo</th>
                  <th class="direita">Total</th><th class="direita">Por dia</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in dados.series" :key="s.chave">
                <td>
                  <span class="linha-flex" style="gap:8px">
                    <i class="ponto" :style="{ background: s.cor }"></i>
                    <strong>{{ s.nome }}</strong>
                  </span>
                </td>
                <td class="pequeno mudo">
                  {{ s.tipo === 'receita' ? 'Entrada' : 'Saída' }}
                </td>
                <td class="direita num" :class="s.tipo === 'receita' ? 'entrada' : 'saida'">
                  {{ dinheiro(s.total) }}
                </td>
                <td class="direita num mudo">{{ dinheiro(s.total / dias) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.legenda {
  display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px;
  padding-top: 14px; border-top: 1px solid var(--linha);
}
.legenda-item {
  display: flex; align-items: center; gap: 7px;
  background: var(--papel); border: 1px solid var(--linha);
  border-radius: 999px; padding: 6px 12px; cursor: pointer;
  font: inherit; font-size: .78rem; color: var(--tinta); transition: .15s;
}
.legenda-item:hover { border-color: var(--tinta-45); }
.legenda-item.apagada { opacity: .4; }
.legenda-item.apagada .ponto { background: var(--tinta-45) !important; }
.legenda-item strong { font-size: .76rem; color: var(--tinta-70); }
</style>
