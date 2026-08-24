<script setup lang="ts">
const api = useApi()

const mes = ref(hojeISO().slice(0, 7))
const dados = ref<any>(null)
const doDia = ref<any[]>([])
const carregando = ref(true)
const erro = ref('')
const meuLimite = ref(0)
const mexeu = ref(false)

const rotuloMes = computed(() => {
  const [a, m] = mes.value.split('-')
  return `${MESES[Number(m) - 1]} de ${a}`
})

const sugerido = computed(() => Number(dados.value?.limite_sugerido ?? 0))
const diasRestantes = computed(() => Number(dados.value?.dias_restantes ?? 0))
const restante = computed(() => Number(dados.value?.restante ?? 0))
const gastoHoje = computed(() => Number(dados.value?.gasto_hoje ?? 0))

const sobraDeHoje = computed(() => Number(dados.value?.limite_hoje ?? 0) - gastoHoje.value)

// Se eu segurar em "meuLimite" por dia, com quanto termino o mês?
const economia = computed(() => {
  if (!dados.value || diasRestantes.value <= 0) return 0
  return restante.value - (meuLimite.value * diasRestantes.value)
})

const maxSlider = computed(() => Math.max(50, Math.ceil(sugerido.value * 2 / 10) * 10))

const diasPassados = computed(() =>
  (dados.value?.dias ?? []).filter((d: any) => d.passado || d.hoje).reverse())

const semVerba = computed(() => dados.value && Number(dados.value.verba) <= 0)

