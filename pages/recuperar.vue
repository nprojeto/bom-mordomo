<script setup lang="ts">
const { escuroAgora, alternar } = useTema()
const supa = useSupa()
const api = useApi()

const etapa = ref<'email' | 'codigo'>('email')
const email = ref('')
const codigo = ref('')
const senha = ref('')
const senha2 = ref('')
const erro = ref('')
const recado = ref('')
const carregando = ref(false)
const espera = ref(0)

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

async function enviar() {
  erro.value = ''
  const mail = email.value.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    erro.value = 'Informe um e-mail válido.'
    return
  }
  carregando.value = true
  try {
    // o código sai do nosso servidor, pelo Brevo
    await api.post('/acesso/codigo', { email: mail, tipo: 'recuperacao' })
    etapa.value = 'codigo'
    contar()
  } catch (e: any) { erro.value = e.message }
  carregando.value = false
}

async function salvar() {
  erro.value = ''
  if (codigo.value.length < 6) { erro.value = 'Digite o código inteiro.'; return }
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter ao menos 8 caracteres.'; return }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não são iguais.'; return }

  const mail = email.value.trim().toLowerCase()
  carregando.value = true

  try {
    await api.post('/acesso/confirmar', {
      email: mail, tipo: 'recuperacao', codigo: codigo.value, senha: senha.value
    })
  } catch (e: any) {
    carregando.value = false
    erro.value = e.message
    if (String(e.message).toLowerCase().includes('incorreto')) codigo.value = ''
    return
  }

  const { error } = await supa.auth.signInWithPassword({
    email: mail, password: senha.value
  })
  carregando.value = false

  if (error) {
    recado.value = 'Senha trocada. Entre com a nova.'
    setTimeout(() => navigateTo('/login'), 1800)
    return
  }
  await navigateTo('/')
}

async function reenviar() {
  if (espera.value > 0) return
  erro.value = ''; recado.value = ''
  try {
    await api.post('/acesso/codigo', {
      email: email.value.trim().toLowerCase(), tipo: 'recuperacao'
    })
    recado.value = 'Mandamos outro código.'
    contar()
  } catch (e: any) { erro.value = e.message }
}
</script>

<template>
  <div class="portao">
    <button class="tema-flutuante" :title="escuroAgora ? 'Tema claro' : 'Tema escuro'"
            @click="alternar">
      <i class="mi">{{ escuroAgora ? 'light_mode' : 'dark_mode' }}</i>
    </button>

    <div class="portao-caixa">
      <!-- ---------------- código e nova senha ---------------- -->
      <template v-if="etapa === 'codigo'">
        <div class="portao-marca">Nova senha</div>
        <div class="portao-sub">
          Se existir conta, enviamos um código para<br><strong>{{ email }}</strong>
        </div>

        <CampoCodigo v-model="codigo" :erro="!!erro" />

        <div class="campo" style="margin-top:20px">
          <label>Nova senha</label>
          <input v-model="senha" type="password" autocomplete="new-password"
                 placeholder="ao menos 8 caracteres" />
        </div>

        <div class="campo">
          <label>Repita a senha</label>
          <input v-model="senha2" type="password" autocomplete="new-password"
                 placeholder="••••••••" @keyup.enter="salvar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>
        <div v-if="recado" class="aviso bem" style="margin-bottom:14px">{{ recado }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="salvar">
          {{ carregando ? 'Salvando…' : 'Salvar e entrar' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          <button v-if="espera <= 0" class="botao-texto" @click="reenviar">
            Não chegou? Enviar outro código
          </button>
          <span v-else class="mudo">Pode pedir outro em {{ espera }}s</span>
        </div>

        <div class="centro pequeno" style="margin-top:10px">
          <button class="botao-texto mudo" @click="etapa = 'email'; erro = ''">
            Corrigir o e-mail
          </button>
        </div>
      </template>

      <!-- ---------------- e-mail ---------------- -->
      <template v-else>
        <div class="portao-marca">Esqueci a senha</div>
        <div class="portao-sub">Enviamos um código para você criar outra</div>

        <div class="campo">
          <label>E-mail da conta</label>
          <input v-model="email" type="email" autocomplete="email"
                 placeholder="seu@email.com" @keyup.enter="enviar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="enviar">
          {{ carregando ? 'Enviando…' : 'Enviar código' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          <NuxtLink to="/login" class="mudo">Voltar</NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.botao-texto {
  background: none; border: 0; padding: 0; font: inherit;
  color: var(--laranja); text-decoration: underline; cursor: pointer;
}
.botao-texto.mudo { color: var(--tinta-45); }
</style>
