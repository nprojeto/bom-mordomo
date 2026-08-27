<script setup lang="ts">
const supa = useSupa()
const rota = useRoute()

const etapa = ref<'dados' | 'codigo'>('dados')
const nome = ref('')
const casa = ref('')
const email = ref(String(rota.query.email ?? ''))
const senha = ref('')
const senha2 = ref('')
const codigo = ref('')
const erro = ref('')
const recado = ref('')
const carregando = ref(false)
const espera = ref(0)

const convidado = computed(() => !!rota.query.email)

const forcaSenha = computed(() => {
  const s = senha.value
  if (!s) return { n: 0, txt: '', cor: '' }
  let n = 0
  if (s.length >= 8) n++
  if (s.length >= 12) n++
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++
  if (/\d/.test(s)) n++
  if (/[^A-Za-z0-9]/.test(s)) n++
  const rot = ['muito fraca', 'fraca', 'razoável', 'boa', 'forte', 'forte']
  const cores = ['#E0474C', '#E0474C', '#C77800', '#12A150', '#12A150', '#12A150']
  return { n, txt: rot[n], cor: cores[n] }
})

let cronometro: any = null
function contar() {
  espera.value = 60
  clearInterval(cronometro)
  cronometro = setInterval(() => {
    espera.value--
    if (espera.value <= 0) clearInterval(cronometro)
  }, 1000)
}
onUnmounted(() => clearInterval(cronometro))

async function criar() {
  erro.value = ''
  const mail = email.value.trim().toLowerCase()

  if (!nome.value.trim()) { erro.value = 'Como podemos te chamar?'; return }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { erro.value = 'E-mail inválido.'; return }
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter ao menos 8 caracteres.'; return }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não são iguais.'; return }

  carregando.value = true
  const { data, error } = await supa.auth.signUp({
    email: mail,
    password: senha.value,
    options: { data: { nome: nome.value.trim(), casa: casa.value.trim() || null } }
  })
  carregando.value = false

  if (error) {
    erro.value = error.message.includes('already registered')
      ? 'Já existe uma conta com este e-mail. Tente entrar.'
      : error.message
    return
  }

  // se a confirmação estiver desligada no projeto, já entra
  if (data.session) { await navigateTo('/'); return }

  etapa.value = 'codigo'
  contar()
}

async function conferir() {
  erro.value = ''
  if (codigo.value.length < 6) { erro.value = 'Digite os 6 números.'; return }

  carregando.value = true
  const { data, error } = await supa.auth.verifyOtp({
    email: email.value.trim().toLowerCase(),
    token: codigo.value,
    type: 'signup'
  })
  carregando.value = false

  if (error) {
    erro.value = String(error.message).toLowerCase().includes('expired')
      ? 'Este código expirou. Peça outro.'
      : 'Código incorreto. Confira e tente de novo.'
    codigo.value = ''
    return
  }
  if (data.session) { await navigateTo('/'); return }
  erro.value = 'Não consegui concluir. Tente entrar pela tela de acesso.'
}

async function reenviar() {
  if (espera.value > 0) return
  erro.value = ''; recado.value = ''
  const { error } = await supa.auth.resend({
    type: 'signup', email: email.value.trim().toLowerCase()
  })
  if (error) { erro.value = error.message; return }
  recado.value = 'Mandamos outro código.'
  contar()
}
</script>

<template>
  <div class="portao">
    <div class="portao-caixa">
      <!-- ---------------- código ---------------- -->
      <template v-if="etapa === 'codigo'">
        <div class="portao-marca">Confirme o e-mail</div>
        <div class="portao-sub">
          Enviamos 6 números para<br><strong>{{ email }}</strong>
        </div>

        <CampoCodigo v-model="codigo" :erro="!!erro" @completo="conferir" />

        <div v-if="erro" class="aviso mal" style="margin:16px 0 0">{{ erro }}</div>
        <div v-if="recado" class="aviso bem" style="margin:16px 0 0">{{ recado }}</div>

        <button class="btn" style="width:100%;margin-top:18px"
                :disabled="carregando || codigo.length < 6" @click="conferir">
          {{ carregando ? 'Conferindo…' : 'Confirmar e entrar' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          <button v-if="espera <= 0" class="botao-texto" @click="reenviar">
            Não chegou? Enviar outro código
          </button>
          <span v-else class="mudo">Pode pedir outro em {{ espera }}s</span>
        </div>

        <div class="centro pequeno" style="margin-top:10px">
          <button class="botao-texto mudo" @click="etapa = 'dados'; erro = ''">
            Corrigir o e-mail
          </button>
        </div>
      </template>

      <!-- ---------------- dados ---------------- -->
      <template v-else>
        <div class="portao-marca">Criar conta</div>
        <div class="portao-sub">
          {{ convidado
            ? 'Você foi convidado — use este mesmo e-mail'
            : 'Experimente sem cartão de crédito' }}
        </div>

        <div class="campo">
          <label>Seu nome</label>
          <input v-model="nome" autocomplete="name" placeholder="Como quer ser chamado" />
        </div>

        <div v-if="!convidado" class="campo">
          <label>Nome da família <span class="mudo">(opcional)</span></label>
          <input v-model="casa" placeholder="Família Silva" />
        </div>

        <div class="campo">
          <label>E-mail</label>
          <input v-model="email" type="email" autocomplete="email"
                 :disabled="convidado" placeholder="seu@email.com" />
        </div>

        <div class="campo">
          <label>Senha</label>
          <input v-model="senha" type="password" autocomplete="new-password"
                 placeholder="ao menos 8 caracteres" />
          <div v-if="senha" class="forca">
            <div class="forca-barra">
              <i :style="{ width: (forcaSenha.n / 5 * 100) + '%', background: forcaSenha.cor }"></i>
            </div>
            <span class="pequeno" :style="{ color: forcaSenha.cor }">{{ forcaSenha.txt }}</span>
          </div>
        </div>

        <div class="campo">
          <label>Repita a senha</label>
          <input v-model="senha2" type="password" autocomplete="new-password"
                 placeholder="••••••••" @keyup.enter="criar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="criar">
          {{ carregando ? 'Criando…' : 'Criar minha conta' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          Já tem conta? <NuxtLink to="/login"><strong>Entrar</strong></NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.forca { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.forca-barra {
  flex: 1; height: 4px; background: #E9EEF5; border-radius: 999px; overflow: hidden;
}
.forca-barra i { display: block; height: 100%; transition: width .2s; }

.botao-texto {
  background: none; border: 0; padding: 0; font: inherit;
  color: var(--azul-forte); text-decoration: underline; cursor: pointer;
}
.botao-texto.mudo { color: var(--tinta-45); }
</style>
