<script setup lang="ts">
const supa = useSupa()

const etapa = ref<'email' | 'codigo' | 'senha'>('email')
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
  const { error } = await supa.auth.resetPasswordForEmail(mail)
  carregando.value = false
  if (error) { erro.value = error.message; return }
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
    type: 'recovery'
  })
  carregando.value = false

  if (error) {
    erro.value = String(error.message).toLowerCase().includes('expired')
      ? 'Este código expirou. Peça outro.'
      : 'Código incorreto. Confira e tente de novo.'
    codigo.value = ''
    return
  }
  if (!data.session) { erro.value = 'Não consegui validar o código.'; return }
  etapa.value = 'senha'
}

async function salvar() {
  erro.value = ''
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter ao menos 8 caracteres.'; return }
  if (senha.value !== senha2.value) { erro.value = 'As senhas não são iguais.'; return }

  carregando.value = true
  const { error } = await supa.auth.updateUser({ password: senha.value })
  carregando.value = false
  if (error) { erro.value = error.message; return }
  await navigateTo('/')
}

async function reenviar() {
  if (espera.value > 0) return
  erro.value = ''; recado.value = ''
  const { error } = await supa.auth.resetPasswordForEmail(email.value.trim().toLowerCase())
  if (error) { erro.value = error.message; return }
  recado.value = 'Mandamos outro código.'
  contar()
}
</script>

<template>
  <div class="portao">
    <div class="portao-caixa">
      <!-- ---------------- nova senha ---------------- -->
      <template v-if="etapa === 'senha'">
        <div class="portao-marca">Nova senha</div>
        <div class="portao-sub">Escolha uma que você lembre</div>

        <div class="campo">
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

        <button class="btn" style="width:100%" :disabled="carregando" @click="salvar">
          {{ carregando ? 'Salvando…' : 'Salvar e entrar' }}
        </button>
      </template>

      <!-- ---------------- código ---------------- -->
      <template v-else-if="etapa === 'codigo'">
        <div class="portao-marca">Confira o e-mail</div>
        <div class="portao-sub">
          Se existir conta, enviamos 6 números para<br><strong>{{ email }}</strong>
        </div>

        <CampoCodigo v-model="codigo" :erro="!!erro" @completo="conferir" />

        <div v-if="erro" class="aviso mal" style="margin:16px 0 0">{{ erro }}</div>
        <div v-if="recado" class="aviso bem" style="margin:16px 0 0">{{ recado }}</div>

        <button class="btn" style="width:100%;margin-top:18px"
                :disabled="carregando || codigo.length < 6" @click="conferir">
          {{ carregando ? 'Conferindo…' : 'Continuar' }}
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
  color: var(--azul-forte); text-decoration: underline; cursor: pointer;
}
.botao-texto.mudo { color: var(--tinta-45); }
</style>
