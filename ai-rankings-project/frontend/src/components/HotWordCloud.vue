<template>
  <div class="word-cloud">
    <van-tag
      v-for="word in words"
      :key="word.word"
      :color="word.count > 20 ? '#0f8b8d' : '#eef7f7'"
      :text-color="word.count > 20 ? '#fff' : '#0f8b8d'"
      size="medium"
    >
      {{ word.word }} {{ word.count }}
    </van-tag>
  </div>
</template>

<script setup>
defineProps({
  words: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.word-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
