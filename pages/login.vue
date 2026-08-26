<script setup lang="ts">
const supa = useSupa()
const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)

async function entrar() {
  erro.value = ''
  if (!email.value.trim() || !senha.value) {
    erro.value = 'Preencha e-mail e senha.'
    return
  }
  carregando.value = true
  const { error } = await supa.auth.signInWithPassword({
    email: email.value.trim().toLowerCase(), password: senha.value
  })
  carregando.value = false
  if (error) {
    erro.value = error.message.includes('Email not confirmed')
      ? 'Confirme seu e-mail antes de entrar. Veja a caixa de entrada.'
      : 'E-mail ou senha não conferem.'
    return
  }
  await navigateTo('/')
}
</script>

<template>
  <div class="portao">
    <div class="portao-caixa">
      <div class="portao-marca">Bom Mordomo</div>
      <div class="portao-sub">O livro-razão da casa</div>

      <div class="campo">
        <label>E-mail</label>
        <input v-model="email" type="email" autocomplete="email"
               placeholder="seu@email.com" @keyup.enter="entrar" />
      </div>

      <div class="campo">
        <label>Senha</label>
        <input v-model="senha" type="password" autocomplete="current-password"
               placeholder="••••••••" @keyup.enter="entrar" />
      </div>

      <div v-if="erro" class="aviso mal" style="margin-bottom:14px">{{ erro }}</div>

      <button class="btn" style="width:100%" :disabled="carregando" @click="entrar">
        {{ carregando ? 'Entrando…' : 'Entrar' }}
      </button>

      <div class="centro pequeno" style="margin-top:18px">
        <NuxtLink to="/recuperar" class="mudo">Esqueci minha senha</NuxtLink>
      </div>

      <div class="regua-portao"></div>

      <div class="centro pequeno">
        Ainda não tem conta?
        <NuxtLink to="/criar-conta"><strong>Criar agora</strong></NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.regua-portao {
  height: 1px; background: var(--linha); margin: 20px 0 16px;
}
</style>
