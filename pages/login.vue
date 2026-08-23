<script setup lang="ts">
const supa = useSupa()
const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)

async function entrar() {
  erro.value = ''
  carregando.value = true
  const { error } = await supa.auth.signInWithPassword({
    email: email.value.trim(), password: senha.value
  })
  carregando.value = false
  if (error) {
    erro.value = 'E-mail ou senha não conferem. Tente de novo.'
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
    </div>
  </div>
</template>
