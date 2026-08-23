<script setup lang="ts">
const api = useApi()

const lista = ref<any[]>([])
const carregando = ref(true)
const abrindoReserva = ref(false)
const abrindoMov = ref(false)
const erro = ref('')
const extrato = ref<any[]>([])
const selecionada = ref<any>(null)

const formR = ref({ nome: '', tipo: 'investimento', instituicao: '', meta_valor: '', meta_data: '' })
const formM = ref({ reserva_id: '', tipo: 'aporte', valor: '', data: hojeISO(), observacao: '' })

const total = computed(() => lista.value.reduce((s, r) => s + Number(r.saldo || 0), 0))

const rotuloTipo: Record<string, string> = {
  investimento: 'Investimento', fundo_reserva: 'Fundo de reserva', meta: 'Meta'
}

async function carregar() {
  carregando.value = true
  lista.value = await api.get('/reservas') ?? []
  carregando.value = false
}

async function abrirExtrato(r: any) {
  selecionada.value = r
  extrato.value = await api.get(`/reservas/movimentos/${r.id}`) ?? []
}

function novaMov(r: any) {
  formM.value = { reserva_id: r.id, tipo: 'aporte', valor: '', data: hojeISO(), observacao: '' }
  erro.value = ''
  abrindoMov.value = true
}

