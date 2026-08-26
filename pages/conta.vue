<script setup lang="ts">
const api = useApi()
const supa = useSupa()

const dados = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const recado = ref('')
const nomeCasa = ref('')
const novoEmail = ref('')
const convidando = ref(false)

const plano = computed(() => dados.value?.conta?.plano)
const dias = computed(() => Number(dados.value?.dias_restantes ?? 0))

const rotuloPlano: Record<string, string> = {
  teste: 'Período de teste',
  ativo: 'Assinatura ativa',
  vencido: 'Assinatura vencida',
  cancelado: 'Assinatura cancelada'
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    dados.value = await api.get('/conta')
    nomeCasa.value = dados.value?.conta?.nome ?? ''
  } catch (e: any) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

async function salvarNome() {
  erro.value = ''
  try {
    await api.patch('/conta', { nome: nomeCasa.value })
    recado.value = 'Nome salvo.'
    setTimeout(() => (recado.value = ''), 2500)
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function convidar() {
  erro.value = ''; recado.value = ''
  if (!novoEmail.value.trim()) return
  convidando.value = true
  try {
    await api.post('/convites', { email: novoEmail.value })
    recado.value = `Convite enviado para ${novoEmail.value.trim()}.`
    novoEmail.value = ''
    await carregar()
  } catch (e: any) { erro.value = e.message }
  convidando.value = false
}

async function cancelarConvite(c: any) {
  if (!confirm(`Cancelar o convite de ${c.email}?`)) return
  try {
    await api.remove(`/convites/${c.id}`)
    await carregar()
  } catch (e: any) { erro.value = e.message }
}

async function removerMembro(m: any) {
  if (!confirm(`Remover ${m.nome || m.email} da casa? A conta dessa pessoa será apagada.`)) return
  try {
    await api.remove(`/conta/membros/${m.id}`)
    await carregar()
  } catch (e: any) { erro.value = e.message }
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
      <h1>Minha casa</h1>
      <p>Quem tem acesso, o nome da casa e sua assinatura.</p>
    </div>

    <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>
    <div v-if="erro" class="aviso mal entre" style="margin-bottom:14px">
      <span>{{ erro }}</span>
      <button class="btn claro mini" @click="carregar">Tentar de novo</button>
    </div>

    <div v-if="carregando" class="vazio">Consultando…</div>

    <template v-else-if="dados">
      <!-- assinatura -->
      <div class="cartao" style="margin-bottom:16px"
           :style="dados.em_dia ? 'border-left:3px solid var(--entrada)' : 'border-left:3px solid var(--saida)'">
        <div class="entre">
          <div>
            <div class="rotulo">{{ rotuloPlano[plano] ?? plano }}</div>
            <div class="selo-valor" :class="dados.em_dia ? 'entrada' : 'saida'">
              {{ dados.em_dia
                ? (dias > 0 ? `${dias} dia${dias > 1 ? 's' : ''}` : 'último dia')
                : 'expirada' }}
            </div>
            <div class="pequeno mudo">
              <template v-if="plano === 'teste'">
                Teste até {{ dataBr(dados.conta.teste_ate) }}
              </template>
              <template v-else-if="dados.conta.assinatura_ate">
                Válida até {{ dataBr(dados.conta.assinatura_ate) }}
              </template>
              <template v-else>Sem data de expiração</template>
            </div>
          </div>
          <button class="btn latao" disabled>Assinar</button>
        </div>

        <div v-if="!dados.em_dia" class="aviso mal" style="margin-top:14px">
          O acesso expirou. Você ainda consegue consultar tudo, mas não dá
          para lançar nada novo até renovar.
        </div>
        <div v-else-if="plano === 'teste' && dias <= 5" class="aviso" style="margin-top:14px">
          Seu teste termina em breve.
        </div>

        <div class="pequeno mudo" style="margin-top:12px">
          O pagamento pelo Mercado Pago entra na próxima atualização.
        </div>
      </div>

      <!-- nome da casa -->
      <div class="cartao" style="margin-bottom:16px">
        <h2 style="margin-bottom:12px">Nome da casa</h2>
        <div class="linha-flex">
          <input v-model="nomeCasa" :disabled="!dados.sou_dono"
                 placeholder="Casa Silva, Nosso lar…" />
          <button v-if="dados.sou_dono" class="btn claro" @click="salvarNome">Salvar</button>
        </div>
        <div v-if="!dados.sou_dono" class="pequeno mudo" style="margin-top:6px">
          Só o dono da casa pode alterar.
        </div>
      </div>

      <!-- membros -->
      <div class="cartao chapa" style="margin-bottom:16px">
        <div class="cartao-topo">
          <h2>Quem tem acesso</h2>
          <span class="pequeno mudo">{{ dados.membros.length }} pessoa(s)</span>
        </div>

        <div class="tabela-rolagem">
          <table>
            <tbody>
              <tr v-for="m in dados.membros" :key="m.id">
                <td>
                  <strong>{{ m.nome || m.email }}</strong>
                  <span v-if="m.id === dados.eu" class="eti pago"
                        style="margin-left:6px">você</span>
                  <div class="pequeno mudo">{{ m.email }}</div>
                </td>
                <td class="pequeno mudo">
                  {{ m.papel === 'dono' ? 'Dono da casa' : 'Membro' }}
                </td>
                <td class="direita">
                  <button v-if="dados.sou_dono && m.id !== dados.eu"
                          class="btn risco mini" @click="removerMembro(m)">
                    Remover
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="dados.sou_dono" style="padding:16px 18px;border-top:1px solid var(--linha)">
          <label>Convidar alguém para esta casa</label>
          <div class="linha-flex">
            <input v-model="novoEmail" type="email" placeholder="email@dapessoa.com"
                   @keyup.enter="convidar" />
            <button class="btn" :disabled="convidando" @click="convidar">
              {{ convidando ? 'Enviando…' : 'Convidar' }}
            </button>
          </div>
          <div class="pequeno mudo" style="margin-top:6px">
            A pessoa recebe um e-mail e, ao criar a conta com esse mesmo endereço,
            entra direto aqui — vendo e lançando tudo junto com você.
          </div>
        </div>
      </div>

      <!-- convites pendentes -->
      <div v-if="dados.convites.length" class="cartao chapa" style="margin-bottom:16px">
        <div class="cartao-topo"><h2>Convites aguardando</h2></div>
        <div class="tabela-rolagem">
          <table>
            <tbody>
              <tr v-for="c in dados.convites" :key="c.id">
                <td>
                  <strong>{{ c.email }}</strong>
                  <div class="pequeno mudo">vale até {{ dataBr(c.expira_em) }}</div>
                </td>
                <td class="direita">
                  <button class="btn risco mini" @click="cancelarConvite(c)">Cancelar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cartao">
        <h2 style="margin-bottom:10px">Sessão</h2>
        <button class="btn claro" @click="sair">Sair da conta</button>
      </div>
    </template>
  </div>
</template>
