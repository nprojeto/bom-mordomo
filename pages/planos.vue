<script setup lang="ts">
const api = useApi()
const rota = useRoute()

const dados = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const assinando = ref('')

const motivo = computed(() => String(rota.query.bloqueado ?? ''))

const nomeRecurso = computed(() => {
  const r = dados.value?.recursos?.find((x: any) => x.chave === motivo.value)
  return r?.nome ?? ''
})

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    dados.value = await api.get('/planos')
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

function inclui(plano: any, chave: string) {
  const r = plano?.recursos ?? {}
  if (!Object.keys(r).length) return true
  return r[chave] !== false
}

// o plano resolve o que está faltando hoje?
function resolve(plano: any) {
  return motivo.value ? inclui(plano, motivo.value) : false
}

async function assinar(plano: any) {
  erro.value = ''
  if (!confirm(`Assinar "${plano.nome}" por ${dinheiro(plano.preco)} ao mês?`)) return
  assinando.value = plano.id
  try {
    const r = await api.post('/assinatura/checkout', { plano_id: plano.id })
    if (r?.link) { window.location.href = r.link; return }
    erro.value = 'O Mercado Pago não devolveu o link de pagamento.'
  } catch (e: any) { erro.value = e.message }
  assinando.value = ''
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Planos</h1>
      <p>Escolha o que a sua família precisa.</p>
    </div>

    <div v-if="motivo && nomeRecurso" class="aviso" style="margin-bottom:16px">
      <strong>{{ nomeRecurso }}</strong> não faz parte do seu plano atual.
      Os planos abaixo que incluem essa parte estão marcados.
    </div>

    <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <div v-if="carregando" class="vazio">Consultando…</div>

    <template v-else-if="dados">
      <div v-if="dados.plano_atual" class="cartao" style="margin-bottom:16px">
        <div class="entre">
          <div>
            <div class="rotulo">Seu plano hoje</div>
            <h2>{{ dados.plano_atual.nome }}</h2>
            <div class="pequeno mudo">
              {{ dinheiro(dados.plano_atual.preco) }}/mês ·
              até {{ dados.plano_atual.max_pessoas }} pessoa(s)
            </div>
          </div>
          <span class="eti" :class="dados.em_dia ? 'pago' : 'atrasado'">
            {{ dados.em_dia ? 'em dia' : 'vencido' }}
          </span>
        </div>
      </div>

      <div v-if="!dados.planos.length" class="cartao vazio">
        Nenhum plano disponível no momento.
      </div>

      <div v-else class="grade g3">
        <div v-for="p in dados.planos" :key="p.id" class="cartao plano"
             :class="{ atual: p.atual, resolve: resolve(p) && !p.atual }">
          <div class="entre">
            <h3>{{ p.nome }}</h3>
            <span v-if="p.atual" class="eti pago">seu plano</span>
            <span v-else-if="resolve(p)" class="eti" style="background:var(--latao-fraco);color:#7A5F19">
              resolve
            </span>
          </div>

          <div class="preco">{{ dinheiro(p.preco) }}<span class="mudo">/mês</span></div>
          <div class="pequeno mudo">{{ p.descricao || '\u00A0' }}</div>

          <div class="regua-latao" style="margin:14px 0;opacity:.3"></div>

          <div class="pequeno" style="margin-bottom:10px">
            <strong>{{ p.max_pessoas }}</strong> pessoa(s) na família
            <span v-if="p.dias_teste" class="mudo"> · {{ p.dias_teste }} dias de teste</span>
          </div>

          <ul class="lista-recursos">
            <li v-for="r in dados.recursos" :key="r.chave"
                :class="{ fora: !inclui(p, r.chave) }">
              <span class="marca">{{ inclui(p, r.chave) ? '✓' : '·' }}</span>
              {{ r.nome }}
            </li>
          </ul>

          <button v-if="!p.atual" class="btn latao" style="width:100%;margin-top:16px"
                  :disabled="assinando === p.id || !p.disponivel || !dados.pagamento_disponivel"
                  @click="assinar(p)">
            {{ assinando === p.id ? 'Abrindo…' : 'Assinar este' }}
          </button>
          <div v-else class="pequeno mudo centro" style="margin-top:16px">
            É o que você usa hoje
          </div>

          <div v-if="!p.disponivel && !p.atual" class="pequeno mudo centro" style="margin-top:6px">
            Ainda não disponível para contratação
          </div>
        </div>
      </div>

      <div class="cartao" style="margin-top:16px">
        <div class="pequeno mudo">
          A cobrança é mensal pelo Mercado Pago e pode ser cancelada quando quiser.
          Ao trocar de plano, o novo passa a valer assim que o pagamento entra.
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plano { display: flex; flex-direction: column; }
.plano.atual { border-color: var(--entrada); border-width: 2px; }
.plano.resolve { border-color: var(--latao); border-width: 2px; }

.preco {
  font-family: var(--mono); font-size: 1.7rem; font-weight: 500;
  letter-spacing: -.03em; margin-top: 10px;
}
.preco .mudo { font-size: .8rem; font-family: var(--sans); }

.lista-recursos { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.lista-recursos li { font-size: .85rem; display: flex; gap: 8px; align-items: baseline; }
.lista-recursos li .marca { color: var(--entrada); font-weight: 700; width: 12px; }
.lista-recursos li.fora { color: var(--tinta-45); }
.lista-recursos li.fora .marca { color: var(--linha); }
</style>
