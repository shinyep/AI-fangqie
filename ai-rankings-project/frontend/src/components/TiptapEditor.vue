<template>
  <div ref="containerRef" class="tiptap-wrapper" :class="{ 'is-readonly': readOnly, 'has-markers': showMarkers }">
    <!-- 段落编号 -->
    <div v-if="showMarkers && paragraphMarkers.length > 0" class="paragraph-markers">
      <div
        v-for="marker in paragraphMarkers"
        :key="'P' + marker.index"
        class="paragraph-marker"
        :class="{ highlighted: highlightedRange && marker.index >= highlightedRange.start && marker.index <= highlightedRange.end }"
        :style="{ top: marker.top + 'px' }"
      >
        P{{ marker.index + 1 }}
      </div>
    </div>

    <editor-content :editor="editor" class="tiptap-content" :class="{ 'with-markers': showMarkers }" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, onMounted, nextTick } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

const props = defineProps({
  modelValue: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  showMarkers: { type: Boolean, default: true },
  placeholder: { type: String, default: '请输入章节内容' },
  highlightedRange: { type: Object, default: null }, // { start: number, end: number }
});

const emit = defineEmits(['update:modelValue', 'selection-change', 'text-change']);

const containerRef = ref(null);
const paragraphMarkers = ref([]);

// 将纯文本转换为 HTML 段落（以连续空行分隔）
function plainTextToHtml(text) {
  if (!text) return '';
  // 如果已经是 HTML，直接返回
  if (/<\/?[a-z][^>]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

const editor = useEditor({
  content: plainTextToHtml(props.modelValue),
  editable: !props.readOnly,
  extensions: [
    StarterKit.configure({
      paragraph: { HTMLAttributes: { class: 'content-paragraph' } },
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
    CharacterCount.configure({}),
  ],
  onUpdate: ({ editor }) => {
    const text = editor.getText();
    emit('update:modelValue', text);
    emit('text-change', text);
  },
  onSelectionUpdate: ({ editor }) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    emit('selection-change', {
      from,
      to,
      text,
      isEmpty: from === to,
    });
  },
  editorProps: {
    attributes: {
      class: 'tiptap-editor-body',
    },
  },
});

// 同步外部 value 到编辑器（仅在非用户编辑时）
watch(() => props.modelValue, (newVal) => {
  if (editor.value && newVal !== editor.value.getText()) {
    editor.value.commands.setContent(plainTextToHtml(newVal), false);
  }
});

// 同步只读状态
watch(() => props.readOnly, (val) => {
  if (editor.value) {
    editor.value.setEditable(!val);
  }
});

// 计算段落位置标记
function updateParagraphMarkers() {
  if (!props.showMarkers || !containerRef.value) {
    paragraphMarkers.value = [];
    return;
  }

  nextTick(() => {
    const container = containerRef.value;
    if (!container) return;

    const paragraphs = container.querySelectorAll('.content-paragraph');
    const containerRect = container.getBoundingClientRect();
    const markers = [];

    paragraphs.forEach((p, index) => {
      const rect = p.getBoundingClientRect();
      if (rect.height > 0) {
        markers.push({
          index,
          top: rect.top - containerRect.top + rect.height / 2,
        });
      }
    });

    paragraphMarkers.value = markers;
  });
}

// 监听内容变化更新标记
watch(() => props.modelValue, () => {
  updateParagraphMarkers();
});

onMounted(() => {
  updateParagraphMarkers();
  // ResizeObserver 监听容器变化
  if (containerRef.value) {
    const observer = new ResizeObserver(() => {
      updateParagraphMarkers();
    });
    observer.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});

defineExpose({
  editor,
  getText: () => editor.value?.getText() || '',
  getHTML: () => editor.value?.getHTML() || '',
  focus: () => editor.value?.commands.focus(),
  scrollToParagraph: (index) => {
    if (!containerRef.value) return;
    const paragraphs = containerRef.value.querySelectorAll('.content-paragraph');
    if (paragraphs[index]) {
      paragraphs[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
  updateParagraphMarkers,
});
</script>

<style scoped>
.tiptap-wrapper {
  position: relative;
  min-height: 400px;
}

.tiptap-wrapper.has-markers {
  padding-left: 44px;
}

.tiptap-wrapper.is-readonly .tiptap-content {
  opacity: 0.85;
}

.paragraph-markers {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 36px;
  pointer-events: none;
  z-index: 10;
}

.paragraph-marker {
  position: absolute;
  right: 4px;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  line-height: 1;
  transition: color 0.2s;
}

.paragraph-marker.highlighted {
  color: #0ea5e9;
}

.tiptap-editor-body {
  outline: none;
  min-height: 400px;
  font-size: 15px;
  line-height: 2;
  color: #1f2937;
}

.tiptap-editor-body p {
  margin-bottom: 1.5em;
}

.tiptap-editor-body p:last-child {
  margin-bottom: 0;
}

/* Placeholder */
.tiptap-editor-body p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
  float: left;
  height: 0;
}

.content-paragraph {
  position: relative;
}
</style>
