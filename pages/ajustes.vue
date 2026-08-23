<script setup lang="ts">
const api = useApi()
const supa = useSupa()

const config = ref<any[]>([])
const categorias = ref<any[]>([])
const carregando = ref(true)
const recado = ref('')
const erro = ref('')
const enviando = ref(false)

const novaCat = ref({ nome: '', tipo: 'despesa', cor: '#64748b' })

function valorDe(chave: string) {
  return config.value.find((c) => c.chave === chave)?.valor ?? ''
}

async function carregar() {
  carregando.value = true
  const [c, k] = await Promise.all([api.get('/config'), api.get('/categorias')])
  config.value = c ?? []
  categorias.value = k ?? []
  carregando.value = false
}

async function salvarConfig(chave: string, valor: string) {
  await api.patch('/config', { chave, valor })
  recado.value = 'Salvo.'
  setTimeout(() => (recado.value = ''), 2500)
}

async function testarEmail() {
  enviando.value = true
  recado.value = ''; erro.value = ''
  try {
    const r = await api.post('/email/teste')
    recado.value = r?.enviado
      ? 'E-mail enviado. Confira a caixa de entrada.'
      : 'Não havia nada para enviar hoje.'
  } catch (e: any) { erro.value = e.message }
  enviando.value = false
}

async function criarCategoria() {
  if (!novaCat.value.nome.trim()) return
  await api.post('/categorias', { ...novaCat.value, nome: novaCat.value.nome.trim() })
  novaCat.value = { nome: '', tipo: 'despesa', cor: '#64748b' }
  await carregar()
}

async function removerCategoria(k: any) {
  if (!confirm(`Remover a categoria "${k.nome}"?`)) return
  await api.remove(`/categorias/${k.id}`)
  await carregar()
}

async function sair() {
  await supa.auth.signOut()
  await navigateTo('/login')
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="topo">
      <h1>Ajustes</h1>
      <p>Aviso diário, categorias e acesso.</p>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>
    <div v-if="carregando" class="vazio">Consultando…</div>

    <template v-else>
      <!-- e-mail -->
      <div class="cartao" style="margin-bottom:16px">
        <h2 style="margin-bottom:4px">Aviso diário por e-mail</h2>
        <p class="pequeno mudo" style="margin:0 0 16px">
          Todo dia às 8h da manhã, a lista das contas que vencem naquele dia.
        </p>

        <div class="campo">
          <label>Enviar para (separe por vírgula)</label>
          <input :value="valorDe('email_destinatarios')"
                 @change="salvarConfig('email_destinatarios', ($event.target as HTMLInputElement).value)" />
        </div>

        <button class="btn latao" :disabled="enviando" @click="testarEmail">
          {{ enviando ? 'Enviando…' : 'Enviar um agora para testar' }}
        </button>
      </div>

      <!-- categorias -->
      <div class="cartao chapa" style="margin-bottom:16px">
        <div class="cartao-topo"><h2>Categorias</h2></div>

        <div style="padding:16px 18px;border-bottom:1px solid var(--linha)">
          <div class="grade g4" style="align-items:end">
            <div>
              <label>Nome</label>
              <input v-model="novaCat.nome" placeholder="Nova categoria" />
            </div>
            <div>
              <label>Tipo</label>
              <select v-model="novaCat.tipo">
                <option value="despesa">Saída</option>
                <option value="receita">Entrada</option>
              </select>
            </div>
            <div>
              <label>Cor</label>
              <input v-model="novaCat.cor" type="color" style="height:40px;padding:3px" />
            </div>
            <div><button class="btn" style="width:100%" @click="criarCategoria">Adicionar</button></div>
          </div>
        </div>

        <div class="tabela-rolagem">
          <table>
            <tbody>
              <tr v-for="k in categorias" :key="k.id">
                <td style="width:34px">
                  <i class="ponto" :style="{ background: k.cor, width:'12px', height:'12px' }"></i>
                </td>
                <td><strong>{{ k.nome }}</strong></td>
                <td class="pequeno mudo">{{ k.tipo === 'receita' ? 'Entrada' : 'Saída' }}</td>
                <td class="direita">
                  <button class="btn risco mini" @click="removerCategoria(k)">Remover</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cartao">
        <h2 style="margin-bottom:10px">Acesso</h2>
        <button class="btn claro" @click="sair">Sair da conta</button>
      </div>
    </template>
  </div>
</template>
