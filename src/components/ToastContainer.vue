<script setup>
import { useToast } from '../composables/useToast'
const { toasts } = useToast()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast-fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="t.type"
      >{{ t.msg }}</div>
    </TransitionGroup>
  </div>
</template>
