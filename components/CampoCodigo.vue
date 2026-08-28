<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  erro?: boolean
  minimo?: number
  maximo?: number
}>(), { minimo: 6, maximo: 10 })

const emit = defineEmits<{ 'update:modelValue': [string]; completo: [string] }>()

const caixas = ref<HTMLInputElement[]>([])

// O tamanho do código vem do servidor e pode mudar. Em vez de travar em
// seis casas, o campo cresce conforme o que for digitado ou colado.
const TAM = computed(() => Math.min(
  props.maximo,
  Math.max(props.minimo, String(props.modelValue ?? '').replace(/\D/g, '').length)
))

const digitos = computed(() => {
  const v = String(props.modelValue ?? '').replace(/\D/g, '').slice(0, TAM.value)
  return Array.from({ length: TAM.value }, (_, i) => v[i] ?? '')
})

function atualizar(valor: string) {
  const limpo = valor.replace(/\D/g, '').slice(0, props.maximo)
  emit('update:modelValue', limpo)
  if (limpo.length >= props.minimo) emit('completo', limpo)
}

function digitar(i: number, ev: Event) {
  const el = ev.target as HTMLInputElement
  const n = el.value.replace(/\D/g, '')
  if (!n) { el.value = digitos.value[i]; return }

  const atual = digitos.value.join('').split('')
  // colar vários de uma vez
  if (n.length > 1) {
    atualizar(digitos.value.slice(0, i).join('') + n)
    nextTick(() => caixas.value[Math.min(TAM.value - 1, i + n.length)]?.focus())
    return
  }
  atual[i] = n
  atualizar(atual.join(''))
  nextTick(() => caixas.value[Math.min(TAM.value - 1, i + 1)]?.focus())
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
  if (ev.key === 'ArrowRight' && i < TAM.value - 1) caixas.value[i + 1]?.focus()
}

function colar(ev: ClipboardEvent) {
  ev.preventDefault()
  const t = ev.clipboardData?.getData('text') ?? ''
  atualizar(t)
  nextTick(() => caixas.value[Math.min(TAM.value - 1, t.replace(/\D/g, '').length)]?.focus())
}

onMounted(() => nextTick(() => caixas.value[0]?.focus()))
defineExpose({ focar: () => caixas.value[0]?.focus() })
</script>

<template>
  <div class="codigo" :class="{ ruim: erro, longo: TAM > 6 }" @paste="colar">
    <input v-for="(d, i) in digitos" :key="i"
           ref="caixas"
           :value="d"
           type="text" inputmode="numeric" autocomplete="one-time-code"
           :maxlength="maximo"
           @input="digitar(i, $event)"
           @keydown="tecla(i, $event)"
           @focus="($event.target as HTMLInputElement).select()" />
  </div>
</template>

<style scoped>
.codigo { display: flex; gap: 8px; justify-content: center; }
.codigo input {
  width: 46px; height: 56px; min-width: 0; flex: 0 1 46px; padding: 0; text-align: center;
  font-variant-numeric: tabular-nums; font-size: 1.5rem; font-weight: 600;
  border: 1px solid var(--linha); border-radius: 10px;
  background: var(--carta); color: var(--tinta);
}
.codigo input:focus {
  outline: 2px solid var(--latao); outline-offset: 1px; border-color: var(--latao);
}
.codigo.ruim input { border-color: var(--saida); background: var(--saida-fraco); }

.codigo.longo input { width: 40px; height: 50px; font-size: 1.25rem; }

@media (max-width: 460px) {
  .codigo { gap: 4px; }
  .codigo input { width: 38px; height: 48px; font-size: 1.15rem; }
  .codigo.longo input { width: 32px; height: 44px; font-size: 1rem; }
}
</style>
