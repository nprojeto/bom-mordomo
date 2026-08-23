<script setup lang="ts">
const api = useApi()

const mes = ref(hojeISO().slice(0, 7))
const resumo = ref<any>(null)
const proximas = ref<any[]>([])
const atrasadas = ref<any[]>([])
const carregando = ref(true)
const erro = ref('')

const rotuloMes = computed(() => {
  const [a, m] = mes.value.split('-')
  return `${MESES[Number(m) - 1]} de ${a}`
})

const saldo = computed(() =>
  Number(resumo.value?.receitas || 0) - Number(resumo.value?.despesas || 0))

function mudarMes(passo: number) {
  const [a, m] = mes.value.split('-').map(Number)
  const d = new Date(a, m - 1 + passo, 1)
  mes.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  carregar()
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const hoje = hojeISO()
    const daqui = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const [r, p, a] = await Promise.all([
      api.get(`/resumo?mes=${mes.value}`),
      api.get(`/ocorrencias?de=${hoje}&ate=${daqui}&status=pendente`),
      api.get('/ocorrencias?status=atrasado')
    ])
    resumo.value = r
    proximas.value = (p ?? []).slice(0, 8)
    atrasadas.value = (a ?? []).filter((x: any) => x.tipo === 'despesa').slice(0, 6)
  } catch (e: any) {
    erro.value = e.message
  }
  carregando.value = false
}

async function pagar(id: string, valor: number) {
  await api.patch(`/ocorrencias/pagar/${id}`, { valor_pago: valor })
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Painel</h1>
        <p>Como está a casa em {{ rotuloMes }}.</p>
      </div>
      <div class="linha-flex">
        <button class="btn claro mini" @click="mudarMes(-1)">‹</button>
        <button class="btn claro mini" @click="mudarMes(1)">›</button>
      </div>
    </div>

    <div v-if="erro" class="aviso mal" style="margin-bottom:16px">{{ erro }}</div>
    <div v-if="carregando" class="vazio">Consultando os livros…</div>

    <template v-else-if="resumo">
      <!-- selos -->
      <div class="grade g4" style="margin-bottom:16px">
        <div class="cartao">
          <div class="rotulo">Entradas do mês</div>
          <div class="selo-valor entrada">{{ dinheiro(resumo.receitas) }}</div>
        </div>
        <div class="cartao">
          <div class="rotulo">Saídas do mês</div>
          <div class="selo-valor saida">{{ dinheiro(resumo.despesas) }}</div>
        </div>
        <div class="cartao">
          <div class="rotulo">Sobra prevista</div>
          <div class="selo-valor" :class="saldo >= 0 ? 'entrada' : 'saida'">
            {{ dinheiro(saldo) }}
          </div>
        </div>
        <div class="cartao">
          <div class="rotulo">Guardado</div>
          <div class="selo-valor">{{ dinheiro(resumo.total_reservado) }}</div>
        </div>
      </div>

      <div class="grade g2" style="margin-bottom:16px">
        <div class="cartao">
          <div class="rotulo">Ainda a pagar este mês</div>
          <div class="selo-valor">{{ dinheiro(resumo.pendentes) }}</div>
          <div class="pequeno mudo" style="margin-top:6px">
            Já pago: <span class="num">{{ dinheiro(resumo.pagas) }}</span>
          </div>
        </div>
        <div class="cartao">
          <div class="rotulo">Gasto no cartão</div>
          <div class="selo-valor">{{ dinheiro(resumo.gastos_cartao) }}</div>
          <div class="pequeno mudo" style="margin-top:6px">
            Lançamentos importados do banco no período.
          </div>
        </div>
      </div>

      <!-- atrasadas -->
      <div v-if="atrasadas.length" class="cartao chapa" style="margin-bottom:16px">
        <div class="cartao-topo">
          <h2 style="color:var(--saida)">Passou do prazo</h2>
          <span class="eti atrasado">{{ atrasadas.length }}</span>
        </div>
        <div class="tabela-rolagem">
          <table>
            <tbody>
              <tr v-for="o in atrasadas" :key="o.id">
                <td>
                  <strong>{{ o.descricao }}</strong>
                  <div class="pequeno mudo">Venceu em {{ dataBr(o.data) }}</div>
                </td>
                <td class="direita num saida">{{ dinheiro(o.valor) }}</td>
                <td class="direita" style="width:110px">
                  <button class="btn claro mini" @click="pagar(o.id, o.valor)">
                    Dar baixa
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- proximas -->
      <div class="cartao chapa">
        <div class="cartao-topo">
          <h2>Próximos 14 dias</h2>
          <NuxtLink to="/calendario" class="btn claro mini">Ver calendário</NuxtLink>
        </div>
        <div v-if="!proximas.length" class="vazio">
          <div class="simbolo">✓</div>
          Nada vencendo nas próximas duas semanas.
        </div>
        <div v-else class="tabela-rolagem">
          <table>
            <thead>
              <tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th>
                  <th class="direita">Valor</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="o in proximas" :key="o.id">
                <td class="num">{{ dataBr(o.data) }}</td>
                <td>
                  <strong>{{ o.descricao }}</strong>
                  <span v-if="o.numero_parcela" class="pequeno mudo">
                    ({{ o.numero_parcela }}/{{ o.total_parcelas }})
                  </span>
                </td>
                <td>
                  <span class="linha-flex" style="gap:6px">
                    <i class="ponto" :style="{ background: o.categoria_cor }"></i>
                    <span class="pequeno">{{ o.categoria ?? '—' }}</span>
                  </span>
                </td>
                <td class="direita num" :class="o.tipo === 'receita' ? 'entrada' : 'saida'">
                  {{ o.tipo === 'receita' ? '+' : '−' }} {{ dinheiro(o.valor) }}
                </td>
                <td class="direita" style="width:110px">
                  <button class="btn claro mini" @click="pagar(o.id, o.valor)">
                    Dar baixa
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
