<script setup lang="ts">
const supa = useSupa()
const email = ref('')
const erro = ref('')
const enviado = ref(false)
const carregando = ref(false)

async function enviar() {
  erro.value = ''
  const mail = email.value.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    erro.value = 'Informe um e-mail válido.'
    return
  }
  carregando.value = true
  const cfg = useRuntimeConfig()
  const { error } = await supa.auth.resetPasswordForEmail(mail, {
    redirectTo: `${window.location.origin}${cfg.app.baseURL}nova-senha`
  })
  carregando.value = false
  if (error) { erro.value = error.message; return }
  enviado.value = true
}
</script>

<template>
  <div class="portao">
    <div class="portao-caixa">
      <template v-if="enviado">
        <div class="portao-marca">Verifique o e-mail</div>
        <div class="portao-sub">Se existir conta, o link chegou</div>
        <div class="aviso bem" style="margin-bottom:18px">
          Enviamos as instruções para <strong>{{ email }}</strong>.
          O link vale por uma hora.
        </div>
        <NuxtLink to="/login" class="btn claro" style="width:100%">
          Voltar para a entrada
        </NuxtLink>
      </template>

      <template v-else>
        <div class="portao-marca">Esqueci a senha</div>
        <div class="portao-sub">Enviamos um link para você criar outra</div>

        <div class="campo">
          <label>E-mail da conta</label>
          <input v-model="email" type="email" autocomplete="email"
                 placeholder="seu@email.com" @keyup.enter="enviar" />
        </div>

        <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

        <button class="btn" style="width:100%" :disabled="carregando" @click="enviar">
          {{ carregando ? 'Enviando…' : 'Enviar link' }}
        </button>

        <div class="centro pequeno" style="margin-top:18px">
          <NuxtLink to="/login" class="mudo">Voltar</NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