async function salvarReserva() {
  if (!formR.value.nome.trim()) { erro.value = 'Dê um nome à reserva.'; return }
  try {
    await api.post('/reservas', {
      nome: formR.value.nome.trim(),
      tipo: formR.value.tipo,
      instituicao: formR.value.instituicao || null,
      meta_valor: formR.value.meta_valor ? Number(formR.value.meta_valor) : null,
      meta_data: formR.value.meta_data || null
    })
    abrindoReserva.value = false
    formR.value = { nome: '', tipo: 'investimento', instituicao: '', meta_valor: '', meta_data: '' }
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function salvarMov() {
  if (!Number(formM.value.valor)) { erro.value = 'Informe o valor.'; return }
  try {
    await api.post('/reservas/movimentos', {
      reserva_id: formM.value.reserva_id,
      tipo: formM.value.tipo,
      valor: Number(formM.value.valor),
      data: formM.value.data,
      observacao: formM.value.observacao || null
    })
    abrindoMov.value = false
    await carregar()
    if (selecionada.value) await abrirExtrato(selecionada.value)
  } catch (e: any) { erro.value = e.message }
}

function progresso(r: any) {
  if (!r.meta_valor) return null
  return Math.min(100, (Number(r.saldo) / Number(r.meta_valor)) * 100)
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo entre">
      <div>
        <h1>Reservas</h1>
        <p>O que está guardado — investimento, emergência e metas.</p>
      </div>
      <button class="btn" @click="erro=''; abrindoReserva = true">＋ Nova reserva</button>
    </div>

    <div class="cartao" style="margin-bottom:16px">
      <div class="rotulo">Total guardado</div>
      <div class="selo-valor">{{ dinheiro(total) }}</div>
    </div>

    <div v-if="carregando" class="vazio">Consultando…</div>
    <div v-else-if="!lista.length" class="cartao vazio">
      <div class="simbolo">◉</div>
      Nenhuma reserva ainda.
    </div>

    <div v-else class="grade g2">
      <div v-for="r in lista" :key="r.id" class="cartao">
        <div class="entre">
          <div>
            <h3>{{ r.nome }}</h3>
            <div class="pequeno mudo">
              {{ rotuloTipo[r.tipo] }}<span v-if="r.instituicao"> · {{ r.instituicao }}</span>
            </div>
          </div>
          <i class="ponto" :style="{ background: r.cor, width:'12px', height:'12px' }"></i>
        </div>

        <div class="selo-valor" style="margin:12px 0 4px">{{ dinheiro(r.saldo) }}</div>

        <template v-if="progresso(r) !== null">
          <div class="barra-meta">
            <i :style="{ width: progresso(r) + '%', background: r.cor }"></i>
          </div>
          <div class="pequeno mudo" style="margin-top:5px">
            {{ Math.round(progresso(r)!) }}% da meta de {{ dinheiro(r.meta_valor) }}
          </div>
        </template>

        <div class="linha-flex" style="margin-top:14px">
          <button class="btn latao mini" @click="novaMov(r)">Lançar</button>
          <button class="btn claro mini" @click="abrirExtrato(r)">Extrato</button>
        </div>
      </div>
    </div>

    <!-- extrato -->
    <div v-if="selecionada" class="veu" @click.self="selecionada = null">
      <div class="painel">
        <div class="painel-topo">
          <h2>{{ selecionada.nome }}</h2>
          <button class="fechar" @click="selecionada = null">×</button>
        </div>
        <div class="painel-corpo" style="padding:0">
          <div v-if="!extrato.length" class="vazio">Sem lançamentos ainda.</div>
          <table v-else>
            <tbody>
              <tr v-for="m in extrato" :key="m.id">
                <td class="num pequeno">{{ dataBr(m.data) }}</td>
                <td>
                  <span class="pequeno">{{ m.tipo === 'aporte' ? 'Aporte'
                    : m.tipo === 'resgate' ? 'Resgate' : 'Rendimento' }}</span>
                  <div v-if="m.observacao" class="pequeno mudo">{{ m.observacao }}</div>
                </td>
                <td class="direita num" :class="m.tipo === 'resgate' ? 'saida' : 'entrada'">
                  {{ m.tipo === 'resgate' ? '−' : '+' }} {{ dinheiro(m.valor) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- nova reserva -->
    <div v-if="abrindoReserva" class="veu" @click.self="abrindoReserva = false">
      <div class="painel">
        <div class="painel-topo">
          <h2>Nova reserva</h2>
          <button class="fechar" @click="abrindoReserva = false">×</button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>Nome</label>
            <input v-model="formR.nome" placeholder="Tesouro Selic, Reserva de emergência…" />
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Tipo</label>
              <select v-model="formR.tipo">
                <option value="investimento">Investimento</option>
                <option value="fundo_reserva">Fundo de reserva</option>
                <option value="meta">Meta de compra</option>
              </select>
            </div>
            <div class="campo">
              <label>Onde está</label>
              <input v-model="formR.instituicao" placeholder="Nubank, XP…" />
            </div>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Meta de valor (opcional)</label>
              <input v-model="formR.meta_valor" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Meta de data (opcional)</label>
              <input v-model="formR.meta_data" type="date" />
            </div>
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="abrindoReserva = false">Cancelar</button>
          <button class="btn" @click="salvarReserva">Salvar</button>
        </div>
      </div>
    </div>

    <!-- movimento -->
    <div v-if="abrindoMov" class="veu" @click.self="abrindoMov = false">
      <div class="painel" style="max-width:420px">
        <div class="painel-topo">
          <h2>Lançar movimento</h2>
          <button class="fechar" @click="abrindoMov = false">×</button>
        </div>
        <div class="painel-corpo">
          <div class="campo">
            <label>O que aconteceu</label>
            <select v-model="formM.tipo">
              <option value="aporte">Guardei dinheiro</option>
              <option value="resgate">Tirei dinheiro</option>
              <option value="rendimento">Rendeu juros</option>
            </select>
          </div>
          <div class="dupla">
            <div class="campo">
              <label>Valor (R$)</label>
              <input v-model="formM.valor" type="number" step="0.01" />
            </div>
            <div class="campo">
              <label>Data</label>
              <input v-model="formM.data" type="date" />
            </div>
          </div>
          <div class="campo">
            <label>Observação</label>
            <input v-model="formM.observacao" />
          </div>
          <div v-if="erro" class="aviso mal">{{ erro }}</div>
        </div>
        <div class="painel-pe">
          <button class="btn claro" @click="abrindoMov = false">Cancelar</button>
          <button class="btn" @click="salvarMov">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
