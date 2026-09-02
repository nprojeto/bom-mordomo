<script setup lang="ts">
const props = defineProps<{ chave: string }>()

const api = useApi()
const info = ref<any>(null)

// Cada função ganha uma prévia com a cara da tela de verdade. Ver o
// formato do que se está perdendo convence mais que uma lista de nomes.
const PREVIA: Record<string, { cartoes: { rotulo: string; valor: string; cor?: string }[] }> = {
  moderando: { cartoes: [
    { rotulo: 'Dá para gastar hoje', valor: 'R$ 135,02', cor: 'entrada' },
    { rotulo: 'Ainda tenho', valor: 'R$ 486,02' },
    { rotulo: 'Por dia', valor: 'R$ 97,20' },
  ] },
  calendario: { cartoes: [
    { rotulo: 'Vence hoje', valor: 'R$ 340,00', cor: 'saida' },
    { rotulo: 'Vence esta semana', valor: 'R$ 1.280,00' },
    { rotulo: 'Atrasadas', valor: 'R$ 0,00' },
  ] },
  contas: { cartoes: [
    { rotulo: 'Entra por mês', valor: 'R$ 8.200,00', cor: 'entrada' },
    { rotulo: 'Sai por mês', valor: 'R$ 6.480,00', cor: 'saida' },
    { rotulo: 'Sobra', valor: 'R$ 1.720,00' },
  ] },
  gastos: { cartoes: [
    { rotulo: 'Gasto no mês', valor: 'R$ 2.140,00', cor: 'saida' },
    { rotulo: 'No crédito', valor: 'R$ 1.320,00' },
    { rotulo: 'Lançamentos', valor: '38' },
  ] },
  cartoes: { cartoes: [
    { rotulo: 'Fatura fechada', valor: 'R$ 1.845,30', cor: 'saida' },
    { rotulo: 'Fatura aberta', valor: 'R$ 612,88' },
    { rotulo: 'Comprometido', valor: 'R$ 3.104,00' },
  ] },
  reservas: { cartoes: [
    { rotulo: 'Total guardado', valor: 'R$ 9.719,00', cor: 'entrada' },
    { rotulo: 'Fundo de reserva', valor: 'R$ 5.400,00' },
    { rotulo: 'Metas', valor: '3' },
  ] },
}

const previa = computed(() => PREVIA[props.chave]?.cartoes ?? [])

onMounted(async () => {
  try {
    const c = await api.get('/conta')
    info.value = (c?.recursos_catalogo ?? []).find((x: any) => x.chave === props.chave)
  } catch { /* segue com o texto padrão */ }
})
</script>

<template>
  <div>
    <!-- prévia com a cara da tela, valores cobertos -->
    <div v-if="previa.length" class="grade g3 larga" style="margin-bottom:16px">
      <div v-for="(c, i) in previa" :key="i" class="cartao trancado-cartao">
        <div class="rotulo">{{ c.rotulo }}</div>
        <div class="selo-valor coberto" :class="c.cor">{{ c.valor }}</div>
      </div>
    </div>

    <div class="cartao larga trancado">
      <div class="trancado-topo">
        <span class="trancado-cadeado"><i class="mi">lock</i></span>
        <div>
          <h2>{{ info?.nome ?? 'Esta parte do sistema' }}</h2>
          <div class="pequeno mudo">Não faz parte do seu plano atual</div>
        </div>
      </div>

      <p class="trancado-texto">
        {{ info?.detalhe ?? info?.texto ?? 'Fica disponível em outros planos.' }}
      </p>

      <ul v-if="info?.exemplos?.length" class="trancado-lista">
        <li v-for="(e, i) in info.exemplos" :key="i">{{ e }}</li>
      </ul>

      <div class="linha-flex" style="margin-top:18px">
        <NuxtLink :to="`/planos?bloqueado=${chave}`" class="btn latao">
          <i class="mi">workspace_premium</i>Ver planos que incluem
        </NuxtLink>
        <NuxtLink to="/" class="btn claro">Voltar ao painel</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trancado-cartao { opacity: .8; }
.trancado { border-left: 3px solid var(--laranja); }

.trancado-topo { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
.trancado-cadeado {
  width: 44px; height: 44px; flex: 0 0 44px; border-radius: 14px;
  background: var(--laranja-fundo); color: var(--laranja);
  display: grid; place-items: center;
}
.trancado-cadeado .mi { font-size: 22px; vertical-align: 0; }

.trancado-texto {
  margin: 0; font-size: .92rem; color: var(--tinta-70); line-height: 1.6;
  max-width: 62ch;
}

.trancado-lista {
  list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 7px;
}
.trancado-lista li {
  font-size: .86rem; color: var(--tinta-70); line-height: 1.5;
  padding-left: 20px; position: relative;
}
.trancado-lista li::before {
  content: '✓'; position: absolute; left: 0; top: 0;
  color: var(--laranja); font-weight: 700; font-size: .78rem;
}
</style>
