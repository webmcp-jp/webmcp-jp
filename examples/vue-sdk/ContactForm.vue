<script setup>
import { onBeforeUnmount, onMounted, reactive } from "vue";
import { registerContactFormTool } from "webmcp-jp";

const values = reactive({ name: "", message: "", consent: false });
let submitted = false;
let registration;

onMounted(async () => {
  registration = await registerContactFormTool({
    modelContext: document.modelContext,
    read: () => ({ ...values }),
    write: (next) => Object.assign(values, next),
    isSubmitted: () => submitted,
  });
});
onBeforeUnmount(() => registration?.unregister());

// humanSubmit は人が通常UIを送信した場合だけ呼ばれる。
function humanSubmit() {
  if (submitted) return;
  submitted = true;
}
</script>

<template>
  <form @submit.prevent="humanSubmit">
    <input v-model="values.name" />
    <textarea v-model="values.message" />
    <button type="submit">人が確認して送信</button>
  </form>
</template>