function mudarMes(passo: number) {
  const [a, m] = mes.value.split('-').map(Number)
  const d = new Date(a, m - 1 + passo, 1)
  mes.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  mexeu.value = false
  carregar()
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const [m, g] = await Promise.all([
      api.get(`/moderando?mes=${mes.value}`),
      api.get(`/gastos?de=${hojeISO()}&ate=${hojeISO()}`)
    ])
    dados.value = m
    doDia.value = g?.itens ?? []
    if (!mexeu.value) meuLimite.value = Math.floor(Number(m?.limite_sugerido ?? 0))
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Moderando</h1>
        <p>Quanto dá para gastar hoje sem apertar o fim do mês.</p>
      </div>
      <div class="linha-flex">
        <button class="btn claro mini" @click="mudarMes(-1)">‹</button>
        <span class="pequeno mudo" style="min-width:110px;text-align:center">{{ rotuloMes }}</span>
        <button class="btn claro mini" @click="mudarMes(1)">›</button>
      </div>
    </div>

    <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <div v-if="carregando" class="vazio">Fazendo as contas…</div>

    <template v-else-if="dados">
      <!-- limite de hoje -->
      <div class="cartao painel-limite">
        <div class="rotulo">Você pode gastar hoje</div>
        <div class="limite-grande" :class="sobraDeHoje < 0 ? 'saida' : ''">
          {{ dinheiro(dados.limite_hoje) }}
        </div>

        <div v-if="gastoHoje > 0" class="pequeno" style="margin-top:8px">
          Já gastou <span class="num">{{ dinheiro(gastoHoje) }}</span> hoje ·
          <span :class="sobraDeHoje >= 0 ? 'entrada' : 'saida'" style="font-weight:600">
            {{ sobraDeHoje >= 0
              ? `ainda cabem ${dinheiro(sobraDeHoje)}`
              : `passou ${dinheiro(-sobraDeHoje)}` }}
          </span>
        </div>
        <div v-else class="pequeno mudo" style="margin-top:8px">
          Nenhum gasto lançado hoje ainda.
        </div>

        <div class="regua-latao" style="margin:16px 0 14px;opacity:.35"></div>

        <div class="grade g4">
          <div>
            <div class="rotulo">Verba do mês</div>
            <div class="num">{{ dinheiro(dados.verba) }}</div>
          </div>
          <div>
            <div class="rotulo">Já gastei</div>
            <div class="num saida">{{ dinheiro(dados.gasto_do_mes) }}</div>
          </div>
          <div>
            <div class="rotulo">Ainda tenho</div>
            <div class="num" :class="restante >= 0 ? 'entrada' : 'saida'">
              {{ dinheiro(restante) }}
            </div>
          </div>
          <div>
            <div class="rotulo">Dias até o fim</div>
            <div class="num">{{ diasRestantes }}</div>
          </div>
        </div>
      </div>

      <div v-if="semVerba" class="aviso mal" style="margin-top:14px">
        Suas contas fixas deste mês já consomem tudo o que entra. Não sobra verba
        para o dia a dia — vale rever as contas ou as entradas.
      </div>

      <!-- de onde vem a verba -->
      <div class="cartao" style="margin-top:14px">
        <div class="rotulo" style="margin-bottom:10px">Como cheguei nessa verba</div>
        <table class="conta-simples">
          <tbody>
            <tr>
              <td>Entradas previstas no mês</td>
              <td class="direita num entrada">+ {{ dinheiro(dados.entradas) }}</td>
            </tr>
            <tr>
              <td>Contas fixas do mês</td>
              <td class="direita num saida">− {{ dinheiro(dados.contas_fixas) }}</td>
            </tr>
            <tr>
              <td>
                Parcelas de compras anteriores
                <div class="pequeno mudo">o que você já comprometeu em meses passados</div>
              </td>
              <td class="direita num saida">− {{ dinheiro(dados.parcelas_herdadas) }}</td>
            </tr>
            <tr class="total">
              <td><strong>Sobra para o dia a dia</strong></td>
              <td class="direita num" style="font-weight:700">{{ dinheiro(dados.verba) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- simulador -->
      <div class="cartao" style="margin-top:14px">
        <div class="entre" style="margin-bottom:6px">
          <div class="rotulo">E se eu segurar mais?</div>
          <button v-if="mexeu" class="btn claro mini"
                  @click="meuLimite = Math.floor(sugerido); mexeu = false">
            Voltar ao sugerido
          </button>
        </div>

        <div class="linha-flex" style="align-items:baseline;gap:8px;margin-bottom:10px">
          <span class="limite-medio num">{{ dinheiro(meuLimite) }}</span>
          <span class="pequeno mudo">por dia</span>
        </div>

        <input v-model.number="meuLimite" type="range" min="0" :max="maxSlider" step="1"
               class="regua" @input="mexeu = true" />

        <div class="entre pequeno mudo" style="margin-top:4px">
          <span>R$ 0</span>
          <span>sugerido: <strong class="num">{{ dinheiro(sugerido) }}</strong></span>
          <span>{{ dinheiro(maxSlider) }}</span>
        </div>

        <div class="resultado-simulacao" :class="economia >= 0 ? 'bom' : 'ruim'">
          <template v-if="diasRestantes <= 0">
            Este mês já fechou.
          </template>
          <template v-else-if="economia > 0">
            Gastando <span class="num">{{ dinheiro(meuLimite) }}</span> por dia nos
            {{ diasRestantes }} dias que faltam, você termina o mês com
            <strong class="num">{{ dinheiro(economia) }}</strong> sobrando.
          </template>
          <template v-else-if="economia < 0">
            Nesse ritmo você fecha o mês <strong class="num">{{ dinheiro(-economia) }}</strong>
            no vermelho.
          </template>
          <template v-else>
            Nesse ritmo o mês fecha exatamente no zero.
          </template>
        </div>
      </div>

      <!-- lancamentos de hoje -->
      <div class="cartao chapa" style="margin-top:14px">
        <div class="cartao-topo">
          <h2>O que você lançou hoje</h2>
          <NuxtLink to="/gastos" class="btn claro mini">Lançar gasto</NuxtLink>
        </div>
        <div v-if="!doDia.length" class="vazio">
          <div class="simbolo">☕</div>
          Nada gasto hoje até agora.
        </div>
        <div v-else class="tabela-rolagem">
          <table>
            <tbody>
              <tr v-for="g in doDia" :key="g.id">
                <td>
                  <strong>{{ g.descricao }}</strong>
                  <div class="pequeno mudo">
                    {{ g.forma === 'credito'
                      ? `${g.cartao_nome} ••${g.ultimos4}${g.parcelas > 1 ? ` · ${g.parcelas}×` : ''}`
                      : (g.forma === 'debito' ? 'Débito' : g.forma === 'pix' ? 'Pix' : 'Dinheiro') }}
                  </div>
                </td>
                <td class="direita num saida">
                  {{ dinheiro(g.forma === 'credito' ? g.valor_parcela : g.valor_total) }}
                  <div v-if="g.forma === 'credito' && g.parcelas > 1" class="pequeno mudo">
                    1ª de {{ g.parcelas }}
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#FAFBF9;border-top:2px solid var(--linha)">
                <td style="font-weight:700">Total de hoje</td>
                <td class="direita num saida" style="font-weight:700">
                  {{ dinheiro(gastoHoje) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- historico -->
      <div class="cartao chapa" style="margin-top:14px">
        <div class="cartao-topo">
          <h2>Dia a dia do mês</h2>
          <span class="pequeno mudo">limite × gasto</span>
        </div>
        <div v-if="!diasPassados.length" class="vazio">O mês ainda não começou.</div>
        <div v-else class="tabela-rolagem">
          <table>
            <thead>
              <tr><th>Dia</th><th class="direita">Podia gastar</th>
                  <th class="direita">Gastou</th><th class="direita">Diferença</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in diasPassados" :key="d.data"
                  :style="d.hoje ? 'background:var(--latao-fraco)' : ''">
                <td class="num">
                  {{ d.dia }}<span v-if="d.hoje" class="pequeno mudo"> · hoje</span>
                </td>
                <td class="direita num mudo">{{ dinheiro(d.limite) }}</td>
                <td class="direita num" :class="d.gasto > 0 ? 'saida' : 'mudo'">
                  {{ dinheiro(d.gasto) }}
                </td>
                <td class="direita num" :class="d.diferenca >= 0 ? 'entrada' : 'saida'">
                  {{ d.diferenca >= 0 ? '+' : '' }}{{ dinheiro(d.diferenca) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.painel-limite { border-left: 3px solid var(--latao); }

.limite-grande {
  font-family: var(--mono); font-size: 2.6rem; font-weight: 500;
  font-variant-numeric: tabular-nums; letter-spacing: -.04em;
  line-height: 1.1; color: var(--verde);
}
.limite-grande.saida { color: var(--saida); }

.limite-medio {
  font-size: 1.7rem; font-weight: 600; color: var(--tinta);
}

.conta-simples td { padding: 8px 0; border-bottom: 1px solid #EDF0EB; font-size: .88rem; }
.conta-simples tr.total td { border-bottom: 0; border-top: 2px solid var(--linha); padding-top: 11px; }

.regua {
  width: 100%; height: 30px; padding: 0; background: transparent;
  border: 0; appearance: none; cursor: pointer;
}
.regua:focus { outline: none; }
.regua::-webkit-slider-runnable-track {
  height: 6px; border-radius: 999px;
  background: linear-gradient(90deg, var(--verde), var(--latao));
}
.regua::-moz-range-track {
  height: 6px; border-radius: 999px;
  background: linear-gradient(90deg, var(--verde), var(--latao));
}
.regua::-webkit-slider-thumb {
  appearance: none; width: 24px; height: 24px; margin-top: -9px;
  border-radius: 50%; background: var(--carta);
  border: 3px solid var(--tinta); box-shadow: 0 2px 6px rgba(22,33,31,.3);
}
.regua::-moz-range-thumb {
  width: 24px; height: 24px; border-radius: 50%; background: var(--carta);
  border: 3px solid var(--tinta); box-shadow: 0 2px 6px rgba(22,33,31,.3);
}

.resultado-simulacao {
  margin-top: 14px; padding: 12px 14px; border-radius: 8px;
  font-size: .9rem; line-height: 1.5;
}
.resultado-simulacao.bom { background: var(--entrada-fraco); color: #1E5B42; }
.resultado-simulacao.ruim { background: var(--saida-fraco); color: #7A2C22; }
</style>
