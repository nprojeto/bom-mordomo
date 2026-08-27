<script setup lang="ts">
const props = defineProps<{ modelValue: string; erro?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [string]; completo: [string] }>()

const TAM = 6
const caixas = ref<HTMLInputElement[]>([])

const digitos = computed(() => {
  const v = String(props.modelValue ?? '').replace(/\D/g, '').slice(0, TAM)
  return Array.from({ length: TAM }, (_, i) => v[i] ?? '')
})

function atualizar(valor: string) {
  const limpo = valor.replace(/\D/g, '').slice(0, TAM)
  emit('update:modelValue', limpo)
  if (limpo.length === TAM) emit('completo', limpo)
}

function digitar(i: number, ev: Event) {
  const el = ev.target as HTMLInputElement
  const n = el.value.replace(/\D/g, '')
  if (!n) { el.value = digitos.value[i]; return }

  const atual = digitos.value.join('').split('')
  // colar vários de uma vez
  if (n.length > 1) {
    atualizar(digitos.value.slice(0, i).join('') + n)
    nextTick(() => caixas.value[Math.min(TAM - 1, i + n.length)]?.focus())
    return
  }
  atual[i] = n
  atualizar(atual.join(''))
  nextTick(() => caixas.value[Math.min(TAM - 1, i + 1)]?.focus())
}

function tecla(i: number, ev: KeyboardEvent) {
  if (ev.key === 'Backspace') {
    ev.preventDefault()
    const atual = digitos.value.join('').split('')
    if (atual[i]) { atual[i] = ''; atualizar(atual.join('')) }
    else if (i > 0) {
      atual[i - 1] = ''
      atualizar(atual.join(''))
      nextTick(() => caixas.value[i - 1]?.focus())
    }
  }
  if (ev.key === 'ArrowLeft' && i > 0) caixas.value[i - 1]?.focus()
  if (ev.key === 'ArrowRight' && i < TAM - 1) caixas.value[i + 1]?.focus()
}

function colar(ev: ClipboardEvent) {
  ev.preventDefault()
  const t = ev.clipboardData?.getData('text') ?? ''
  atualizar(t)
  nextTick(() => caixas.value[Math.min(TAM - 1, t.replace(/\D/g, '').length)]?.focus())
}

onMounted(() => nextTick(() => caixas.value[0]?.focus()))
defineExpose({ focar: () => caixas.value[0]?.focus() })
</script>

<template>
  <div class="codigo" :class="{ ruim: erro }" @paste="colar">
    <input v-for="(d, i) in digitos" :key="i"
           ref="caixas"
           :value="d"
           type="text" inputmode="numeric" autocomplete="one-time-code"
           maxlength="6"
           @input="digitar(i, $event)"
           @keydown="tecla(i, $event)"
           @focus="($event.target as HTMLInputElement).select()" />
  </div>
</template>

<style scoped>
.codigo { display: flex; gap: 8px; justify-content: center; }
.codigo input {
  width: 46px; height: 56px; padding: 0; text-align: center;
  font-variant-numeric: tabular-nums; font-size: 1.5rem; font-weight: 600;
  border: 1px solid var(--linha); border-radius: 10px;
  background: var(--carta); color: var(--tinta);
}
.codigo input:focus {
  outline: 2px solid var(--latao); outline-offset: 1px; border-color: var(--latao);
}
.codigo.ruim input { border-color: var(--saida); background: var(--saida-fraco); }

@media (max-width: 400px) {
  .codigo { gap: 5px; }
  .codigo input { width: 40px; height: 50px; font-size: 1.25rem; }
}
</style>
