<script setup lang="ts">
const api = useApi()

const ouvindo = ref(false)
const texto = ref('')
const parcial = ref('')
const previa = ref<any>(null)
const salvando = ref(false)
const erro = ref('')
const recado = ref('')
const suportaVoz = ref(true)
const lista = ref<any[]>([])
const total = ref(0)

let reconhecedor: any = null

const exemplos = [
  'Gastei 45 reais no mercado',
  'Paguei 32 e 90 de Uber ontem',
  'Almoço 28 reais',
  'Recebi 200 de freelance hoje'
]

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
  erro.value = ''; recado.value = ''; previa.value = null; texto.value = ''; parcial.value = ''
  ouvindo.value = true
  try { reconhecedor.start() } catch { ouvindo.value = false }
}

function parar() { reconhecedor?.stop(); ouvindo.value = false }

async function interpretar() {
  if (!texto.value.trim()) return
  erro.value = ''
  try {
    previa.value = await api.post('/gastos/interpretar', { texto: texto.value })
  } catch (e: any) { erro.value = e.message }
}

async function confirmar() {
  if (!previa.value) return
  salvando.value = true
  erro.value = ''
  try {
    await api.post('/gastos/voz', {
      texto: texto.value,
      descricao: previa.value.descricao,
      valor: Number(previa.value.valor),
      tipo: previa.value.tipo,
      data: previa.value.data,
      categoria_id: previa.value.categoria_id
    })
    recado.value = 'Registrado.'
    previa.value = null; texto.value = ''
    await carregar()
    setTimeout(() => (recado.value = ''), 2500)
  } catch (e: any) { erro.value = e.message }
  salvando.value = false
}

async function carregar() {
  const de = hojeISO().slice(0, 8) + '01'
  const r = await api.get(`/gastos?de=${de}&ate=${hojeISO()}`)
  lista.value = r?.itens ?? []
  total.value = r?.total ?? 0
}

async function apagar(g: any) {
  if (!confirm(`Apagar "${g.descricao}"?`)) return
  await api.remove(`/gastos/${g.id}`)
  await carregar()
}
</script>

<template>
  <div>
    <div class="topo">
      <h1>Gastos do dia</h1>
      <p>Aperte o botão, fale o gasto. O resto é comigo.</p>
    </div>

    <!-- microfone -->
    <div class="cartao centro" style="padding:30px 20px;margin-bottom:16px">
      <button class="botao-voz" :class="{ ativo: ouvindo }"
              :disabled="!suportaVoz"
              @click="ouvindo ? parar() : ouvir()">
        <span>{{ ouvindo ? '■' : '●' }}</span>
      </button>

      <div style="margin-top:14px;min-height:24px">
        <div v-if="ouvindo" class="mudo">Estou ouvindo…</div>
        <div v-else-if="!suportaVoz" class="mudo pequeno">
          Este navegador não tem microfone para texto. Use o campo abaixo.
        </div>
        <div v-else class="mudo pequeno">Toque para falar</div>
        <div v-if="parcial" class="mudo" style="font-style:italic">{{ parcial }}</div>
      </div>

      <div style="max-width:440px;margin:16px auto 0">
        <div class="linha-flex">
          <input v-model="texto" placeholder="ou escreva aqui: mercado 45 reais"
                 @keyup.enter="interpretar" />
          <button class="btn claro" @click="interpretar">Ler</button>
        </div>
        <div class="pequeno mudo" style="margin-top:10px">
          Exemplos: <em>{{ exemplos.join(' · ') }}</em>
        </div>
      </div>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

    <!-- confirmacao -->
    <div v-if="previa" class="cartao" style="margin-bottom:16px;border-color:var(--latao)">
      <div class="rotulo">Entendi assim — confira antes de gravar</div>
      <div class="grade g4" style="margin-top:12px">
        <div class="campo">
          <label>Descrição</label>
          <input v-model="previa.descricao" />
        </div>
        <div class="campo">
          <label>Valor (R$)</label>
          <input v-model="previa.valor" type="number" step="0.01" />
        </div>
        <div class="campo">
          <label>Data</label>
          <input v-model="previa.data" type="date" />
        </div>
        <div class="campo">
          <label>Categoria</label>
          <select v-model="previa.categoria_id">
            <option value="">Sem categoria</option>
            <option v-for="k in previa.categorias" :key="k.id" :value="k.id">{{ k.nome }}</option>
          </select>
        </div>
      </div>
      <div class="linha-flex">
        <button class="btn latao" :disabled="salvando" @click="confirmar">
          {{ salvando ? 'Gravando…' : 'Gravar gasto' }}
        </button>
        <button class="btn claro" @click="previa = null">Descartar</button>
        <span class="espaco"></span>
        <span class="num" :class="previa.tipo === 'receita' ? 'entrada' : 'saida'"
              style="font-size:1.3rem">
          {{ previa.tipo === 'receita' ? '+' : '−' }} {{ dinheiro(previa.valor) }}
        </span>
      </div>
    </div>

    <!-- lista do mes -->
    <div class="cartao chapa">
      <div class="cartao-topo">
        <h2>Lançados este mês</h2>
        <span class="num saida">{{ dinheiro(total) }}</span>
      </div>
      <div v-if="!lista.length" class="vazio">
        <div class="simbolo">◍</div>
        Nada registrado ainda neste mês.
      </div>
      <div v-else class="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Quando</th><th>O quê</th><th>Categoria</th>
                <th class="direita">Valor</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="g in lista" :key="g.id">
              <td class="num pequeno">{{ dataBr(g.data) }}</td>
              <td>
                <strong>{{ g.descricao }}</strong>
                <div v-if="g.observacao" class="pequeno mudo">“{{ g.observacao }}”</div>
              </td>
              <td>
                <span class="linha-flex" style="gap:6px">
                  <i class="ponto" :style="{ background: g.categorias?.cor ?? '#94a3b8' }"></i>
                  <span class="pequeno">{{ g.categorias?.nome ?? '—' }}</span>
                </span>
              </td>
              <td class="direita num" :class="Number(g.valor) < 0 ? 'saida' : 'entrada'">
                {{ dinheiro(g.valor) }}
              </td>
              <td class="direita">
                <button class="btn risco mini" @click="apagar(g)">×</button>
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
  width: 92px; height: 92px; border-radius: 50%;
  border: 2px solid var(--tinta); background: var(--tinta); color: #fff;
  font-size: 1.6rem; cursor: pointer; transition: .2s;
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
